import Link from "next/link";
import { WebsiteHilfe } from "@/components/WebsiteHilfe";
import { MenueSchliessen } from "@/components/start/MenueSchliessen";
import { RUNDGANG_HREF } from "@/lib/rundgang";
import { gastzugangOffen } from "@/lib/vorschau";

// Kopfzeile der Website im Journal-Stil: Wortmarke links, Textnavigation, ein Knopf.
// Am Handy wandert die Navigation in ein aufklappbares Menü (ohne JavaScript, mit <details>). Es wächst aus dem Knopf
// oben rechts (app/globals.css, .j-menue) und schließt sich mit Escape, beim Tippen daneben und nach einem Link (MenueSchliessen).
const LINKS: [string, string, string?][] = [
  ["/#fach", "Fachgebiete"],
  ["/#preise", "Preise"],
  ["/ratgeber", "Ratgeber"],
  ["/rechner", "Rechner"],
];

/** gastzugang: Ist /demo für Besucher offen (lib/vorschau.ts)? Sonst führt der Knopf zur Vorschau. */
export function JournalKopf({ angemeldet, gastzugang = gastzugangOffen() }: { angemeldet: boolean; gastzugang?: boolean }) {
  return (
    <header className="relative z-20 border-b border-linie">
      <div className="mx-auto flex max-w-[78rem] items-center justify-between gap-3 px-5 py-4 sm:gap-6 sm:px-8">
        <Link href="/" className="j-link flex shrink-0 items-center gap-3 decoration-transparent" aria-label="Sorrida Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.webp" alt="" className="h-10 w-10" />
          <span className="font-brand text-[17px] text-brand-700">SORRIDA</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[15px] lg:flex" aria-label="Hauptnavigation">
          {LINKS.map(([href, name, id]) => (
            <Link key={href} href={href} className="j-link text-tinte-2 decoration-transparent hover:text-tinte" data-testid={id}>
              {name}
            </Link>
          ))}
          {/* Rundgang: einfacher Link (kein next/link), damit die Startseite ihn auch von anderen Seiten aus öffnet.
              data-rundgang-ausloeser: Hierhin geht der Fokus nach dem Rundgang, wenn es sonst kein Ziel gibt. */}
          <a href={RUNDGANG_HREF} className="j-link text-tinte-2 decoration-transparent hover:text-tinte" data-rundgang-ausloeser="" data-testid="rundgang-link-kopf">
            Rundgang
          </a>
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          {angemeldet ? (
            <Link href="/dashboard" className="j-link hidden text-[15px] font-semibold text-brand-700 sm:inline" data-testid="zur-uebersicht">
              Zur Übersicht
            </Link>
          ) : (
            <Link href="/login" className="j-link hidden text-[15px] text-tinte-2 decoration-transparent hover:text-tinte sm:inline">
              Anmelden
            </Link>
          )}
          <Link href={gastzugang ? "/demo" : "/vorschau"} className="j-knopf j-knopf-voll !min-h-[42px] whitespace-nowrap !px-4 text-sm" data-testid="kopf-knopf">
            {/* Unter 380 px nur „Demo“, sonst stößt der Knopf an die Wortmarke. */}
            {gastzugang ? <span>Demo<span className="max-[379px]:hidden"> öffnen</span></span> : "Vorschau"}
          </Link>
          <details className="j-menue group relative lg:hidden">
            <summary className="j-menue-knopf grid h-11 w-11 cursor-pointer list-none place-items-center rounded-[6px] border border-linie-stark" aria-label="Menü">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
                <path className="group-open:hidden" d="M4 8h16M4 16h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <nav className="j-menue-liste absolute right-0 top-12 w-60 border border-linie bg-papier p-2 shadow-[0_20px_40px_-24px_rgba(60,40,30,.5)]" aria-label="Menü">
              {LINKS.map(([href, name]) => (
                <Link key={href} href={href} className="block border-b border-linie px-3 py-3 text-[15px] last:border-0 hover:text-brand-700">
                  {name}
                </Link>
              ))}
              <a href={RUNDGANG_HREF} className="block border-b border-linie px-3 py-3 text-[15px] hover:text-brand-700" data-testid="rundgang-link-menue">
                Rundgang
              </a>
              <Link href={angemeldet ? "/dashboard" : "/login"} className="block px-3 py-3 text-[15px] font-semibold text-brand-700">
                {angemeldet ? "Zur Übersicht" : "Anmelden"}
              </Link>
            </nav>
          </details>
          <MenueSchliessen />
        </div>
      </div>
    </header>
  );
}

