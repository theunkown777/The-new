import { describe, expect, it } from "vitest";
import { meineKennzahlen } from "./meinBereich";
import { empfehlungJe } from "./patientI18n";

const now = new Date(2026, 10, 15, 12);
const d = (m: number, t: number) => new Date(2026, m, t, 10);

describe("Mein Bereich", () => {
  it("zählt nur bezahlte Rechnungen in Monat und Jahr, offene getrennt", () => {
    const k = meineKennzahlen(
      [
        { status: "BEZAHLT", amountCent: 10000, paidAt: d(10, 3), dueDate: d(10, 1) },
        { status: "BEZAHLT", amountCent: 5000, paidAt: d(2, 3), dueDate: d(2, 1) },
        { status: "OFFEN", amountCent: 7000, paidAt: null, dueDate: d(11, 1) },
        { status: "STORNIERT", amountCent: 9999, paidAt: null, dueDate: d(10, 1) },
      ],
      [],
      now,
    );
    expect(k.bezahltMonatCent).toBe(10000);
    expect(k.bezahltJahrCent).toBe(15000);
    expect(k.offenCent).toBe(7000);
    expect(k.monate).toHaveLength(6);
    expect(k.monate[5].cent).toBe(10000);
  });

  it("Annahmequote erst ab drei Entscheidungen, nur im Zeitraum", () => {
    const v = (status: string, t = 10) => ({ status, eigenanteilCent: 20000, createdAt: d(10, t) });
    expect(meineKennzahlen([], [v("ANGENOMMEN"), v("ABGELEHNT")], now).quote).toBeNull();
    const k = meineKennzahlen([], [v("ANGENOMMEN"), v("ANGENOMMEN"), v("ABGELEHNT"), v("ENTWURF"), { status: "ANGENOMMEN", eigenanteilCent: 1, createdAt: d(1, 1) }], now);
    expect(k.quote).toBe(67);
    expect(k.vorschlaege).toBe(4);
    expect(k.angenommenCent).toBe(40000);
  });
});

describe("Empfehlung im Patientenvorschlag", () => {
  const items = [
    { key: "a", recommended: "x", options: [{ id: "k" }, { id: "x" }] },
    { key: "b", recommended: null, options: [{ id: "k" }, { id: "y" }] },
    { key: "c", recommended: "z", options: [{ id: "k" }, { id: "z" }] },
  ];
  it("Wahl der Praxis vor Regelwerk, sonst erste Option; ungültige Wahl wird ignoriert", () => {
    expect(empfehlungJe(items, { a: "k", c: "gibtsnicht" })).toEqual({ a: "k", b: "k", c: "z" });
  });
});
