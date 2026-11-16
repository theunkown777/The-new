import { HinweisMerker } from "@/components/HinweisMerker";

/**
 * Hilfe am Ort: Ein Erklärtext steht hinter einem „?“-Knopf (details/summary, ohne JavaScript bedienbar).
 * Beim ersten Besuch ist er offen. Wer ihn zuklappt, sieht ihn in diesem Browser beim nächsten Mal zugeklappt
 * (gemerkt wird nur diese ausdrückliche Wahl, im localStorage unter „sorrida-hinweis-<id>“).
 */
export function Hinweis({
  id,
  titel,
  ebene,
  children,
  className = "",
  testid,
}: {
  /** Kurzer, fester Name der Stelle, z. B. „eingang-wege“. */
  id: string;
  /** Zeile neben dem „?“, z. B. „Was wo ankommt“. */
  titel: React.ReactNode;
  /** Ist die Zeile eine Überschrift der Seite, hier ihre Ebene angeben (bleibt für Bildschirmleser eine Überschrift). */
  ebene?: 2 | 3;
  children: React.ReactNode;
  className?: string;
  testid?: string;
}) {
  return (
    <details id={`hinweis-${id}`} open className={`hinweis group rounded-xl border border-slate-200 bg-white ${className}`} data-testid={testid}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-brand-700 group-open:border-brand-700 group-open:bg-brand-700 group-open:text-white" aria-hidden="true">?</span>
        {ebene === 2 ? (
          <h2 className="min-w-0 flex-1 font-semibold text-slate-900">{titel}</h2>
        ) : ebene === 3 ? (
          <h3 className="min-w-0 flex-1 font-semibold text-slate-900">{titel}</h3>
        ) : (
          <span className="min-w-0 flex-1 font-semibold text-slate-900">{titel}</span>
        )}
        <span className="shrink-0 text-xs text-slate-500 group-open:hidden">Erklärung zeigen</span>
        <span className="hidden shrink-0 text-xs text-slate-500 group-open:inline">Zuklappen</span>
      </summary>
      <div className="hinweis-text border-t border-slate-100 px-4 py-3">{children}</div>
      <HinweisMerker id={id} />
    </details>
  );
}
