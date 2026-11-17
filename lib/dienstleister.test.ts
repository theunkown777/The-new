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
    expect(ki.daten).toMatch(/Name der Patientin oder des Patienten, Geburtsdatum, Versichertennummer/);
    expect(ki.daten).toMatch(/Platzhalter/);
    // Ein Foto oder PDF lässt sich nicht bereinigen (lib/kiHilfen.ts kiPreislisteLesen).
    expect(ki.daten).toMatch(/Preisliste \(Foto oder PDF\) geht unverändert an den KI-Dienst/);
  });

  it("der E-Mail-Dienst bekommt den Anlass eines Termins nicht, aber die Kurzmeldung über Fehler", () => {
    const mail = DIENSTE.find((d) => d.dienst.startsWith("Resend"))!;
    expect(mail.daten).not.toMatch(/Anlass/);
    expect(mail.daten).toMatch(/Kurzmeldung über neue Fehler mit Anzahl und Ort, ohne Meldungstext/);
  });

  it("verspricht nichts", () => {
    const text = JSON.stringify(DIENSTE).toLowerCase();
    for (const wort of ["garantiert", "dsgvo-konform", "rechtssicher", "zertifiziert"]) expect(text).not.toContain(wort);
  });
});
