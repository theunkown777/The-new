import { PLANS, PRICE_TERMS, VAT_NOTE, eur } from "@/lib/pricing";

// Preistabelle der Website: drei Pakete, alles enthalten.
export function PricingPlans({ cta = "#fach" }: { cta?: string }) {
  return (
    <section id="preise" className="mt-20 scroll-mt-6" aria-labelledby="preise-titel" data-testid="preise">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-brand-700">Preise</p>
        <h2 id="preise-titel" className="mt-1 text-3xl font-semibold text-slate-900">Ein Werkzeug statt fünf. Ein Preis, alles drin.</h2>
        <p className="mt-3 text-slate-600">
          Vorschläge, Patienten-Link, Patientenportal mit Zahlung, Anamnese, Diktat und Analyse. Wofür Praxen sonst mehrere Abos bezahlen und
          Daten zwischen Programmen abtippen, läuft hier an einem Ort.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <div key={p.id} className={`flex flex-col rounded-3xl p-6 sm:p-8 ${i === 1 ? "bg-brand-700 text-white shadow-[0_24px_50px_-30px_rgba(107,42,36,.9)]" : "bg-white"}`}>
            <p className={`text-sm font-semibold ${i === 1 ? "text-brand-100" : "text-brand-700"}`}>{p.fuer}</p>
            <h3 className={`mt-1 text-xl font-semibold ${i === 1 ? "text-white" : "text-slate-900"}`}>{p.name}</h3>
            <p className="mt-4 flex items-baseline gap-1.5">
              {p.ab && <span className={i === 1 ? "text-white/80" : "text-slate-500"}>ab</span>}
              <span className="text-4xl font-semibold tabular-nums">{eur(p.preis)}</span>
              <span className={i === 1 ? "text-white/80" : "text-slate-500"}>/ Monat</span>
            </p>
            <ul className={`mt-6 space-y-2 text-sm ${i === 1 ? "text-white/90" : "text-slate-700"}`}>
              {p.punkte.map((x) => (
                <li key={x} className="flex gap-2">
                  <span aria-hidden="true" className={i === 1 ? "text-brand-200" : "text-brand-600"}>✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <a href={p.id === "mvz" ? "/hilfe?fach=MVZ" : cta} className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-semibold ${i === 1 ? "bg-white text-brand-700 hover:bg-brand-50" : "bg-brand-600 text-white hover:bg-brand-700"}`}>
              {p.id === "mvz" ? "Gespräch vereinbaren" : "30 Tage kostenlos testen"}
            </a>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-600">{PRICE_TERMS}</p>
      <p className="mt-1 text-xs text-slate-500">{VAT_NOTE}</p>
    </section>
  );
}
