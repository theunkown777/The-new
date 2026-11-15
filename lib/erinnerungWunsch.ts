import { prisma } from "@/lib/prisma";
import { berlinTag } from "@/lib/proposals";
import { eingangMelden } from "@/lib/eingang";

// „Erinnern Sie mich“: Die Patientin oder der Patient wählt in der eigenen Ansicht, wann sie bzw. er an den offenen
// Vorschlag erinnert werden möchte. Gespeichert wird nur der Tag am Vorschlag. An dem Tag legt der tägliche Lauf
// einen Eintrag im Eingang der Praxis an; die Praxis erinnert dann selbst mit ihrem vorhandenen Knopf oder ruft an.
// Sorrida verschickt hier NIE von selbst eine Nachricht an Patienten.

export const ERINNERN_TAGE = [3, 7, 14] as const;
export type ErinnernTage = (typeof ERINNERN_TAGE)[number];
export const istErinnernTage = (x: unknown): x is ErinnernTage => typeof x === "number" && (ERINNERN_TAGE as readonly number[]).includes(x);

/** Offen ist ein Vorschlag, über den noch nicht entschieden wurde; nur dann gibt es die Erinnerung. */
export const erinnernMoeglich = (status: string) => status === "ENTWURF" || status === "BESPROCHEN";

/** Der gewählte Tag als Kalendertag (Mitternacht UTC), gezählt ab dem heutigen Tag in Deutschland. */
export function erinnernAm(tage: ErinnernTage, now = new Date()): Date {
  const [j, m, t] = berlinTag(now).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + tage));
}

/** Ob der gewählte Tag erreicht ist (Vergleich nach Kalendertag in Deutschland). */
export const erinnerungFaellig = (am: Date, now = new Date()) => am.toISOString().slice(0, 10) <= berlinTag(now);

/**
 * Täglicher Lauf: für jeden offenen Vorschlag, dessen gewählter Tag erreicht ist, einen Eintrag im Eingang anlegen
 * („Erinnerung vom Patienten gewünscht“). Jeder Wunsch wird genau einmal gemeldet. Es geht keine Nachricht raus.
 */
export async function erinnerungenMelden(now = new Date()): Promise<number> {
  const grenze = new Date(`${berlinTag(now)}T23:59:59.999Z`);
  const faellig = await prisma.treatmentProposal.findMany({
    where: { erinnernAm: { lte: grenze }, erinnernGemeldetAt: null, status: { in: ["ENTWURF", "BESPROCHEN"] } },
    select: { id: true, practiceId: true, patientId: true, erinnernAm: true },
    take: 500,
  });
  let n = 0;
  for (const p of faellig) {
    if (!p.erinnernAm || !erinnerungFaellig(p.erinnernAm, now)) continue;
    await eingangMelden({ practiceId: p.practiceId, patientId: p.patientId, art: "ERINNERUNG_GEWUENSCHT", entityId: p.id, hinweis: null });
    await prisma.treatmentProposal.update({ where: { id: p.id }, data: { erinnernGemeldetAt: now } });
    n++;
  }
  return n;
}
