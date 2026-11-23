/**
 * Farbe für markierte Stellen an Modellen und Zeichnungen, nur aus der Sorrida-Palette (Bordeaux):
 * eigene Auswahl im Kurz-Fragebogen, Angaben des Patienten in der Akte und Markierungen der Praxis.
 * Diese drei erscheinen nie zusammen in einer Ansicht; deshalb genügt eine Farbe.
 * Fläche brand-600, Rand brand-800 (app/globals.css).
 */
export const STELLE = { flaeche: "#6B2A24", rand: "#431515" } as const;
/** Dieselbe Farbe für das 3D-Modell (three.js) */
export const STELLE_HEX = 0x6b2a24;
