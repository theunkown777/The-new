import { describe, expect, it } from "vitest";
import { DATEV_SPALTEN, alsWindows1252, belegfeld, datevBuchungen, datevSchema, datevStapel } from "./datev";

const e = datevSchema.parse({ beraternummer: 1001, mandantennummer: 456 });
const von = new Date(2026, 9, 1);
const bis = new Date(2026, 9, 31, 23, 59, 59);

describe("DATEV-Buchungsstapel", () => {
  it("Vorgaben SKR03 und Pflichtfelder", () => {
    expect(e).toMatchObject({ sachkontenlaenge: 4, erloeskonto: 8100, bankkonto: 1200, debitor: 10000, geldtransit: 1360 });
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
    expect(zeilen[0]).toBe('"EXTF";700;21;"Buchungsstapel";13;20261107100503007;;"SO";"Sorrida";"";1001;456;20260101;4;20261001;20261031;"Sorrida 20261001 bis 20261031";"";1;0;0;"EUR";;"";;;"03";;;"";""');
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

// Feldregeln aus dem Schema der verbreiteten Bibliothek ledermann/datev (Version 0.12.1,
// DATEV-Format 7.0): Kopf 31 Felder mit Längen, Buchungen mit 125 Spalten in derselben
// Reihenfolge, Umsatz mit 2 Nachkommastellen, Konto bis 9 Stellen, Belegdatum TTMM,
// Belegfeld 1 bis 36 Zeichen aus [a-zA-Z0-9$&%*+-/], Buchungstext bis 60 Zeichen.
describe("DATEV: Abgleich mit dem Schema der datev-Bibliothek", () => {
  const unq = (v: string) => (v.startsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v);
  it("Kopf und jede Buchung halten die Feldregeln ein, auch bei Grenzfällen", () => {
    const rechnungen = [
      { number: "2026-0001", amountCent: 1, status: "BEZAHLT", createdAt: new Date(2026, 0, 2), paidAt: new Date(2026, 0, 31) },
      { number: "2026/Ä-0002 (Kopie)", amountCent: 999_999_999, status: "OFFEN", createdAt: new Date(2026, 11, 31), paidAt: null },
      { number: "X".repeat(50), amountCent: 123456, status: "GEMELDET", createdAt: new Date(2026, 5, 15), paidAt: null },
    ];
    const e2 = datevSchema.parse({ beraternummer: 9999999, mandantennummer: 99999, sachkontenlaenge: 8, erloeskonto: 81000000, bankkonto: 12000000, geldtransit: 13600000, debitor: 100000000, kuerzel: "Z".repeat(25) });
    const v = new Date(2026, 0, 1), b2 = new Date(2026, 11, 31, 23, 59, 59);
    const zeilen = datevStapel(datevBuchungen(rechnungen, e2, v, b2), e2, v, b2).split("\r\n").slice(0, -1);
    const kopf = zeilen[0].split(";");
    expect(kopf).toHaveLength(31);
    const grenzen: Record<number, number> = { 1: 4, 2: 3, 3: 2, 5: 3, 8: 2, 9: 25, 10: 10, 11: 7, 12: 5, 14: 1, 17: 30, 18: 2, 19: 1, 20: 2, 22: 3 };
    for (const [i, max] of Object.entries(grenzen)) expect(unq(kopf[Number(i) - 1]).length, `Kopf ${i}`).toBeLessThanOrEqual(max);
    expect(kopf[5]).toMatch(/^\d{17}$/);
    for (const i of [13, 15, 16]) expect(kopf[i - 1]).toMatch(/^\d{8}$/);
    expect(zeilen[1].split(";")).toEqual([...DATEV_SPALTEN]);
    for (const z of zeilen.slice(2)) {
      const f = z.split(";");
      expect(f).toHaveLength(125);
      expect(f[0]).toMatch(/^\d{1,10},\d{2}$/);
      expect(["S", "H"]).toContain(unq(f[1]));
      expect(f[6]).toMatch(/^\d{1,9}$/);
      expect(f[7]).toMatch(/^\d{1,9}$/);
      expect(f[9]).toMatch(/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])$/);
      expect(unq(f[10])).toMatch(/^[a-zA-Z0-9$&%*+\-/]{0,36}$/);
      expect(unq(f[13]).length).toBeLessThanOrEqual(60);
    }
    expect(zeilen.length).toBe(2 + 4);
  });
});


// Reguläre Ausdrücke wörtlich aus der DATEV-Formatbeschreibung (developer.datev.de,
// DATEV-Format → Formatbeschreibung → Header bzw. Buchungsstapel, abgerufen 07.11.2026).
const DATEV_KOPF: Record<number, RegExp> = {
  1: /^["](EXTF|DTVF)["]$/, 2: /^(700)$/, 3: /^(16|20|21|46|48|65)$/,
  4: /^["](Buchungsstapel|Wiederkehrende Buchungen|Debitoren\/Kreditoren|Kontenbeschriftungen|Zahlungsbedingungen|Diverse Adressen)["]$/,
  5: /^(2|4|5|13)$/,
  6: /^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])(2[0-3]|[01][0-9])([0-5][0-9])([0-5][0-9][0-9][0-9][0-9])$/,
  7: /^$/, 8: /^["]\w{0,2}["]$/, 9: /^["]\w{0,25}["]$/, 10: /^["]\w{0,25}["]$/, 11: /^(\d{4,6}|\d{7})$/, 12: /^\d{1,5}$/,
  13: /^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$/, 14: /^[4-8]$/,
  15: /^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$/, 16: /^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$/,
  17: /^["][\w.-/ ]{0,30}["]$/, 18: /^["]([A-Z]{2}){0,2}["]$/, 19: /^[1-2]$/, 20: /^(0|30|40|50|64)$/, 21: /^(0|1)$/, 22: /^["]([A-Z]{3})["]$/,
  23: /^$/, 24: /^["]["]$/, 25: /^$/, 26: /^$/, 27: /^["](\d{2}){0,2}["]$/, 28: /^\d{0,4}$/, 29: /^$/, 30: /^["]["]$/, 31: /^["].{0,16}["]$/,
};
const DATEV_BUCHUNG: Record<number, RegExp> = {
  1: /^(?!0{1,10}\,00)\d{1,10}\,\d{2}$/, 2: /^["](S|H)["]$/, 7: /^(?!0{1,9}$)(\d{1,9})$/, 8: /^(?!0{1,9}$)(\d{1,9})$/,
  10: /^(\d{4})$/, 11: /^(["][\w$&%*+\-\/]{0,36}["])$/, 14: /^(["].{0,60}["])$/,
};

