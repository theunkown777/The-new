import { describe, expect, it } from "vitest";
import { ALLE_THEMEN, ERKLAERUNG, FACH_THEMEN, themenFuerFach } from "./erklaerung";
import { ERKLAER_BILDER, MENSCH_BILD } from "./erklaerBilder";
import { SPECIALTIES } from "../specialties";

describe("Erklärungsansicht", () => {
  it("jeder Punkt im Bild hat eine Erklärung", () => {
    for (const [thema, bild] of Object.entries(ERKLAER_BILDER)) {
      const namen = new Set(ERKLAERUNG[thema as keyof typeof ERKLAERUNG].teile.map((t) => t.name.toLowerCase()));
      for (const p of bild!.punkte) expect(namen.has((p.teil ?? p.name).toLowerCase()), `${thema}: ${p.name}`).toBe(true);
    }
  });
  it("Punkte liegen im Bild und jedes Bild hat Herkunft und Lizenz", () => {
    for (const [thema, bild] of Object.entries(ERKLAER_BILDER)) {
      expect(bild!.lizenz, thema).toBeTruthy();
      expect(bild!.quelleUrl, thema).toMatch(/^https:\/\//);
      for (const p of bild!.punkte) {
        expect(p.x, `${thema}: ${p.name}`).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100);
      }
    }
  });
  it("jedes Thema hat ein Bild, und der Mensch hat einen Punkt für jedes Thema außer dem Zahn", () => {
    for (const t of ALLE_THEMEN) expect(ERKLAER_BILDER[t], t).toBeDefined();
    for (const t of ALLE_THEMEN.filter((x) => x !== "zahn")) expect(MENSCH_BILD!.punkte[t], t).toBeDefined();
  });
  it("Lungenpraxis sieht nur die Lunge, Kardiologie nur das Herz, jedes Fach etwas", () => {
    expect(themenFuerFach("pneumo")).toEqual(["lunge"]);
    expect(themenFuerFach("kardio")).toEqual(["herz"]);
    for (const s of SPECIALTIES) expect(themenFuerFach(s.id).length, s.id).toBeGreaterThan(0);
    for (const liste of Object.values(FACH_THEMEN)) for (const t of liste) expect(ALLE_THEMEN).toContain(t);
  });
});
