import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { STRUKTUREN } from "@/lib/modelle/koerper";
import { INSTRUMENTE, ZAEHNE } from "@/lib/modelle/gebiss";

export const metadata: Metadata = {
  title: "Anatomie-Modelle: Gebiss und Körper zum Hineinzoomen – Sorrida",
  description: "Interaktive Modelle für Patienten und Praxen: alle Zähne mit den Instrumenten der Zahnarztpraxis sowie Knochen, Muskeln und Sehnen des Körpers, jeweils mit verständlicher Erklärung.",
};

export default function AnatomiePage() {
  const karten = [
    { href: "/anatomie/gebiss", titel: "Gebiss", text: `Alle ${ZAEHNE.length} Zähne, der Aufbau eines Zahns und ${INSTRUMENTE.length} Instrumente der Zahnarztpraxis: wofür sie da sind und wie sie sich anfühlen.`, fuer: "Für Zahnarztpraxen" },
    { href: "/anatomie/koerper", titel: "Körper", text: `${STRUKTUREN.length} Knochen, Muskeln, Sehnen, Bänder und Gelenke von vorn und hinten. Antippen zeigt, was es ist und welche Beschwerden dort häufig sind.`, fuer: "Für Arzt- und Therapiepraxen" },
  ];
  return (
    <PublicShell full>
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sehen, wo es sitzt</p>
        <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">Anatomie-Modelle zum Hineinzoomen</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Wer versteht, was im eigenen Körper passiert, entscheidet ruhiger. Mit den Modellen zeigt die Praxis, wo das Problem liegt und was
          dort gemacht wird. Patienten sehen dieselbe Stelle später in ihrem Patientenlink wieder, mit dem Hinweis ihrer Praxis.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {karten.map((k) => (
            <Link key={k.href} href={k.href} className="group rounded-3xl bg-white p-6 ring-1 ring-[#E9E2DA] transition hover:ring-brand-300" data-testid="anatomie-karte">
              <span className="text-xs font-medium text-salbei-700">{k.fuer}</span>
              <h2 className="mt-1 font-display text-2xl text-slate-900 group-hover:text-brand-700">{k.titel}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{k.text}</p>
              <span className="mt-4 inline-block text-sm font-medium text-brand-700">Modell öffnen →</span>
            </Link>
          ))}
        </div>
        <section className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-[#E9E2DA]">
          <h2 className="font-display text-xl text-slate-900">So nutzt die Praxis die Modelle</h2>
          <ol className="mt-3 grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
            <li><span className="font-semibold text-brand-700">1. Zeigen.</span> Am Bildschirm oder Tablet die Stelle antippen und heranzoomen.</li>
            <li><span className="font-semibold text-brand-700">2. Markieren.</span> Die Stelle für den Patienten markieren und einen kurzen Hinweis dazuschreiben.</li>
            <li><span className="font-semibold text-brand-700">3. Mitgeben.</span> Der Patient sieht Markierung und Erklärung zu Hause in seinem Patientenlink.</li>
          </ol>
        </section>
      </div>
    </PublicShell>
  );
}
