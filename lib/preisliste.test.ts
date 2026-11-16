import { describe, expect, it } from "vitest";
import { VERMERK_AB, VERMERK_SPANNE, aehnlichkeit, betragInCent, lesePreiszeile, ordnePreiseZu, parsePreisliste } from "@/lib/preisliste";

describe("betragInCent", () => {
  it.each([
    ["1.234,50", 123450],
    ["1234,50", 123450],
    ["85,-", 8500],
    ["85,–", 8500],
    ["85.-", 8500],
    ["85", 8500],
    ["12,5", 1250],
    ["12.50", 1250],
    ["1.250", 125000],
    ["1 250,00", 125000],
    ["1,234.50", 123450],
    ["0,50", 50],
  ])("%s → %i Cent", (roh, cent) => expect(betragInCent(roh)).toBe(cent));
  it.each(["", "abc", "12,345", "1.2.3,4567", "12.3456"])("nicht lesbar: %s", (roh) => expect(betragInCent(roh)).toBeNull());
});

describe("lesePreiszeile", () => {
  it.each([
    ["Reisemedizinische Beratung 30,00 €", "Reisemedizinische Beratung", 3000],
    ["Reisemedizinische Beratung ........ 30 €", "Reisemedizinische Beratung", 3000],
    ["Akupunktur: 55,- EUR", "Akupunktur", 5500],
    ["Stoßwellentherapie\t85,– €", "Stoßwellentherapie", 8500],
    ["Professionelle Reinigung;1.234,50 €", "Professionelle Reinigung", 123450],
    ["3. Attest für den Sportverein  15,00", "Attest für den Sportverein", 1500],
    ["- Hautkrebs-Screening mit Auflichtmikroskopie 45 Euro", "Hautkrebs-Screening mit Auflichtmikroskopie", 4500],
    ["Sehtest für den Führerschein € 12,50", "Sehtest für den Führerschein", 1250],
    ["Attest;15,00", "Attest", 1500],
    ["OCT der Netzhaut | 95", "OCT der Netzhaut", 9500],
    ["U10 49,90", "U10", 4990],
  ])("%s", (zeile, bezeichnung, cent) => {
    expect(lesePreiszeile(zeile)).toMatchObject({ bezeichnung, betragCent: cent, ab: false });
  });
  it("„ab 60 €“ wird 60 mit Vermerk", () => {
    expect(lesePreiszeile("Akupunktur ab 60 €")).toEqual({ zeile: 1, bezeichnung: "Akupunktur", betragCent: 6000, ab: true, vermerk: VERMERK_AB });
    expect(lesePreiszeile("Faltenbehandlung (ab 180,- EUR)")).toMatchObject({ betragCent: 18000, ab: true });
  });
  it("Zusatz hinter dem Betrag gehört zur Bezeichnung", () => {
    expect(lesePreiszeile("Akupunktur 55 € je Sitzung")).toMatchObject({ bezeichnung: "Akupunktur (je Sitzung)", betragCent: 5500 });
  });
  it("Preisspanne: unterer Betrag mit Vermerk", () => {
    expect(lesePreiszeile("Hyaluron 250 bis 320 €")).toMatchObject({ bezeichnung: "Hyaluron", betragCent: 25000, vermerk: VERMERK_SPANNE });
    expect(lesePreiszeile("Hyaluron 250 € – 320 €")).toMatchObject({ bezeichnung: "Hyaluron", betragCent: 25000, vermerk: VERMERK_SPANNE });
  });
  it("Zahlen in der Bezeichnung sind kein Betrag", () => {
    expect(lesePreiszeile("Krankengymnastik 6 Einheiten 150 €")).toMatchObject({ bezeichnung: "Krankengymnastik 6 Einheiten", betragCent: 15000 });
    expect(lesePreiszeile("Check-up ab 35")).toBeNull();
    expect(lesePreiszeile("Sprechzeiten Montag 8 bis 12")).toBeNull();
    expect(lesePreiszeile("Stand 2026")).toBeNull();
  });
  it("Zeilen ohne Bezeichnung oder ohne Betrag werden nicht gelesen", () => {
    expect(lesePreiszeile("45,00 €")).toBeNull();
    expect(lesePreiszeile("Unsere Selbstzahlerleistungen")).toBeNull();
    expect(lesePreiszeile("")).toBeNull();
  });
});

