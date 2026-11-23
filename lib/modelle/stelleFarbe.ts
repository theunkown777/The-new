/**
 * Farben für Stellen an Modellen und Zeichnungen, nur aus der Sorrida-Palette (Bordeaux und Papier).
 *
 * Markiert: eigene Auswahl im Kurz-Fragebogen, Angaben des Patienten in der Akte und Markierungen der Praxis.
 * Diese drei erscheinen nie zusammen in einer Ansicht; deshalb genügt eine Farbe.
 * Fläche brand-600, Rand brand-800 (app/globals.css).
 *
 * Gewählt (gerade angetippt): hell, damit es sich klar vom dunklen Markierten abhebt. Gelb ist bei Sorrida
 * nur für Warnungen da und wird hier nicht verwendet.
 */
export const STELLE = { flaeche: "#6B2A24", rand: "#431515" } as const;
/** Dieselbe Farbe für das 3D-Modell (three.js) */
export const STELLE_HEX = 0x6b2a24;

/** Gewählt in Zeichnungen: Fläche brand-200, Rand brand-700 */
export const AUSWAHL = { flaeche: "#DFC2BC", rand: "#5A1D1D" } as const;
/** Markiert und zugleich gewählt: etwas heller als Markiert, Rand in Tinte */
export const STELLE_GEWAEHLT = { flaeche: "#86433A", rand: "#24201F" } as const;

/** Gewählt im 3D-Modell: Papier (auf dunklen und roten Teilen wie Muskeln) oder helles Bordeaux brand-300
 *  (auf hellen Teilen wie Zähnen, Knochen und Haut). */
export const AUSWAHL_PAPIER_HEX = 0xf5f2ee;
export const AUSWAHL_ROSE_HEX = 0xc79a91;

/** Relative Leuchtdichte (WCAG) einer Farbe im sRGB-Raum */
export function leuchtdichteHex(hex: number): number {
  const k = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
const kontrastHex = (a: number, b: number) => {
  const la = leuchtdichteHex(a), lb = leuchtdichteHex(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Farbe für ein gewähltes Teil im 3D-Modell: die Sorrida-Farbe, die sich von seiner eigenen Farbe am stärksten abhebt. */
export function auswahlHex(grundHex: number): number {
  return kontrastHex(AUSWAHL_PAPIER_HEX, grundHex) >= kontrastHex(AUSWAHL_ROSE_HEX, grundHex) ? AUSWAHL_PAPIER_HEX : AUSWAHL_ROSE_HEX;
}
