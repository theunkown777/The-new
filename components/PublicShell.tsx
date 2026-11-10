import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";

// Gemeinsamer Rahmen für öffentliche Seiten außerhalb der Startseite: Kopf und Fuß wie auf der Startseite.
export function PublicShell({ children, wide = false, full = false }: { children: React.ReactNode; wide?: boolean; full?: boolean }) {
  // full: ganze Desktop-Breite (Fachseiten, Vorschau); wide: Lesebreite für Ratgeber und Rechtliches.
  return (
    <JournalRahmen>
      <main className={`mx-auto px-5 py-12 sm:py-16 ${full ? "max-w-[88rem] sm:px-6 lg:px-10" : wide ? "max-w-4xl sm:px-8" : "max-w-2xl sm:px-8"}`}>
        {children}
        <p className="mt-14 border-t border-linie pt-5 text-xs text-tinte-2">
          Beispielpreise und Hinweise ohne Gewähr, keine Rechts- oder Abrechnungsberatung. <Link href="/impressum" className="underline">Impressum</Link> ·{" "}
          <Link href="/datenschutz" className="underline">Datenschutz</Link> · <Link href="/avv" className="underline">AVV-Muster</Link>
        </p>
      </main>
    </JournalRahmen>
  );
}
