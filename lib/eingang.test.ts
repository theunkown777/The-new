import { describe, expect, it } from "vitest";
import { EINGANG_ARTEN, eingangZiel, istEingangArt } from "./eingang";

describe("Eingang", () => {
  it("kennt für jede Art Titel, Aufgabe und Ziel", () => {
    for (const [art, a] of Object.entries(EINGANG_ARTEN)) {
      expect(a.titel.length).toBeGreaterThan(5);
      expect(a.tun.length).toBeGreaterThan(10);
      expect(eingangZiel({ art, entityId: "x1", patientId: "p1", tag: "2026-11-12" })).toMatch(/^\/(zahlungen|patients|proposals|termine)/);
    }
  });
  it("führt an die richtige Stelle", () => {
    expect(eingangZiel({ art: "ZAHLUNG_GEMELDET", entityId: "r1", patientId: "p1" })).toBe("/zahlungen?f=gemeldet");
    expect(eingangZiel({ art: "ANAMNESE", entityId: "a1", patientId: "p1" })).toBe("/patients/p1#anamnese");
    expect(eingangZiel({ art: "VEREINBARUNG", entityId: "v1", patientId: "p1" })).toBe("/proposals/v1");
    expect(eingangZiel({ art: "TERMIN_GEBUCHT", entityId: "t1", patientId: "p1", tag: "2026-11-12" })).toBe("/termine?tag=2026-11-12");
    expect(eingangZiel({ art: "TERMIN_ABGESAGT", entityId: "t1", patientId: "p1" })).toBe("/termine");
    expect(eingangZiel({ art: "UNBEKANNT", entityId: null, patientId: "p1" })).toBe("/patients/p1");
  });
  it("erkennt nur bekannte Arten", () => {
    expect(istEingangArt("RATEN")).toBe(true);
    expect(istEingangArt("toString")).toBe(false);
  });
});
