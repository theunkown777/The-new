import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { audit } from "@/lib/audit";
import { BESTAETIGUNG_MINUTEN, MAX_FEHLVERSUCHE, PRUEFUNG_NOETIG, berlinTag, eingabeTag, geburtsdatumStimmt, nachFehlversuch, restSperre } from "@/lib/portalPruefung";
import { pruefCookieName, pruefToken, pruefTokenLesen } from "@/lib/portalPruefungCookie";

// Geburtsdatum-Prüfung im Patientenportal (S5), Serverseite: liest und setzt
// die Bestätigung (Cookie) und führt Fehlversuche und Sperre je Portal-Link in
// der Datenbank. Die Datenbank statt des Rate-Limit-Speichers, weil die Sperre
// die einzige Bremse beim Erraten eines Geburtsdatums ist und deshalb auch dann
// für alle Server-Instanzen gelten muss, wenn kein Redis angebunden ist
// (gleiches Muster wie "Mein Bereich", lib/bereichSchutz.ts).

export type PruefLage =
  /** Geburtsdatum in den letzten 30 Minuten auf diesem Gerät bestätigt */
  | { status: "bestaetigt"; geprueftAt: Date }
  /** Geburtsdatum hinterlegt, aber (noch) nicht bestätigt */
  | { status: "noetig" }
  /** Die Praxis hat kein Geburtsdatum hinterlegt: Prüfung nicht möglich */
  | { status: "ohne" };

/** Lage für Seiten und Routen, die den Patienten schon geladen haben. */
export function pruefLage(token: string, patient: { id: string; birthDate: Date | null }): PruefLage {
  if (!patient.birthDate) return { status: "ohne" };
  const linkHash = hashToken(token);
  const wert = cookies().get(pruefCookieName(linkHash))?.value;
  const ok = pruefTokenLesen(wert, { linkHash, patientId: patient.id, geburtstag: berlinTag(patient.birthDate) });
  return ok ? { status: "bestaetigt", geprueftAt: ok.geprueftAt } : { status: "noetig" };
}

/** Lage für API-Routen, die nur die Patienten-ID des Links kennen (lib/portalAuth.ts). */
export async function portalPruefung(token: string, patientId: string): Promise<PruefLage> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, birthDate: true } });
  return p ? pruefLage(token, p) : { status: "noetig" };
}

/** Antwort der bindenden Routen, wenn die Bestätigung fehlt oder abgelaufen ist. */
export const pruefungNoetigAntwort = () =>
  NextResponse.json({ error: "Bitte bestätigen Sie zuerst Ihr Geburtsdatum.", code: PRUEFUNG_NOETIG }, { status: 403, headers: { "Cache-Control": "no-store" } });

export type PruefErgebnis =
  | { ok: true; cookie: { name: string; wert: string; maxAge: number } }
  | { ok: false; code: "OHNE_GEBURTSDATUM" }
  | { ok: false; code: "GESPERRT"; minuten: number }
  | { ok: false; code: "FALSCH"; rest: number };

const offen = (linkHash: string, now: Date) => ({ linkHash, OR: [{ gesperrtBis: null }, { gesperrtBis: { lte: now } }] });

/**
 * Einen Versuch reservieren, bevor verglichen wird. Liefert den Zählerstand
 * einschließlich dieses Versuchs oder null, wenn der Link gerade gesperrt ist.
 * Das Hochzählen ist eine einzelne Anweisung auf der Zeile: Auch viele
 * gleichzeitige Anfragen bekommen zusammen nicht mehr als MAX_FEHLVERSUCHE Vergleiche.
 */
async function versuchReservieren(linkHash: string, patientId: string, now: Date): Promise<{ fehler: number; sperren: number } | null> {
  for (let runde = 0; runde < 2; runde++) {
    const gezaehlt = await prisma.portalPruefung.updateMany({ where: offen(linkHash, now), data: { fehler: { increment: 1 } } });
    if (gezaehlt.count > 0) return prisma.portalPruefung.findUnique({ where: { linkHash }, select: { fehler: true, sperren: true } });
    try {
      return await prisma.portalPruefung.create({ data: { linkHash, patientId, fehler: 1 }, select: { fehler: true, sperren: true } });
    } catch (err) {
      // Zeile gibt es schon: entweder gesperrt oder eben erst von einer parallelen Anfrage angelegt (dann zweite Runde).
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  return null;
}

/**
 * Eingabe gegen das hinterlegte Geburtsdatum prüfen. Bei Erfolg kommt der Wert
 * für das Bestätigungs-Cookie zurück; Fehlversuche werden gezählt und führen
 * nach MAX_FEHLVERSUCHE zur Sperre des Links (15 Minuten, bei jeder weiteren
 * Sperre doppelt so lang, höchstens 24 Stunden).
 */
export async function geburtsdatumPruefen(a: { token: string; patient: { id: string; practiceId: string; birthDate: Date | null }; eingabe: { tag: unknown; monat: unknown; jahr: unknown } }, now = new Date()): Promise<PruefErgebnis> {
  const { patient } = a;
  if (!patient.birthDate) return { ok: false, code: "OHNE_GEBURTSDATUM" };
  const linkHash = hashToken(a.token);
  const gesperrt = async (): Promise<PruefErgebnis> => {
    const z = await prisma.portalPruefung.findUnique({ where: { linkHash }, select: { gesperrtBis: true } });
    return { ok: false, code: "GESPERRT", minuten: Math.max(1, restSperre(z?.gesperrtBis, now.getTime())) };
  };

  const stand = await versuchReservieren(linkHash, patient.id, now);
  if (!stand) return gesperrt();

  // Mehr gleichzeitige Anfragen als erlaubte Versuche: nicht mehr vergleichen, nur noch sperren.
  const zuViele = stand.fehler > MAX_FEHLVERSUCHE;
  if (!zuViele && geburtsdatumStimmt(patient.birthDate, eingabeTag(a.eingabe, now))) {
    await prisma.portalPruefung.deleteMany({ where: { linkHash } });
    return {
      ok: true,
      cookie: { name: pruefCookieName(linkHash), wert: pruefToken({ linkHash, patientId: patient.id, geburtstag: berlinTag(patient.birthDate) }, now.getTime()), maxAge: BESTAETIGUNG_MINUTEN * 60 },
    };
  }

  const folge = nachFehlversuch(stand.fehler, stand.sperren, now.getTime());
  if (!folge.gesperrt) return { ok: false, code: "FALSCH", rest: folge.rest };
  // Nur die Anfrage, die die Grenze erreicht hat, setzt die Sperre (und zählt sie einmal).
  const gesetzt = await prisma.portalPruefung.updateMany({
    where: { linkHash, fehler: { gte: MAX_FEHLVERSUCHE } },
    data: { fehler: 0, sperren: { increment: 1 }, gesperrtBis: folge.bis },
  });
  if (gesetzt.count === 0) return gesperrt();
  await audit({ practiceId: patient.practiceId, userName: "Patientenportal", action: "portal.gesperrt", entityType: "Patient", entityId: patient.id, summary: `${MAX_FEHLVERSUCHE} Fehlversuche, ${folge.minuten} Minuten` });
  return { ok: false, code: "GESPERRT", minuten: folge.minuten };
}
