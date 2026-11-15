import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { ERINNERN_TAGE, erinnernAm, erinnernMoeglich, erinnerungFaellig, istErinnernTage } from "@/lib/erinnerungWunsch";
import { EINGANG_ARTEN, eingangZiel } from "@/lib/eingang";

describe("„Erinnern Sie mich“", () => {
  it("kennt drei Tage, eine Woche und zwei Wochen", () => {
    expect([...ERINNERN_TAGE]).toEqual([3, 7, 14]);
    expect(istErinnernTage(7)).toBe(true);
    expect(istErinnernTage(5)).toBe(false);
    expect(istErinnernTage("7")).toBe(false);
  });

  it("zählt ab dem heutigen Kalendertag in Deutschland", () => {
    expect(erinnernAm(3, new Date("2026-11-15T10:00:00Z")).toISOString()).toBe("2026-11-18T00:00:00.000Z");
    // 23:30 Uhr UTC ist in Deutschland schon der nächste Tag.
    expect(erinnernAm(7, new Date("2026-11-15T23:30:00Z")).toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(erinnernAm(14, new Date("2026-12-25T10:00:00Z")).toISOString()).toBe("2027-01-08T00:00:00.000Z");
  });

  it("ist erst am gewählten Tag fällig", () => {
    const am = erinnernAm(3, new Date("2026-11-15T10:00:00Z"));
    expect(erinnerungFaellig(am, new Date("2026-11-17T22:00:00Z"))).toBe(false);
    expect(erinnerungFaellig(am, new Date("2026-11-18T03:17:00Z"))).toBe(true);
    expect(erinnerungFaellig(am, new Date("2026-11-20T03:17:00Z"))).toBe(true);
  });

  it("gibt es nur, solange nicht entschieden ist", () => {
    expect(erinnernMoeglich("ENTWURF")).toBe(true);
    expect(erinnernMoeglich("BESPROCHEN")).toBe(true);
    expect(erinnernMoeglich("ANGENOMMEN")).toBe(false);
    expect(erinnernMoeglich("ABGELEHNT")).toBe(false);
  });

  it("landet als Aufgabe im Eingang, ohne dass etwas verschickt wird", () => {
    const a = EINGANG_ARTEN.ERINNERUNG_GEWUENSCHT;
    expect(a.titel).toBe("Erinnerung vom Patienten gewünscht");
    expect(a.gruppe).toBe("Vorschläge");
    expect(eingangZiel({ art: "ERINNERUNG_GEWUENSCHT", entityId: "v1", patientId: "p1" })).toBe("/proposals/v1");
  });
});
