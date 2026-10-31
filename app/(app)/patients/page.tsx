import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, ageFromBirthDate } from "@/lib/proposals";
import { loadAnamnesis } from "@/lib/anamnesisView";

const PAGE_SIZE = 50;
const DAY = 24 * 60 * 60 * 1000;

const FILTERS = {
  alle: { label: "Alle", where: {} },
  offen: { label: "Offener Vorschlag", where: { proposals: { some: { status: { in: ["ENTWURF", "BESPROCHEN"] } } } } },
  rueckmeldung: {
    label: "Rückmeldung",
    where: { proposals: { some: { patientResponse: { not: null }, status: { in: ["ENTWURF", "BESPROCHEN"] } } } },
  },
  anamnese: { label: "Mit Anamnese", where: { anamnesisForms: { some: { submittedAt: { not: null } } } } },
  privat: { label: "Privat versichert", where: { insuranceType: "PKV" } },
} satisfies Record<string, { label: string; where: Prisma.PatientWhereInput }>;
type FilterKey = keyof typeof FILTERS;

type Row = {
  createdAt: Date;
  proposals: { id: string; status: string; patientResponse: string | null; shareTokenHash: string | null; patientViewedAt: Date | null; updatedAt: Date }[];
  anamnesisForms: { submittedAt: Date | null }[];
};

