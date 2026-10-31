import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageFromBirthDate } from "@/lib/proposals";

const PAGE_SIZE = 50;

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

export default async function PatientsPage({ searchParams }: { searchParams: { q?: string; page?: string; filter?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const filter: FilterKey = searchParams.filter && searchParams.filter in FILTERS ? (searchParams.filter as FilterKey) : "alle";
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Suche nach Vor- oder Nachname, auch "Nachname, Vorname" oder "Vorname Nachname".
  const words = q.replace(",", " ").split(/\s+/).filter(Boolean);
  const where: Prisma.PatientWhereInput = {
    practiceId,
    ...FILTERS[filter].where,
    AND: words.map((w) => ({
      OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }],
    })),
  };

  const [total, all, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.count({ where: { practiceId } }),
    prisma.patient.findMany({
      where,
      orderBy: q ? [{ lastName: "asc" }, { firstName: "asc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        proposals: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, patientResponse: true } },
        anamnesisForms: { where: { submittedAt: { not: null } }, take: 1, select: { id: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const v = { q, filter, page: 1, ...over };
    if (v.q) p.set("q", String(v.q));
    if (v.filter && v.filter !== "alle") p.set("filter", String(v.filter));
    if (Number(v.page) > 1) p.set("page", String(v.page));
    const s = p.toString();
    return `/patients${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          Patienten <span className="text-base font-normal text-slate-500">({all.toLocaleString("de-DE")})</span>
        </h1>
        <Link href="/patients/new" className="btn-primary">
          Neuer Patient
        </Link>
      </div>

      <form action="/patients" className="mb-3 flex gap-2" role="search">
        {filter !== "alle" && <input type="hidden" name="filter" value={filter} />}
        <input
          name="q"
          defaultValue={q}
          className="input max-w-md"
          placeholder="Name suchen, z. B. Weber oder Martina Weber"
          aria-label="Patienten suchen"
        />
        <button className="btn-secondary">Suchen</button>
      </form>

      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filter">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <Link
            key={k}
            href={href({ filter: k })}
            aria-current={k === filter ? "true" : undefined}
            className={`rounded-full border px-3 py-1 ${k === filter ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-600"}`}
          >
            {FILTERS[k].label}
          </Link>
        ))}
      </nav>

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
        <div className="card divide-y divide-slate-100 p-0" data-testid="patient-list">
          {patients.map((p) => {
            const age = ageFromBirthDate(p.birthDate);
            const last = p.proposals[0];
            return (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {p.lastName}, {p.firstName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {age != null ? `${age} Jahre` : "Alter unbekannt"}
                    {p.insuranceName ? ` · ${p.insuranceName}` : ""}
                    {p.insuranceType === "PKV" ? " (privat)" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {last?.patientResponse && (last.status === "ENTWURF" || last.status === "BESPROCHEN") && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Rückmeldung</span>
                  )}
                  {last && (last.status === "ENTWURF" || last.status === "BESPROCHEN") && !last.patientResponse && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Vorschlag offen</span>
                  )}
                  {last?.status === "ANGENOMMEN" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Vorschlag angenommen</span>}
                  {p.anamnesisForms.length > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">Anamnese</span>}
                </div>
              </Link>
            );
          })}
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
  );
}
