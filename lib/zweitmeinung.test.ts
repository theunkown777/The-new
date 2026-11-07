import { describe, expect, it } from "vitest";
import { anspruchAufZweitmeinung, zweitmeinungHinweis, zweitmeinungSchema } from "./zweitmeinung";

describe("Zweitmeinung", () => {
  it("erkennt Eingriffe mit gesetzlichem Anspruch (§ 27b SGB V)", () => {
    expect(anspruchAufZweitmeinung(["Künstliches Kniegelenk"])).toMatch(/Knieendoprothese/);
    expect(anspruchAufZweitmeinung(["Mandel-OP", "Tonsillektomie"])).toMatch(/Rachenmandeln/);
    expect(anspruchAufZweitmeinung(["Gebärmutterentfernung"])).toMatch(/Hysterektomie/);
    expect(anspruchAufZweitmeinung(["Bandscheiben-OP"])).toMatch(/Wirbelsäule/);
    expect(anspruchAufZweitmeinung(["Katheterablation bei Vorhofflimmern"])).toMatch(/Ablation/);
    expect(anspruchAufZweitmeinung(["Professionelle Zahnreinigung", "Krone"])).toBeNull();
    // Vorsorge ist kein Eingriff, und Texte verschiedener Positionen werden nicht verbunden
    expect(anspruchAufZweitmeinung(["Prostatakrebs-Früherkennung", "Weitere Behandlung"])).toBeNull();
    expect(anspruchAufZweitmeinung(["Prostatakrebs-Behandlung"])).toMatch(/Prostatakarzinom/);
  });
  it("Hinweis je nach Anspruch und Fach", () => {
    expect(zweitmeinungHinweis(["Künstliches Hüftgelenk"], false).text).toMatch(/§ 27b SGB V/);
    expect(zweitmeinungHinweis(["Krone"], true).titel).toMatch(/Heil- und Kostenplan/);
    expect(zweitmeinungHinweis(["Akne"], false).titel).toMatch(/zweite Meinung/);
  });
  it("Beträge: deutsches Komma und Tausenderpunkt, in Cent", () => {
    const d = zweitmeinungSchema.parse({ leistung: "Implantat", eigenanteil: "1.890,50", gesamt: null });
    expect(d.eigenanteil).toBe(189050);
    expect(zweitmeinungSchema.safeParse({ leistung: "x", eigenanteil: "10" }).success).toBe(false);
    expect(zweitmeinungSchema.safeParse({ leistung: "Krone", eigenanteil: "-5" }).success).toBe(false);
  });
});
