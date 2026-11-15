import { describe, expect, it } from "vitest";
import { belastungsgrenze, festzuschussVergleich, gebuehrPosition, zuzahlungVergleich } from "@/lib/rechner";

describe("Rechner Zuzahlung", () => {
  it("Heilmittel: 10 % plus 10 € bis 2026, plus 15 € ab 2027", () => {
    expect(zuzahlungVergleich("heilmittel", 180)).toEqual({ bis2026: 28, ab2027: 33, mehr: 5 });
  });
  it("Hilfs- und Arzneimittel: Grenzen 5–10 € und 7,50–15 €, nie mehr als der Preis", () => {
    expect(zuzahlungVergleich("hilfsmittel", 30)).toEqual({ bis2026: 5, ab2027: 7.5, mehr: 2.5 });
    expect(zuzahlungVergleich("arznei", 120)).toEqual({ bis2026: 10, ab2027: 12, mehr: 2 });
    expect(zuzahlungVergleich("arznei", 400)).toEqual({ bis2026: 10, ab2027: 15, mehr: 5 });
    expect(zuzahlungVergleich("arznei", 4)).toEqual({ bis2026: 4, ab2027: 4, mehr: 0 });
  });
  it("leere oder unsinnige Eingaben ergeben 0", () => {
    expect(zuzahlungVergleich("heilmittel", 0)).toEqual({ bis2026: 0, ab2027: 0, mehr: 0 });
    expect(zuzahlungVergleich("heilmittel", Number.NaN).ab2027).toBe(0);
    expect(zuzahlungVergleich("hilfsmittel", -5).bis2026).toBe(0);
  });
  it("Belastungsgrenze: 2 %, bei chronischer Erkrankung 1 %", () => {
    expect(belastungsgrenze(30000, false)).toBe(600);
    expect(belastungsgrenze(30000, true)).toBe(300);
    expect(belastungsgrenze(-1, false)).toBe(0);
  });
});

describe("Rechner Festzuschuss", () => {
  it("Krone ohne Bonus: 60 % bis 2026, 50 % ab 2027", () => {
    const r = festzuschussVergleich("1.1", 0, false);
    expect(r.zuschuss2026).toBeCloseTo(398.39 * 0.6, 2);
    expect(r.zuschuss2027).toBeCloseTo(398.39 * 0.5, 2);
    expect(r.mehr).toBeCloseTo(398.39 * 0.1, 1);
  });
  it("mit eigenen Gesamtkosten: Eigenanteil = Kosten minus Festzuschuss, nie negativ", () => {
    const r = festzuschussVergleich("2.1", 10, false, 2400);
    expect(r.eigen2026).toBeCloseTo(2400 - 921.6 * 0.75, 2);
    expect(r.eigen2027).toBeCloseTo(2400 - 921.6 * 0.65, 2);
    expect(festzuschussVergleich("1.1", 10, false, 100).eigen2026).toBe(0);
  });
  it("Härtefall: voller Betrag in beiden Jahren, kein Mehrbetrag bei der Regelversorgung", () => {
    const r = festzuschussVergleich("1.1", 0, true);
    expect(r.zuschuss2026).toBe(r.zuschuss2027);
    expect(r.eigen2027).toBe(0);
    expect(r.mehr).toBe(0);
  });
});

describe("Rechner GOÄ/GOZ", () => {
  it("GOÄ Nr. 1 (80 Punkte) zum 2,3-fachen Satz: 10,72 €", () => {
    const r = gebuehrPosition("GOAE", 80, 2.3);
    expect(r.einfach).toBeCloseTo(4.66, 2);
    expect(r.betrag).toBeCloseTo(10.72, 2);
    expect(r.pruefung.stufe).toBe("ok");
  });
  it("über dem Schwellenwert braucht es eine Begründung, über dem Höchstsatz eine Vereinbarung", () => {
    expect(gebuehrPosition("GOAE", 80, 3).pruefung.stufe).toBe("begruendung");
    expect(gebuehrPosition("GOZ", 100, 4).pruefung.stufe).toBe("vereinbarung");
    expect(gebuehrPosition("GOAE", 100, 2, "technisch").pruefung.stufe).toBe("begruendung");
  });
});
