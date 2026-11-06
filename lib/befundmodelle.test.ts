import { describe, expect, it } from "vitest";
import { BEFUNDMODELLE, befundmodell } from "./befundmodelle";
import { ICD_RE } from "./akte";
import { specialty } from "./specialties";

describe("Befundmodelle", () => {
  it("jeder Code hat gültiges ICD-10-Format und jede Region mindestens einen Befund", () => {
    for (const [fach, regionen] of Object.entries(BEFUNDMODELLE)) {
      for (const r of regionen) {
        expect(r.befunde.length, `${fach}/${r.id}`).toBeGreaterThan(0);
        for (const b of r.befunde) expect(ICD_RE.test(b.icd), `${fach}: ${b.icd}`).toBe(true);
      }
    }
  });
  it("verweist nur auf Anlässe, die es im Fach gibt", () => {
    for (const [fach, regionen] of Object.entries(BEFUNDMODELLE)) {
      if (fach === "zahn") continue;
      const anlaesse = new Set(specialty(fach)?.anlaesse.map((a) => a.id) ?? []);
      for (const r of regionen) for (const b of r.befunde) if (b.anlass) expect(anlaesse.has(b.anlass), `${fach}: ${b.anlass}`).toBe(true);
    }
  });
  it("Zahnarzt bekommt Kiefer, Kardiologie das Herz, Unbekanntes den Hausarzt", () => {
    expect(befundmodell("zahn").map((r) => r.id)).toContain("kiefer");
    expect(befundmodell("kardio").map((r) => r.id)).toContain("koronarien");
    expect(befundmodell("xyz")).toBe(BEFUNDMODELLE.hausarzt);
  });
  it("kein Diagnosemodell für Apotheke, Optik, Pflege & Co.", () => {
    for (const f of ["apotheke", "optik", "hoerakustik", "sanitaetshaus", "pflege", "hebamme"]) expect(befundmodell(f), f).toEqual([]);
  });
  it("Frauen sehen keine Prostata-Befunde, Männer keine PCOS", () => {
    const frau = JSON.stringify(befundmodell("uro", { geschlecht: "W" }));
    expect(frau).not.toContain("Prostata");
    expect(frau).not.toContain("Erektile");
    expect(frau).toContain("Harninkontinenz");
    expect(JSON.stringify(befundmodell("uro", { geschlecht: "M" }))).toContain("Prostata");
    expect(JSON.stringify(befundmodell("endo", { geschlecht: "M" }))).not.toContain("Polyzystisch");
  });
});