/** Status-Pille wie im Praxisportal: das Wichtigste zuerst. */
function status(p: Row, now: number): { label: string; cls: string } {
  const last = p.proposals[0];
  const open = last && (last.status === "ENTWURF" || last.status === "BESPROCHEN");
  if (open && last.patientResponse) return { label: "Rückmeldung", cls: "bg-emerald-100 text-emerald-800" };
  if (open && last.shareTokenHash && !last.patientViewedAt) return { label: "Link ungeöffnet", cls: "bg-orange-100 text-orange-800" };
  if (open) return { label: "Vorschlag offen", cls: "bg-amber-100 text-amber-800" };
  const ana = p.anamnesisForms[0]?.submittedAt;
  if (ana && now - ana.getTime() < 30 * DAY) return { label: "Anamnese neu", cls: "bg-sky-100 text-sky-800" };
  if (now - p.createdAt.getTime() < 30 * DAY) return { label: "Neuer Patient", cls: "bg-brand-100 text-brand-800" };
  if (last?.status === "ANGENOMMEN") return { label: "Angenommen", cls: "bg-slate-100 text-slate-700" };
  if (last?.status === "ABGELEHNT") return { label: "Abgelehnt", cls: "bg-slate-100 text-slate-500" };
  return { label: "Ohne Vorgang", cls: "bg-slate-50 text-slate-400" };
}

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–");
const fmtStamp = (d: Date) => `${fmtDate(d)} ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

export default async function PatientsPage({ searchParams }: { searchParams: { q?: string; page?: string; filter?: string; sel?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const filter: FilterKey = searchParams.filter && searchParams.filter in FILTERS ? (searchParams.filter as FilterKey) : "alle";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const now = Date.now();

  // Suche nach Vor- oder Nachname, auch "Nachname, Vorname" oder "Vorname Nachname".
  const words = q.replace(",", " ").split(/\s+/).filter(Boolean);
  const where: Prisma.PatientWhereInput = {
    practiceId,
    ...FILTERS[filter].where,
    AND: words.map((w) => ({
      OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }],
    })),
  };

  const [total, all, patients, selected] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.count({ where: { practiceId } }),
    prisma.patient.findMany({
      where,
      orderBy: q ? [{ lastName: "asc" }, { firstName: "asc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        proposals: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, patientResponse: true, shareTokenHash: true, patientViewedAt: true, updatedAt: true },
        },
        anamnesisForms: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1, select: { submittedAt: true } },
      },
    }),
    searchParams.sel
      ? prisma.patient.findFirst({
          where: { id: searchParams.sel, practiceId },
          include: {
            proposals: {
              orderBy: { createdAt: "desc" },
              take: 3,
              select: { id: true, status: true, patientResponse: true, shareTokenHash: true, patientViewedAt: true, updatedAt: true, createdAt: true, eigenanteilCent: true },
            },
            anamnesisForms: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1, select: { submittedAt: true } },
          },
        })
      : null,
  ]);
  const anamnesis = selected ? await loadAnamnesis(practiceId, selected.id) : null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const v = { q, filter, page, sel: searchParams.sel, ...over };
    if (v.q) p.set("q", String(v.q));
    if (v.filter && v.filter !== "alle") p.set("filter", String(v.filter));
    if (Number(v.page) > 1) p.set("page", String(v.page));
    if (v.sel) p.set("sel", String(v.sel));
    const s = p.toString();
    return `/patients${s ? `?${s}` : ""}`;
  };
  const lastChange = (p: Row) =>
    new Date(Math.max(p.createdAt.getTime(), p.proposals[0]?.updatedAt.getTime() ?? 0, p.anamnesisForms[0]?.submittedAt?.getTime() ?? 0));

  return (
    <div className={`grid gap-6 ${selected ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            Patienten <span className="text-base font-normal text-slate-500">({all.toLocaleString("de-DE")})</span>
          </h1>
          <Link href="/patients/new" className="btn-primary">
            Neuer Patient
          </Link>
        </div>

        {/* Werkzeugleiste: Filter und Suche */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          <nav className="flex flex-wrap gap-1.5 text-sm" aria-label="Filter">
            {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
              <Link
                key={k}
                href={href({ filter: k, page: 1, sel: undefined })}
                aria-current={k === filter ? "true" : undefined}
                className={`rounded-full px-3 py-1 ${k === filter ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"}`}
              >
                {FILTERS[k].label}
              </Link>
            ))}
          </nav>
          <form action="/patients" className="ml-auto flex min-w-[16rem] flex-1 gap-2 sm:flex-none" role="search">
            {filter !== "alle" && <input type="hidden" name="filter" value={filter} />}
            <input name="q" defaultValue={q} className="input py-1.5" placeholder="Suche nach Name" aria-label="Patienten suchen" />
            <button className="btn-secondary py-1.5">Suchen</button>
          </form>
        </div>

        {patients.length === 0 ? (
          <div className="card text-sm text-slate-500">
            {all === 0 ? (
              <>
                Noch keine Patienten angelegt.{" "}
                <Link href="/patients/new" className="font-medium text-brand-600 hover:underline">
                  Ersten Patienten anlegen
                </Link>
              </>
            ) : (
              "Keine Patienten gefunden."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm" data-testid="patient-list">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Letzte Änderung</th>
                  <th className="hidden px-3 py-3 font-semibold sm:table-cell">Geburtsdatum</th>
                  <th className="hidden px-3 py-3 font-semibold lg:table-cell">Kasse</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const st = status(p, now);
                  const isSel = selected?.id === p.id;
                  const rowHref = href({ sel: p.id });
                  return (
                    <tr key={p.id} className={`border-b border-slate-50 last:border-0 ${isSel ? "bg-brand-50" : "hover:bg-[#F5F2EE]"}`}>
                      <td className="px-5 py-2.5">
                        <Link href={rowHref} className="font-medium text-slate-900 hover:text-brand-700" scroll={false}>
                          {p.lastName}, {p.firstName}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2.5 tabular-nums text-slate-500 md:table-cell">{fmtStamp(lastChange(p))}</td>
                      <td className="hidden px-3 py-2.5 tabular-nums text-slate-600 sm:table-cell">{fmtDate(p.birthDate)}</td>
                      <td className="hidden px-3 py-2.5 text-slate-600 lg:table-cell">
                        {p.insuranceName ?? "–"}
                        {p.insuranceType === "PKV" && <span className="ml-1 text-xs text-slate-400">privat</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        <Link href={rowHref} scroll={false} className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Seiten">
            <span className="text-slate-500">
              {total.toLocaleString("de-DE")} Treffer · Seite {page} von {pages}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link href={href({ page: page - 1 })} className="btn-secondary">
                  ← Zurück
                </Link>
              )}
              {page < pages && (
                <Link href={href({ page: page + 1 })} className="btn-secondary">
                  Weiter →
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>

      {/* Detailbereich rechts */}
      {selected && (
        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6" data-testid="patient-detail">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {selected.lastName}, {selected.firstName}
              </h2>
              <p className="text-xs text-slate-500">Patient seit {fmtDate(selected.createdAt)}</p>
            </div>
            <Link href={href({ sel: undefined })} scroll={false} className="text-slate-400 hover:text-slate-700" aria-label="Detailansicht schließen">
              ✕
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-medium">
            <Link href={`/abschluss/new?patientId=${selected.id}`} className="rounded-xl bg-brand-600 px-2 py-3 text-white hover:bg-brand-700">
              Behandlung abschließen
            </Link>
            <Link href={`/proposals/new?patientId=${selected.id}`} className="rounded-xl bg-brand-50 px-2 py-3 text-brand-800 hover:bg-brand-100">
              Neuer Vorschlag
            </Link>
            <Link href={`/patients/${selected.id}#anamnese`} className="rounded-xl bg-brand-50 px-2 py-3 text-brand-800 hover:bg-brand-100">
              Anamnese senden
            </Link>
            <Link
              href={selected.proposals[0] ? `/proposals/${selected.proposals[0].id}` : `/patients/${selected.id}`}
              className="rounded-xl bg-brand-50 px-2 py-3 text-brand-800 hover:bg-brand-100"
            >
              {selected.proposals[0] ? "Patienten-Link" : "Akte öffnen"}
            </Link>
          </div>

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Persönliche Daten</h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Geburtsdatum</dt>
              <dd className="tabular-nums text-slate-800">
                {fmtDate(selected.birthDate)}
                {selected.birthDate && ` (${ageFromBirthDate(selected.birthDate)})`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Kasse</dt>
              <dd className="text-right text-slate-800">{selected.insuranceName ?? "–"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Versicherung</dt>
              <dd className="text-slate-800">{selected.insuranceType === "PKV" ? "privat" : selected.insuranceType === "GKV" ? "gesetzlich" : "–"}</dd>
            </div>
          </dl>

          {anamnesis?.submittedAt && (
            <>
              <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Anamnese</h3>
              <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${anamnesis.flags.some((f) => f.level === "warn") ? "bg-red-50 text-red-900" : "bg-slate-50 text-slate-700"}`}>
                {anamnesis.flags.length ? anamnesis.flags.map((f) => f.text).join(" · ") : "keine Auffälligkeiten angegeben"}
              </p>
            </>
          )}

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vorschläge</h3>
          {selected.proposals.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Noch keine.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {selected.proposals.map((pr) => (
                <li key={pr.id}>
                  <Link href={`/proposals/${pr.id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1 hover:bg-[#F5F2EE]">
                    <span className="text-slate-700">
                      {fmtDate(pr.createdAt)} · {PROPOSAL_STATUS_LABELS[pr.status]}
                      {pr.patientResponse && " · Rückmeldung"}
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-slate-500">{(pr.eigenanteilCent / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href={`/patients/${selected.id}`} className="btn-secondary mt-5 flex w-full items-center justify-between gap-2">
            Akte öffnen <span aria-hidden="true">→</span>
          </Link>
        </aside>
      )}
    </div>
  );
}
