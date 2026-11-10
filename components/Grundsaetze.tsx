import { Behandlungsweg } from "@/components/Behandlungsweg";
import { KassenSockel } from "@/components/KassenSockel";

// Sorridas Haltung in fünf Sätzen, gesetzt wie ein Inhaltsverzeichnis: große Ziffer, Grundsatz, Erklärung,
// und wo es das Produkt zeigt, das Bildelement, an dem man ihn wiedererkennt.
const SAETZE: { titel: string; text: string; bild?: "sockel" | "nutzen" | "weg" }[] = [
  { titel: "Kasse zuerst", text: "Jeder Betrag steht auf dem Kassen-Sockel: erst was die Kasse zahlt, dann der eigene Anteil. Nie umgekehrt.", bild: "sockel" },
  { titel: "Ehrlich zum Nutzen", text: "Wo ein Nutzen nicht belegt ist, steht das beim Angebot. Wer vertraut, kommt wieder.", bild: "nutzen" },
  { titel: "Ein Weg statt Listen", text: "Gespräch, Vorschlag, Entscheidung, Vereinbart, Bezahlt. Praxis und Patient sehen denselben Weg und den nächsten Schritt.", bild: "weg" },
  { titel: "Das Geld bleibt in der Praxis", text: "Patienten zahlen per GiroCode direkt aufs Praxiskonto. Kein Abschlag, keine Finanzierungsmarge dazwischen." },
  { titel: "Ein Preis, keine Zähler", text: "Kein Kontingent, das abläuft, keine Einheiten zum Nachkaufen. Was im Paket steht, ist drin." },
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
        {SAETZE.map((s, i) => (
          <li key={s.titel} className="j-ein grid gap-4 border-b border-linie py-9 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-8">
            <span className="j-ziffer text-[3.6rem]">{i + 1}</span>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] md:items-end">
              <div>
                <h3 className="j-titel text-[2rem] text-tinte">{s.titel}</h3>
                <p className="j-text mt-3 max-w-lg">{s.text}</p>
              </div>
              {s.bild === "sockel" && <KassenSockel kasse={85} eigen={155} />}
              {s.bild === "nutzen" && <p className="text-[14px] leading-snug text-amber-900"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">Zum Nutzen</span>Ohne Verdacht ist ein Zusatznutzen nicht belegt.</p>}
              {s.bild === "weg" && <Behandlungsweg erreicht={3} aktuell={3} size="gross" animate />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
