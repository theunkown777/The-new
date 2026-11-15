import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { kostenuebersichtAntwort, pdfErlaubt, pdfFehler } from "@/lib/kostenuebersichtAntwort";

export const dynamic = "force-dynamic";

// Kostenübersicht als PDF über den Patienten-Link (öffentlich, ohne Login). Geprüft wird wie auf der Seite /p/<token>:
// nur der Hauptlink des Patienten, nicht abgelaufen. Lese-Links für Vertrauenspersonen (/a/<token>) bekommen kein PDF.
export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  if (!(await pdfErlaubt(req))) return pdfFehler("Zu viele Anfragen. Bitte später erneut versuchen.", 429);
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(params.token)) return pdfFehler("Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis.", 404);
  const proposal = await prisma.treatmentProposal.findUnique({
    where: { shareTokenHash: hashToken(params.token) },
    select: { shareExpiresAt: true, input: true, choices: true, patientChoices: true, patientResponse: true, practice: { select: { name: true, proposalPrices: true, stammdaten: true } } },
  });
  if (!proposal || !proposal.shareExpiresAt || proposal.shareExpiresAt < new Date()) return pdfFehler("Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis.", 404);
  return kostenuebersichtAntwort(proposal);
}
