import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { STRUKTUREN } from "@/lib/modelle/koerper";
import { INSTRUMENTE, MILCHZAEHNE, ZAEHNE } from "@/lib/modelle/gebiss";
import { SCHNITTMODELLE } from "@/lib/modelle/schnitt";
import { MenschKarte } from "@/components/modelle/erklaerung/MenschKarte";

export const metadata: Metadata = {
  title: "Anatomie-Modelle: Körper, Gebiss, Auge, Ohr und Haut zum Hineinzoomen – Sorrida",
  description: "Interaktive Modelle für Patienten und Praxen: Organe, Knochen, Muskeln und Nerven des Körpers, alle Zähne mit den Instrumenten der Zahnarztpraxis sowie Auge, Ohr und Haut im Schnitt, jeweils mit verständlicher Erklärung.",
};

export default function AnatomiePage() {
  const karten = [
    { href: "/anatomie/koerper", titel: "Körper", text: `${STRUKTUREN.length} Organe, Knochen, Muskeln, Sehnen und Nerven von vorn und hinten, in Ebenen ein- und ausblendbar.`, fuer: "Hausarzt, Innere, Orthopädie, Physio u. a." },
    { href: "/anatomie/gebiss", titel: "Gebiss", text: `${ZAEHNE.length} bleibende Zähne, ${MILCHZAEHNE.length} Milchzähne, der Aufbau eines Zahns und ${INSTRUMENTE.length} Instrumente der Praxis.`, fuer: "Zahnarztpraxen" },
    ...Object.values(SCHNITTMODELLE).map((m) => ({ href: `/anatomie/${m.id}`, titel: m.titel.replace(/^(Das|Die) /, ""), text: `${m.teile.length} Teile im Schnitt: ${m.teile.slice(-5).reverse().map((t) => t.name.split(" (")[0]).join(", ")} und mehr.`, fuer: m.id === "auge" ? "Augenarzt" : m.id === "ohr" ? "HNO, Logopädie" : "Hautarzt, Ästhetik, Podologie" })),
  ];

  return (
    <PublicShell full>
      <div className="mx-auto max-w-6xl">
        <p className="j-marke text-brand-700">Sehen, wo es sitzt</p>
        <h1 className="j-schau mt-3 text-[clamp(2.6rem,5.5vw,4.4rem)]">
          Der Körper, <em>verständlich erklärt.</em>
        </h1>
        <p className="j-text mt-4 max-w-2xl text-lg">
          Wer versteht, was im eigenen Körper passiert, entscheidet ruhiger. Die Praxis zeigt am Bildschirm, wo das Problem liegt, und erklärt
          jedes Teil in einfachen Worten. Patienten sehen dieselbe Stelle später in ihrem Patientenlink wieder.
        </p>
        <div className="mt-12">
          <MenschKarte ueberschrift={false} />
        </div>
        <h2 className="j-titel mt-20 border-t border-linie pt-8 text-[2rem] text-tinte">Die Modelle zum Drehen und Markieren</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {karten.map((k) => (
            <Link key={k.href} href={k.href} className="j-kachel group rounded-[8px] bg-papier-2 p-6" data-testid="anatomie-karte">
              <span className="j-marke text-salbei-700">Für {k.fuer}</span>
              <h2 className="j-titel mt-2 text-[1.8rem] text-tinte group-hover:text-brand-700">{k.titel}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-tinte-2">{k.text}</p>
              <span className="mt-4 inline-block text-[15px] font-semibold text-brand-700">Modell öffnen →</span>
            </Link>
          ))}
        </div>
        <section className="mt-12 grid gap-6 border-t border-linie pt-8 sm:grid-cols-3">
          {[
            ["Zeigen", "Am Bildschirm oder Tablet die Stelle antippen und heranfahren."],
            ["Markieren", "Die Stelle für den Patienten markieren und einen kurzen Hinweis dazuschreiben."],
            ["Mitgeben", "Der Patient sieht Markierung und Erklärung zu Hause in seinem Patientenlink."],
          ].map(([t, d], i) => (
            <div key={t}>
              <span className="j-ziffer text-[2.6rem]">{i + 1}</span>
              <p className="j-titel mt-2 text-2xl text-tinte">{t}</p>
              <p className="mt-1 text-[15px] text-tinte-2">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </PublicShell>
  );
}
