import { PRICE_SHORT, PRICE_TERMS } from "@/lib/pricing";
import Link from "next/link";

// Keine Namen einzelner Praxisprogramme, solange es je Programm kein Testprotokoll aus einer Praxis gibt (Prüfbericht A19).
const SCHNITTSTELLE_SATZ =
  "Programme, die diese Schnittstellen anbieten, können Sorrida mit dem aktuellen Patienten öffnen. Welche Programme wir schon in einer Praxis getestet haben, sagen wir Ihnen auf Anfrage.";

type FaqGruppe = { therapie?: boolean; dental?: boolean; alle?: boolean };

/** Antwort auf „Ist das nicht Verkaufen am Patienten?“ je Fachgruppe; als Daten exportiert, damit Tests die Regel prüfen. */
export function faqVerkaufen({
  therapie = false,
  dental = false,
}: FaqGruppe): string {
  return therapie
    ? "Nein. Sorrida zeigt zuerst, was auf Verordnung möglich ist, und rechnet die gesetzliche Zuzahlung nach § 32 und § 61 SGB V. Selbstzahler-Einheiten stehen daneben, mit Preis und Hinweis auf Kassenzuschüsse. Empfohlen wird nichts von sich aus."
    : dental
      ? "Nein. Die Kassenleistung (Regelversorgung) steht immer zuerst und ist vorausgewählt. Gleich- und andersartige Versorgungen stehen mit Eigenanteil daneben. Was hervorgehoben wird, klickt die Praxis an; Sorrida empfiehlt nichts von sich aus."
      : "Nein. Die Kassenleistung steht immer zuerst und ist immer vorausgewählt. Bei den Angeboten im Katalog, zu denen eine Bewertung des IGeL-Monitors des Medizinischen Dienstes hinterlegt ist, steht sie wörtlich mit Quelle beim Angebot. Was hervorgehoben wird, klickt die Praxis an; Sorrida empfiehlt nichts von sich aus. Das entspricht dem, was Patientenvertreter fordern: Information, Bedenkzeit und Kosten vorab.";
}

/** Antwort auf „Wobei hilft Sorrida rechtlich?“ je Fachgruppe. */
export function faqRechtlich({
  therapie = false,
  dental = false,
  alle = false,
}: FaqGruppe): string {
  return `Sorrida erstellt die Kosteninformation mit den voraussichtlichen Kosten je Option als Text zum Ausdrucken oder Mitgeben und ${
    therapie
      ? "erinnert an die schriftliche Vereinbarung vor Selbstzahlerleistungen; die Zuzahlung rechnet Sorrida nach § 32 und § 61 SGB V in der jeweils geltenden Fassung"
      : dental
        ? "erinnert an Mehrkostenvereinbarung und Heil- und Kostenplan, die Sie weiter in Ihrer Praxissoftware erstellen"
        : alle
          ? "erinnert an die schriftliche Vereinbarung vor einer Selbstzahlerleistung und an die Bedenkzeit"
          : "erinnert an die schriftliche Vereinbarung vor einer Selbstzahlerleistung (§ 18 Abs. 8 BMV-Ä) und an die Bedenkzeit"
  }. Das unterstützt Sie bei der Information nach § 630c Abs. 3 BGB. Die Verantwortung für Inhalt, Zeitpunkt und Form bleibt bei Ihrer Praxis; Sorrida ersetzt keine Rechtsberatung.`;
}

// Häufige Fragen von Praxen vor dem Start (aus Recherche und Pilotgesprächen abgeleitet).
// `alle`: Fassung für die Startseite, die kein Fach voraussetzt.
export function PraxisFaq({ therapie = false, dental = false, journal = false, alle = false }: { therapie?: boolean; dental?: boolean; journal?: boolean; alle?: boolean }) {
  const fragen: [string, React.ReactNode][] = [
    [
      "Ist das nicht Verkaufen am Patienten?",
      faqVerkaufen({ therapie, dental }),
    ],
    [
      // Keine Aussage „erfüllt § 630c“: Ob die Information im Einzelfall genügt, entscheidet die Praxis (Prüfbericht A16, T10).
      "Wobei hilft Sorrida rechtlich, und was bleibt bei uns?",
      faqRechtlich({ therapie, dental, alle }),
    ],
    [
      "Wo liegen die Daten?",
      <>
        Anwendung und Datenbank laufen in Rechenzentren in Frankfurt am Main. Die Betreiber sind US-Unternehmen. Für E-Mail-Versand und die
        Formulierung von Berichtsentwürfen nutzen wir Dienste mit Verarbeitung in den USA; den Namen des Patienten, Geburtsdatum, Versichertennummer und
        Kontaktdaten ersetzen wir vorher durch Platzhalter. Alle Dienstleister stehen im{" "}
        <Link href="/avv" className="underline">
          AVV-Muster
        </Link>
        . Patienten-Links enthalten keine Patientendaten und laufen ab.
      </>,
    ],
    [
      "Müssen wir unsere Praxissoftware wechseln?",
      therapie
        ? "Nein. Sorrida läuft im Browser neben Ihrer Software. Abrechnung und Terminplanung bleiben, wo sie sind."
        : alle
          ? `Nein. Sorrida nutzt die Standardschnittstellen GDT (Arztpraxen) und VDDS-media (Zahnarztpraxen). ${SCHNITTSTELLE_SATZ} Therapiepraxen und alle ohne Anbindung nutzen Sorrida im Browser neben ihrer Software.`
          : `Nein. Sorrida nutzt die Standardschnittstelle ${dental ? "VDDS-media" : "GDT"}. ${SCHNITTSTELLE_SATZ} Ohne Anbindung geht es im Browser.`,
    ],
    ["Wie viel Arbeit macht die Einführung?", "Erfahrungswert aus der Entwicklung: etwa eine Stunde für Preise prüfen, eigene Leistungen ergänzen und eine kurze Einweisung fürs Team. Im Pilot messen wir es. Im Pilotprogramm übernehmen wir die Einrichtung mit Ihnen."],
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
        <h2 id="faq" className="scroll-mt-6 font-display text-4xl text-slate-900">
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
