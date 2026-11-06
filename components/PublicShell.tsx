import Link from "next/link";

// Gemeinsamer Rahmen für öffentliche Seiten außerhalb der statischen Startseite.
export function PublicShell({ children, wide = false, full = false }: { children: React.ReactNode; wide?: boolean; full?: boolean }) {
  // full: ganze Desktop-Breite (Fachseiten, Vorschau); wide: Lesebreite für Ratgeber und Rechtliches.
  return (
    <div className={full ? "min-h-screen bg-[#F5F2EE]" : undefined}>
    <main className={`mx-auto px-4 py-10 ${full ? "max-w-[88rem] sm:px-6 lg:px-10" : wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-auto" />
          <span className="font-brand text-brand-700">SORRIDA</span>
        </Link>
        <span className="flex flex-wrap gap-4">
          <Link href="/#fach" className="text-slate-600 hover:underline">Fachgebiete</Link>
          <Link href="/leistungen" className="text-slate-600 hover:underline">Leistungen A–Z</Link>
          <Link href="/ratgeber" className="text-slate-600 hover:underline">Ratgeber</Link>
          <Link href="/demo" className="font-medium text-brand-600 hover:underline">Kostenlos ausprobieren</Link>
        </span>
      </nav>
      {children}
      <p className="mt-12 text-xs text-slate-500">
        Beispielpreise und Hinweise ohne Gewähr, keine Rechts- oder Abrechnungsberatung. <Link href="/impressum" className="underline">Impressum</Link> ·{" "}
        <Link href="/datenschutz" className="underline">Datenschutz</Link> · <Link href="/avv" className="underline">AVV-Muster</Link>
      </p>
    </main>
    </div>
  );
}
