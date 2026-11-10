import { describe, expect, it } from "vitest";
import { ellipse, flaeche, knochen } from "../formen";
import { STRUKTUREN } from "../koerper";
import { ZAEHNE } from "../gebiss";
import { aufblasen } from "./aufblasen";
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
  it("bläst einen Kreis zu einer Kugel auf", () => {
    const [t] = pfadPunkte(ellipse([0, 0], 30, 30).d, 2);
    const n = aufblasen(t.punkte);
    let zMax = 0, zMin = 0;
    for (let i = 2; i < n.ort.length; i += 3) { zMax = Math.max(zMax, n.ort[i]); zMin = Math.min(zMin, n.ort[i]); }
    // Membran über einem Kreis: Höhe in der Mitte r/√2 (ein Streifen ergäbe genau den Halbkreis)
    expect(zMax).toBeGreaterThan(17); expect(zMax).toBeLessThan(26);
    expect(zMin).toBeCloseTo(-zMax, 3);
    expect(n.index.length % 3).toBe(0);
    expect(n.index.length).toBeGreaterThan(300);
    for (const i of n.index) expect(i).toBeLessThan(n.ort.length / 3);
  });
  it("hält Röhrenknochen rund und begrenzt flache Formen", () => {
    const [k] = pfadPunkte(knochen([0, 0], [0, 200], 16).d);
    const rund = aufblasen(k.punkte);
    let z = 0; for (let i = 2; i < rund.ort.length; i += 3) z = Math.max(z, rund.ort[i]);
    expect(z).toBeGreaterThan(6); expect(z).toBeLessThan(16);
    const [f] = pfadPunkte(flaeche([[0, 0], [120, 0], [120, 90], [0, 90]]).d);
    const flach = aufblasen(f.punkte, { maxDicke: 8, hinten: 0.2 });
    let zv = 0, zh = 0; for (let i = 2; i < flach.ort.length; i += 3) { zv = Math.max(zv, flach.ort[i]); zh = Math.min(zh, flach.ort[i]); }
    expect(zv).toBeLessThanOrEqual(8.01); expect(zv).toBeGreaterThan(6); expect(zh).toBeGreaterThan(-1.7);
  });
  it("baut für jeden Zahn eine Krone", () => {
    for (const z of ZAEHNE) {
      const [t] = pfadPunkte(z.form.d, 1.5);
      const n = aufblasen(t.punkte, { feinheit: 14 });
      expect(n.index.length, String(z.fdi)).toBeGreaterThan(30);
    }
  });
});
