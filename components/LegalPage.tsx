import { JournalRahmen } from "@/components/start/JournalKopf";
import { infoSeitenOffen } from "@/lib/vorschau";

// Rahmen für Impressum, Datenschutz und AVV: ruhige Lesespalte im Stil der Website.
// Diese Pflichtseiten sind auch hinter dem Vorschau-Schloss erreichbar. „Frag Sorrida“ erscheint dort nur, wenn die
// übrigen Informationsseiten offen sind; sonst stünden Preise und Funktionen auf einer verschlossenen Domain.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <JournalRahmen hilfe={infoSeitenOffen()}>
      <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="j-schau mb-10 text-[clamp(2.6rem,6vw,4rem)]">{title}</h1>
        <div className="space-y-5 text-[15px] leading-relaxed text-tinte [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-linie [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-tinte">
          {children}
        </div>
      </main>
    </JournalRahmen>
  );
}
