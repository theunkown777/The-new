import { Behandlungsweg, Laechelbogen } from "@/components/Behandlungsweg";
import { KassenSockel } from "@/components/KassenSockel";

// Sorridas Haltung in fünf Sätzen, jeder mit dem Bildelement, an dem man ihn
// im Produkt wiedererkennt.
export function Grundsaetze() {
  return (
    <section className="mt-20" aria-labelledby="grundsaetze" data-testid="grundsaetze">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand-700"><Laechelbogen className="h-2 w-8" />Woran Sie Sorrida erkennen</p>
      <h2 id="grundsaetze" className="font-display mt-1 max-w-3xl text-4xl leading-tight text-slate-900 sm:text-5xl">Fünf Grundsätze, an die sich jede Ansicht hält.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-3xl bg-white p-6">
          <p className="font-display text-5xl text-brand-600">1</p>
          <h3 className="font-display mt-2 text-2xl text-slate-900">Kasse zuerst</h3>
          <p className="mt-2 text-sm text-slate-600">Jeder Betrag steht auf dem Kassen-Sockel: erst was die Kasse zahlt, dann der eigene Anteil. Nie umgekehrt.</p>
          <KassenSockel className="mt-4" kasse={85} eigen={155} />
        </article>
        <article className="rounded-3xl bg-white p-6">
          <p className="font-display text-5xl text-brand-600">2</p>
          <h3 className="font-display mt-2 text-2xl text-slate-900">Ehrlich zum Nutzen</h3>
          <p className="mt-2 text-sm text-slate-600">Wo ein Nutzen nicht belegt ist, steht das beim Angebot. Wer vertraut, kommt wieder.</p>
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Zum Nutzen: Ohne Verdacht ist ein Zusatznutzen nicht belegt.</p>
        </article>
        <article className="rounded-3xl bg-white p-6">
          <p className="font-display text-5xl text-brand-600">3</p>
          <h3 className="font-display mt-2 text-2xl text-slate-900">Ein Weg statt Listen</h3>
          <p className="mt-2 text-sm text-slate-600">Gespräch, Vorschlag, Entscheidung, Vereinbart, Bezahlt. Praxis und Patient sehen denselben Weg und den nächsten Schritt.</p>
          <div className="mt-4"><Behandlungsweg erreicht={3} aktuell={3} size="gross" /></div>
        </article>
        <article className="rounded-3xl bg-white p-6">
          <p className="font-display text-5xl text-brand-600">4</p>
          <h3 className="font-display mt-2 text-2xl text-slate-900">Das Geld bleibt in der Praxis</h3>
          <p className="mt-2 text-sm text-slate-600">Patienten zahlen per GiroCode direkt aufs Praxiskonto. Kein Abschlag, keine Finanzierungsmarge dazwischen.</p>
        </article>
        <article className="rounded-3xl bg-white p-6">
          <p className="font-display text-5xl text-brand-600">5</p>
          <h3 className="font-display mt-2 text-2xl text-slate-900">Ein Preis, keine Zähler</h3>
          <p className="mt-2 text-sm text-slate-600">Kein Kontingent, das abläuft, keine Einheiten zum Nachkaufen. Was im Paket steht, ist drin.</p>
        </article>
        <article className="rounded-3xl bg-brand-700 p-6 text-white">
          <p className="font-display text-3xl leading-tight">Sorrida heißt „lächeln“.</p>
          <p className="mt-2 text-sm text-white/85">Der Bogen aus dem Logo zieht sich durch das ganze Produkt: als Weg, als Markierung, als Unterschriftslinie. Weil gute Aufklärung am Ende beide Seiten zufrieden macht.</p>
        </article>
      </div>
    </section>
  );
}
