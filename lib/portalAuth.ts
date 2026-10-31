import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

// Patientenzugang: Der Portal-Link ist der einzige Schlüssel des Patienten.
// Alles im Portal (Rechnungen, Vorschläge, Anamnese) wird über diesen Link
// und die Patienten-ID des Links eingegrenzt; interne Praxisdaten wie
// Notizen, Analyse oder andere Patienten sind darüber nie erreichbar.
export async function portalPatient(token: string) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  const patient = await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(token) },
    select: { id: true, practiceId: true, firstName: true, lastName: true, portalExpiresAt: true },
  });
  if (!patient || !patient.portalExpiresAt || patient.portalExpiresAt < new Date()) return null;
  return patient;
}

/** Welche Vorschläge der Patient im Portal sieht: nur geteilte oder besprochene, nie interne Entwürfe. */
export const portalProposalWhere = (patientId: string) => ({
  patientId,
  OR: [{ shareCreatedAt: { not: null } }, { status: { in: ["BESPROCHEN", "ANGENOMMEN"] } }],
});
