import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/reportLabels";
import { formatEuro } from "@/lib/proposals";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  const [patientCount, draftCount, recentReports, openProposals, accepted] = await Promise.all([
    prisma.patient.count({ where: { practiceId } }),
    prisma.report.count({ where: { practiceId, status: "ENTWURF" } }),
    prisma.report.findMany({
      where: { practiceId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { patient: true },
    }),
    prisma.treatmentProposal.count({ where: { practiceId, status: { in: ["ENTWURF", "BESPROCHEN"] } } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, status: "ANGENOMMEN" },
      select: { baseTotalCent: true, planTotalCent: true },
    }),
  ]);
  const acceptedDeltaCent = accepted.reduce((sum, p) => sum + p.planTotalCent - p.baseTotalCent, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Übersicht</h1>
        <Link href="/abschluss/new" className="btn-primary">Behandlung abschließen</Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Patienten</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{patientCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Offene Entwürfe</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{draftCount}</p>
        </div>
        <Link href="/proposals" className="card hover:bg-slate-50">
          <p className="text-sm text-slate-500">Offene Vorschläge</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{openProposals}</p>
        </Link>
        <Link href="/proposals" className="card hover:bg-slate-50">
          <p className="text-sm text-slate-500">Mehrumsatz angenommen</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{formatEuro(acceptedDeltaCent / 100)}</p>
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Zuletzt erstellte Berichte
      </h2>
      {recentReports.length === 0 ? (
        <div className="card text-sm text-slate-500">
          Noch keine Berichte vorhanden.{" "}
          <Link href="/reports/new" className="font-medium text-brand-600 hover:underline">
            Ersten Bericht erstellen
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {recentReports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {r.patient.firstName} {r.patient.lastName} · {REPORT_TYPE_LABELS[r.type]}
                </p>
                <p className="text-sm text-slate-500">{r.createdAt.toLocaleDateString("de-DE")}</p>
              </div>
              <span
                className={
                  r.status === "FINAL"
                    ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                    : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
                }
              >
                {REPORT_STATUS_LABELS[r.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
