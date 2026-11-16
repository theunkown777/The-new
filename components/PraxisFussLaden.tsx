import { prisma } from "@/lib/prisma";
import { PraxisFuss } from "@/components/PraxisFuss";

/**
 * PraxisFuss für Seiten, die die Angaben der Praxis nicht selbst laden: holt Name und Stammdaten über die Praxis
 * oder über den Patienten. Findet sich nichts, bleibt der Fuß weg, statt die Seite zu stören.
 */
export async function PraxisFussLaden({ practiceId, patientId, className, ohneLinks }: { practiceId?: string; patientId?: string; className?: string; ohneLinks?: boolean }) {
  const praxis = practiceId
    ? await prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, stammdaten: true } }).catch(() => null)
    : patientId
      ? (await prisma.patient.findUnique({ where: { id: patientId }, select: { practice: { select: { name: true, stammdaten: true } } } }).catch(() => null))?.practice ?? null
      : null;
  if (!praxis) return null;
  return <PraxisFuss name={praxis.name} stammdaten={praxis.stammdaten} className={className} ohneLinks={ohneLinks} />;
}
