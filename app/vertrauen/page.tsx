import type { Metadata } from "next";
import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";
import { DIENSTE } from "@/lib/dienstleister";
import { LOESCHFRISTEN, NICHT_AUTOMATISCH } from "@/lib/loeschfristen";
import { KI_ERSETZT, KI_GEHT, KI_HINWEISE, NOCH_NICHT, ORT, SCHUTZ, VERTRAUEN_STAND } from "@/lib/vertrauen";

export const metadata: Metadata = {
  title: "So geht Sorrida mit Daten um – Sorrida",
  description:
    "Wo die Daten liegen, welche Dienstleister beteiligt sind, was an den KI-Dienst geht und was vorher ersetzt wird, wann Daten gelöscht werden und was es bei Sorrida noch nicht gibt.",
};

// Öffentliche Seite. Nur Tatsachen aus dem Code, dem AVV-Muster und der Datenschutzerklärung
// (Texte und Belege in lib/vertrauen.ts, Dienstleister in lib/dienstleister.ts, Fristen in lib/loeschfristen.ts).
// Keine Siegel, keine Zusagen.
export default function VertrauenPage() {
  const abschnitte: [string, string][] = [
    ["ort", "Wo die Daten liegen"],
    ["dienstleister", "Dienstleister"],
    ["ki", "KI"],
    ["loeschen", "Löschfristen"],
    ["schutz", "Schutzmaßnahmen"],
    ["noch-nicht", "Was es noch nicht gibt"],
  ];
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20" data-testid="vertrauen">
        <h1 className="j-schau text-[clamp(2.6rem,7vw,4.4rem)]">
          So geht Sorrida <em>mit Daten um</em>
        </h1>
        <p className="j-text mt-5 max-w-xl text-lg">
          Auf dieser Seite steht, was die Software tatsächlich tut. Jede Angabe lässt sich im Vertrag zur Auftragsverarbeitung oder in der
          Datenschutzerklärung nachlesen. Am Ende steht, was es noch nicht gibt.
        </p>
        <p className="mt-3 text-sm text-tinte-2">Stand: {VERTRAUEN_STAND}</p>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px]" aria-label="Abschnitte">
          {abschnitte.map(([id, titel]) => (
            <a key={id} href={`#${id}`} className="j-link text-tinte-2">
              {titel}
            </a>
          ))}
        </nav>

        <section id="ort" className="mt-14 scroll-mt-6" data-testid="vertrauen-ort">
          <h2 className="j-titel text-[2rem] text-tinte">Wo die Daten liegen</h2>
          <dl className="mt-6 border-t border-tinte">
            {ORT.map((p) => (
              <div key={p.titel} className="border-b border-linie py-5">
                <dt className="font-semibold text-tinte">{p.titel}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-tinte-2">{p.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="dienstleister" className="mt-14 scroll-mt-6" data-testid="vertrauen-dienstleister">
          <h2 className="j-titel text-[2rem] text-tinte">Dienstleister und wozu</h2>
          <p className="mt-2 max-w-xl text-[15px] text-tinte-2">
            Dieselbe Liste steht im <Link href="/avv" className="j-link text-brand-700">Muster des Vertrags zur Auftragsverarbeitung</Link>, Anlage 2.
          </p>
          <ul className="mt-6 border-t border-tinte">
            {DIENSTE.map((d) => (
              <li key={d.dienst} className="border-b border-linie py-5 text-[15px] leading-relaxed">
                <p className="font-semibold text-tinte">{d.dienst}</p>
                <p className="mt-1 text-tinte-2"><span className="text-tinte">Wozu:</span> {d.zweck}</p>
                <p className="text-tinte-2"><span className="text-tinte">Welche Daten:</span> {d.daten}</p>
                <p className="text-tinte-2"><span className="text-tinte">Ort:</span> {d.ort}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="ki" className="mt-14 scroll-mt-6" data-testid="vertrauen-ki">
          <h2 className="j-titel text-[2rem] text-tinte">Was an den KI-Dienst geht und was vorher ersetzt wird</h2>
          <div className="mt-6 grid gap-8 border-t border-tinte pt-6 sm:grid-cols-2">
            <div>
              <h3 className="j-marke">Das geht an den KI-Dienst</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-tinte-2">
                {KI_GEHT.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="j-marke">Das ersetzt Sorrida vor dem Versand durch Platzhalter</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-tinte-2" data-testid="vertrauen-ki-ersetzt">
                {KI_ERSETZT.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-[15px] leading-relaxed text-tinte-2">
            {KI_HINWEISE.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section id="loeschen" className="mt-14 scroll-mt-6" data-testid="vertrauen-loeschfristen">
          <h2 className="j-titel text-[2rem] text-tinte">Löschfristen</h2>
          <p className="mt-2 max-w-xl text-[15px] text-tinte-2">Diese Daten löscht Sorrida von selbst. Der Lauf kommt einmal in der Nacht.</p>
          <ul className="mt-6 border-t border-tinte">
            {LOESCHFRISTEN.map((f) => (
              <li key={f.id} className="grid gap-1 border-b border-linie py-4 text-[15px] leading-relaxed sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-6">
                <span className="text-tinte">{f.daten}</span>
                <span className="text-tinte-2">{f.frist}</span>
              </li>
            ))}
          </ul>
          <h3 className="j-marke mt-8">Das löscht Sorrida nicht von selbst</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-tinte-2">
            {NICHT_AUTOMATISCH.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section id="schutz" className="mt-14 scroll-mt-6" data-testid="vertrauen-schutz">
          <h2 className="j-titel text-[2rem] text-tinte">Schutzmaßnahmen</h2>
          <dl className="mt-6 border-t border-tinte">
            {SCHUTZ.map((p) => (
              <div key={p.titel} className="border-b border-linie py-5">
                <dt className="font-semibold text-tinte">{p.titel}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-tinte-2">{p.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="noch-nicht" className="mt-14 scroll-mt-6" data-testid="vertrauen-noch-nicht">
          <h2 className="j-titel text-[2rem] text-tinte">Was es noch nicht gibt</h2>
          <dl className="mt-6 border-t border-tinte">
            {NOCH_NICHT.map((p) => (
              <div key={p.titel} className="border-b border-linie py-5">
                <dt className="font-semibold text-tinte">{p.titel}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-tinte-2">{p.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-12 text-[15px] leading-relaxed text-tinte-2">
          Mehr dazu: <Link href="/datenschutz" className="j-link text-brand-700">Datenschutzerklärung</Link>,{" "}
          <Link href="/avv" className="j-link text-brand-700">AVV-Muster</Link>,{" "}
          <Link href="/status" className="j-link text-brand-700">Status und Störungen</Link>.
        </p>
      </main>
    </JournalRahmen>
  );
}
