import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { praxisManager } from "@/lib/praxisManager";
import { loadRecallDue } from "@/lib/recallLoad";
import { canSeeAnalytics } from "@/lib/permissions";
import { PraxisManager } from "@/components/PraxisManager";
import { loadTermineHeute } from "@/lib/termineLoad";
import { loadBillingCheck } from "@/lib/billingCheckLoad";

export const dynamic = "force-dynamic";
export const metadata = { title: "Praxismanager" };

export default async function PraxisManagerPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const now = new Date();
  const seit = new Date(now.getTime() - 400 * 864e5);
  const [invoices, reports, proposals, anamnesis, recall, analyse, termine, pruefung] = await Promise.all([
    prisma.invoice.findMany({
      where: { practiceId, OR: [{ status: { in: ["OFFEN", "GEMELDET"] } }, { paidAt: { gte: seit } }] },
      select: { id: true, status: true, dueDate: true, amountCent: true, paidAt: true, reminderLevel: true, remindedAt: true },
    }),
    prisma.report.findMany({ where: { practiceId, status: "ENTWURF" }, select: { id: true, status: true, createdAt: true } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, createdAt: { gte: seit } },
      select: { id: true, status: true, createdAt: true, patientViewedAt: true, eigenanteilCent: true },
    }),
    prisma.anamnesisForm.findMany({ where: { patient: { practiceId }, submittedAt: null }, select: { createdAt: true, submittedAt: true, expiresAt: true } }),
    loadRecallDue(practiceId, now),
    canSeeAnalytics(session!.user.id),
    loadTermineHeute(practiceId, now),
    loadBillingCheck(practiceId, now),
  ]);
  const antworten = praxisManager({
    now,
    invoices,
    reports,
    proposals,
    anamnesis,
    recallDue: recall.due.length,
    recallNeverReminded: recall.due.filter((d) => !d.p.recallSentAt).length,
    termine,
    pruefung: {
      hinweise: pruefung.length,
      ohneRechnungCent: pruefung.reduce((a, b) => a + (b.betragCent ?? 0), 0),
      ohneDoku: pruefung.filter((b) => b.art === "ohne_doku").length,
    },
  }).filter((a) => analyse || a.thema !== "umsatz");

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="praxismanager">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Praxismanager</h1>
        <p className="mt-1 text-sm text-slate-600">
          Antworten auf die täglichen Fragen, direkt aus Ihren Daten in Sorrida. Der Praxismanager rechnet nach festen Regeln, nutzt keine KI und
          führt nichts selbst aus: Jeder Vorschlag führt auf die Seite, auf der Sie prüfen und entscheiden.
        </p>
      </div>
      <PraxisManager antworten={antworten} />
    </div>
  );
}
