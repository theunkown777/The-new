// Kleine Helfer für Zahlen in den Sprachdateien. Bewusst ohne Intl: Server und
// Browser liefern so in jeder Umgebung dieselbe Zeichenfolge (immer lateinische Ziffern).

/** Ganze Zahl mit Tausendertrennzeichen, z. B. gruppiert(2088, ".") → "2.088". */
export function gruppiert(n: number, trenner: string): string {
  const r = Math.round(n);
  const ziffern = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, trenner);
  return r < 0 ? `-${ziffern}` : ziffern;
}

/** Geschütztes Leerzeichen (Tausendertrenner in ru, uk, pl; Abstand vor €). */
export const NBSP = " ";

/**
 * Pluralform für slawische Sprachen: eins (1, 21, 31 …), wenige (2–4, 22–24 …), viele (0, 5–20, 25–30 …).
 */
export function slawischerPlural(n: number, eins: string, wenige: string, viele: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return viele;
  if (b === 1) return eins;
  if (b >= 2 && b <= 4) return wenige;
  return viele;
}
