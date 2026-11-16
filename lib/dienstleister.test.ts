import { describe, expect, it } from "vitest";
import { DIENSTE } from "@/lib/dienstleister";

describe("Dienstleister (AVV-Muster und /vertrauen)", () => {
  it("jeder Dienst nennt Zweck, Daten und Ort", () => {
    expect(DIENSTE.length).toBeGreaterThanOrEqual(5);
    for (const d of DIENSTE) {
      expect(d.dienst.length).toBeGreaterThan(3);
      expect(d.zweck.length).toBeGreaterThan(5);
      expect(d.daten.length).toBeGreaterThan(5);
      expect(d.ort.length).toBeGreaterThan(1);
    }
    expect(new Set(DIENSTE.map((d) => d.dienst)).size).toBe(DIENSTE.length);
  });

  it("der KI-Dienst nennt, was vorher ersetzt wird", () => {
    const ki = DIENSTE.find((d) => d.dienst.startsWith("Anthropic"))!;
    expect(ki.daten).toMatch(/Namen, Geburtsdatum, Versichertennummer/);
    expect(ki.daten).toMatch(/Platzhalter/);
  });

  it("verspricht nichts", () => {
    const text = JSON.stringify(DIENSTE).toLowerCase();
    for (const wort of ["garantiert", "dsgvo-konform", "rechtssicher", "zertifiziert"]) expect(text).not.toContain(wort);
  });
});