describe("parsePreisliste", () => {
  const TEXT = `Preisliste 2026
Leistung;Betrag

Reisemedizinische Beratung;30,00 €
Reiseimpfung (je Impfung)\t15 €
Sportmedizinische Untersuchung ...... ab 120,- EUR
Bitte sprechen Sie uns an.`;
  it("liest Zeilen mit Betrag und meldet die übrigen", () => {
    const r = parsePreisliste(TEXT);
    expect(r.zeilen.map((z) => [z.zeile, z.bezeichnung, z.betragCent, z.ab])).toEqual([
      [4, "Reisemedizinische Beratung", 3000, false],
      [5, "Reiseimpfung (je Impfung)", 1500, false],
      [6, "Sportmedizinische Untersuchung", 12000, true],
    ]);
    expect(r.ohneBetrag.map((z) => z.zeile)).toEqual([1, 2, 7]);
  });
  it("Windows-Zeilenenden und leerer Text", () => {
    expect(parsePreisliste("Attest 15 €\r\nImpfung 20 €\r\n").zeilen).toHaveLength(2);
    expect(parsePreisliste("")).toEqual({ zeilen: [], ohneBetrag: [] });
  });
  it("höchstens 500 Zeilen", () => {
    expect(parsePreisliste(Array.from({ length: 700 }, (_, i) => `Leistung ${i} 10,00 €`).join("\n")).zeilen).toHaveLength(500);
  });
});

describe("aehnlichkeit", () => {
  it("gleich bis auf Schreibweise und Endungen", () => {
    expect(aehnlichkeit("Reisemedizinische Beratung", "reisemedizinische beratung")).toBe(1);
    expect(aehnlichkeit("Hoertest", "Hörtest")).toBe(1);
    expect(aehnlichkeit("Reiseimpfungen", "Reiseimpfung")).toBe(1);
  });
  it("ähnliche Bezeichnungen liegen über der Schwelle, fremde darunter", () => {
    expect(aehnlichkeit("Reiseimpfung je Impfung", "Reiseimpfungen nach Plan (je Impfung, zzgl. Impfstoff)")).toBeGreaterThanOrEqual(0.6);
    expect(aehnlichkeit("Sportuntersuchung mit Belastungs-EKG", "Sportmedizinische Untersuchung mit Belastungs-EKG")).toBeGreaterThanOrEqual(0.6);
    expect(aehnlichkeit("Akupunktur", "Stoßwellentherapie")).toBeLessThan(0.3);
    expect(aehnlichkeit("Attest", "Reisemedizinische Beratung")).toBeLessThan(0.3);
    expect(aehnlichkeit("", "Attest")).toBe(0);
  });
});

describe("ordnePreiseZu", () => {
  const ZIELE = [
    { id: "reiseberatung", name: "Reisemedizinische Beratung" },
    { id: "reiseimpfung", name: "Reiseimpfungen nach Plan (je Impfung, zzgl. Impfstoff)" },
    { id: "sportcheck", name: "Sportmedizinische Untersuchung mit Belastungs-EKG" },
  ];
  it("ordnet vorhandenen Leistungen zu und schlägt sonst eine eigene Leistung vor", () => {
    const { zeilen } = parsePreisliste("Reisemedizinische Beratung 35 €\nReiseimpfung je Impfung 18 €\nTauchtauglichkeit 90 €");
    const r = ordnePreiseZu(zeilen, ZIELE);
    expect(r.map((z) => z.zielId)).toEqual(["reiseberatung", "reiseimpfung", null]);
    expect(r[0].aehnlichkeit).toBe(1);
    expect(r[2].aehnlichkeit).toBe(0);
  });
  it("dieselbe Leistung wird nur einmal vorgeschlagen", () => {
    const { zeilen } = parsePreisliste("Reisemedizinische Beratung 35 €\nReisemedizinische Beratung Familie 60 €");
    const r = ordnePreiseZu(zeilen, ZIELE);
    expect(r[0].zielId).toBe("reiseberatung");
    expect(r[1].zielId).toBeNull();
    expect(r[1].vermerk).toContain("Reisemedizinische Beratung");
  });
  it("der Vermerk der Zeile bleibt erhalten; naheliegende Leistungen für die Auswahl", () => {
    const { zeilen } = parsePreisliste("Sportuntersuchung mit Belastungs-EKG ab 120 €");
    const r = ordnePreiseZu(zeilen, ZIELE);
    expect(r[0]).toMatchObject({ zielId: "sportcheck", vermerk: VERMERK_AB });
    expect(r[0].naheliegend[0].id).toBe("sportcheck");
  });
  it("ohne vorhandene Leistungen: alles neue eigene Leistungen", () => {
    const { zeilen } = parsePreisliste("Attest 15 €");
    expect(ordnePreiseZu(zeilen, [])).toMatchObject([{ zielId: null, naheliegend: [] }]);
  });
});
