import { describe, expect, it } from "vitest";
import { ARTEN, artenFuer } from "./abrechnungsarten";
import { ALLE_SPECIALTIES } from "./specialties";

describe("Abrechnungsarten", () => {
  it("jedes Fach bekommt mindestens eine Abrechnungsart mit Begriffen und Geldhebeln", () => {
    for (const f of ["zahn", ...ALLE_SPECIALTIES.map((s) => s.id)]) {
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
    expect(artenFuer("apotheke")[0].id).toBe("apotheke");
    expect(artenFuer("apotheke").map((a) => a.id)).not.toContain("gkv_ebm");
    expect(artenFuer("klinik")[0].id).toBe("klinik_wahl");
    expect(artenFuer("heilpraktiker")[0].id).toBe("heilpraktiker");
    expect(artenFuer("aesthetik").map((a) => a.id)).not.toContain("gkv_ebm");
  });
  it("alle Arten sind vollständig beschrieben", () => {
    for (const a of Object.values(ARTEN)) { expect(a.rechenweg.length).toBeGreaterThan(20); expect(a.regeln.length).toBeGreaterThan(0); }
  });
  it("Hinweise beschreiben: kein „aktiv ansprechen“, kein Erinnern zur Vorsorge, keine Mengen ohne Quelle, keine Wertung", () => {
    for (const a of Object.values(ARTEN)) {
      const texte = [...a.regeln, ...a.geldhebel.flatMap((g) => [g.problem, g.massnahme, g.inSorrida ?? ""])];
      for (const t of texte) {
        expect(t, a.id).not.toMatch(/aktiv ansprechen|ansprechen|ausschöpfen|unter Wert|\b(kaum|viele|vielen|oft|meist|häufig)\b/i);
        expect(t, a.id).not.toMatch(/(lehnen|zahlen nicht) ab, weil|ablehnen, weil/i);
      }
      for (const g of a.geldhebel) if (/Vorsorge/.test(g.problem)) expect(g.massnahme, a.id).not.toMatch(/erinnern/i);
    }
  });
  it("kein Text rät zu Raten oder Teilzahlung (Raten sind angehalten, lib/installments.ts)", () => {
    for (const a of Object.values(ARTEN)) {
      const texte = [a.zahler, a.rechenweg, ...a.regeln, ...a.begriffe.flat(), ...a.geldhebel.flatMap((g) => [g.problem, g.massnahme, g.inSorrida ?? ""])];
      for (const t of texte) expect(t, a.id).not.toMatch(/\brate|ratenwunsch|teilzahl|finanzier/i);
    }
  });
});
