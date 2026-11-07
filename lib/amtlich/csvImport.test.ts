import { describe, expect, it } from "vitest";
import { euroInCent, leseLeistungenCsv } from "./csvImport";

describe("Leistungslisten als CSV", () => {
  it("liest Zeilen ohne Kopfzeile (Ziffer;Bezeichnung;Betrag)", () => {
    const r = leseLeistungenCsv("99001;Impfung Influenza (regional);10,50\n99002;Grippeimpfung Zuschlag;\n");
    expect(r.fehler).toEqual([]);
    expect(r.zeilen).toEqual([
      { code: "99001", title: "Impfung Influenza (regional)", festbetragCent: 1050, punktzahl: null, description: null },
      { code: "99002", title: "Grippeimpfung Zuschlag", festbetragCent: null, punktzahl: null, description: null },
    ]);
  });

  it("erkennt Kopfzeile, Komma als Trenner und Spalten in anderer Reihenfolge", () => {
    const r = leseLeistungenCsv('Bezeichnung,GOP,Euro,Kasse\n"Hautkrebs-Screening, erweitert",99123,"25,00",AOK\n');
    expect(r.zeilen[0]).toMatchObject({ code: "99123", title: "Hautkrebs-Screening, erweitert", festbetragCent: 2500, description: "AOK" });
  });

  it("meldet fehlerhafte und doppelte Zeilen, übernimmt den Rest", () => {
    const r = leseLeistungenCsv("Ziffer\tLeistung\tBetrag\n1\tA\tabc\n2\tB\t1.234,56\n2\tC\t1\n\tD\t1\n");
    expect(r.zeilen).toEqual([{ code: "2", title: "B", festbetragCent: 123456, punktzahl: null, description: null }]);
    expect(r.fehler.map((f) => f.zeile)).toEqual([2, 4, 5]);
  });

  it("Beträge", () => {
    expect(euroInCent("12,50 €")).toBe(1250);
    expect(euroInCent("12.5")).toBe(1250);
    expect(euroInCent("")).toBeNull();
    expect(euroInCent("x")).toBeNaN();
  });
});
