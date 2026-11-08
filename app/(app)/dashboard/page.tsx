import { abschlussWort, fachprofil } from "@/lib/fachprofile";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/reportLabels";
import { PROPOSAL_STATUS_LABELS, formatEuro } from "@/lib/proposals";
import { isDental } from "@/lib/specialties";
import { journey, STATIONEN } from "@/lib/journey";
import { loadTermineHeute } from "@/lib/termineLoad";
import { uhrzeit, STATUS_LABEL, type TerminStatus } from "@/lib/termine";
import { canSeeAnalytics } from "@/lib/permissions";
import { formatCent } from "@/lib/invoices";
import { Behandlungsweg, Laechelbogen } from "@/components/Behandlungsweg";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  const unopenedSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } });
  // Arzt- und Therapiepraxen arbeiten ohne die zahnärztlichen KI-Berichte.
  const dental = isDental(practice?.specialty);
  const P = fachprofil(practice?.specialty ?? "zahn").person;
  const [anamnesen30, recentProposals] = dental
    ? [0, []]
    : await Promise.all([
        prisma.anamnesisForm.count({ where: { practiceId, submittedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
        prisma.treatmentProposal.findMany({
          where: { practiceId },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, status: true, createdAt: true, patient: { select: { firstName: true, lastName: true } } },
        }),
      ]);
  const [patientCount, draftCount, recentReports, openProposals, accepted, responses, unopened] = await Promise.all([
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
    prisma.treatmentProposal.findMany({
      where: { practiceId, patientResponse: { not: null }, status: { in: ["ENTWURF", "BESPROCHEN"] } },
      orderBy: { patientRespondedAt: "desc" },
      take: 10,
      select: { id: true, patientResponse: true, patientRespondedAt: true, patientNote: true, patientWantsInstallments: true, patient: { select: { firstName: true, lastName: true } } },
    }),
    prisma.treatmentProposal.findMany({
      where: {
        practiceId,
        status: { in: ["ENTWURF", "BESPROCHEN"] },
        shareTokenHash: { not: null },
        shareExpiresAt: { gt: new Date() },
        shareCreatedAt: { lt: unopenedSince },
        patientViewedAt: null,
      },
      orderBy: { shareCreatedAt: "asc" },
      take: 10,
      select: { id: true, shareCreatedAt: true, patient: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const monatsStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [termine, darfUmsatz, bezahltMonat] = await Promise.all([
    loadTermineHeute(practiceId),
    canSeeAnalytics(session!.user.id),
    prisma.invoice.aggregate({ where: { practiceId, status: "BEZAHLT", paidAt: { gte: monatsStart } }, _sum: { amountCent: true } }),
  ]);
  const aufgaben = draftCount + termine.morgenUnbestaetigt;
  const acceptedDeltaCent = accepted.reduce((sum, p) => sum + p.planTotalCent - p.baseTotalCent, 0);

  // Wege der letzten 90 Tage: wie viele Patienten stehen an welcher Station?
  const wege = await prisma.treatmentProposal.findMany({
    where: { practiceId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    distinct: ["patientId"],
    take: 2000,
    select: {
      status: true, shareCreatedAt: true, patientViewedAt: true, patientResponse: true, patientRespondedAt: true, eigenanteilCent: true,
      invoices: { where: { status: { not: "STORNIERT" } }, select: { status: true, dueDate: true } },
    },
  });
  const now = new Date();
  const proStation = [0, 0, 0, 0, 0];
  let heute = 0;
  for (const w of wege) {
    const j = journey({ proposal: w, invoices: w.invoices }, now);
    if (j.abgelehnt) continue;
    proStation[j.aktuell ?? 4]++;
    if (j.praxis.tone === "achtung") heute++;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Heute in Ihrer Praxis</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
            <Laechelbogen className="h-2 w-8 text-brand-600" />
            {heute ? `${heute} ${heute === 1 ? `${P.sg} braucht` : `${P.pl} brauchen`} heute Ihre Aufmerksamkeit` : "Heute ist nichts liegen geblieben"}
          </p>
        </div>
        <Link href="/abschluss/new" className="btn-primary">{abschlussWort(practice?.specialty)} abschließen</Link>
      </div>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_22rem]" data-testid="heute">
        <div className="card p-0">
          <div className="flex items-baseline justify-between px-5 pt-4">
            <h2 className="font-semibold text-slate-900">Termine heute</h2>
            <Link href="/termine" className="ziel text-sm text-brand-700 underline">Tagesplan</Link>
          </div>
          {termine.liste.length === 0 ? (
            <p className="px-5 pb-5 pt-2 text-sm text-slate-600">Für heute ist kein Termin in Sorrida eingetragen. <Link href="/termine" className="text-brand-700 underline">Termin eintragen</Link></p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {termine.liste.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="w-12 font-semibold tabular-nums text-slate-900">{uhrzeit(t.start)}</span>
                  <Link href={`/patients/${t.patient.id}`} className="min-w-0 flex-1 truncate text-slate-800 hover:text-brand-700">
                    {t.patient.lastName}, {t.patient.firstName} <span className="text-slate-500">· {t.reason}</span>
                  </Link>
                  <span className="text-xs text-slate-500">{STATUS_LABEL[t.status as TerminStatus]}</span>
                </li>
              ))}
              {termine.liste.length > 6 && <li className="px-5 py-2 text-xs text-slate-500">und {termine.liste.length - 6} weitere</li>}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/termine" className="card hover:bg-slate-50">
            <p className="text-xs text-slate-500">Auslastung</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{termine.auslastungHeute} %</p>
            <p className="text-xs text-slate-500">{termine.heute} Termine</p>
          </Link>
          <Link href="/praxismanager" className="card hover:bg-slate-50" data-testid="aufgaben">
            <p className="text-xs text-slate-500">Aufgaben</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{aufgaben}</p>
            <p className="text-xs text-slate-500">Freigaben, Bestätigungen</p>
          </Link>
          <Link href="/abrechnungspruefung" className="card hover:bg-slate-50">
            <p className="text-xs text-slate-500">Ausfallquote</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{termine.ausfallquote == null ? "–" : `${termine.ausfallquote} %`}</p>
            <p className="text-xs text-slate-500">60 Tage</p>
          </Link>
          {darfUmsatz ? (
            <Link href="/analyse" className="card hover:bg-slate-50">
              <p className="text-xs text-slate-500">Eingang Monat</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatCent(bezahltMonat._sum.amountCent ?? 0)}</p>
              <p className="text-xs text-slate-500">bezahlte Rechnungen</p>
            </Link>
          ) : (
            <div className="card"><p className="text-xs text-slate-500">Umsatz</p><p className="mt-1 text-xs text-slate-500">nur mit Freigabe</p></div>
          )}
        </div>
      </section>

      {/* Sorrida-Signatur: Wege der letzten 90 Tage auf dem Lächelbogen */}
      <section className="mb-8 rounded-3xl bg-white p-5 sm:p-6" data-testid="wege-trichter">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Wo Ihre {P.pl} gerade stehen</h2>
          <Link href="/patients" className="ziel text-sm text-brand-700 underline">Zur Arbeitsliste</Link>
        </div>
        <div className="mx-auto mt-4 max-w-2xl">
          <Behandlungsweg erreicht={5} aktuell={null} size="gross" labels={STATIONEN.map((st, i) => `${st} · ${proStation[i]}`)} animate />
        </div>
        <p className="mt-1 text-xs text-slate-500">Je Patient der jüngste Vorschlag der letzten 90 Tage, abgelehnte nicht mitgezählt.</p>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">{P.pl}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{patientCount.toLocaleString("de-DE")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{dental ? "Offene Entwürfe" : "Anamnesen (30 Tage)"}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{dental ? draftCount : anamnesen30}</p>
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

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="min-w-0">
      {responses.length > 0 && (
        <section className="mb-8" data-testid="patient-responses">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Rückmeldungen von {P.pl}</h2>
          <div className="card divide-y divide-slate-100 p-0">
            {responses.map((r) => (
              <Link key={r.id} href={`/proposals/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 hover:bg-emerald-50">
                <div>
                  <p className="font-medium text-slate-900">
                    {r.patient.firstName} {r.patient.lastName}
                  </p>
                  {r.patientNote && <p className="text-sm italic text-slate-600">„{r.patientNote}“</p>}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  {r.patientResponse === "RUECKRUF" ? "Rückruf gewünscht" : "möchte besprechen"}
                  {r.patientWantsInstallments && " · Ratenzahlung"}
                  {r.patientRespondedAt && ` · ${r.patientRespondedAt.toLocaleDateString("de-DE")}`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {unopened.length > 0 && (
        <section className="mb-8" data-testid="unopened-links">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Seit 3 Tagen nicht geöffnet</h2>
          <div className="card divide-y divide-slate-100 p-0">
            {unopened.map((u) => (
              <Link key={u.id} href={`/proposals/${u.id}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-slate-50">
                <span className="font-medium text-slate-900">
                  {u.patient.firstName} {u.patient.lastName}
                </span>
                <span className="text-sm text-slate-500">
                  Link vom {u.shareCreatedAt?.toLocaleDateString("de-DE")} · kurz anrufen oder neuen Link schicken
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

        </div>
        <div className="min-w-0">
      {!dental && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Neueste Vorschläge</h2>
          <div className="card divide-y divide-slate-100 p-0">
            {recentProposals.length === 0 ? (
              <p className="px-6 py-4 text-sm text-slate-500">
                Noch keine Vorschläge. <Link href="/abschluss/new" className="font-medium text-brand-600 hover:underline">Ersten Vorschlag erstellen</Link>
              </p>
            ) : (
              recentProposals.map((r) => (
                <Link key={r.id} href={`/proposals/${r.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">
                    {r.patient.firstName} {r.patient.lastName}
                  </span>
                  <span className="text-sm text-slate-500">
                    {PROPOSAL_STATUS_LABELS[r.status]} · {r.createdAt.toLocaleDateString("de-DE")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      )}

      {dental && (<>
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
              className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50 sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {r.patient.firstName} {r.patient.lastName} · {REPORT_TYPE_LABELS[r.type]}
                </p>
                <p className="text-sm text-slate-500">{r.createdAt.toLocaleDateString("de-DE")}</p>
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
      </>)}
        </div>
      </div>
    </div>
  );
}
