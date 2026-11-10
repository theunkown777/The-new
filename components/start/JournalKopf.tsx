import Link from "next/link";

// Kopfzeile der Website im Journal-Stil: Wortmarke links, Textnavigation, ein Knopf.
// Am Handy wandert die Navigation in ein aufklappbares Menü (ohne JavaScript, mit <details>).
const LINKS: [string, string, string?][] = [
  ["/#fach", "Fachgebiete"],
  ["/anatomie", "Modelle", "nav-modelle"],
  ["/#preise", "Preise"],
  ["/ratgeber", "Ratgeber"],
];

export function JournalKopf({ angemeldet }: { angemeldet: boolean }) {
  return (
    <header className="relative z-20 border-b border-linie">
      <div className="mx-auto flex max-w-[78rem] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Sorrida Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-10" />
          <span className="font-brand text-[17px] text-brand-700">SORRIDA</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[15px] lg:flex" aria-label="Hauptnavigation">
          {LINKS.map(([href, name, id]) => (
            <Link key={href} href={href} className="j-link text-tinte-2 decoration-transparent hover:text-tinte" data-testid={id}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {angemeldet ? (
            <Link href="/dashboard" className="j-link hidden text-[15px] font-semibold text-brand-700 sm:inline" data-testid="zur-uebersicht">
              Zur Übersicht
            </Link>
          ) : (
            <Link href="/login" className="j-link hidden text-[15px] text-tinte-2 decoration-transparent hover:text-tinte sm:inline">
              Anmelden
            </Link>
          )}
          <Link href="/demo" className="j-knopf j-knopf-voll !min-h-[42px] whitespace-nowrap !px-4 text-sm">
            Demo öffnen
          </Link>
          <details className="group relative lg:hidden">
            <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-[6px] border border-linie-stark" aria-label="Menü">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
                <path className="group-open:hidden" d="M4 8h16M4 16h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <nav className="absolute right-0 top-12 w-60 border border-linie bg-papier p-2 shadow-[0_20px_40px_-24px_rgba(60,40,30,.5)]" aria-label="Menü">
              {LINKS.map(([href, name]) => (
                <Link key={href} href={href} className="block border-b border-linie px-3 py-3 text-[15px] last:border-0 hover:text-brand-700">
                  {name}
                </Link>
              ))}
              <Link href={angemeldet ? "/dashboard" : "/login"} className="block px-3 py-3 text-[15px] font-semibold text-brand-700">
                {angemeldet ? "Zur Übersicht" : "Anmelden"}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

/** Fußzeile: Wortmarke, drei Spalten Links, rechtlicher Hinweis. */
export function JournalFuss() {
  const spalten: [string, [string, string][]][] = [
    ["Sorrida", [["/#fach", "Fachgebiete"], ["/leistungen", "Leistungen A–Z"], ["/anatomie", "Modelle"], ["/#preise", "Preise"]]],
    ["Ausprobieren", [["/demo", "Demo-Praxis öffnen"], ["/vorschau", "Vorschau"], ["/hilfe", "Hilfe und Kontakt"], ["/ratgeber", "Ratgeber"]]],
    ["Rechtliches", [["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/avv", "AVV-Muster"]]],
  ];
  return (
    <footer className="border-t border-linie">
      <div className="mx-auto grid max-w-[78rem] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark.svg" alt="" className="h-9 w-9" />
            <span className="font-brand text-brand-700">SORRIDA</span>
          </div>
          <p className="j-titel mt-5 max-w-[16rem] text-2xl text-tinte">
            Sorrida heißt <em>lächeln</em>.
          </p>
        </div>
        {spalten.map(([titel, links]) => (
          <div key={titel}>
            <p className="j-marke">{titel}</p>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {links.map(([href, name]) => (
                <li key={href}>
                  <Link href={href} className="j-link text-tinte-2 decoration-transparent hover:text-brand-700">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-linie">
        <p className="mx-auto max-w-[78rem] px-5 py-6 text-xs text-tinte-2 sm:px-8">
          Keine Abrechnungs- oder Rechtsberatung. Genannte Produktnamen sind Marken ihrer Inhaber.
        </p>
      </div>
    </footer>
  );
}

/** Rahmen für alle öffentlichen Seiten außer der Startseite: Papier, Kopf, Inhalt, Fuß. */
export function JournalRahmen({ children }: { children: React.ReactNode }) {
  return (
    <div className="journal flex min-h-screen flex-col">
      <JournalKopf angemeldet={false} />
      <div className="flex-1">{children}</div>
      <JournalFuss />
    </div>
  );
}
