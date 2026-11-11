import Link from "next/link";
import { RATGEBER, ratgeber, type RatgeberSlug } from "@/lib/ratgeber";
import { JournalRahmen } from "@/components/start/JournalKopf";

// Rahmen für Ratgeber-Artikel: öffentlich, lesbar, mit strukturierten Daten
// für Suchmaschinen und einem Hinweis auf die Demo am Ende.
export function ArticlePage({ slug, children }: { slug: RatgeberSlug; children: React.ReactNode }) {
  const a = ratgeber(slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    dateModified: a.updated,
    inLanguage: "de-DE",
    publisher: { "@type": "Organization", name: "Sorrida" },
  };
  return (
    <JournalRahmen>
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link prefetch={false} href="/ratgeber" className="j-link text-[15px] text-tinte-2">
        ← Alle Ratgeber
      </Link>
      <article className="mt-10">
        <p className="j-marke">
          Ratgeber · Stand {new Date(a.updated).toLocaleDateString("de-DE")}
        </p>
        <h1 className="j-schau mb-6 mt-4 text-[clamp(2.4rem,6vw,3.8rem)]">{a.title}</h1>
        <p className="j-text mb-10 text-lg">{a.description}</p>
        <div className="space-y-5 leading-relaxed text-tinte [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-12 [&_h2]:border-t [&_h2]:border-linie [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-[1.9rem] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:text-tinte [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_table]:w-full [&_table]:text-[15px] [&_table]:tabular-nums [&_td]:border-b [&_td]:border-linie [&_td]:py-2.5 [&_th]:border-b [&_th]:border-tinte [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
      <aside className="mt-16 bg-papier-2 px-6 py-8 sm:px-8">
        <h2 className="j-titel text-[1.8rem] text-tinte">Sorrida rechnet das <em className="text-brand-700">für jeden Patienten</em> aus</h2>
        <p className="j-text mt-3">
          Befund anklicken oder diktieren, Sorrida zeigt jede sinnvolle Option mit Eigenanteil, auch im Vergleich 2026 und 2027.
          Der Patient bekommt alles als Link aufs Handy.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link prefetch={false} href="/demo" className="j-knopf j-knopf-voll">
            Sofort ausprobieren
          </Link>
          <Link prefetch={false} href="/hilfe" className="j-knopf j-knopf-linie">
            Pilotplatz anfragen
          </Link>
        </div>
      </aside>
      <section className="mt-14">
        <h2 className="j-marke border-b border-tinte pb-3">Weitere Ratgeber</h2>
        <ul>
          {RATGEBER.filter((x) => x.slug !== slug).map((x) => (
            <li key={x.slug} className="border-b border-linie">
              <Link prefetch={false} href={`/ratgeber/${x.slug}`} className="group flex items-baseline justify-between gap-4 py-3">
                <span className="j-titel text-xl text-tinte group-hover:text-brand-700">{x.title}</span>
                <span className="j-pfeil text-tinte-2" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-10 text-xs text-tinte-2">
        Allgemeine Information, keine Rechts- oder Abrechnungsberatung. Maßgeblich sind die aktuellen Vorgaben von KZBV, KZV und
        Krankenkasse.
      </p>
    </main>
    </JournalRahmen>
  );
}
