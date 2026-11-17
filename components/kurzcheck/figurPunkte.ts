// Punkte der flachen Körperfigur. Ohne „use client“: Die Akte (Server) ruft sie auch auf.
import { KOERPER_BREITE } from "@/lib/modelle/koerper";
import { orteFuer, type Ansicht, type KurzArt } from "@/lib/kurzcheck";

export interface FigurPunkt { ort: string; x: number; y: number; r: number }

/** Punkte der Körperfigur für eine Ansicht. Von vorn liegt die rechte Körperseite links im Bild, von hinten rechts. */
export function koerperPunkte(art: KurzArt, ansicht: Ansicht): FigurPunkt[] {
  const aus: FigurPunkt[] = [];
  for (const o of orteFuer(art)) for (const f of o.figur ?? []) {
    if (f.ansicht !== ansicht) continue;
    // bei = Punkt in der linken Bildhälfte; welche Seite dort liegt, hängt von der Ansicht ab
    const links = ansicht === "vorn" ? "R" : "L";
    const x = o.seite && o.seite !== links ? KOERPER_BREITE - f.bei[0] : f.bei[0];
    aus.push({ ort: o.id, x, y: f.bei[1], r: f.r });
  }
  return aus;
}

/** Lage der Stellen am Kopf von vorn (300 × 340); die rechte Gesichtshälfte liegt links im Bild. Je Art gilt nur, was es dort gibt (ortGueltig). */
export const KOPF_PUNKTE: FigurPunkt[] = [
  { ort: "kopf", x: 150, y: 30, r: 16 },
  { ort: "gesicht:stirn", x: 150, y: 72, r: 20 },
  { ort: "gesicht:schlaefe:R", x: 82, y: 104, r: 13 }, { ort: "gesicht:schlaefe:L", x: 218, y: 104, r: 13 },
  { ort: "auge:R", x: 116, y: 128, r: 15 }, { ort: "auge:L", x: 184, y: 128, r: 15 },
  { ort: "ohr:R", x: 46, y: 152, r: 17 }, { ort: "ohr:L", x: 254, y: 152, r: 17 },
  { ort: "kiefergelenk:R", x: 74, y: 176, r: 10 }, { ort: "kiefergelenk:L", x: 226, y: 176, r: 10 },
  { ort: "nase", x: 150, y: 166, r: 14 },
  { ort: "gesicht:wange:R", x: 104, y: 188, r: 16 }, { ort: "gesicht:wange:L", x: 196, y: 188, r: 16 },
  { ort: "gesicht:mund", x: 150, y: 214, r: 15 },
  { ort: "gesicht:kinn", x: 150, y: 250, r: 13 },
  { ort: "rachen", x: 150, y: 302, r: 18 },
];
