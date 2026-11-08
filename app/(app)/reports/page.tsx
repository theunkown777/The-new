import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/reportLabels";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  const q = searchParams.q?.trim();
  const status = searchParams.status;

  const reports = await prisma.report.findMany({
    where: {
      practiceId: session!.user.practiceId,
      ...(status === "ENTWURF" || status === "FINAL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { patient: { firstName: { contains: q } } },
              { patient: { lastName: { contains: q } } },
              { serviceTemplate: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { patient: true, serviceTemplate: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-slate-900">Berichte</h1>
        <Link href="/reports/new" className="btn-primary">Neuer Bericht</Link>
      </div>

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="q">Suche (Patient, Sitzungstyp)</label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            className="input"
            placeholder="z. B. Mustermann"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Alle</option>
            <option value="ENTWURF">Entwurf</option>
            <option value="FINAL">Final</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">Filtern</button>
        {(q || status) && (
          <Link href="/reports" className="text-sm text-slate-500 hover:underline">
            Zurücksetzen
          </Link>
        )}
      </form>

      {reports.length === 0 ? (
        <div className="card text-sm text-slate-500">
          {q || status ? (
            "Keine Berichte gefunden."
          ) : (
            <>
              Noch keine Berichte vorhanden.{" "}
              <Link href="/reports/new" className="font-medium text-brand-600 hover:underline">
                Ersten Bericht erstellen
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50 sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {r.patient.firstName} {r.patient.lastName} · {REPORT_TYPE_LABELS[r.type]}
                </p>
                <p className="text-sm text-slate-500">
                  {r.serviceTemplate?.name ? `${r.serviceTemplate.name} · ` : ""}
                  {r.createdAt.toLocaleDateString("de-DE")}
                </p>
              </div>
              <span
                className={
                  r.status === "FINAL"
                    ? "shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                    : "shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
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
