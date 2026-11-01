import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAnalysis } from "@/lib/analyticsLoad";
import { prisma } from "@/lib/prisma";
import { formatCent, invoiceTotals } from "@/lib/invoices";
import type { Risk } from "@/lib/analytics";
import { AnalyseExplorer } from "@/components/AnalyseExplorer";
import { canSeeAnalytics } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analyse" };

const ZEITRAUM = [
  [30, "30 Tage"],
  [90, "90 Tage"],
  [365, "12 Monate"],
] as const;

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

const STUFE: Record<Risk["stufe"], { label: string; cls: string; dot: string }> = {
  hoch: { label: "Dringend", cls: "border-red-200 bg-red-50", dot: "bg-red-600" },
  mittel: { label: "Beachten", cls: "border-amber-200 bg-amber-50", dot: "bg-amber-500" },
  info: { label: "Hinweis", cls: "border-slate-200 bg-white", dot: "bg-slate-400" },
};





export default async function AnalysePage({ searchParams }: { searchParams: { tage?: string } }) {
  const session = await getServerSession(authOptions);
  // Umsätze und Risiken sind Sache der Geschäftsführung: Mitarbeitende sehen
  // die Analyse nur mit Freigabe (Einstellungen → Team). Ohne Freigabe werden
  // keine Zahlen geladen.
  if (!(await canSeeAnalytics(session?.user.id))) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center" data-testid="analyse-gesperrt">
        <h1 className="text-xl font-semibold text-slate-900">Analyse nur für die Geschäftsführung</h1>
        <p className="mt-3 text-slate-600">
          Umsätze, Annahmequoten und Risiken der Praxis sieht die Geschäftsführung. Wenn Sie die Analyse brauchen, bitten Sie sie, Ihnen die
          Freigabe unter Einstellungen → Team zu erteilen.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-block">Zur Übersicht</Link>
      </div>
    );
  }
  const practiceId = session!.user.practiceId;
  const tage = ZEITRAUM.find(([t]) => String(t) === searchParams.tage)?.[0] ?? 90;
  const [a, invoices] = await Promise.all([
    loadAnalysis(practiceId, tage),
    prisma.invoice.findMany({ where: { practiceId }, select: { status: true, dueDate: true, amountCent: true, paidAt: true } }),
  ]);
  const inv = invoiceTotals(invoices);

  return (
    <div className="space-y-6" data-testid="analyse">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analyse</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Womit Ihre Praxis Geld verdient, warum Patienten zusagen und wo es haken kann. Grundlage sind Ihre Vorschläge und Rechnungen, keine Schätzungen von außen.
          </p>
        </div>
        <nav className="flex rounded-full bg-white p-1 text-sm shadow-sm ring-1 ring-slate-200" aria-label="Zeitraum">
          {ZEITRAUM.map(([t, l]) => (
            <Link key={t} href={`/analyse?tage=${t}`} aria-current={t === tage ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${t === tage ? "bg-brand-600 text-white" : "text-slate-600 hover:text-brand-700"}`}>
              {l}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Umsatz aus angenommenen Vorschlägen</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900" data-testid="kpi-umsatz">{eur(a.umsatz)}</p>
          <p className="mt-1 text-xs text-slate-500">{eur(a.privat)} selbst bezahlt · {eur(a.kasse)} Kasse</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Annahmequote</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{a.quote == null ? "–" : `${a.quote} %`}</p>
          <p className="mt-1 text-xs text-slate-500">{a.angenommen} von {a.entschieden} entschiedenen Vorschlägen</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Noch offen in Vorschlägen</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{eur(a.offenPotenzial)}</p>
          <p className="mt-1 text-xs text-slate-500">Selbstzahleranteil, noch nicht entschieden</p>
        </div>
        <Link href="/zahlungen" className="card hover:bg-slate-50">
          <p className="text-sm text-slate-500">Offene Rechnungen</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{formatCent(inv.offenCent)}</p>
          <p className={`mt-1 text-xs ${inv.ueberfaellig ? "text-red-700" : "text-slate-500"}`}>
            {inv.ueberfaellig ? `${inv.ueberfaellig} überfällig (${formatCent(inv.ueberfaelligCent)})` : "nichts überfällig"}
          </p>
        </Link>
      </div>

      <AnalyseExplorer
        leistungen={a.leistungen}
        themen={a.themen}
        arten={a.arten}
        monate={a.monate}
        kpi={{ privat: a.privat, entschieden: a.entschieden, angenommen: a.angenommen, zeitraumTage: a.zeitraumTage }}
      />

      <div className="grid gap-6">
        <section className="space-y-3" data-testid="risiken">
          <h2 className="font-semibold text-slate-900">Hinweise und mögliche Probleme</h2>
          {a.risiken.length === 0 && <p className="card text-sm text-slate-600">Gerade nichts Auffälliges. Sobald sich etwas zeigt, steht es hier mit Grund und Vorschlag.</p>}
          {a.risiken.map((r) => {
            const s = STUFE[r.stufe];
            return (
              <details key={r.id} className={`group rounded-2xl border p-4 ${s.cls}`} open={r.stufe === "hoch"}>
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
                    <span className="block font-medium text-slate-900">{r.titel}</span>
                  </span>
                  <span className="text-slate-400 transition group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <dl className="mt-3 space-y-2 pl-5 text-sm">
                  <div><dt className="font-semibold text-slate-700">Warum das wichtig ist</dt><dd className="text-slate-600">{r.warum}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Was Sie tun können</dt><dd className="text-slate-600">{r.tun}</dd></div>
                </dl>
              </details>
            );
          })}
          {a.staerken.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-900">Was gut läuft</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-emerald-900">
                {a.staerken.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="card" data-testid="faktoren">
        <h2 className="font-semibold text-slate-900">Warum Patienten zusagen</h2>
        <p className="mt-1 text-sm text-slate-600">Annahmequote je Gruppe. Verglichen wird erst ab {5} entschiedenen Fällen pro Gruppe, damit Zufall nicht wie ein Muster aussieht.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {a.faktoren.map((f) => (
            <div key={f.frage} className="rounded-2xl bg-[#FBFAF8] p-4">
              <p className="font-medium text-slate-900">{f.frage}</p>
              {[f.a, f.b].map((g) => (
                <div key={g.label} className="mt-3">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{g.label} <span className="text-slate-400">({g.n})</span></span>
                    <b className="tabular-nums text-slate-900">{g.quote == null ? "–" : `${g.quote} %`}</b>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${g.quote ?? 0}%` }} />
                  </div>
                </div>
              ))}
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                {f.punkte != null && (
                  <b className="text-slate-800">{f.punkte === 0 ? "Kein Unterschied. " : `${Math.abs(f.punkte)} Punkte ${f.punkte > 0 ? "mehr" : "weniger"} bei „${f.a.label}“. `}</b>
                )}
                {f.erklaerung}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Umsatz = Preise der gewählten Optionen in angenommenen Vorschlägen, nach Ihren hinterlegten Preisen. Abgerechnet wird weiter über Ihre Praxissoftware;
        die Zahlen zeigen Muster, keine Buchhaltung.
      </p>
    </div>
  );
}
