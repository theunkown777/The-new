import { describe, expect, it } from "vitest";
import { describePatientChoices, patientLinkState, patientResponseSchema } from "@/lib/patientLink";

const items = [
  { key: "t36", where: "Zahn 36", options: [{ id: "bruecke", name: "Brücke" }, { id: "implantat", name: "Implantat mit Krone" }] },
  { key: "t16", where: "Zahn 16", options: [{ id: "kasse", name: "Füllung" }] },
];

describe("patientLink", () => {
  it("beschreibt die Auswahl des Patienten lesbar und ignoriert Unbekanntes", () => {
    expect(describePatientChoices(items, { t36: "implantat", t16: "gibtsnicht", x: "y" })).toEqual(["Zahn 36: Implantat mit Krone"]);
    expect(describePatientChoices(items, null)).toEqual([]);
  });

  it("validiert die Rückmeldung", () => {
    expect(patientResponseSchema.safeParse({ response: "RUECKRUF" }).success).toBe(true);
    expect(patientResponseSchema.safeParse({ response: "KAUFEN" }).success).toBe(false);
    expect(patientResponseSchema.safeParse({ response: "INTERESSE", note: "x".repeat(501) }).success).toBe(false);
  });

  it("erkennt abgelaufene Links", () => {
    const now = new Date("2026-11-01T10:00:00Z");
    const base = {
      shareTokenHash: "h",
      patientViewedAt: null,
      patientResponse: null,
      patientRespondedAt: null,
      patientNote: null,
      patientChoices: null,
    };
    expect(patientLinkState({ ...base, shareExpiresAt: new Date("2026-11-02T00:00:00Z") }, items, now).active).toBe(true);
    expect(patientLinkState({ ...base, shareExpiresAt: new Date("2026-10-30T00:00:00Z") }, items, now).active).toBe(false);
    expect(patientLinkState({ ...base, shareTokenHash: null, shareExpiresAt: null }, items, now).active).toBe(false);
  });
});
