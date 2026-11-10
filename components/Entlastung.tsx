// "Was Praxen heute belastet – und was Sorrida abnimmt": aus der Recherche
// (Vault: Recherche Bedürfnisse von Praxen). Zahlen nur mit Quelle.
const QUELLEN = {
  buerokratie: "https://www.monitor-versorgungsforschung.de/news/umfrage-fuer-deutsche-ist-der-buerokratieaufwand-in-arztpraxen-unzumutbar/",
  personal: "https://biermann-medizin.de/zi-umfrage-buerokratie-und-it-chaos-bewegen-viele-aerzte-zum-praxis-ausstieg/",
  igel: "https://patientenbeauftragter.de/2025/08/19/umfassendere-aufklaerung-bei-igel-gefordert/",
  kbv: "https://www.kbv.de/infothek/zahlen-und-fakten/studien-und-berichte/praxisbarometer-digitalisierung",
};

export function Entlastung({ therapie = false, journal = false }: { therapie?: boolean; journal?: boolean }) {
  const karten = [
    {
      titel: "Weniger Bürokratie",
      fakt: "76 % der Ärztinnen und Ärzte sagen, dass Verwaltung ihre medizinische Arbeit einschränkt.",
      quelle: QUELLEN.buerokratie,
      sorrida: "Ein Klick nach dem Gespräch erzeugt Patienteninformation, Vereinbarungs-Hinweis und To-dos. Nichts wird doppelt getippt.",
    },
    {
      titel: "Entlastung für das Team",
      fakt: "Fehlendes Personal ist neben der Bürokratie das größte Problem der Praxen und ein häufiger Grund für den vorzeitigen Ausstieg.",
      quelle: QUELLEN.personal,
      sorrida: "Patienten lesen Optionen und Kosten zu Hause auf dem Handy. Weniger Rückfragen am Tresen und am Telefon, Rückrufwünsche kommen gesammelt an.",
    },
    {
      titel: therapie ? "Klare Preise statt Missverständnisse" : "Selbstzahlerleistungen ohne Rufschaden",
      fakt: therapie
        ? "Zuzahlung, Selbstzahler-Einheiten und Kassenzuschüsse verwirren viele Patienten."
        : "Patienten werden über Schäden von IGeL kaum aufgeklärt; gefordert werden Bedenkzeit und unabhängige Information.",
      quelle: therapie ? undefined : QUELLEN.igel,
      sorrida: therapie
        ? "Zuzahlung wird korrekt berechnet, Selbstzahler-Einheiten stehen mit Preis und Hinweis auf Kassenzuschüsse daneben."
        : "Kassenleistung zuerst, ehrlicher Hinweis zum Nutzen, Bedenkzeit und Kostenschätzung in Textform. Das schützt Patienten und den Ruf Ihrer Praxis.",
    },
    {
      titel: "Kein weiteres Insel-System",
      fakt: "Über die Hälfte der Praxen kommuniziert schon überwiegend digital mit Patienten. Die Akzeptanz steigt, wenn Anwendungen zuverlässig laufen; Störungen und unflexible Praxissoftware bremsen (KBV PraxisBarometer 2025).",
      quelle: QUELLEN.kbv,
      sorrida: therapie
        ? "Läuft im Browser, ohne Installation und ohne Umstellung Ihrer Abrechnung."
        : "Öffnet sich aus Ihrer Praxissoftware (VDDS-media oder GDT) mit dem aktuellen Patienten. Ihre Abrechnung bleibt, wo sie ist.",
    },
  ];
  if (journal)
    return (
      <section aria-labelledby="entlastung" data-testid="entlastung">
        <h2 id="entlastung" className="j-schau max-w-4xl text-[clamp(2.4rem,4.6vw,3.8rem)]">
          Was Praxen heute belastet, <em>und was Sorrida abnimmt.</em>
        </h2>
        <div className="mt-14 border-t border-tinte">
          <div className="hidden grid-cols-12 gap-8 border-b border-linie py-3 md:grid" aria-hidden="true">
            <p className="j-marke col-span-6">Was belastet</p>
            <p className="j-marke col-span-5 col-start-8 text-brand-700">Was Sorrida abnimmt</p>
          </div>
          {karten.map((k) => (
            <div key={k.titel} className="j-ein grid gap-4 border-b border-linie py-9 md:grid-cols-12 md:gap-8">
              <div className="md:col-span-6">
                <h3 className="j-titel text-[1.9rem] text-tinte">{k.titel}</h3>
                <p className="j-text mt-3 text-[15px]">
                  {k.fakt}
                  {k.quelle && (
                    <>
                      {" "}
                      <a href={k.quelle} className="j-link whitespace-nowrap" rel="noopener" target="_blank">
                        Quelle
                      </a>
                    </>
                  )}
                </p>
              </div>
              <p className="text-tinte md:col-span-5 md:col-start-8">
                <span className="mb-1 block text-[13px] font-semibold text-brand-700 md:hidden">Was Sorrida abnimmt</span>
                {k.sorrida}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  return (
    <section className="mt-14" aria-labelledby="entlastung">
      <h2 id="entlastung" className="font-display text-4xl text-slate-900">
        Was Praxen heute belastet, und was Sorrida abnimmt
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {karten.map((k) => (
          <div key={k.titel} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">{k.titel}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {k.fakt}
              {k.quelle && (
                <>
                  {" "}
                  <a href={k.quelle} className="underline" rel="noopener" target="_blank">
                    Quelle
                  </a>
                </>
              )}
            </p>
            <p className="mt-3 text-sm text-slate-800">
              <span className="font-medium text-brand-700">Sorrida: </span>
              {k.sorrida}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
