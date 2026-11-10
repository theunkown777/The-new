import { PRICE_SHORT, PRICE_TERMS } from "@/lib/pricing";
import Link from "next/link";

// Häufige Fragen von Praxen vor dem Start (aus Recherche und Pilotgesprächen abgeleitet).
export function PraxisFaq({ therapie = false, dental = false, journal = false }: { therapie?: boolean; dental?: boolean; journal?: boolean }) {
  const fragen: [string, React.ReactNode][] = [
    [
      "Ist das nicht Verkaufen am Patienten?",
      therapie
        ? "Nein. Sorrida zeigt zuerst, was auf Verordnung möglich ist, und rechnet die Zuzahlung korrekt. Selbstzahler-Einheiten stehen daneben, mit Preis und Hinweis auf Kassenzuschüsse. Empfohlen wird nichts von sich aus."
        : "Nein. Die Kassenleistung steht immer zuerst. Bei jeder Selbstzahlerleistung steht, was über den Nutzen bekannt ist, und Sorrida empfiehlt sie nie von sich aus. Das entspricht dem, was Patientenvertreter fordern: Information, Bedenkzeit und Kosten vorab.",
    ],
    [
      "Ist das rechtlich sauber?",
      therapie
        ? "Patienten erhalten Preise und Ablauf in Textform, Selbstzahlerleistungen werden vor der Behandlung schriftlich vereinbart. Die Zuzahlung bei Heilmitteln wird nach § 32 und § 61 SGB V berechnet."
        : dental
          ? "Die Kostenaufklärung in Textform erfüllt § 630c Abs. 3 BGB. Mehrkostenvereinbarung und Heil- und Kostenplan erstellen Sie weiter in Ihrer Praxissoftware; Sorrida erinnert daran."
          : "Die Kostenaufklärung in Textform erfüllt § 630c Abs. 3 BGB. Für IGeL erinnert Sorrida an die schriftliche Vereinbarung vor der Leistung (§ 18 Abs. 8 BMV-Ä) mit Kosten nach GOÄ und an die Bedenkzeit.",
    ],
    [
      "Wo liegen die Daten?",
      <>
        Anwendung und Datenbank laufen in Frankfurt am Main. Ein Vertrag zur Auftragsverarbeitung gehört zu jedem Paket ({" "}
        <Link href="/avv" className="underline">
          Muster ansehen
        </Link>
        ). Patienten-Links enthalten keine Patientendaten und laufen nach 30 Tagen ab.
      </>,
    ],
    [
      "Müssen wir unsere Praxissoftware wechseln?",
      therapie
        ? "Nein. Sorrida läuft im Browser neben Ihrer Software. Abrechnung und Terminplanung bleiben, wo sie sind."
        : `Nein. Sorrida öffnet sich aus Ihrer Praxissoftware mit dem aktuellen Patienten, ${dental ? "über VDDS-media (z. B. DS-Win, CGM Z1, charly, EVIDENT)" : "über GDT (z. B. Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS)"}. Ohne Anbindung geht es im Browser.`,
    ],
    ["Wie viel Arbeit macht die Einführung?", "Etwa eine Stunde: Preise prüfen, eigene Leistungen ergänzen, kurze Einweisung fürs Team. Im Pilotprogramm übernehmen wir die Einrichtung mit Ihnen."],
    ["Was kostet es?", `${PRICE_SHORT}. ${PRICE_TERMS}`],
  ];
  if (journal)
    return (
      <section className="grid gap-12 lg:grid-cols-12" aria-labelledby="faq">
        <div className="lg:col-span-4">
          <h2 id="faq" className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)]">
            Was Praxen <em>vor dem Start</em> fragen
          </h2>
          <p className="j-text mt-5">Ihre Frage fehlt? Im Pilotprogramm klären wir sie persönlich.</p>
        </div>
        <div className="border-t border-tinte lg:col-span-8">
          {fragen.map(([q, a]) => (
            <details key={q} className="group border-b border-linie">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
                <span className="j-titel text-[1.6rem] text-tinte transition-colors group-hover:text-brand-700">{q}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-linie-stark text-tinte-2 transition group-open:rotate-45 group-open:border-brand-700 group-open:text-brand-700" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="j-text max-w-2xl pb-7 text-[16px] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    );
  return (
    <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-labelledby="faq">
      <div>
        <h2 id="faq" className="font-display text-4xl text-slate-900">
          Was Praxen vor dem Start fragen
        </h2>
        <p className="mt-2 text-sm text-slate-500">Ihre Frage fehlt? Im Pilotprogramm klären wir sie persönlich.</p>
      </div>
      <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {fragen.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
              {q}
              <span className="text-slate-400 transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
