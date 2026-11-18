import Link from "next/link";
import { Leer } from "@/components/Leer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, formatEuro } from "@/lib/proposals";
import { PROPOSAL_STATUS_BADGE } from "@/lib/proposalLabels";
import { MIN_DECIDED_FOR_COMPARISON, proposalStats } from "@/lib/proposalStats";
import { praxisFach } from "@/lib/katalogScope";
import { fachWoerter } from "@/lib/fachprofile";

/** So viele Vorschläge zeigt die Liste höchstens; ältere stehen beim Patienten und in der Suche. */
const LISTE_MAX = 200;

export default async function ProposalsPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  // Die Liste zeigt die neuesten Vorschläge und lädt nur, was eine Zeile braucht (ohne Befunde und Schreiben).
  // Die Kennzahlen rechnen über alle Vorschläge der Praxis, aber nur mit den sechs Feldern, die sie brauchen.
  const [proposals, zahlen, fach] = await Promise.all([
    prisma.treatmentProposal.findMany({
      where: { practiceId },
      orderBy: { createdAt: "desc" },
      take: LISTE_MAX,
      select: { id: true, status: true, createdAt: true, planTotalCent: true, eigenanteilCent: true, patientResponse: true, patientViewedAt: true, patient: { select: { firstName: true, lastName: true } } },
    }),
    prisma.treatmentProposal.findMany({
      where: { practiceId },
      select: { status: true, shareCreatedAt: true, patientViewedAt: true, patientRespondedAt: true, baseTotalCent: true, planTotalCent: true },
    }),
    praxisFach(practiceId),
  ]);
  const w = fachWoerter(fach);
  const gesamt = zahlen.length;

  const stats = proposalStats(zahlen);
  const rate = stats.all.rate;
  const acceptedDeltaCent = stats.acceptedDeltaCent;
  const f = stats.funnel;
  const pct = (n: number) => (f.sent ? Math.round((n / f.sent) * 100) : 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-slate-900">{w.vorschlaege}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/proposals/nachfassen" className="btn-secondary" data-testid="link-nachfassen" data-hilfe="vorschlag-nachfassen">Nachfassen</Link>
          <Link href="/proposals/schnell" className="btn-secondary" data-testid="schnellvorschlag" data-hilfe="vorschlag-schnell">Schnellvorschlag ohne Akte</Link>
          <Link href="/proposals/new" className="btn-primary" data-testid="vorschlag-neu" data-hilfe="vorschlag-neu">Neuer Vorschlag</Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Vorschläge</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900" data-testid="vorschlaege-gesamt">{gesamt}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Annahmequote</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{rate == null ? "–" : `${rate} %`}</p>
          <p className="text-xs text-slate-500">von {stats.all.decided} entschiedenen</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Mehrumsatz angenommen</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{formatEuro(acceptedDeltaCent / 100)}</p>
          <p className="text-xs text-slate-500">ggü. reiner Kassenleistung</p>
        </div>
      </div>

      {f.sent > 0 && (
        <section className="card mb-8 space-y-4" data-testid="link-funnel">
          <div>
            <h2 className="font-medium text-slate-900">Wirkung des Patienten-Links</h2>
            <p className="text-sm text-slate-500">Gemessen in Ihrer Praxis, keine Schätzung.</p>
          </div>
          <div className="space-y-2">
            {[
              ["Link versendet", f.sent],
              ["vom Patienten geöffnet", f.viewed],
              ["Rückmeldung gegeben", f.responded],
              ["angenommen", f.accepted],
            ].map(([label, n]) => (
              <div key={label as string} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="text-slate-600">{label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct(n as number)}%` }} />
                </div>
                <span className="tabular-nums text-slate-900">
                  {n} <span className="text-slate-500">({pct(n as number)} %)</span>
                </span>
              </div>
            ))}
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {stats.linkEffectPoints == null ? (
              <>
                Annahmequote mit Link {stats.withLink.rate ?? "–"} %, ohne Link {stats.withoutLink.rate ?? "–"} %. Ein Vergleich wird
                aussagekräftig, sobald je Gruppe mindestens {MIN_DECIDED_FOR_COMPARISON} Vorschläge entschieden sind (bisher{" "}
                {stats.withLink.decided} mit, {stats.withoutLink.decided} ohne Link).
              </>
            ) : (
              <>
                Annahmequote mit Link <b>{stats.withLink.rate} %</b> ({stats.withLink.decided} entschieden), ohne Link{" "}
                <b>{stats.withoutLink.rate} %</b> ({stats.withoutLink.decided} entschieden):{" "}
                <b>
                  {stats.linkEffectPoints >= 0 ? "+" : ""}
                  {stats.linkEffectPoints} Prozentpunkte
                </b>
                . Kleine Zahlen schwanken stark; die Auswahl, wem ein Link geschickt wird, beeinflusst das Ergebnis.
              </>
            )}
          </p>
        </section>
      )}

      {proposals.length === 0 ? (
        <div className="card p-0">
          <Leer symbol="blatt">
            Noch keine Vorschläge.{" "}
            <Link href="/proposals/new" className="font-medium text-brand-600 hover:underline">
              Ersten Vorschlag erstellen
            </Link>
          </Leer>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {gesamt > proposals.length && (
            <p className="px-6 py-3 text-sm text-slate-500" data-testid="vorschlaege-begrenzt">
              Die Liste zeigt die neuesten {proposals.length} von {gesamt} Vorschlägen. Ältere finden Sie beim Patienten oder über die Suche (Strg+K).
            </p>
          )}
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
                  {p.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · Plan {formatEuro(p.planTotalCent / 100)} · Eigenanteil{" "}
                  {formatEuro(p.eigenanteilCent / 100)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.patientResponse ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    {p.patientResponse === "RUECKRUF" ? "Rückruf gewünscht" : "Besprechung gewünscht"}
                  </span>
                ) : p.patientViewedAt ? (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">{w.vonPerson} gelesen</span>
                ) : null}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${PROPOSAL_STATUS_BADGE[p.status]}`}>
                  {PROPOSAL_STATUS_LABELS[p.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
