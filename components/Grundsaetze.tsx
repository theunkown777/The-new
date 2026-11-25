import { Behandlungsweg } from "@/components/Behandlungsweg";
import { KassenSockel } from "@/components/KassenSockel";
import { NutzenQuelleLink } from "@/components/NutzenQuelleLink";
import { igelMonitor } from "@/lib/nutzenQuelle";
import { eur } from "@/lib/pricing";

/** Ein Beispiel für die ganze Liste: Die Kasse zahlt 85 €, der eigene Anteil beträgt 155 € (Grundsatz 1 und 4). */
const BEISPIEL = { kasse: 85, eigen: 155 };

/** Beispiel für den Kasten „Zum Nutzen“: wörtlich wie beim PSA-Test im Katalog (lib/specialties.ts), mit Quelle. */
const BEISPIEL_NUTZEN = {
  text: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „PSA-Test zur Früherkennung von Prostatakrebs“ mit „tendenziell negativ“.",
  quelle: igelMonitor("PSA-Test zur Früherkennung von Prostatakrebs", "psa-test-zur-frueherkennung-von-prostatakrebs", "17.11.2026", "tendenziell negativ"),
};

// Sorridas Haltung in fünf Sätzen, gesetzt wie ein Inhaltsverzeichnis: große Ziffer, Grundsatz, Erklärung,
// und daneben ein kleines Bildelement, an dem man ihn wiedererkennt.
const SAETZE: { titel: string; text: string; bild: "sockel" | "nutzen" | "weg" | "konto" | "zaehler" }[] = [
  { titel: "Kasse zuerst", text: "Jeder Betrag baut auf dem Kassenanteil auf: erst was die Kasse zahlt, dann der eigene Anteil. Nie umgekehrt.", bild: "sockel" },
  { titel: "Nutzen nur mit Quelle", text: "Bei den Angeboten im Katalog, zu denen eine Bewertung des IGeL-Monitors des Medizinischen Dienstes hinterlegt ist, steht sie wörtlich mit Quelle beim Angebot. Eine eigene Wertung gibt Sorrida nicht ab.", bild: "nutzen" },
  { titel: "Ein Weg statt Listen", text: "Gespräch, Vorschlag, Entscheidung, Vereinbart, Bezahlt. Praxis und Patient sehen denselben Weg und den nächsten Schritt.", bild: "weg" },
  { titel: "Das Geld bleibt in der Praxis", text: "Bei Zahlung per GiroCode geht der volle Betrag direkt aufs Praxiskonto. Sorrida behält nichts ein und finanziert nichts vor. Für Kartenzahlung berechnet der Zahlungsdienst der Praxis seine eigenen Gebühren.", bild: "konto" },
  { titel: "Ein Preis, keine Zähler", text: "Kein Kontingent, das abläuft, keine Einheiten zum Nachkaufen. Was im Paket steht, ist drin.", bild: "zaehler" },
];

export function Grundsaetze() {
  return (
    <section className="grid gap-12 lg:grid-cols-12" aria-labelledby="grundsaetze" data-testid="grundsaetze">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-10">
          <h2 id="grundsaetze" className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)]">
            Fünf Grundsätze, an die sich <em>jede Ansicht</em> hält.
          </h2>
        </div>
      </div>
      <ol className="border-t border-tinte lg:col-span-8">
        {/* Handy: Ziffer neben dem Titel wie im Wegband. Ab sm steht sie groß in ihrer eigenen Spalte links (7rem). */}
        {SAETZE.map((s, i) => (
          <li key={s.titel} className="j-ein relative border-b border-linie py-9 sm:pl-28">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:items-end">
              <div>
                <div className="flex items-baseline gap-3 sm:block">
                  <span className="j-ziffer text-[2.4rem] sm:absolute sm:left-0 sm:top-9 sm:text-[3.6rem]">{i + 1}</span>
                  <h3 className="j-titel text-[2.2rem] text-tinte">{s.titel}</h3>
                </div>
                <p className="j-text mt-3 max-w-lg">{s.text}</p>
              </div>
              {s.bild === "sockel" && <KassenSockel kasse={BEISPIEL.kasse} eigen={BEISPIEL.eigen} />}
              {s.bild === "nutzen" && <p className="text-[15px] leading-snug text-amber-900"><span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-800">Zum Nutzen</span>{BEISPIEL_NUTZEN.text}<NutzenQuelleLink quelle={BEISPIEL_NUTZEN.quelle} /></p>}
              {s.bild === "weg" && (
                <div>
                  <Behandlungsweg erreicht={3} aktuell={3} size="gross" labels={["", "", "", "", ""]} animate />
                  <p className="mt-3 flex justify-between text-[12px] text-tinte-2">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" />Gespräch</span>
                    <span className="flex items-center gap-1.5">Bezahlt<span className="h-2 w-2 rounded-full border border-slate-300" /></span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-600 bg-white" />Nächster Schritt: Vereinbart
                  </p>
                </div>
              )}
              {s.bild === "konto" && (
                <div data-testid="grundsatz-konto">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-700">Beispiel: Zahlung per GiroCode</p>
                  <dl className="text-[15px]">
                    <div className="flex items-baseline justify-between gap-3 border-b border-linie pb-2">
                      <dt className="text-tinte">An Ihr Praxiskonto</dt>
                      <dd className="font-semibold tabular-nums text-brand-700">{eur(BEISPIEL.eigen)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 pt-2">
                      <dt className="text-tinte-2">An Sorrida</dt>
                      <dd className="tabular-nums text-tinte-2">{eur(0)}</dd>
                    </div>
                  </dl>
                </div>
              )}
              {/* Zähler, die es bei Sorrida nicht gibt: durchgestrichen und ohne Betrag. Der Text daneben sagt dasselbe in Worten. */}
              {s.bild === "zaehler" && (
                <div className="text-[15px] text-tinte-2" aria-hidden="true" data-testid="grundsatz-zaehler">
                  <p className="flex items-baseline justify-between gap-3 border-b border-linie pb-2">
                    <s className="decoration-brand-700">Kontingent</s>
                    <span>–</span>
                  </p>
                  <p className="flex items-baseline justify-between gap-3 pt-2">
                    <s className="decoration-brand-700">Nachkauf</s>
                    <span>–</span>
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
