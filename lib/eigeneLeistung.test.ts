import { describe, expect, it } from "vitest";
import { eigeneLeistungSchema, eigenesSystem, naechsteEigeneZiffer, preisInCent } from "./eigeneLeistung";

describe("Eigene Leistung schnell anlegen", () => {
  it("liest Preise in üblichen Schreibweisen", () => {
    expect(preisInCent("49")).toBe(4900);
    expect(preisInCent("49,90")).toBe(4990);
    expect(preisInCent("49.90")).toBe(4990);
    expect(preisInCent("1.250,00 €")).toBe(125000);
    expect(preisInCent("")).toBeNull();
    expect(preisInCent(null)).toBeNull();
    expect(preisInCent("abc")).toBeUndefined();
    expect(preisInCent("-5")).toBeUndefined();
    expect(preisInCent(12.5)).toBe(1250);
  });
  it("vergibt die nächste freie Ziffer", () => {
    expect(naechsteEigeneZiffer([])).toBe("E1");
    expect(naechsteEigeneZiffer(["E1", "E7", "0010", "Ä 1", "E2x"])).toBe("E8");
  });
  it("prüft die Eingabe", () => {
    expect(eigeneLeistungSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(eigeneLeistungSchema.safeParse({ name: "Bleaching", preis: "x" }).success).toBe(false);
    const ok = eigeneLeistungSchema.safeParse({ name: "  Professionelle   Zahnreinigung ", preis: "95,00" });
    expect(ok.success && ok.data).toEqual({ name: "Professionelle Zahnreinigung", preisCent: 9500, kategorie: null });
    const ohne = eigeneLeistungSchema.safeParse({ name: "Attest" });
    expect(ohne.success && ohne.data.preisCent).toBeNull();
  });
  it("wählt das Verzeichnis nach Fach", () => {
    expect(eigenesSystem("zahn")).toBe("SONSTIGES");
    expect(eigenesSystem("arzt")).toBe("SELBST");
  });
});
