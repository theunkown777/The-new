import { describe, expect, it } from "vitest";
import { HILFE_HINWEIS, HILFE_WISSEN } from "@/lib/hilfeWissen";
import { sucheHilfe } from "@/lib/hilfeSuche";

const erster = (frage: string, fach?: "zahn" | "andere") => sucheHilfe(frage, HILFE_WISSEN, { fach })[0]?.eintrag.id;
const ids = (frage: string, anzahl = 3) => sucheHilfe(frage, HILFE_WISSEN, { anzahl }).map((t) => t.eintrag.id);

describe("Wissenssammlung", () => {
  it("hat 40 bis 60 Einträge mit eindeutigen Kennungen", () => {
    expect(HILFE_WISSEN.length).toBeGreaterThanOrEqual(40);
    expect(HILFE_WISSEN.length).toBeLessThanOrEqual(60);
    expect(new Set(HILFE_WISSEN.map((e) => e.id)).size).toBe(HILFE_WISSEN.length);
  });
  it("jeder Eintrag: Frage, Antwort in zwei bis vier Sätzen, Menüpfad, Seite in der App, Stichwörter", () => {
    for (const e of HILFE_WISSEN) {
      expect(e.frage.length, e.id).toBeGreaterThan(10);
      const saetze = e.antwort.split(/(?<=[.!?])\s+(?=[„A-ZÄÖÜ])/).length;
      expect(saetze, `${e.id}: ${saetze} Sätze`).toBeGreaterThanOrEqual(2);
      expect(saetze, `${e.id}: ${saetze} Sätze`).toBeLessThanOrEqual(4);
      expect(e.pfad.length, e.id).toBeGreaterThan(3);
      expect(e.href, e.id).toMatch(/^\/[a-z0-9/#-]*$/);
      expect(e.stichwoerter.length, e.id).toBeGreaterThanOrEqual(3);
    }
  });
  it("keine Werbewörter, keine Zusagen, keine Gedankenstrich-Einschübe", () => {
    for (const e of HILFE_WISSEN) {
      const t = `${e.frage} ${e.antwort}`;
      expect(t, e.id).not.toMatch(/DSGVO-konform|rechtssicher|garantiert|optimal|\bbeste[nrs]?\b|sinnvoll| – | — /i);
      expect(t, e.id).not.toMatch(/Ratenzahlung|Teilzahlung|3D-Modell/i);
    }
  });
  it("der feste Hinweis schließt Abrechnungs- und Rechtsberatung aus", () => {
    expect(HILFE_HINWEIS).toMatch(/Abrechnung/);
    expect(HILFE_HINWEIS).toMatch(/Recht/);
  });
  it("jeder Eintrag wird mit seiner eigenen Frage als erster gefunden", () => {
    for (const e of HILFE_WISSEN) expect(erster(e.frage, e.nur), e.id).toBe(e.id);
  });
});

describe("sucheHilfe", () => {
  it.each([
    ["Wie mache ich einen neuen Vorschlag?", "vorschlag-neu"],
    ["Patient neu anlegen", "patient-anlegen"],
    ["Wo kann ich die IBAN eintragen", "bankverbindung"],
    ["Kollegin einladen", "team-einladen"],
    ["zwei faktor einrichten", "zwei-faktor"],
    ["Preisliste importieren", "preisliste"],
    ["Mikrofon geht nicht", "diktat"],
    ["DATEV Export für den Steuerberater", "datev"],
    ["Wer hat das geändert?", "protokoll"],
    ["Kalender von Google verbinden", "kalender"],
    ["Warteliste", "warteliste"],
    ["PIN für das Tablet ändern", "empfang-pin"],
    ["KI einschalten", "ki-hilfen"],
    ["Zweigpraxis anlegen", "standorte"],
    ["Patientenliste aus alter Software übernehmen", "patient-import"],
  ])("%s → %s", (frage, id) => expect(erster(frage)).toBe(id));

  it("Umlaute ausgeschrieben, Großschreibung, Endungen", () => {
    expect(erster("VORSCHLAEGE NACHFASSEN")).toBe("vorschlag-nachfassen");
    expect(erster("einwilligungen whatsapp")).toBe("patient-einwilligung");
  });
  it("findet den Import der Patientenliste auch mit dem Wort „importieren“", () => {
    expect(erster("Patienten aus einer Datei importieren")).toBe("patient-import");
    expect(erster("Patientenliste importieren")).toBe("patient-import");
    expect(erster("Preisliste importieren")).toBe("preisliste");
  });
  it("zeigt höchstens drei Einträge, beste zuerst", () => {
    const t = sucheHilfe("Preise ändern", HILFE_WISSEN);
    expect(t.length).toBeGreaterThan(0);
    expect(t.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].punkte).toBeGreaterThanOrEqual(t[i].punkte);
    expect(ids("Preise ändern", 5).length).toBeLessThanOrEqual(5);
  });
  it("blendet Einträge anderer Fächer aus", () => {
    expect(sucheHilfe("Befund diktieren Zahnschema", HILFE_WISSEN, { fach: "andere" }).map((t) => t.eintrag.id)).not.toContain("vorschlag-befund-diktat");
    expect(erster("Befund diktieren Zahnschema", "zahn")).toBe("vorschlag-befund-diktat");
    expect(erster("Preise ändern", "zahn")).toBe("vorschlagspreise");
    expect(erster("Preise ändern", "andere")).toBe("preise");
  });
  it("findet nichts zu Fragen außerhalb der Bedienung und zu leeren Fragen", () => {
    expect(sucheHilfe("", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("wie ist das?", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("Wetter morgen in Hamburg", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("Xylophon Quantenphysik", HILFE_WISSEN)).toEqual([]);
  });
});
