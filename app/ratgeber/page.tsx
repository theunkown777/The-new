import type { Metadata } from "next";
import Link from "next/link";
import { ratgeberNachGruppen } from "@/lib/ratgeber";
import { JournalRahmen } from "@/components/start/JournalKopf";

export const metadata: Metadata = {
  title: "Ratgeber für Praxisteams: Kassenleistung, Zuzahlung, Selbstzahler – Sorrida",
  description:
    "Kurz erklärt für Arzt-, Zahnarzt-, Psychotherapie- und Therapiepraxen: Kosten vor der Behandlung nennen, Zuzahlungen 2027, IGeL-Vereinbarung, GOÄ-Rechnung, Heilmittel-Zuzahlung, Festzuschuss.",
};

export default function RatgeberIndex() {
  const gruppen = ratgeberNachGruppen();
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="j-schau text-[clamp(2.8rem,7vw,4.6rem)]">
          Ratgeber <em>für Praxisteams</em>
        </h1>
        <p className="j-text mt-5 max-w-xl text-lg">
          Kurze, sachliche Erklärungen zu den Kostenfragen, über die Patienten am Empfang am häufigsten stolpern. Für Empfang, Abrechnung
          und Behandelnde, in jeder Fachrichtung.
        </p>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px]" aria-label="Gruppen">
          {gruppen.map(({ gruppe }) => (
            <a key={gruppe.id} href={`#${gruppe.id}`} className="j-link text-tinte-2">
              {gruppe.titel}
            </a>
          ))}
        </nav>
        {gruppen.map(({ gruppe, artikel }) => (
          <section key={gruppe.id} id={gruppe.id} className="mt-14 scroll-mt-6" data-testid={`ratgeber-gruppe-${gruppe.id}`}>
            <h2 className="j-titel text-[2rem] text-tinte">{gruppe.titel}</h2>
            <p className="mt-2 max-w-xl text-[15px] text-tinte-2">{gruppe.text}</p>
            <ol className="mt-6 border-t border-tinte">
              {artikel.map((a, i) => (
                <li key={a.slug} className="border-b border-linie">
                  <Link prefetch={false} href={`/ratgeber/${a.slug}`} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-6">
                    <span className="j-ziffer text-2xl">{i + 1}</span>
                    <span>
                      <span className="j-titel block text-[1.7rem] text-tinte group-hover:text-brand-700">{a.title}</span>
                      <span className="mt-1 block text-[15px] text-tinte-2">{a.description}</span>
                    </span>
                    <span className="j-pfeil text-tinte-2 group-hover:text-brand-700" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </JournalRahmen>
  );
}
