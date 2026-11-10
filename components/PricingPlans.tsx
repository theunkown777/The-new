import { PLANS, PRICE_TERMS, VAT_NOTE, eur } from "@/lib/pricing";

// Preistabelle der Website: drei Pakete, alles enthalten. Gesetzt wie eine Preisliste:
// drei Spalten zwischen Haarlinien, die mittlere auf dunklerem Papier hervorgehoben.
export function PricingPlans({ cta = "#fach" }: { cta?: string }) {
  return (
    <section id="preise" className="scroll-mt-10" aria-labelledby="preise-titel" data-testid="preise">
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="preise-titel" className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)] lg:col-span-7">
          Ein Werkzeug statt fünf. <em>Ein Preis, alles drin.</em>
        </h2>
        <p className="j-text self-end lg:col-span-4 lg:col-start-9">
          Vorschläge, Patienten-Link, Behandlungsweg mit Zahlung, Anamnese, Diktat und Analyse. Wofür Praxen sonst mehrere Abos bezahlen und
          Daten zwischen Programmen abtippen, läuft hier an einem Ort.
        </p>
      </div>
      <div className="mt-14 grid border-y border-tinte lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <div key={p.id} className={`flex flex-col border-b border-linie px-1 py-10 last:border-b-0 lg:border-b-0 lg:px-8 ${i === 1 ? "bg-papier-2 lg:px-10" : ""} ${i === 0 ? "lg:pl-0" : ""} ${i < 2 ? "lg:border-r" : ""}`}>
            <p className={`j-marke ${i === 1 ? "text-brand-700" : ""}`}>{p.fuer}</p>
            <h3 className="j-titel mt-3 text-[2rem] text-tinte">{p.name}</h3>
            <p className="mt-6 flex items-baseline gap-2">
              {p.ab && <span className="text-tinte-2">ab</span>}
              <span className="j-zahl text-[3.4rem] leading-none text-tinte">{eur(p.preis)}</span>
              <span className="text-tinte-2">/ Monat</span>
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-tinte">
              {p.punkte.map((x) => (
                <li key={x} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.55em] h-px w-3 shrink-0 bg-brand-700" />
                  {x}
                </li>
              ))}
            </ul>
            <a href={p.id === "mvz" ? "/hilfe?fach=MVZ" : cta} className={`j-knopf mt-10 ${i === 1 ? "j-knopf-voll" : "j-knopf-linie"}`}>
              {p.id === "mvz" ? "Gespräch vereinbaren" : "30 Tage kostenlos testen"}
            </a>
          </div>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-[15px] text-tinte-2">{PRICE_TERMS}</p>
      <p className="mt-1 text-xs text-tinte-2">{VAT_NOTE}</p>
    </section>
  );
}
