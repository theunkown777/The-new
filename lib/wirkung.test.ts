import { describe, expect, it } from "vitest";
import { letzteMonate, median, monatName, wirkungJeMonat } from "./wirkung";

const d = (s: string) => new Date(s);
describe("Wirkungsbericht", () => {
  it("bildet die letzten Monate in deutscher Zeit", () => {
    expect(letzteMonate(3, d("2026-11-13T10:00:00Z"))).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(letzteMonate(2, d("2026-12-31T23:30:00Z"))).toEqual(["2026-12", "2027-01"]);
    expect(monatName("2026-11")).toBe("November 2026");
  });
  it("rechnet den Median", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
  it("zählt je Monat Versand, Reaktion, Entscheidung und Zahlung", () => {
    const v = [
      { status: "ANGENOMMEN", createdAt: d("2026-11-02T09:00:00Z"), updatedAt: d("2026-11-05T09:00:00Z"), shareCreatedAt: d("2026-11-02T10:00:00Z"), patientViewedAt: d("2026-11-02T18:00:00Z"), patientRespondedAt: d("2026-11-04T10:00:00Z"), agreedAt: null },
      { status: "ENTWURF", createdAt: d("2026-11-03T09:00:00Z"), updatedAt: d("2026-11-03T09:00:00Z"), shareCreatedAt: d("2026-11-03T10:00:00Z"), patientViewedAt: null, patientRespondedAt: null, agreedAt: null },
      { status: "ABGELEHNT", createdAt: d("2026-10-20T09:00:00Z"), updatedAt: d("2026-10-25T09:00:00Z"), shareCreatedAt: null, patientViewedAt: null, patientRespondedAt: null, agreedAt: null },
    ];
    const r = [{ status: "BEZAHLT", createdAt: d("2026-11-05T09:00:00Z"), paidAt: d("2026-11-09T09:00:00Z") }, { status: "OFFEN", createdAt: d("2026-11-06T09:00:00Z"), paidAt: null }];
    const [okt, nov] = wirkungJeMonat(v, r, ["2026-10", "2026-11"]);
    expect(nov).toMatchObject({ vorschlaege: 2, gesendet: 2, geoeffnet: 1, rueckmeldung: 1, entschieden: 1, ohneEntscheidungProzent: 50, tageBisReaktion: 2, tageBisZahlung: 4 });
    expect(okt).toMatchObject({ vorschlaege: 1, gesendet: 0, entschieden: 1, ohneEntscheidungProzent: 0, tageBisReaktion: null, tageBisZahlung: null });
  });
});
