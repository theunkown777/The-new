import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Sorrida für jedes Fach – mit eigenen Leistungen",
  description:
    "Neurologie, Psychiatrie, Gastroenterologie, Chirurgie oder Physikalische Medizin: Legen Sie Ihre Leistungen selbst an. Kassenleistung zuerst, Preis, Hinweis zum Nutzen, Patienten-Link und IGeL-Vereinbarung funktionieren wie in jedem Fach.",
};

const BEISPIEL = [
  { anlass: "Darmkrebs-Vorsorge", name: "Darmspiegelung", preis: "Kasse", kasse: "Kassenleistung ab 50 Jahren", nutzen: "" },
  { anlass: "Darmkrebs-Vorsorge", name: "Zusätzlicher Stuhltest auf Wunsch", preis: "35 €", kasse: "Ab 50 im Rahmen der Vorsorge Kassenleistung", nutzen: "Ersetzt die Darmspiegelung nicht." },
  { anlass: "Unverträglichkeit", name: "Atemtest ohne Beschwerden", preis: "45 €", kasse: "Bei Beschwerden Kassenleistung", nutzen: "" },
];

export default function AnderesFach() {
  return (
    <PublicShell wide>
      <p className="text-sm font-medium text-brand-700">Sorrida für jedes Fach</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">Ihr Fach ist nicht dabei? Dann legen Sie Ihre Leistungen selbst an.</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        Für neun Fächer bringt Sorrida fertige Anlässe mit. Für alle anderen tragen Sie ein, was Sie anbieten. Alles andere funktioniert
        genauso: Kassenleistung zuerst, Patienten-Link, Rückmeldung, schriftliche Vereinbarung und Auswertung.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/register?fach=andere" className="btn-primary">
          Praxis kostenlos anlegen
        </Link>
        <Link href="/demo?fach=hausarzt" className="btn-secondary">
          Erst ansehen (Beispiel Hausarztpraxis)
        </Link>
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">So richten Sie es ein</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
            <li>Praxis anlegen und als Fachgebiet „Andere Fachrichtung“ wählen.</li>
            <li>Unter Einstellungen → Fachgebiet und Leistungen je Leistung eintragen: Anlass, Name, Preis.</li>
            <li>Optional: wann die Kasse zahlt und was über den Nutzen bekannt ist. Beides sieht der Patient.</li>
            <li>Kassenleistungen ankreuzen, damit sie in der Auswahl immer oben stehen.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Beispiel Gastroenterologie: eigene Leistungen</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {BEISPIEL.map((b) => (
              <li key={b.name} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {b.anlass}: {b.name}
                  </span>
                  <span className="tabular-nums text-slate-600">{b.preis}</span>
                </div>
                {b.kasse && <p className="mt-1 text-green-800">Kasse zahlt: {b.kasse}</p>}
                {b.nutzen && <p className="mt-1 text-amber-800">Zum Nutzen: {b.nutzen}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Ihr Fach soll fertige Vorlagen bekommen?</h2>
        <p className="mt-1 text-slate-600">
          Schreiben Sie uns, welche Leistungen Sie am häufigsten erklären. Wir bauen daraus ein Regelwerk für Ihr Fach und lassen es von
          Kolleginnen und Kollegen gegenlesen.
        </p>
        <Link href="/zahnmedizin#kontakt" className="mt-3 inline-block text-brand-700 underline">
          Kontakt aufnehmen
        </Link>
      </section>
    </PublicShell>
  );
}
