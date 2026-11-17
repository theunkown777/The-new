import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecht } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { consumeAttempt } from "@/lib/rateLimit";
import type { Prisma } from "@prisma/client";
import { bestandAus, einordnen, importBlockSchema, serverPruefung, type ImportPatient } from "@/lib/patientenImport";
import { importSpeichern, mitImportSperre } from "@/lib/patientenImportSperre";

export const dynamic = "force-dynamic";

// Patientenliste einlesen: Der Browser liest die CSV-Datei und schickt geprüfte
// Zeilen in Blöcken. Diese Route ordnet jede Zeile ein (neu / schon vorhanden /
// fehlerhaft) und speichert nur neue – erst wenn `nurPruefen` aus ist.
// Die Datei selbst kommt hier nie an und wird nicht gespeichert. Vorhandene
// Patienten werden nie überschrieben. Einwilligungen (E-Mail, WhatsApp) werden
// nicht gesetzt. Nur die Praxisleitung; Protokoll ohne Namen.
// Obergrenzen: Gastzugang höchstens 200 Patienten je Demo-Praxis, sonst 50.000 neue je 24 Stunden (lib/patientenImport.ts).
// Zählen und Speichern laufen je Praxis nacheinander (lib/patientenImportSperre.ts).
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

  // Einordnen (neu / schon vorhanden) und, beim Speichern, Obergrenze prüfen und anlegen. Beim Speichern läuft das
  // Ganze unter der Import-Sperre der Praxis (lib/patientenImportSperre.ts): Gleichzeitige Blöcke lesen sonst
  // denselben alten Bestand, kommen so über die Obergrenze und legen dieselben Patienten doppelt an.
  type Lauf = { zeilen: Zeile[]; zahlen: { neu: number; vorhanden: number; fehler: number }; gespeichert: number; grenze: string | null };
  const lauf = async (db: Prisma.TransactionClient, speichern: boolean): Promise<Lauf> => {
    // Nur die Patienten der eigenen Praxis laden, die als Dublette in Frage kommen:
    // gleiches Geburtsdatum, kein Geburtsdatum oder gleiche Patientennummer.
    const tage = [...new Set(gueltig.map((p) => p.birthDate).filter((d): d is string => !!d))].map((d) => new Date(`${d}T00:00:00.000Z`));
    const ohneDatum = gueltig.some((p) => !p.birthDate);
    const nummern = [...new Set(gueltig.map((p) => p.patientNummer).filter((n): n is string => !!n))];
    const kandidaten = gueltig.length
      ? await db.patient.findMany({
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

    const zeilen = [...ergebnis];
    const neu: ImportPatient[] = [];
    einordnen(gueltig, bestandAus(kandidaten)).forEach((e, i) => {
      zeilen.push(e);
      if (e.status === "neu") neu.push(gueltig[i]);
    });
    zeilen.sort((a, b) => a.zeile - b.zeile);
    const zahlen = {
      neu: neu.length,
      vorhanden: zeilen.filter((e) => e.status === "vorhanden").length,
      fehler: zeilen.filter((e) => e.status === "fehler").length,
    };
    if (!speichern || neu.length === 0) return { zeilen, zahlen, gespeichert: 0, grenze: null };

    // Obergrenzen: Im Gastzugang ist jeder Besucher Praxisleitung; dort bleibt es bei einer kleinen Zahl.
    // Für jede Praxis gilt außerdem eine Grenze je 24 Stunden. Zählen und Anlegen in einem Schritt.
    const r = await importSpeichern(db, { practiceId, demo: practice.isDemo, neu, now: heute });
    return r.ok ? { zeilen, zahlen, gespeichert: r.gespeichert, grenze: null } : { zeilen, zahlen, gespeichert: 0, grenze: r.grund };
  };

  let l: Lauf;
  if (nurPruefen) l = await lauf(prisma, false);
  else {
    // P2028: Die Transaktion kam nicht rechtzeitig an die Reihe (zu viele gleichzeitige Blöcke). Das ist kein Fehler
    // des Servers, sondern „bitte noch einmal“. Alles andere bleibt ein Fehler.
    const mit = await mitImportSperre(practiceId, (tx) => lauf(tx, true)).catch((e: unknown) => {
      if ((e as { code?: unknown } | null)?.code === "P2028") return null;
      throw e;
    });
    if (!mit || mit.belegt) {
      return NextResponse.json({ error: "Gerade wird in Ihrer Praxis schon eine Liste gespeichert. Bitte gleich noch einmal versuchen.", code: "BELEGT", gespeichert: 0 }, { status: 409 });
    }
    l = mit.wert;
  }
  const { zeilen: liste, zahlen } = l;

  if (l.grenze) return NextResponse.json({ error: l.grenze, code: "GRENZE", gespeichert: 0, ...zahlen, ergebnis: liste, demo: practice.isDemo }, { status: 409 });
  if (nurPruefen || l.gespeichert === 0) {
    return NextResponse.json({ gespeichert: 0, ...zahlen, ergebnis: liste, demo: practice.isDemo });
  }

  // Protokoll ohne Namen: nur Anzahl und Teil der Datei.
  await auditFromSession(session, "patient.import", {
    entityType: "Patientenliste",
    summary: `${l.gespeichert} neu, ${zahlen.vorhanden} schon vorhanden, ${zahlen.fehler} fehlerhaft${teil && teile ? ` (Teil ${teil} von ${teile})` : ""}`,
  });

  return NextResponse.json({ gespeichert: l.gespeichert, ...zahlen, ergebnis: liste, demo: practice.isDemo });
}