describe("DATEV: Abgleich mit der offiziellen DATEV-Formatbeschreibung", () => {
  it("jedes Kopffeld und jedes befüllte Buchungsfeld passt auf den Ausdruck von DATEV, alle anderen sind leer", () => {
    const rechnungen = [
      { number: "2026-0001", amountCent: 1, status: "BEZAHLT", createdAt: new Date(2026, 0, 2), paidAt: new Date(2026, 0, 31) },
      { number: "2026/Ä-0002 (Kopie)", amountCent: 999_999_999, status: "OFFEN", createdAt: new Date(2026, 11, 31), paidAt: null },
      { number: "2026-0003", amountCent: 0, status: "OFFEN", createdAt: new Date(2026, 5, 1), paidAt: null },
      { number: "X".repeat(50), amountCent: 123456, status: "BEZAHLT", createdAt: new Date(2026, 5, 15), paidAt: new Date(2026, 6, 1) },
    ];
    for (const einst of [{}, { sachkontenlaenge: 8, erloeskonto: 81000000, bankkonto: 12000000, geldtransit: 14600000, debitor: 100000000, kontenrahmen: "04" }]) {
      const e2 = datevSchema.parse({ beraternummer: 1001, mandantennummer: 1, ...einst });
      const v = new Date(2026, 0, 1), b2 = new Date(2026, 11, 31, 23, 59, 59);
      const zeilen = datevStapel(datevBuchungen(rechnungen, e2, v, b2), e2, v, b2).split("\r\n").slice(0, -1);
      const kopf = zeilen[0].split(";");
      expect(kopf).toHaveLength(31);
      for (const [i, re] of Object.entries(DATEV_KOPF)) expect(kopf[Number(i) - 1], `Kopf #${i}`).toMatch(re);
      expect(zeilen).toHaveLength(2 + 5); // Umsatz 0,00 wird nicht exportiert
      for (const z of zeilen.slice(2)) {
        const f = z.split(";");
        expect(f).toHaveLength(125);
        for (const [i, re] of Object.entries(DATEV_BUCHUNG)) expect(f[Number(i) - 1], `Buchung #${i}`).toMatch(re);
        f.forEach((x, j) => { if (!DATEV_BUCHUNG[j + 1]) expect(x, `Buchung #${j + 1} leer`).toBe(""); });
      }
    }
  });

  it("Kontenlängen nach DATEV: Personenkonto genau eine Stelle länger als die Sachkontenlänge", () => {
    expect(datevSchema.safeParse({ beraternummer: 1001, mandantennummer: 1, debitor: 1000 }).success).toBe(false);
    expect(datevSchema.safeParse({ beraternummer: 1001, mandantennummer: 1, erloeskonto: 81000 }).success).toBe(false);
    expect(datevSchema.safeParse({ beraternummer: 1001, mandantennummer: 1, kuerzel: "Max M." }).success).toBe(false);
  });
});


describe("DATEV: Online-Zahlungen über Stripe", () => {
  it("bucht Online-Zahlungen auf Geldtransit statt Bank, damit der DATEV-Datenservice nicht doppelt bucht", () => {
    const b = datevBuchungen(
      [
        { number: "2026-0100", amountCent: 25000, status: "BEZAHLT", createdAt: new Date(2026, 9, 3), paidAt: new Date(2026, 9, 4), paidVia: "ONLINE" },
        { number: "2026-0101", amountCent: 9000, status: "BEZAHLT", createdAt: new Date(2026, 9, 3), paidAt: new Date(2026, 9, 9), paidVia: null },
      ],
      e,
      von,
      bis,
    );
    expect(b.filter((x) => x.konto !== 10000).map((x) => [x.konto, x.gegenkonto, x.text])).toEqual([
      [1360, 10000, "Online-Zahlung Rg. 2026-0100"],
      [1200, 10000, "Zahlungseingang Rg. 2026-0101"],
    ]);
  });
});
