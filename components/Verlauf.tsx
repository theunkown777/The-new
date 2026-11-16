import { verlaufPfad } from "@/lib/verlauf";

/**
 * Kleine Verlaufslinie neben einer Kennzahl (8 bis 12 Abschnitte). Eine Farbe, keine Wertung:
 * Die Linie zeigt nur die Richtung. Für Bildschirmleser steht der Verlauf als Satz in `beschreibung`.
 */
export function Verlauf({ werte, beschreibung, className = "", testid }: { werte: (number | null | undefined)[]; beschreibung: string; className?: string; testid?: string }) {
  const B = 96;
  const H = 28;
  const p = verlaufPfad(werte, B, H, 3);
  if (!p) return null;
  return (
    <svg viewBox={`0 0 ${B} ${H}`} className={`h-7 w-24 shrink-0 text-brand-700 ${className}`} role="img" aria-label={beschreibung} data-testid={testid}>
      <line x1={3} x2={B - 3} y1={H - 2.5} y2={H - 2.5} stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} />
      <path d={p.d} pathLength={1} className="verlauf-linie" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={p.ende.x} cy={p.ende.y} r={2.4} fill="currentColor" />
    </svg>
  );
}
