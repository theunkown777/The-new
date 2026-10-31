import Link from "next/link";

// Häufige Fragen von Praxen vor dem Start (aus Recherche und Pilotgesprächen abgeleitet).
export function PraxisFaq({ therapie = false, dental = false }: { therapie?: boolean; dental?: boolean }) {
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
    ["Was kostet es?", "149 € im Monat für Einzelpraxen, 249 € für bis zu fünf Behandelnde. Ohne Zähler und ohne KI-Kontingent, 30 Tage kostenlos, monatlich kündbar."],
  ];
  return (
    <section className="mt-14" aria-labelledby="faq">
      <h2 id="faq" className="text-2xl font-semibold text-slate-900">
        Was Praxen vor dem Start fragen
      </h2>
      <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
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
