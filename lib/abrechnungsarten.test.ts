import { describe, expect, it } from "vitest";
import { ARTEN, artenFuer } from "./abrechnungsarten";
import { SPECIALTIES } from "./specialties";

describe("Abrechnungsarten", () => {
  it("jedes Fach bekommt mindestens eine Abrechnungsart mit Begriffen und Geldhebeln", () => {
    for (const f of ["zahn", ...SPECIALTIES.map((s) => s.id)]) {
      const a = artenFuer(f);
      expect(a.length, f).toBeGreaterThan(0);
      for (const x of a) { expect(x.begriffe.length).toBeGreaterThan(0); expect(x.geldhebel.length).toBeGreaterThan(0); }
    }
  });
  it("ordnet typische Fächer richtig zu", () => {
    expect(artenFuer("zahn")[0].id).toBe("gkv_bema");
    expect(artenFuer("physio").map((a) => a.id)).toContain("heilmittel");
    expect(artenFuer("ortho").map((a) => a.id)).toContain("bg");
    expect(artenFuer("kardio").map((a) => a.id)).toEqual(["gkv_ebm", "pkv_goae", "beihilfe", "igel"]);
  });
  it("alle Arten sind vollständig beschrieben", () => {
    for (const a of Object.values(ARTEN)) { expect(a.rechenweg.length).toBeGreaterThan(20); expect(a.regeln.length).toBeGreaterThan(0); }
  });
});
