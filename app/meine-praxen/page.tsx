import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { MeinePraxen } from "@/components/MeinePraxen";
import { darfAufGeraetMerken } from "@/lib/meinePraxenSchutz";
import { GERAET_UI, PORTAL_LANGS, PORTAL_LANG_NAMES, PORTAL_LOCALE, pickPortalLang, portalDir } from "@/lib/portalI18n";

// „Meine Praxen auf diesem Gerät“. Server-Hülle ohne Datenbank: Sie wählt die Sprache und schaut nur auf die
// Namen der Cookies (Gerät der Praxis?). Die Liste selbst liegt allein im Browser des Patienten und wird dort
// gelesen (components/MeinePraxen.tsx). Beim Öffnen der Seite geht kein Aufruf an /api/portal; jede Karte öffnet
// genau ein Portal. Kopfzeilen: no-referrer und noindex (next.config.js), frei auf der Vorschau-Domain (lib/vorschau.ts).

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = pickPortalLang((await props.searchParams).lang, (await headers()).get("accept-language"));
  const t = GERAET_UI[lang];
  return {
    title: t.liste,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    manifest: lang === "de" ? "/meine-praxen/manifest.webmanifest" : `/meine-praxen/manifest.webmanifest?lang=${lang}`,
    // Bewusst keine eigenständige Web-App (capable: false, im Manifest display "browser"): Auf dem iPhone hat eine
    // Web-App vom Home-Bildschirm einen eigenen Speicher, getrennt von Safari. Die Liste wäre dort leer. So öffnet
    // das Symbol die Seite im Browser, mit derselben Liste wie beim Merken.
    appleWebApp: { capable: false, title: t.kurzTitel },
    icons: { icon: [{ url: "/brand/meine-praxen.svg", type: "image/svg+xml" }], apple: [{ url: "/brand/meine-praxen-180.png", sizes: "180x180" }] },
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F2EE" },
    { media: "(prefers-color-scheme: dark)", color: "#191615" },
  ],
};

export default async function MeinePraxenSeite(props: { searchParams: Promise<{ lang?: string }> }) {
  const lang = pickPortalLang((await props.searchParams).lang, (await headers()).get("accept-language"));
  const t = GERAET_UI[lang];
  // Gerät der Praxis (angemeldet, Empfangsmodus): keine Liste zeigen. Entschieden nach den Namen der Cookies.
  const praxisGeraet = !darfAufGeraetMerken((await cookies()).getAll().map((c) => c.name));
  return (
    <main className="min-h-screen bg-[#F5F2EE] text-slate-900 dark:bg-[#191615] dark:text-[#F1ECE6]" lang={lang} dir={portalDir(lang)} data-testid="meine-praxen">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-8 sm:pt-12">
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/meine-praxen.svg" alt="" className="h-11 w-11 rounded-xl ring-1 ring-slate-200 dark:ring-[#3D3733]" />
          <h1 className="font-display mt-4 text-3xl leading-tight sm:text-4xl">{t.liste}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-[#D5CCC2]" data-testid="meine-praxen-einleitung">{t.einleitung}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-[#BDB3A8]">{t.geteilt}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-[#BDB3A8]" data-testid="meine-praxen-nur-browser">{t.nurBrowser}</p>
        </header>

        <MeinePraxen t={t} locale={PORTAL_LOCALE[lang]} praxisGeraet={praxisGeraet} />

        <footer className="mt-12 space-y-3 text-center text-xs text-slate-600 dark:text-[#BDB3A8]">
          <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm" aria-label="Sprache" data-testid="meine-praxen-sprachen">
            {PORTAL_LANGS.map((l) => (
              <a key={l} href={`?lang=${l}`} lang={l} aria-current={l === lang ? "true" : undefined} className={l === lang ? "font-semibold text-salbei-700 underline dark:text-[#C7D6C2]" : "hover:underline"}>
                {PORTAL_LANG_NAMES[l]}
              </a>
            ))}
          </nav>
          <p>{t.fuss}</p>
          <p>
            <a href="/datenschutz#meine-praxen" className="underline">{t.datenschutz}</a>
            {" · "}
            <a href="/impressum" className="underline" lang="de">Impressum</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
