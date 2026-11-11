// Bilder der Erklärungsansicht mit Herkunft, Lizenz und den Stellen der beschrifteten Teile
// (x, y in Prozent des Bildes). Die Namen entsprechen den Teilen in lib/modelle/erklaerung.ts.
import type { ErklaerThema } from "./erklaerung";

export interface BildPunkt {
  name: string;
  x: number;
  y: number;
}

export interface ErklaerBild {
  datei: string;
  breite: number;
  hoehe: number;
  titel?: string;
  autor: string;
  quelleUrl: string;
  lizenz: string;
  lizenzUrl: string;
  /** zugeschnitten oder Beschriftung entfernt */
  geaendert?: boolean;
  punkte: BildPunkt[];
}

export const ERKLAER_BILDER: Partial<Record<ErklaerThema, ErklaerBild>> = {};

/** Der ganze Mensch als Einstieg, mit den Stellen der Punkte je Thema (x, y in Prozent). */
export interface MenschBild {
  datei: string;
  breite: number;
  hoehe: number;
  titel?: string;
  autor: string;
  quelleUrl: string;
  lizenz: string;
  lizenzUrl: string;
  punkte: Partial<Record<ErklaerThema, { x: number; y: number }>>;
}

export const MENSCH_BILD: MenschBild | null = null;
