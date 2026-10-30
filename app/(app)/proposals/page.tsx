import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, formatEuro } from "@/lib/proposals";
import { PROPOSAL_STATUS_BADGE } from "@/lib/proposalLabels";

export default async function ProposalsPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  const proposals = await prisma.treatmentProposal.findMany({
    where: { practiceId },
    orderBy: { createdAt: "desc" },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  const decided = proposals.filter((p) => p.status === "ANGENOMMEN" || p.status === "ABGELEHNT");
  const accepted = proposals.filter((p) => p.status === "ANGENOMMEN");
  const acceptedDeltaCent = accepted.reduce((sum, p) => sum + (p.planTotalCent - p.baseTotalCent), 0);
  const rate = decided.length ? Math.round((accepted.length / decided.length) * 100) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Behandlungsvorschläge</h1>
        <Link href="/proposals/new" className="btn-primary">Neuer Vorschlag</Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Vorschläge</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{proposals.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Annahmequote</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{rate == null ? "–" : `${rate} %`}</p>
          <p className="text-xs text-slate-400">von {decided.length} entschiedenen</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Mehrumsatz angenommen</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{formatEuro(acceptedDeltaCent / 100)}</p>
          <p className="text-xs text-slate-400">ggü. reiner Kassenleistung</p>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="card text-sm text-slate-500">
          Noch keine Vorschläge.{" "}
          <Link href="/proposals/new" className="font-medium text-brand-600 hover:underline">
            Ersten Vorschlag erstellen
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {proposals.map((p) => (
            <Link
              key={p.id}
              href={`/proposals/${p.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {p.patient.firstName} {p.patient.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {p.createdAt.toLocaleDateString("de-DE")} · Plan {formatEuro(p.planTotalCent / 100)} · Eigenanteil{" "}
                  {formatEuro(p.eigenanteilCent / 100)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${PROPOSAL_STATUS_BADGE[p.status]}`}>
                {PROPOSAL_STATUS_LABELS[p.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
