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