/** Fußzeile: Wortmarke, drei Spalten Links, rechtlicher Hinweis. Den Demo-Link gibt es nur mit offenem Gastzugang. */
export function JournalFuss({ gastzugang = gastzugangOffen() }: { gastzugang?: boolean } = {}) {
  const demo: [string, string][] = gastzugang ? [["/demo", "Demo-Praxis öffnen"]] : [];
  const spalten: [string, [string, string][]][] = [
    ["Sorrida", [["/#fach", "Fachgebiete"], ["/leistungen", "Leistungen A–Z"], ["/#preise", "Preise"], ["/neu", "Neu"]]],
    ["Ausprobieren", [[RUNDGANG_HREF, "Rundgang"], ...demo, ["/vorschau", "Vorschau"], ["/hilfe", "Hilfe und Kontakt"], ["/ratgeber", "Ratgeber"], ["/rechner", "Rechner"]]],
    ["Rechtliches", [["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/avv", "AVV-Muster"], ["/vertrauen", "Umgang mit Daten"], ["/status", "Status"], ["/lizenzen", "Lizenzen und Quellen"], ["/impressum#zweck", "Wofür Sorrida bestimmt ist"]]],
  ];
  const fussLink = "j-link flex min-h-[36px] items-center text-tinte-2 decoration-transparent hover:text-brand-700 md:inline md:min-h-0";
  return (
    <footer className="border-t border-linie">
      <div className="mx-auto grid max-w-[78rem] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark.webp" alt="" className="h-9 w-9" />
            <span className="font-brand text-brand-700">SORRIDA</span>
          </div>
          <p className="j-titel mt-5 max-w-[16rem] text-[1.7rem] text-tinte">
            Damit beide Seiten <em>lächeln</em>.
          </p>
        </div>
        {spalten.map(([titel, links]) => (
          <div key={titel}>
            <p className="j-marke">{titel}</p>
            {/* Am Handy ist jede Zeile 36 px hoch und in voller Breite antippbar, dafür ohne Zwischenraum; ab md wie gewohnt. */}
            <ul className="mt-2 text-[15px] md:mt-4 md:space-y-2.5">
              {links.map(([href, name]) => (
                <li key={href}>
                  {href === RUNDGANG_HREF ? (
                    <a href={href} className={fussLink} data-testid="rundgang-link-fuss">
                      {name}
                    </a>
                  ) : (
                    <Link prefetch={false} href={href} className={fussLink}>
                      {name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-linie">
        <p className="mx-auto max-w-[78rem] px-5 pb-20 pt-6 text-xs text-tinte-2 sm:px-8 sm:pb-6">
          Keine Abrechnungs- oder Rechtsberatung. Genannte Produktnamen sind Marken ihrer Inhaber.
        </p>
      </div>
    </footer>
  );
}

/**
 * Rahmen für alle öffentlichen Seiten außer der Startseite: Papier, Kopf, Inhalt, Fuß und „Frag Sorrida“.
 * `hilfe={false}` auf Seiten, die auch hinter dem Vorschau-Schloss erreichbar sind (Pflichtseiten, siehe LegalPage).
 */
export function JournalRahmen({ children, hilfe = true }: { children: React.ReactNode; hilfe?: boolean }) {
  return (
    <div className="journal website flex min-h-screen flex-col">
      <a href="#inhalt" className="sprunglink">Zum Inhalt</a>
      <JournalKopf angemeldet={false} />
      <div id="inhalt" className="flex-1">{children}</div>
      <JournalFuss />
      {hilfe && <WebsiteHilfe />}
    </div>
  );
}
