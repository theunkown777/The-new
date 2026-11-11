import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACH_MODELLE, fokusFuerFach, hauptModell } from "./fach";
import { ERKLAERPUNKTE, FOKUS, erklaerpunkteFuerFach, imFokus } from "./fokus";
import { ANATOMIE, DATEI_VON, IN_3D, STUFEN, STUFE_DATEIEN, inStufe, stufeFuerEbene } from "./drei/anatomie";
import { STRUKTUREN, teilLesen } from "./koerper";
import { MUND_TEILE } from "./mund";

describe("Immer nur das Nötigste: Organ je Fach", () => {
  it("Lunge, Herz, Verdauung, Nieren, Gehirn, Auge, Ohr, Becken je nach Fach", () => {
    expect(fokusFuerFach("pneumo")).toBe("lunge");
    expect(fokusFuerFach("kardio")).toBe("herz");
    expect(fokusFuerFach("gastro")).toBe("verdauung");
    expect(fokusFuerFach("uro")).toBe("harnwege");
    expect(fokusFuerFach("neuro")).toBe("gehirn");
    expect(fokusFuerFach("augen")).toBe("auge");
    expect(fokusFuerFach("hno")).toBe("hno");
    expect(fokusFuerFach("gyn")).toBe("becken");
    expect(fokusFuerFach("podo")).toBe("fuss");
    // Bewegungsapparat und Hausarzt: der ganze Mensch
    expect(fokusFuerFach("ortho")).toBeNull();
    expect(fokusFuerFach("hausarzt")).toBeNull();
    expect(hauptModell("pneumo")).toBe("koerper");
    expect(hauptModell("zahn")).toBe("gebiss");
  });
  it("jeder Fokus verweist auf vorhandene Dateien und zeigt etwas", () => {
    for (const f of Object.values(FOKUS)) {
      for (const d of f.dateien) expect(ANATOMIE[d], `${f.id}: ${d}`).toBeTruthy();
      const teile = f.dateien.flatMap((d) => ANATOMIE[d].teile).filter((t) => imFokus(f, t.name, t.mitte[1]));
      expect(teile.length, f.id).toBeGreaterThan(0);
    }
    for (const [fach, m] of Object.entries(FACH_MODELLE)) if (m.fokus) expect(FOKUS[m.fokus], fach).toBeTruthy();
  });
  it("Lungenarzt sieht nur Lunge, Atemwege und Zwerchfell", () => {
    const f = FOKUS.lunge;
    const namen = f.dateien.flatMap((d) => ANATOMIE[d].teile.map((t) => t.name)).filter((n) => !n.startsWith("deko:"));
    expect(namen.sort()).toEqual(["luftroehre:M", "lunge:L", "lunge:R", "zwerchfell:M"]);
    expect(f.bewegung).toBe("atmen");
    expect(FOKUS.herz.bewegung).toBe("schlagen");
  });
  it("Erklärpunkte: Fach sieht nur seine; ohne Fach alle", () => {
    expect(erklaerpunkteFuerFach("pneumo").map((p) => p.thema)).toEqual(["lunge"]);
    expect(erklaerpunkteFuerFach("zahn").map((p) => p.thema)).toEqual(["mund"]);
    expect(erklaerpunkteFuerFach(null).length).toBe(ERKLAERPUNKTE.length);
    expect(new Set(ERKLAERPUNKTE.map((p) => p.thema)).size).toBe(11);
    for (const p of ERKLAERPUNKTE) expect(!!p.fokus !== !!p.stufe, p.thema).toBe(true);
  });
});

describe("Echte 3D-Daten", () => {
  it("die Dateien liegen im öffentlichen Ordner und sind klein genug", () => {
    let summe = 0;
    for (const [d, i] of Object.entries(ANATOMIE)) {
      const pfad = `public/anatomie-3d/${d}.glb`;
      expect(existsSync(pfad), pfad).toBe(true);
      expect(statSync(pfad).size, d).toBe(i.bytes);
      expect(i.bytes, d).toBeLessThan(1.5 * 1024 * 1024);
      summe += i.bytes;
    }
    expect(summe).toBeLessThan(4 * 1024 * 1024);
  });
  it("Kennungen der 3D-Teile passen zu den Strukturen und Zähnen", () => {
    for (const k of Object.keys(DATEI_VON)) {
      if (/^\d\d$/.test(k)) continue;
      if (k.startsWith("mund:")) { expect(MUND_TEILE.some((m) => m.id === k), k).toBe(true); continue; }
      if (k === "haut") continue;
      expect(teilLesen(k), k).not.toBeNull();
    }
    // 28 echte Zähne und 4 ergänzte Weisheitszähne
    expect(Object.keys(DATEI_VON).filter((k) => /^\d\d$/.test(k)).length).toBe(32);
    for (const id of ["schaedel", "lunge", "herz", "leber", "niere", "gehirn", "bizeps", "oberschenkelknochen"]) expect(IN_3D.has(id), id).toBe(true);
    expect(IN_3D.has("gebaermutter")).toBe(false);
    expect(STRUKTUREN.filter((s) => IN_3D.has(s.id)).length).toBeGreaterThan(70);
  });
  it("Ebenen sind getrennt: ohne Haut nur das Skelett, dann eine Ebene nach der anderen", () => {
    expect(STUFEN.map((s) => s.id)).toEqual(["haut", "muskeln", "organe", "skelett", "nerven"]);
    expect(inStufe("skelett", "knochen")).toBe(true);
    expect(inStufe("skelett", "muskeln")).toBe(false);
    expect(inStufe("skelett", "haut")).toBe(false);
    expect(inStufe("haut", "knochen")).toBe(false);
    expect(inStufe("skelett", "sehnen", "bandscheiben:M")).toBe(true);
    expect(inStufe("muskeln", "sehnen", "bandscheiben:M")).toBe(false);
    expect(STUFE_DATEIEN.haut).toEqual(["haut"]);
    expect(stufeFuerEbene("knochen")).toBe("skelett");
    expect(stufeFuerEbene("sehnen")).toBe("muskeln");
  });
});
