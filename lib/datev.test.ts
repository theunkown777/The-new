import { describe, expect, it } from "vitest";
import { DATEV_SPALTEN, alsWindows1252, belegfeld, datevBuchungen, datevSchema, datevStapel } from "./datev";

const e = datevSchema.parse({ beraternummer: 1001, mandantennummer: 456 });
const von = new Date(2026, 9, 1);
const bis = new Date(2026, 9, 31, 23, 59, 59);

describe("DATEV-Buchungsstapel", () => {
  it("Vorgaben SKR03 und Pflichtfelder", () => {
    expect(e).toMatchObject({ sachkontenlaenge: 4, erloeskonto: 8100, bankkonto: 1200, debitor: 10000 });
    expect(datevSchema.safeParse({ beraternummer: 12, mandantennummer: 1 }).success).toBe(false);
  });

  it("Rechnung als Forderung, Zahlung als Eingang, Storno und andere Monate nicht", () => {
    const b = datevBuchungen(
      [
        { number: "2026-0042", amountCent: 123456, status: "BEZAHLT", createdAt: new Date(2026, 9, 3), paidAt: new Date(2026, 9, 20) },
        { number: "2026-0043", amountCent: 5000, status: "STORNIERT", createdAt: new Date(2026, 9, 5), paidAt: null },
        { number: "2026-0030", amountCent: 9900, status: "BEZAHLT", createdAt: new Date(2026, 8, 20), paidAt: new Date(2026, 9, 2) },
        { number: "2026-0050", amountCent: 7000, status: "OFFEN", createdAt: new Date(2026, 10, 1), paidAt: null },
      ],
      e,
      von,
      bis,
    );
    expect(b.map((x) => [x.konto, x.gegenkonto, x.cent, x.beleg])).toEqual([
      [1200, 10000, 9900, "2026-0030"],
      [10000, 8100, 123456, "2026-0042"],
      [1200, 10000, 123456, "2026-0042"],
    ]);
  });

  it("Dateiaufbau wie die DATEV-Beispieldatei", () => {
    const b = datevBuchungen([{ number: "2026-0042", amountCent: 123456, status: "OFFEN", createdAt: new Date(2026, 9, 3), paidAt: null }], e, von, bis);
    const datei = datevStapel(b, e, von, bis, new Date(2026, 10, 7, 10, 5, 3, 7));
    const zeilen = datei.split("\r\n");
    expect(zeilen[0]).toBe('"EXTF";700;21;"Buchungsstapel";13;20261107100503007;;"SO";"Sorrida";;1001;456;20260101;4;20261001;20261031;"Sorrida 20261001-20261031";;1;;0;"EUR";;;;;;;;;');
    expect(zeilen[0].split(";")).toHaveLength(31);
    expect(DATEV_SPALTEN).toHaveLength(125);
    expect(zeilen[1].split(";")).toHaveLength(125);
    expect(zeilen[2].split(";")).toHaveLength(125);
    expect(zeilen[2].startsWith('1234,56;"S";;;;;10000;8100;;0310;"2026-0042";;;"Honorar Rg. 2026-0042";')).toBe(true);
    expect(datei.endsWith("\r\n")).toBe(true);
  });

  it("Belegfeld und Zeichensatz", () => {
    expect(belegfeld("re 2026/42 (ä)")).toBe("RE2026/42");
    const bytes = alsWindows1252("Gegenkonto (ohne BU-Schlüssel) – €");
    expect(bytes.includes(0xfc)).toBe(true); // ü
    expect(bytes.includes(0x96)).toBe(true); // –
    expect(bytes.includes(0x80)).toBe(true); // €
  });
});
