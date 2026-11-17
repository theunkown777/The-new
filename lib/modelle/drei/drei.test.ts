import { describe, expect, it } from "vitest";
import { ellipse } from "../formen";
import { STRUKTUREN } from "../koerper";
import { imVieleck, pfadPunkte } from "./pfad";

describe("Räumliche Modelle", () => {
  it("zerlegt Pfade aller Strukturen in Punktfolgen", () => {
    for (const s of STRUKTUREN) for (const formen of [s.vorn, s.hinten]) for (const f of formen ?? []) {
      const teile = pfadPunkte(f.d);
      expect(teile.length, s.id).toBeGreaterThan(0);
      for (const t of teile) for (const p of t.punkte) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), s.id).toBe(true);
      if (!f.strich) expect(teile[0].geschlossen, s.id).toBe(true);
    }
  });
  it("tastet eine Ellipse rund ab", () => {
    const [t] = pfadPunkte(ellipse([100, 100], 40, 20).d, 2);
    expect(t.geschlossen).toBe(true);
    for (const p of t.punkte) expect(((p[0] - 100) / 40) ** 2 + ((p[1] - 100) / 20) ** 2).toBeCloseTo(1, 1);
    expect(imVieleck([100, 100], t.punkte)).toBe(true);
    expect(imVieleck([150, 100], t.punkte)).toBe(false);
  });
});
