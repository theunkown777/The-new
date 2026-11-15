import { prisma } from "@/lib/prisma";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { kostenuebersichtAntwort, pdfErlaubt, pdfFehler } from "@/lib/kostenuebersichtAntwort";

export const dynamic = "force-dynamic";

// Kostenübersicht als PDF aus dem Patientenportal: abgesichert über den Portal-Link, nur eigene, geteilte Vorschläge.
export async function GET(req: Request, props: { params: Promise<{ token: string; id: string }> }) {
  const params = await props.params;
  if (!(await pdfErlaubt(req))) return pdfFehler("Zu viele Anfragen. Bitte später erneut versuchen.", 429);
  const patient = await portalPatient(params.token);
  if (!patient) return pdfFehler("Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis.", 404);
  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, ...portalProposalWhere(patient.id) },
    select: { input: true, choices: true, patientChoices: true, patientResponse: true, practice: { select: { name: true, proposalPrices: true, stammdaten: true } } },
  });
  if (!proposal) return pdfFehler("Vorschlag nicht gefunden", 404);
  return kostenuebersichtAntwort(proposal);
}
