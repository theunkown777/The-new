import type { Metadata } from "next";
import Link from "next/link";
import { SPECIALTIES } from "@/lib/specialties";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Sorrida für Arztpraxen – Fachgebiete",
  description:
    "Selbstzahlerleistungen (IGeL) ehrlich anbieten: Kassenleistung zuerst, Preis, Hinweis zum Nutzen, Patienten-Link und schriftliche Vereinbarung. Für Hausarzt, Augen, Haut, Frauenheilkunde, Urologie, Orthopädie, HNO, Kinder, Kardiologie und mehr.",
};

export default function SpecialtiesIndex() {
  return (
    <PublicShell wide>
      <h1 className="text-3xl font-semibold leading-tight text-slate-900">Sorrida für jede Praxis, angepasst an Ihr Fach</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Ob Zahnarzt, Hautärztin oder Orthopäde: Patienten wollen wissen, was die Kasse zahlt und was sie selbst zahlen. Sorrida zeigt es
        ehrlich, zuerst die Kassenleistung, dann Selbstzahlerleistungen mit Preis und mit dem, was über ihren Nutzen bekannt ist.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        <li className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <Link href="/" className="block">
            <h2 className="font-semibold text-slate-900">Zahnmedizin</h2>
            <p className="mt-1 text-sm text-slate-600">Zahnschema, Festzuschuss 2026/2027, Mehrkostenvereinbarung, Befund-Diktat.</p>
          </Link>
        </li>
        {SPECIALTIES.map((s) => (
          <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300">
            <Link href={`/fachgebiete/${s.id}`} className="block">
              <h2 className="font-semibold text-slate-900">{s.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{s.marketing.headline}</p>
            </Link>
          </li>
        ))}
        <li className="rounded-2xl border border-dashed border-slate-300 p-5">
          <h2 className="font-semibold text-slate-900">Ihr Fach fehlt?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Legen Sie Ihre eigenen Leistungen an: Anlass, Preis, wann die Kasse zahlt, Hinweis zum Nutzen. Alles andere funktioniert genauso.
          </p>
        </li>
      </ul>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          ["Kasse zuerst", "Jede Auswahl beginnt mit der Kassenleistung und sagt, wann die Kasse auch die Zusatzleistung zahlt."],
          ["Nutzen offen", "Bei jeder Selbstzahlerleistung steht, was über ihren Nutzen bekannt ist. Sorrida empfiehlt keine IGeL von sich aus."],
          ["Regeln eingebaut", "Schriftliche Vereinbarung vor der Leistung, Kostenschätzung nach GOÄ, Bedenkzeit, Aufklärung in Textform."],
        ].map(([t, d]) => (
          <div key={t}>
            <h3 className="font-semibold text-slate-900">{t}</h3>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>
    </PublicShell>
  );
}
