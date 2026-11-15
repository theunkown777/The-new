import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecht } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { consumeAttempt } from "@/lib/rateLimit";
import { bestandAus, einordnen, importBlockSchema, serverPruefung, type ImportPatient } from "@/lib/patientenImport";

export const dynamic = "force-dynamic";

// Patientenliste einlesen: Der Browser liest die CSV-Datei und schickt geprüfte
// Zeilen in Blöcken. Diese Route ordnet jede Zeile ein (neu / schon vorhanden /
// fehlerhaft) und speichert nur neue – erst wenn `nurPruefen` aus ist.
// Die Datei selbst kommt hier nie an und wird nicht gespeichert. Vorhandene
// Patienten werden nie überschrieben. Einwilligungen (E-Mail, WhatsApp) werden
// nicht gesetzt. Nur die Praxisleitung; Protokoll ohne Namen.
const ANFRAGEN_PRO_STUNDE = 300;

type Zeile = { zeile: number; status: "neu" | "vorhanden" | "fehler"; grund?: string };

export async function POST(req: Request) {
  const { session, error } = await requireRecht("patienten.import");
  if (!session) return error;
  const practiceId = session.user.practiceId;

  if (!(await consumeAttempt(`patienten-import:${practiceId}`, ANFRAGEN_PRO_STUNDE, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Zu viele Anfragen in dieser Stunde. Bitte später erneut versuchen." }, { status: 429 });
  }

  const parsed = importBlockSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe. Bitte die Datei neu einlesen." }, { status: 400 });
  const { nurPruefen, teil, teile } = parsed.data;
  const zeilen = parsed.data.patienten as ImportPatient[];

  // Dem Browser nicht vertrauen: Werte noch einmal prüfen.
  const heute = new Date();
  const ergebnis: Zeile[] = [];
  const gueltig: ImportPatient[] = [];
  for (const p of zeilen) {
    const grund = serverPruefung(p, heute);
    if (grund) ergebnis.push({ zeile: p.zeile, status: "fehler", grund });
    else gueltig.push(p);
  }

  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } });
  if (!practice) return NextResponse.json({ error: "Praxis nicht gefunden" }, { status: 404 });

  // Nur die Patienten der eigenen Praxis laden, die als Dublette in Frage kommen:
  // gleiches Geburtsdatum, kein Geburtsdatum oder gleiche Patientennummer.
  const tage = [...new Set(gueltig.map((p) => p.birthDate).filter((d): d is string => !!d))].map((d) => new Date(`${d}T00:00:00.000Z`));
  const ohneDatum = gueltig.some((p) => !p.birthDate);
  const nummern = [...new Set(gueltig.map((p) => p.patientNummer).filter((n): n is string => !!n))];
  const kandidaten = gueltig.length
    ? await prisma.patient.findMany({
        where: {
          practiceId,
          OR: [
            ...(tage.length ? [{ birthDate: { in: tage } }] : []),
            ...(ohneDatum ? [{ birthDate: null }] : []),
            ...(nummern.length ? [{ patientNummer: { in: nummern, mode: "insensitive" as const } }, { externalId: { in: nummern, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { lastName: true, firstName: true, birthDate: true, patientNummer: true, externalId: true },
      })
    : [];

  const einordnung = einordnen(gueltig, bestandAus(kandidaten));
  const neu: ImportPatient[] = [];
  einordnung.forEach((e, i) => {
    ergebnis.push(e);
    if (e.status === "neu") neu.push(gueltig[i]);
  });
  ergebnis.sort((a, b) => a.zeile - b.zeile);

  const zahlen = {
    neu: neu.length,
    vorhanden: ergebnis.filter((e) => e.status === "vorhanden").length,
    fehler: ergebnis.filter((e) => e.status === "fehler").length,
  };

  if (nurPruefen || neu.length === 0) {
    return NextResponse.json({ gespeichert: 0, ...zahlen, ergebnis, demo: practice.isDemo });
  }

  const r = await prisma.patient.createMany({
    data: neu.map((p) => ({
      practiceId,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00.000Z`) : null,
      geschlecht: p.geschlecht,
      insuranceType: p.insuranceType,
      insuranceName: p.insuranceName,
      phone: p.phone,
      email: p.email,
      patientNummer: p.patientNummer,
      // Bewusst nicht gesetzt: contactConsentAt, whatsappConsentAt (Einwilligungen holt die Praxis selbst ein).
    })),
  });

  // Protokoll ohne Namen: nur Anzahl und Teil der Datei.
  await auditFromSession(session, "patient.import", {
    entityType: "Patientenliste",
    summary: `${r.count} neu, ${zahlen.vorhanden} schon vorhanden, ${zahlen.fehler} fehlerhaft${teil && teile ? ` (Teil ${teil} von ${teile})` : ""}`,
  });

  return NextResponse.json({ gespeichert: r.count, ...zahlen, ergebnis, demo: practice.isDemo });
}
