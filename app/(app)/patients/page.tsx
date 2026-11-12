import { fachprofil } from "@/lib/fachprofile";
import { praxisFach } from "@/lib/katalogScope";
import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, ageFromBirthDate } from "@/lib/proposals";
import { loadAnamnesis } from "@/lib/anamnesisView";
import { TONE_CLASSES, formatCent, invoiceView } from "@/lib/invoices";
import { PortalLinkButton } from "@/components/PortalLinkButton";
import { WhatsappSenden } from "@/components/WhatsappSenden";
import { whatsappApiAktiv } from "@/lib/whatsapp";
import { CreateInvoiceButton } from "@/components/CreateInvoiceButton";
import { Behandlungsweg, Laechelbogen } from "@/components/Behandlungsweg";
import { journey, TONE_STYLE } from "@/lib/journey";
import { meinePatientenWhere } from "@/lib/meinBereich";

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
  // Platzhalter; die Bedingung hängt am angemeldeten Konto (siehe unten).
  meine: { label: "Nur meine", where: {} },
} satisfies Record<string, { label: string; where: Prisma.PatientWhereInput }>;
type FilterKey = keyof typeof FILTERS;

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }) : "–");
const fmtStamp = (d: Date) => `${fmtDate(d)} ${d.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}`;

export default async function PatientsPage({ searchParams }: { searchParams: { q?: string; page?: string; filter?: string; sel?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const P = fachprofil(await praxisFach(practiceId)).person;
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const filter: FilterKey = searchParams.filter && searchParams.filter in FILTERS ? (searchParams.filter as FilterKey) : "alle";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const now = Date.now();

  // Suche nach Vor- oder Nachname, auch "Nachname, Vorname" oder "Vorname Nachname".
  const words = q.replace(",", " ").split(/\s+/).filter(Boolean);
  const where: Prisma.PatientWhereInput = {
    practiceId,
    ...FILTERS[filter].where,
    ...(filter === "meine" ? { OR: meinePatientenWhere(practiceId, session!.user.id).OR } : {}),
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
          select: { id: true, status: true, patientResponse: true, patientRespondedAt: true, shareCreatedAt: true, patientViewedAt: true, agreedAt: true, eigenanteilCent: true, updatedAt: true },
        },
        anamnesisForms: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1, select: { submittedAt: true } },
        invoices: { where: { status: { not: "STORNIERT" } }, orderBy: { dueDate: "desc" }, take: 3, select: { status: true, dueDate: true } },
      },
    }),
    searchParams.sel
      ? prisma.patient.findFirst({
          where: { id: searchParams.sel, practiceId },
          include: {
            proposals: {
              orderBy: { createdAt: "desc" },
              take: 3,
              select: { id: true, status: true, patientResponse: true, patientRespondedAt: true, shareCreatedAt: true, patientViewedAt: true, agreedAt: true, agreedName: true, updatedAt: true, createdAt: true, eigenanteilCent: true },
            },
            anamnesisForms: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1, select: { submittedAt: true } },
            invoices: { where: { status: { not: "STORNIERT" } }, orderBy: { dueDate: "desc" }, take: 4, select: { id: true, title: true, number: true, amountCent: true, status: true, dueDate: true } },
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
  const nowDate = new Date(now);
  const weg = (p: { proposals: Parameters<typeof journey>[0]["proposal"][]; invoices: { status: string; dueDate: Date }[]; anamnesisForms: { submittedAt: Date | null }[] }) =>
    journey({ proposal: p.proposals[0] ?? null, invoices: p.invoices, anamnesisSubmitted: !!p.anamnesisForms[0]?.submittedAt }, nowDate);
  const selWeg = selected ? weg(selected) : null;
  const age = (b: Date | null) => (b ? ageFromBirthDate(b) : null);

  // Verlauf des ausgewählten Patienten: Vorschläge, Anamnese, Rechnungen nach Datum.
  const verlauf = selected
    ? [
        { at: selected.createdAt, text: "In Sorrida angelegt" },
        ...selected.anamnesisForms.filter((a) => a.submittedAt).map((a) => ({ at: a.submittedAt!, text: "Anamnese ausgefüllt" })),
        ...selected.proposals.flatMap((pr) => [
          { at: pr.createdAt, text: `Vorschlag erstellt · Eigenanteil ${formatCent(pr.eigenanteilCent)}`, href: `/proposals/${pr.id}` },
          ...(pr.shareCreatedAt ? [{ at: pr.shareCreatedAt, text: "Patienten-Link gesendet" }] : []),
          ...(pr.patientViewedAt ? [{ at: pr.patientViewedAt, text: "Vom Patienten geöffnet" }] : []),
          ...(pr.patientRespondedAt ? [{ at: pr.patientRespondedAt, text: pr.patientResponse === "RUECKRUF" ? "Rückruf gewünscht" : "Möchte besprechen" }] : []),
          ...(pr.agreedAt ? [{ at: pr.agreedAt, text: `Einverständnis digital unterschrieben (${pr.agreedName})`, href: `/proposals/${pr.id}` }] : []),
          ...(pr.status === "ANGENOMMEN" || pr.status === "ABGELEHNT" ? [{ at: pr.updatedAt, text: PROPOSAL_STATUS_LABELS[pr.status] }] : []),
        ]),
        ...selected.invoices.map((i) => ({ at: i.dueDate, text: `Rechnung ${i.number} · ${formatCent(i.amountCent)} · ${invoiceView(i, nowDate).label}` })),
      ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8)
    : [];

  return (
    <div className={`grid gap-6 ${selected ? "xl:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-slate-900">
              {P.pl} <span className="font-sans text-base font-normal text-slate-500">({all.toLocaleString("de-DE")})</span>
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500"><Laechelbogen className="h-2 w-8 text-brand-600" />Jeder auf seinem Behandlungsweg, mit dem nächsten Schritt</p>
          </div>
          <Link href="/patients/new" className="btn-primary">
            Neu anlegen
          </Link>
        </div>

        {/* Werkzeugleiste: Filter und Suche */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-1.5 text-sm" aria-label="Filter">
            {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
              <Link
                key={k}
                href={href({ filter: k, page: 1, sel: undefined })}
                aria-current={k === filter ? "true" : undefined}
                className={`rounded-full border px-3 py-1 ${k === filter ? "border-brand-600 bg-white font-medium text-brand-700 shadow-[inset_0_-2px_0_#6b2a24]" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"}`}
              >
                {FILTERS[k].label}
              </Link>
            ))}
          </nav>
          <form action="/patients" className="ml-auto flex min-w-[16rem] flex-1 gap-2 sm:flex-none" role="search">
            {filter !== "alle" && <input type="hidden" name="filter" value={filter} />}
            <input name="q" defaultValue={q} className="input py-1.5" placeholder="Name eingeben" aria-label={`${P.pl} suchen`} />
            <button className="btn-secondary py-1.5">Suchen</button>
          </form>
        </div>

        {patients.length === 0 ? (
          <div className="card text-sm text-slate-500">
            {all === 0 ? (
              <>
                Noch keine {P.pl} angelegt.{" "}
                <Link href="/patients/new" className="font-medium text-brand-600 hover:underline">
                  Jetzt anlegen
                </Link>
              </>
            ) : (
              `Keine ${P.pl} gefunden.`
            )}
          </div>
        ) : (
          <ul className="space-y-2" data-testid="patient-list">
            {patients.map((p) => {
              const w = weg(p);
              const isSel = selected?.id === p.id;
              return (
                <li key={p.id}>
                  <Link
                    href={href({ sel: p.id })}
                    scroll={false}
                    className={`grid items-center gap-x-4 gap-y-1 rounded-2xl border bg-white px-4 py-3 sm:grid-cols-[minmax(0,14rem)_7.5rem_minmax(0,1fr)] ${isSel ? "border-brand-600 ring-1 ring-brand-600" : "border-transparent hover:border-slate-200"}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F5F2EE] text-lg text-brand-700">{p.lastName.charAt(0)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{p.lastName}, {p.firstName}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {age(p.birthDate) != null ? `${age(p.birthDate)} J.` : "–"} · {p.insuranceType === "PKV" ? "privat" : p.insuranceName ?? "–"}
                        </span>
                      </span>
                    </span>
                    <Behandlungsweg erreicht={w.erreicht} aktuell={w.aktuell} abgelehnt={w.abgelehnt} className="hidden sm:block" />
                    <span className={`text-sm ${TONE_STYLE[w.praxis.tone]}`}>
                      {w.praxis.tone === "achtung" && <span aria-hidden="true">● </span>}
                      {w.praxis.text}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
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

      {/* Rechts: Weg des ausgewählten Patienten mit nächstem Schritt und Verlauf */}
      {selected && selWeg && (
        <aside className="self-start rounded-3xl bg-white p-5 xl:sticky xl:top-6" data-testid="patient-detail">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl leading-tight text-slate-900">
                {selected.firstName} {selected.lastName}
              </h2>
              <p className="text-xs text-slate-500">
                {fmtDate(selected.birthDate)}
                {selected.birthDate && ` · ${ageFromBirthDate(selected.birthDate)} Jahre`} · {selected.insuranceName ?? "–"} ({selected.insuranceType === "PKV" ? "privat" : "gesetzlich"})
              </p>
            </div>
            <Link href={href({ sel: undefined })} scroll={false} className="text-slate-400 hover:text-slate-700" aria-label="Detailansicht schließen">
              ✕
            </Link>
          </div>

          <div className="mt-5">
            <Behandlungsweg erreicht={selWeg.erreicht} aktuell={selWeg.aktuell} abgelehnt={selWeg.abgelehnt} size="gross" animate />
          </div>

          <div className={`mt-2 rounded-2xl p-4 ${selWeg.praxis.tone === "achtung" ? "bg-red-50" : selWeg.praxis.tone === "erledigt" ? "bg-salbei-50" : "bg-brand-50"}`} data-testid="naechster-schritt">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nächster Schritt</p>
            <p className={`mt-1 font-medium ${TONE_STYLE[selWeg.praxis.tone]}`}>{selWeg.praxis.text}</p>
          </div>

          {anamnesis?.submittedAt && anamnesis.flags.length > 0 && (
            <p className={`mt-3 rounded-xl px-3 py-2 text-xs ${anamnesis.flags.some((f) => f.level === "warn") ? "bg-red-50 text-red-900" : "bg-slate-50 text-slate-700"}`}>
              <b>Anamnese:</b> {anamnesis.flags.map((f) => f.text).join(" · ")}
            </p>
          )}

          <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Laechelbogen className="h-2 w-6 text-brand-600" />Was Sie tun können</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            <li><Link href={`/abschluss/new?patientId=${selected.id}`} className="flex justify-between py-2 font-medium text-brand-700 hover:text-brand-800">Behandlung abschließen <span aria-hidden="true">→</span></Link></li>
            <li><Link href={`/proposals/new?patientId=${selected.id}`} className="flex justify-between py-2 text-slate-700 hover:text-brand-700">Neuer Vorschlag <span aria-hidden="true">→</span></Link></li>
            {selected.proposals[0] && (
              <li><Link href={`/proposals/${selected.proposals[0].id}`} className="flex justify-between py-2 text-slate-700 hover:text-brand-700">Letzten Vorschlag öffnen, Link senden <span aria-hidden="true">→</span></Link></li>
            )}
            <li><Link href={`/patients/${selected.id}#anamnese`} className="flex justify-between py-2 text-slate-700 hover:text-brand-700">Anamnese senden <span aria-hidden="true">→</span></Link></li>
            <li><Link href={`/patients/${selected.id}`} className="flex justify-between py-2 text-slate-700 hover:text-brand-700">Akte öffnen <span aria-hidden="true">→</span></Link></li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <PortalLinkButton patientId={selected.id} firstName={selected.firstName} practiceName={session!.user.practiceName ?? ""} label="Behandlungsweg senden" />
            {selected.phone && selected.whatsappConsentAt && <WhatsappSenden art="portal-link" id={selected.id} label="Link per WhatsApp" className="btn-secondary" direkt={whatsappApiAktiv()} />}
            <CreateInvoiceButton patientId={selected.id} title="Selbstzahlerleistung" label="Rechnung" free />
          </div>

          <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Laechelbogen className="h-2 w-6 text-brand-600" />Verlauf</h3>
          <ol className="mt-2 space-y-2 border-l-2 border-[#F5F2EE] pl-4 text-sm" data-testid="detail-verlauf">
            {verlauf.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
                <span className="block text-xs text-slate-500">{fmtStamp(e.at)}</span>
                {"href" in e && e.href ? (
                  <Link href={e.href} className="text-slate-800 hover:text-brand-700">{e.text}</Link>
                ) : (
                  <span className="text-slate-800">{e.text}</span>
                )}
              </li>
            ))}
          </ol>
          {selected.invoices.length > 0 && (
            <ul className="sr-only" data-testid="detail-invoices">
              {selected.invoices.map((i) => <li key={i.id}>{i.title} {formatCent(i.amountCent)}</li>)}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
