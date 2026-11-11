import { PLANS, PRICE_TERMS, VAT_NOTE, eur } from "@/lib/pricing";

// Preistabelle der Website: drei Pakete, alles enthalten. Gesetzt wie eine Preisliste:
// drei Blätter, das meistgewählte Paket in Bordeaux hervorgehoben.
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
      <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const hervor = i === 1;
          return (
            <div
              key={p.id}
              className={`j-ein j-preis relative flex flex-col rounded-[6px] px-7 py-9 sm:px-9 ${
                hervor ? "bg-[#5A1D1D] text-[#F5EDE6] shadow-[0_30px_60px_-35px_rgba(90,29,29,.9)] lg:-my-4 lg:py-12" : "border border-linie-stark bg-[#FBF9F6] text-tinte"
              }`}
            >
              {!hervor && <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 rounded-t-[6px] ${i === 0 ? "bg-[#C9A27E]" : "bg-tinte"}`} />}
              {hervor && (
                <span className="absolute -top-3 left-7 rounded-full bg-[#E8C9A9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A1D1D] sm:left-9">
                  Unsere Empfehlung
                </span>
              )}
              <p className={`j-marke ${hervor ? "!text-[#E8C9A9]" : ""}`}>{p.fuer}</p>
              <h3 className={`j-titel mt-3 text-[2rem] ${hervor ? "text-white" : "text-tinte"}`}>{p.name}</h3>
              <p className="mt-6 flex items-baseline gap-2">
                {p.ab && <span className={hervor ? "text-[#E8C9A9]" : "text-tinte-2"}>ab</span>}
                <span className={`j-zahl text-[3.4rem] leading-none ${hervor ? "text-white" : "text-tinte"}`}>{eur(p.preis)}</span>
                <span className={hervor ? "text-[#E8C9A9]" : "text-tinte-2"}>/ Monat</span>
              </p>
              <ul className={`mt-8 space-y-3 border-t pt-7 text-[15px] ${hervor ? "border-white/15" : "border-linie"}`}>
                {p.punkte.map((x) => (
                  <li key={x} className="flex gap-3">
                    <svg viewBox="0 0 16 16" className={`mt-[0.3em] h-4 w-4 shrink-0 ${hervor ? "text-[#E8C9A9]" : "text-brand-700"}`} aria-hidden="true">
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-10">
                <a href={p.id === "mvz" ? "/hilfe?fach=MVZ" : cta} className={`j-knopf w-full ${hervor ? "j-knopf-hell" : "j-knopf-linie"}`}>
                  {p.id === "mvz" ? "Gespräch vereinbaren" : "30 Tage kostenlos testen"}
                </a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 max-w-3xl text-[15px] text-tinte-2">{PRICE_TERMS}</p>
      <p className="mt-1 text-xs text-tinte-2">{VAT_NOTE}</p>
    </section>
  );
}
