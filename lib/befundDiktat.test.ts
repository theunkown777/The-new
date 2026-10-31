import { describe, expect, it } from "vitest";
import { normalizeNumbers, parseBefundDiktat } from "@/lib/befundDiktat";

describe("Befund-Diktat", () => {
  it("liest Zahn-dann-Befund mit Kommas", () => {
    const r = parseBefundDiktat("16 Karies MOD, 25 Karies klein, 36 fehlt, 46 Füllung insuffizient, Zahnstein");
    expect(r.teeth).toEqual({ "16": "karies_gross", "25": "karies_klein", "36": "fehlt", "46": "fuellung_defekt" });
    expect(r.globals).toEqual(["zahnstein"]);
  });

  it("funktioniert ohne Satzzeichen wie bei der Spracheingabe", () => {
    const r = parseBefundDiktat("sechzehn karies groß fünfundzwanzig karies klein sechsunddreißig fehlt PSI 3");
    expect(r.teeth).toEqual({ "16": "karies_gross", "25": "karies_klein", "36": "fehlt" });
    expect(r.globals).toEqual(["psi"]);
  });

  it("Befund vor mehreren Zähnen im selben Abschnitt", () => {
    const r = parseBefundDiktat("Karies groß an 16 und 17. 46 Wurzelbehandlung");
    expect(r.teeth).toEqual({ "16": "karies_gross", "17": "karies_gross", "46": "wurzel" });
  });

  it("mehrere Zähne vor einem Befund", () => {
    expect(parseBefundDiktat("36 und 37 fehlen").teeth).toEqual({ "36": "fehlt", "37": "fehlt" });
    expect(parseBefundDiktat("14, 15 fehlend").teeth).toEqual({ "14": "fehlt", "15": "fehlt" });
  });

  it("kariesfrei ist kein Kariesbefund", () => {
    expect(parseBefundDiktat("35 und 37 kariesfrei, 36 fehlt").teeth).toEqual({ "35": "ok", "37": "ok", "36": "fehlt" });
  });

  it("frakturierte Füllung ist Füllung defekt, frakturierter Zahn ist zerstört", () => {
    expect(parseBefundDiktat("46 frakturierte Füllung").teeth).toEqual({ "46": "fuellung_defekt" });
    expect(parseBefundDiktat("21 abgebrochen").teeth).toEqual({ "21": "zerstoert" });
  });

  it("Quadrant-Position gesprochen", () => {
    expect(normalizeNumbers("zahn eins sechs")).toBe("zahn 16");
    expect(parseBefundDiktat("vier sechs krone nötig").teeth).toEqual({ "46": "zerstoert" });
  });

  it("ignoriert Nicht-Zähne und meldet Zähne ohne Befund", () => {
    const r = parseBefundDiktat("Patient 45 Jahre, 19 und 50 sind keine Zähne, 26 schaue ich mir an, knirscht nachts");
    expect(r.teeth).toEqual({});
    expect(r.unassigned).toEqual([26]);
    expect(r.globals).toEqual(["bruxismus"]);
  });

  it("Raucher und Bleaching-Wunsch", () => {
    expect(parseBefundDiktat("Raucher, wünscht Bleaching").globals.sort()).toEqual(["bleaching", "raucher"]);
  });
});
