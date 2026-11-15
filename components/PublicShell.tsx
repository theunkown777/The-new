import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";
import { Zweckbestimmung } from "@/components/Zweckbestimmung";

// Gemeinsamer Rahmen für öffentliche Seiten außerhalb der Startseite: Kopf und Fuß wie auf der Startseite.
// Im Fuß steht klein die Zweckbestimmung, im selben Wortlaut wie im Impressum und auf /hilfe (lib/zweckbestimmung.ts).
// `zweck={false}` nur dort, wo die Seite sie selbst im Text zeigt.
export function PublicShell({ children, wide = false, full = false, zweck = true }: { children: React.ReactNode; wide?: boolean; full?: boolean; zweck?: boolean }) {
  // full: ganze Desktop-Breite (Fachseiten, Vorschau); wide: Lesebreite für Ratgeber und Rechtliches.
  return (
    <JournalRahmen>
      <main className={`mx-auto px-5 py-12 sm:py-16 ${full ? "max-w-[88rem] sm:px-6 lg:px-10" : wide ? "max-w-4xl sm:px-8" : "max-w-2xl sm:px-8"}`}>
        {children}
        <p className="mt-14 border-t border-linie pt-5 text-xs text-tinte-2">
          Beispielpreise und Hinweise ohne Gewähr, keine Rechts- oder Abrechnungsberatung. <Link href="/impressum" className="underline">Impressum</Link> ·{" "}
          <Link href="/datenschutz" className="underline">Datenschutz</Link> · <Link href="/avv" className="underline">AVV-Muster</Link> ·{" "}
          <Link href="/lizenzen" className="underline">Lizenzen und Quellen</Link>
        </p>
        {zweck && <Zweckbestimmung klein className="mt-4 max-w-4xl" />}
      </main>
    </JournalRahmen>
  );
}
