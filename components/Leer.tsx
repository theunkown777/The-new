import Link from "next/link";

// Leerer Zustand: ein kleines Liniensymbol, ein Satz, höchstens ein Knopf. Keine große weiße Fläche mit einem
// einzelnen Satz. Der Satz kommt als children, damit vorhandene Texte und Links unverändert bleiben.
const SYMBOLE = {
  kalender: "M5 6h14v13H5zM5 10h14M9 4v4M15 4v4M9 14h2",
  eingang: "M4 13l2.5-7h11L20 13v5H4zM4 13h4.5l1.2 2.5h4.6L15.5 13H20",
  blatt: "M7 4h7l4 4v12H7zM14 4v4h4M10 12h5M10 15.5h3",
  karte: "M4 7h16v10H4zM4 10.5h16M7 14h3",
  herz: "M12 19.5s-6.5-4-6.5-9A3.6 3.6 0 0 1 12 8.2a3.6 3.6 0 0 1 6.5 2.3c0 5-6.5 9-6.5 9Z",
  personen: "M15.5 18.5v-1a3.5 3.5 0 0 0-3.5-3.5H7.5A3.5 3.5 0 0 0 4 17.5v1M9.8 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 18.5v-1a3.5 3.5 0 0 0-2.6-3.4M15 4.6a3 3 0 0 1 0 5.8",
  haken: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM8.5 12.2l2.4 2.4 4.6-5.2",
} as const;

export type LeerSymbol = keyof typeof SYMBOLE;

export function Leer({
  symbol = "blatt",
  children,
  knopf,
  eng = false,
  className = "",
  testid,
}: {
  symbol?: LeerSymbol;
  /** Der eine Satz (darf einen Link enthalten). */
  children: React.ReactNode;
  /** Höchstens ein Knopf. */
  knopf?: { href: string; text: string; testid?: string };
  /** Flache Fassung für Listen in Karten. */
  eng?: boolean;
  className?: string;
  testid?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${eng ? "px-5 py-4" : "px-5 py-6 sm:px-6"} ${className}`} data-testid={testid}>
      <span className={`flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 ${eng ? "h-10 w-10" : "h-12 w-12"}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className={eng ? "h-5 w-5" : "h-6 w-6"} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <path d={SYMBOLE[symbol]} />
        </svg>
      </span>
      <div className="min-w-0 flex-1 text-sm text-slate-600">
        <p>{children}</p>
        {knopf && (
          <Link href={knopf.href} className="btn-secondary mt-3" data-testid={knopf.testid}>
            {knopf.text}
          </Link>
        )}
      </div>
    </div>
  );
}
