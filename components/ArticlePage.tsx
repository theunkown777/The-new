import Link from "next/link";
import { RATGEBER, ratgeber, type RatgeberSlug } from "@/lib/ratgeber";

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-auto" />
          <span className="font-brand text-brand-700">SORRIDA</span>
        </Link>
        <Link href="/ratgeber" className="text-brand-600 hover:underline">
          Alle Ratgeber
        </Link>
      </nav>
      <article>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Ratgeber · Stand {new Date(a.updated).toLocaleDateString("de-DE")}
        </p>
        <h1 className="mb-4 mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{a.title}</h1>
        <p className="mb-8 text-lg leading-relaxed text-slate-600">{a.description}</p>
        <div className="space-y-5 leading-relaxed text-slate-700 [&_a]:text-brand-600 [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:border-slate-200 [&_td]:py-2 [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
      <aside className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sorrida rechnet das für jeden Patienten aus</h2>
        <p className="mt-2 text-slate-700">
          Befund anklicken oder diktieren, Sorrida zeigt jede sinnvolle Option mit Eigenanteil, auch im Vergleich 2026 und 2027.
          Der Patient bekommt alles als Link aufs Handy.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary">
            Sofort ausprobieren
          </Link>
          <Link href="/#kontakt" className="btn-secondary">
            Pilotplatz anfragen
          </Link>
        </div>
      </aside>
      <section className="mt-10 text-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Weitere Ratgeber</h2>
        <ul className="space-y-1">
          {RATGEBER.filter((x) => x.slug !== slug).map((x) => (
            <li key={x.slug}>
              <Link href={`/ratgeber/${x.slug}`} className="text-brand-600 hover:underline">
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-10 text-xs text-slate-500">
        Allgemeine Information, keine Rechts- oder Abrechnungsberatung. Maßgeblich sind die aktuellen Vorgaben von KZBV, KZV und
        Krankenkasse. <Link href="/impressum">Impressum</Link> · <Link href="/datenschutz">Datenschutz</Link>
      </p>
    </main>
  );
}
