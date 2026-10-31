import { describe, expect, it } from "vitest";
import { journey } from "@/lib/journey";

const now = new Date(2026, 10, 1, 12);
const d = (days: number) => new Date(now.getTime() + days * 86400000);

describe("journey", () => {
  it("ohne Vorschlag: Station Gespräch", () => {
    expect(journey({}, now)).toMatchObject({ erreicht: 0, aktuell: 0 });
    expect(journey({ anamnesisSubmitted: true }, now).praxis.tone).toBe("aktiv");
  });
  it("Vorschlag ohne Link → Link senden", () => {
    expect(journey({ proposal: { status: "ENTWURF" } }, now)).toMatchObject({ erreicht: 1, praxis: { text: expect.stringContaining("Link senden") } });
  });
  it("Link lange ungeöffnet → Achtung", () => {
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-5) } }, now).praxis.tone).toBe("achtung");
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-1) } }, now).praxis.tone).toBe("warten");
  });
  it("Rückmeldung → Entscheidung, nach 2 Tagen Achtung", () => {
    const j = journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-5), patientResponse: "RUECKRUF", patientRespondedAt: d(-3) } }, now);
    expect(j).toMatchObject({ erreicht: 3, aktuell: 3, praxis: { tone: "achtung" } });
  });
  it("angenommen: Rechnung erstellen, offen, überfällig, bezahlt", () => {
    const p = { status: "ANGENOMMEN", eigenanteilCent: 5000 };
    expect(journey({ proposal: p }, now).praxis.text).toContain("Rechnung");
    expect(journey({ proposal: p, invoices: [{ status: "OFFEN", dueDate: d(5) }] }, now).praxis.tone).toBe("warten");
    expect(journey({ proposal: p, invoices: [{ status: "OFFEN", dueDate: d(-5) }] }, now).praxis.tone).toBe("achtung");
    expect(journey({ proposal: p, invoices: [{ status: "BEZAHLT", dueDate: d(-5) }] }, now)).toMatchObject({ erreicht: 5, aktuell: null });
    expect(journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 0 } }, now).erreicht).toBe(5);
  });
  it("digitales Einverständnis → Vereinbart erreicht", () => {
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-2), patientResponse: "INTERESSE", agreedAt: d(-1) } }, now)).toMatchObject({ erreicht: 4, aktuell: 4 });
  });
  it("abgelehnt", () => {
    expect(journey({ proposal: { status: "ABGELEHNT" } }, now)).toMatchObject({ abgelehnt: true, aktuell: null });
  });
});
