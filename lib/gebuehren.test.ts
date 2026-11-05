import { describe, expect, it } from "vitest";
import { betragCent, mehrbetragCent, pruefeFaktor } from "./gebuehren";

describe("Gebührenrechner", () => {
  it("GOÄ: Beratung Nr. 1 (80 Punkte) zum 2,3-fachen = 10,72 €", () => {
    expect(betragCent({ werk: "GOAE", punkte: 80, faktor: 2.3 })).toBe(1072);
  });
  it("GOZ: 100 Punkte zum 2,3-fachen = 12,94 €", () => {
    expect(betragCent({ werk: "GOZ", punkte: 100, faktor: 2.3 })).toBe(1294);
  });
  it("EBM: Punkte mal Orientierungswert der Praxis, ohne Faktor", () => {
    expect(betragCent({ werk: "EBM", punkte: 100, punktwertCent: 12.3934, faktor: 3 })).toBe(1239);
  });
  it("EBM 2026: Versorgungspauschale 03000 (114 Punkte) = 14,52 €", () => {
    expect(betragCent({ werk: "EBM", punkte: 114 })).toBe(1452);
  });
  it("UV-GOÄ rechnet Eurobeträge", () => {
    expect(betragCent({ werk: "UVGOAE", euroBetrag: 8.52, anzahl: 2 })).toBe(1704);
  });
  it("prüft Spannen je Leistungsgruppe", () => {
    expect(pruefeFaktor("GOAE", 2.3).stufe).toBe("ok");
    expect(pruefeFaktor("GOAE", 3.0).stufe).toBe("begruendung");
    expect(pruefeFaktor("GOAE", 3.6).stufe).toBe("vereinbarung");
    expect(pruefeFaktor("GOAE", 2.0, "technisch").stufe).toBe("begruendung");
    expect(pruefeFaktor("GOAE", 1.2, "labor").stufe).toBe("begruendung");
    expect(pruefeFaktor("GOZ", 3.5).stufe).toBe("begruendung");
    expect(pruefeFaktor("EBM", 2).stufe).toBe("ok");
  });
  it("Mehrbetrag einer begründeten Steigerung", () => {
    // GOZ 2060 Füllung einflächig: 518 Punkte (Beispiel), 3,5 statt 2,3
    expect(mehrbetragCent({ werk: "GOZ", punkte: 518, faktor: 3.5 })).toBe(Math.round(518 * 5.62421 * 3.5) - Math.round(518 * 5.62421 * 2.3));
  });
});
