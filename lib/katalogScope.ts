import { prisma } from "@/lib/prisma";

// Mandantentrennung für Leistungskatalog und Sitzungstypen: Globale Einträge
// (practiceId = null) sind Vorgaben je Fach und nur lesbar. Was eine Praxis
// anlegt oder ändert, gehört ihr allein.

export async function praxisFach(practiceId: string): Promise<string> {
  const p = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } });
  return p?.specialty || "zahn";
}

/** Sichtbar: Vorgaben des eigenen Fachs und eigene Einträge. */
export async function sichtbarFuer(practiceId: string) {
  const fach = await praxisFach(practiceId);
  return { OR: [{ practiceId: null, fach }, { practiceId }] };
}

export const SCHREIBGESCHUETZT =
  "Vorgaben von Sorrida sind schreibgeschützt. Legen Sie eine eigene Position bzw. einen eigenen Sitzungstyp an.";
