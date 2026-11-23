import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUSWAHL, AUSWAHL_PAPIER_HEX, AUSWAHL_ROSE_HEX, STELLE, STELLE_GEWAEHLT, STELLE_HEX, auswahlHex, leuchtdichteHex } from "./stelleFarbe";

const quelle = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
/** Farbton (Grad) und Sättigung (HSV) einer Farbe */
function tonUndSaettigung(hex: number): [number, number] {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return [0, 0];
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / max];
}
const gelbOderOrange = (hex: number) => { const [h, s] = tonUndSaettigung(hex); return s > 0.45 && h >= 25 && h <= 70; };

describe("Farben für gewählte und markierte Stellen", () => {
  it("sind Sorrida-Farben (Bordeaux, Papier, Tinte), kein Gelb oder Orange", () => {
    for (const f of [STELLE, AUSWAHL, STELLE_GEWAEHLT]) for (const c of [f.flaeche, f.rand]) expect(gelbOderOrange(parseInt(c.slice(1), 16)), c).toBe(false);
    for (const c of [STELLE_HEX, AUSWAHL_PAPIER_HEX, AUSWAHL_ROSE_HEX]) expect(gelbOderOrange(c)).toBe(false);
  });

  it("Gewählt hebt sich klar vom Markierten ab", () => {
    expect(leuchtdichteHex(parseInt(AUSWAHL.flaeche.slice(1), 16)) / leuchtdichteHex(STELLE_HEX)).toBeGreaterThan(5);
  });

  it("3D: auf roten Muskeln Papier, auf Zähnen, Knochen und Haut helles Bordeaux", () => {
    expect(auswahlHex(0xa83a32)).toBe(AUSWAHL_PAPIER_HEX); // Muskel
    expect(auswahlHex(0xe58f8c)).toBe(AUSWAHL_PAPIER_HEX); // Zahnfleisch
    expect(auswahlHex(0xf2ebdc)).toBe(AUSWAHL_ROSE_HEX); // Zahn
    expect(auswahlHex(0xe8dcc4)).toBe(AUSWAHL_ROSE_HEX); // Knochen
    expect(auswahlHex(0xffffff)).toBe(AUSWAHL_ROSE_HEX); // Gesicht mit Bild (Farbe wird mit dem Bild verrechnet)
  });

  it("die Modelle verwenden keine eigenen gelben oder orangen Farben für Auswahl und Markierung", () => {
    for (const p of ["components/modelle/drei/Buehne.ts", "components/modelle/drei/mundBau.ts", "components/modelle/ModellTeile.tsx"]) {
      const s = quelle(p);
      const hexe = [...s.matchAll(/(?:0x|#)([0-9a-fA-F]{6})\b/g)].map((m) => parseInt(m[1], 16));
      expect(hexe.filter(gelbOderOrange).map((h) => h.toString(16)), p).toEqual([]);
      expect(s, p).not.toMatch(/\b(?:bg|text|ring|border)-(?:amber|yellow|orange)-\d/);
    }
  });
});
