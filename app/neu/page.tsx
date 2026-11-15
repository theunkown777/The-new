import type { Metadata } from "next";
import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";
import { neuigkeitDatum, neuigkeitenNachTagen } from "@/lib/neuigkeiten";

export const metadata: Metadata = {
  title: "Neu in Sorrida",
  description: "Was zuletzt in Sorrida dazugekommen ist: kurz beschrieben, mit Datum und für wen es gedacht ist.",
  alternates: { canonical: "/neu" },
};

// Öffentliche Seite im Journal-Stil. Die Einträge stehen in lib/neuigkeiten.ts. Bewusst ohne Rundbrief und ohne Formular.
export default function NeuSeite() {
  const tage = neuigkeitenNachTagen();
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20" data-testid="neu">
        <h1 className="j-schau text-[clamp(2.8rem,7vw,4.6rem)]">
          Neu <em>in Sorrida</em>
        </h1>
        <p className="j-text mt-5 max-w-xl text-lg">Was zuletzt dazugekommen ist, kurz beschrieben. Mit Datum und für wen es gedacht ist.</p>
        {tage.map((tag) => (
          <section key={tag.datum} className="mt-14" aria-labelledby={`tag-${tag.datum}`} data-testid={`neu-tag-${tag.datum}`}>
            <h2 id={`tag-${tag.datum}`} className="j-marke">
              <time dateTime={tag.datum}>{neuigkeitDatum(tag.datum)}</time>
            </h2>
            <ol className="mt-4 border-t border-tinte">
              {tag.eintraege.map((n) => (
                <li key={n.titel} className="border-b border-linie py-6" data-testid="neu-eintrag">
                  <h3 className="j-titel text-[1.7rem] text-tinte">{n.titel}</h3>
                  <p className="mt-2 text-[15px] text-tinte-2">{n.text}</p>
                  <p className="mt-2 text-sm text-tinte-2">
                    <span className="text-tinte">Für:</span> {n.fuerWen}
                    {n.link && (
                      <>
                        {" · "}
                        <Link prefetch={false} href={n.link.href} className="j-link text-brand-700">
                          {n.link.name}
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </JournalRahmen>
  );
}
