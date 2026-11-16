import { describe, expect, it } from "vitest";
import { verlaufPfad, verlaufText } from "./verlauf";

describe("Verlaufslinie", () => {
  it("zeichnet von links unten nach rechts oben, wenn die Werte steigen", () => {
    const p = verlaufPfad([0, 5, 10], 100, 30, 5)!;
    expect(p.d).toBe("M5 25 L50 15 L95 5");
    expect(p.ende).toEqual({ x: 95, y: 5 });
    expect(p.punkte).toBe(3);
  });

  it("überspringt fehlende Werte und behält deren Platz auf der Zeitachse", () => {
    const p = verlaufPfad([10, null, 0, undefined, 10], 100, 30, 5)!;
    expect(p.d).toBe("M5 5 L50 25 L95 5");
    expect(p.punkte).toBe(3);
  });

  it("läuft bei gleichen Werten waagerecht in der Mitte", () => {
    expect(verlaufPfad([7, 7, 7], 100, 30, 5)!.d).toBe("M5 15 L50 15 L95 15");
    expect(verlaufPfad([0, 0], 100, 30, 5)!.d).toBe("M5 15 L95 15");
  });

  it("zeichnet nichts bei weniger als zwei Werten", () => {
    expect(verlaufPfad([])).toBeNull();
    expect(verlaufPfad([3])).toBeNull();
    expect(verlaufPfad([null, 3, null])).toBeNull();
    expect(verlaufPfad([NaN, Infinity, 2])).toBeNull();
  });

  it("bleibt innerhalb der Zeichenfläche", () => {
    const p = verlaufPfad([3, -40, 900, 12, 0, 55, 7, 300], 96, 28, 3)!;
    for (const m of p.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(3);
      expect(Number(m[1])).toBeLessThanOrEqual(93);
      expect(Number(m[2])).toBeGreaterThanOrEqual(3);
      expect(Number(m[2])).toBeLessThanOrEqual(25);
    }
  });

  it("beschreibt den Verlauf in Worten, ohne Wertung", () => {
    expect(verlaufText("Umsatz", [100, null, 2500], "€")).toBe("Verlauf Umsatz in 3 Abschnitten: am Anfang 100 €, zuletzt 2.500 €");
    expect(verlaufText("Annahmequote", [null, 50], "%")).toBe("Annahmequote: noch kein Verlauf");
    expect(verlaufText("Umsatz", [9, 1], "€")).not.toMatch(/gut|schlecht|besser|schlechter/i);
  });
});
