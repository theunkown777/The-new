// "Was Praxen heute belastet – und was Sorrida abnimmt": aus der Recherche
// (Vault: Recherche Bedürfnisse von Praxen). Zahlen nur mit Quelle.
const QUELLEN = {
  buerokratie: "https://www.monitor-versorgungsforschung.de/news/umfrage-fuer-deutsche-ist-der-buerokratieaufwand-in-arztpraxen-unzumutbar/",
  personal: "https://biermann-medizin.de/zi-umfrage-buerokratie-und-it-chaos-bewegen-viele-aerzte-zum-praxis-ausstieg/",
  igel: "https://patientenbeauftragter.de/2025/08/19/umfassendere-aufklaerung-bei-igel-gefordert/",
  kbv: "https://www.kbv.de/infothek/zahlen-und-fakten/studien-und-berichte/praxisbarometer-digitalisierung",
};

type Karte = { titel: string; zahl?: string; fakt: string; quelle?: string; sorrida: string };

/**
 * Wer die Karten liest: zahn, arzt, therapie oder andere (Apotheke, Versorgung, Pflege, Hebamme, Heilpraktiker).
 * Ohne Angabe die Startseite für alle Fächer. Zahlen aus Umfragen unter Ärztinnen und Ärzten (Zi, KBV) stehen nur
 * dort, wo sie passen; IGeL nur bei Ärzten, VDDS-media nur bei Zahnärzten, GDT bei Ärzten.
 */
export type EntlastungGruppe = "zahn" | "arzt" | "therapie" | "andere";

export function entlastungKarten(gruppe?: EntlastungGruppe): Karte[] {
  const alle = !gruppe;
  const aerztlich = alle || gruppe === "arzt";
  // Das Lächeln-Zitat der Startseite (lib/laecheln.ts) fasst „ein Klick nach dem Gespräch“ in eigenen Worten zusammen: bei Änderungen dort mitpflegen.
  return [
    aerztlich
      ? {
          titel: "Weniger Bürokratie",
          zahl: "76 %",
          fakt: "76 % der Ärztinnen und Ärzte sagen, dass Verwaltung ihre medizinische Arbeit einschränkt.",
          quelle: QUELLEN.buerokratie,
          sorrida: "Ein Klick nach dem Gespräch erzeugt Patienteninformation, Vereinbarungs-Hinweis und To-dos.",
        }
      : {
          titel: "Weniger Bürokratie",
          fakt: "Nach jedem Termin fallen Notizen, Informationen und Aufgaben an.",
          sorrida: "Ein Klick nach dem Gespräch erzeugt die Information zum Mitnehmen, den Hinweis zur Vereinbarung und die To-dos.",
        },
    aerztlich
      ? {
          titel: "Entlastung für das Team",
          fakt: "Fehlendes Personal ist neben der Bürokratie das größte Problem der Praxen und ein häufiger Grund für den vorzeitigen Ausstieg.",
          quelle: QUELLEN.personal,
          sorrida: "Patienten lesen Optionen und Kosten zu Hause auf dem Handy. Rückrufwünsche kommen gesammelt an.",
        }
      : {
          titel: "Entlastung für das Team",
          fakt: "Fragen zu Kosten und Terminen kommen oft am Telefon und am Empfang an.",
          sorrida: "Optionen und Kosten stehen zum Nachlesen auf dem Handy. Rückrufwünsche kommen gesammelt an.",
        },
    gruppe === "zahn"
      ? {
          titel: "Mehrkosten verständlich vor dem Heil- und Kostenplan",
          fakt: "Festzuschuss, Eigenanteil und Mehrkosten werfen bei Patienten Fragen auf.",
          sorrida: "Kassenleistung (Regelversorgung) zuerst, jede Alternative mit Eigenanteil, 2026 und 2027 im Vergleich.",
        }
      : gruppe === "therapie"
        ? {
            titel: "Klare Preise statt Missverständnisse",
            fakt: "Zuzahlung, Selbstzahler-Einheiten und Kassenzuschüsse werfen bei Patienten Fragen auf.",
            sorrida: "Die gesetzliche Zuzahlung wird nach § 32 und § 61 SGB V berechnet, Selbstzahler-Einheiten stehen mit Preis und Hinweis auf Kassenzuschüsse daneben.",
          }
        : gruppe === "arzt"
          ? {
              titel: "Selbstzahlerleistungen mit Quelle und Bedenkzeit",
              fakt: "Über mögliche Schäden von IGeL werden Patienten kaum aufgeklärt. Gefordert sind Bedenkzeit und unabhängige Information.",
              quelle: QUELLEN.igel,
              sorrida: "Kassenleistung zuerst, Angaben zum Nutzen nur mit Quelle, Bedenkzeit und Kostenschätzung in Textform.",
            }
          : {
              titel: "Selbstzahler- und Privatleistungen mit Preis und Bedenkzeit",
              fakt: "Wo die Kasse nicht oder nur teilweise zahlt, entstehen Fragen zu Kosten und Nutzen.",
              sorrida: "Kassenleistung zuerst, Angaben zum Nutzen nur mit Quelle, Bedenkzeit und Kostenschätzung in Textform.",
            },
    {
      titel: "Kein weiteres Insel-System",
      ...(aerztlich
        ? {
            zahl: "über 50 %",
            fakt: "Mehr als die Hälfte der Praxen spricht mit Patienten schon überwiegend digital. Was bremst, sind Störungen und Programme, die nicht zusammenpassen (KBV PraxisBarometer 2025).",
            quelle: QUELLEN.kbv,
          }
        : { fakt: "Programme, die nicht zusammenpassen, kosten im Alltag Zeit." }),
      sorrida: alle
        ? "Öffnet sich aus Ihrer Praxissoftware (GDT oder VDDS-media) mit der aktuellen Akte. Ihre Abrechnung bleibt, wo sie ist."
        : gruppe === "zahn"
          ? "Öffnet sich aus Ihrer Praxissoftware (VDDS-media) mit dem aktuellen Patienten. Ihre Abrechnung bleibt, wo sie ist."
          : gruppe === "arzt"
            ? "Öffnet sich aus Ihrer Praxissoftware (GDT) mit dem aktuellen Patienten. Ihre Abrechnung bleibt, wo sie ist."
            : "Läuft im Browser, ohne Installation und ohne Umstellung Ihrer Abrechnung.",
    },
  ];
}

