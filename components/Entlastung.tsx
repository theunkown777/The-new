// "Was Praxen heute belastet – und was Sorrida abnimmt": aus der Recherche
// (Vault: Recherche Bedürfnisse von Praxen). Zahlen nur mit Quelle.
const QUELLEN = {
  buerokratie: "https://www.monitor-versorgungsforschung.de/news/umfrage-fuer-deutsche-ist-der-buerokratieaufwand-in-arztpraxen-unzumutbar/",
  personal: "https://biermann-medizin.de/zi-umfrage-buerokratie-und-it-chaos-bewegen-viele-aerzte-zum-praxis-ausstieg/",
  igel: "https://patientenbeauftragter.de/2025/08/19/umfassendere-aufklaerung-bei-igel-gefordert/",
};

export function Entlastung({ therapie = false }: { therapie?: boolean }) {
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
      fakt: "Viele Praxen kämpfen mit IT-Problemen; rund jede dritte wollte zuletzt ihre Praxissoftware wechseln.",
      quelle: QUELLEN.personal,
      sorrida: therapie
        ? "Läuft im Browser, ohne Installation und ohne Umstellung Ihrer Abrechnung."
        : "Öffnet sich aus Ihrer Praxissoftware (VDDS-media oder GDT) mit dem aktuellen Patienten. Ihre Abrechnung bleibt, wo sie ist.",
    },
  ];
  return (
    <section className="mt-14" aria-labelledby="entlastung">
      <h2 id="entlastung" className="text-2xl font-semibold text-slate-900">
        Was Praxen heute belastet, und was Sorrida abnimmt
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
