import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { importGrenze, type ImportPatient } from "@/lib/patientenImport";

// Patientenliste speichern, ein Block nach dem anderen je Praxis.
//
// Die Obergrenzen (Gastzugang: höchstens 200 Patienten je Demo-Praxis; jede Praxis: 50.000 neue je 24 Stunden)
// hängen am Bestand. Zählen und Speichern müssen deshalb in einem Schritt laufen: Sonst lesen gleichzeitige Blöcke
// denselben alten Bestand und speichern alle. Hier hält je Praxis immer nur eine Transaktion die Sperre
// (pg_try_advisory_xact_lock). Wer sie nicht bekommt, wartet kurz ohne offene Verbindung und versucht es erneut.

/** Name der Sperre: eine je Praxis. */
export const importSperre = (practiceId: string) => `patienten-import:${practiceId}`;

export type MitSperre<T> = { belegt: true } | { belegt: false; wert: T };

/**
 * Führt `arbeit` in einer Transaktion aus, in der diese Praxis die Import-Sperre hält.
 * Ist die Sperre nach allen Versuchen noch vergeben, kommt `belegt: true` zurück und nichts wurde getan.
 */
export async function mitImportSperre<T>(
  practiceId: string,
  arbeit: (tx: Prisma.TransactionClient) => Promise<T>,
  o: { versuche?: number; pauseMs?: number } = {},
): Promise<MitSperre<T>> {
  const versuche = o.versuche ?? 20, pauseMs = o.pauseMs ?? 150;
  for (let i = 0; i < versuche; i++) {
    const r = await prisma.$transaction(async (tx): Promise<MitSperre<T>> => {
      const zeilen = await tx.$queryRaw<{ frei: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${importSperre(practiceId)})) AS frei`;
      if (!zeilen[0]?.frei) return { belegt: true };
      return { belegt: false, wert: await arbeit(tx) };
    }, { maxWait: 10_000, timeout: 30_000 });
    if (!r.belegt) return r;
    if (i < versuche - 1) await new Promise((fertig) => setTimeout(fertig, pauseMs));
  }
  return { belegt: true };
}

export type SpeicherErgebnis = { ok: true; gespeichert: number } | { ok: false; grund: string };

/**
 * Bestand zählen, Obergrenze prüfen und die neuen Patienten anlegen. Nur innerhalb von mitImportSperre aufrufen:
 * Dann kann zwischen Zählen und Speichern kein anderer Block derselben Praxis dazwischenkommen.
 * Einwilligungen (contactConsentAt, whatsappConsentAt) werden bewusst nicht gesetzt.
 */
export async function importSpeichern(
  tx: Prisma.TransactionClient,
  a: { practiceId: string; demo: boolean; neu: ImportPatient[]; now?: Date },
): Promise<SpeicherErgebnis> {
  const now = a.now ?? new Date();
  const [bestand, heute] = await Promise.all([
    a.demo ? tx.patient.count({ where: { practiceId: a.practiceId } }) : 0,
    tx.patient.count({ where: { practiceId: a.practiceId, createdAt: { gte: new Date(now.getTime() - 24 * 3600e3) } } }),
  ]);
  const grund = importGrenze({ demo: a.demo, bestand, heute, neu: a.neu.length });
  if (grund) return { ok: false, grund };
  const r = await tx.patient.createMany({
    data: a.neu.map((p) => ({
      practiceId: a.practiceId,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00.000Z`) : null,
      geschlecht: p.geschlecht,
      insuranceType: p.insuranceType,
      insuranceName: p.insuranceName,
      phone: p.phone,
      email: p.email,
      patientNummer: p.patientNummer,
    })),
  });
  return { ok: true, gespeichert: r.count };
}