export function Entlastung({ gruppe, journal = false }: { gruppe?: EntlastungGruppe; journal?: boolean }) {
  const karten = entlastungKarten(gruppe);
  if (journal)
    return (
      <section aria-labelledby="entlastung" data-testid="entlastung">
        <div className="grid gap-6 lg:grid-cols-12">
          <h2 id="entlastung" className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)] lg:col-span-8">
            Was Praxen heute belastet, <em>und was Sorrida abnimmt.</em>
          </h2>
          {/* Legende nur, wo die Hälften nebeneinander stehen (ab md). Darunter steht die Beschriftung in jeder Karte. */}
          <p className="hidden flex-wrap items-center gap-x-5 gap-y-2 self-end text-[12px] font-semibold uppercase tracking-[0.14em] md:flex lg:col-span-4 lg:justify-end" aria-hidden="true">
            <span className="flex items-center gap-2 whitespace-nowrap text-brand-700"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" />Was belastet</span>
            <span className="flex items-center gap-2 whitespace-nowrap text-salbei-700"><span className="h-2.5 w-2.5 rounded-full bg-salbei-600" />Was Sorrida abnimmt</span>
          </p>
        </div>
        {/* Keine Reihenfolge, deshalb ohne Ziffern: Die Kennzahl ist die einzige große Zahl der Karte. */}
        <ul className="mt-12 space-y-5">
          {karten.map((k) => (
            <li key={k.titel} className="j-ein j-paar grid overflow-hidden rounded-[6px] md:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)]">
              <div className="j-paar-links relative bg-[#F3E4DF] px-6 py-8 sm:px-9">
                <p className="j-titel text-[1.7rem] text-tinte">{k.titel}</p>
                {k.zahl && <p className="j-zahl mt-5 text-[3.4rem] leading-none text-brand-700">{k.zahl}</p>}
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5b3a35]">
                  {k.zahl && k.fakt.startsWith(k.zahl) ? k.fakt.slice(k.zahl.length).trim() : k.fakt}
                  {k.quelle && (
                    <>
                      {" "}
                      <a href={k.quelle} className="j-link whitespace-nowrap text-brand-700" rel="noopener" target="_blank">
                        Quelle
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="relative hidden bg-[linear-gradient(90deg,#F3E4DF_50%,#E4EDE2_50%)] md:block" aria-hidden="true">
                <span className="j-paar-pfeil absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-tinte text-lg text-[#F5F2EE]">→</span>
              </div>
              <div className="j-paar-rechts flex flex-col justify-center bg-[#E4EDE2] px-6 py-8 sm:px-9">
                {/* Ab md sagt es die Legende oben; für Vorleseprogramme bleibt die Zeile in jeder Karte. */}
                <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-salbei-700 md:sr-only">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Was Sorrida abnimmt
                </p>
                <p className="mt-3 max-w-md text-[17px] leading-relaxed text-[#1f3320] md:mt-0">{k.sorrida}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <section className="mt-14" aria-labelledby="entlastung">
      <h2 id="entlastung" className="scroll-mt-6 font-display text-4xl text-slate-900">
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
