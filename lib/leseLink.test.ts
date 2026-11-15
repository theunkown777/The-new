import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { LESE_LINK_MAX, darfNeuenLeseLink, leseLinkAktiv, leseLinkVermerk, zugangBis } from "@/lib/leseLink";

const now = new Date("2026-11-15T10:00:00Z");
const spaeter = new Date("2026-12-01T10:00:00Z");
const frueher = new Date("2026-11-01T10:00:00Z");
const aktiv = { expiresAt: spaeter, revokedAt: null };

describe("Lese-Link für Vertrauenspersonen", () => {
  it("gilt nur, solange er nicht widerrufen und nicht abgelaufen ist", () => {
    expect(leseLinkAktiv(aktiv, now)).toBe(true);
    expect(leseLinkAktiv({ expiresAt: spaeter, revokedAt: frueher }, now)).toBe(false);
    expect(leseLinkAktiv({ expiresAt: frueher, revokedAt: null }, now)).toBe(false);
  });

  it("erlaubt höchstens drei gleichzeitig; widerrufene zählen nicht", () => {
    expect(LESE_LINK_MAX).toBe(3);
    expect(darfNeuenLeseLink([], now)).toBe(true);
    expect(darfNeuenLeseLink([aktiv, aktiv], now)).toBe(true);
    expect(darfNeuenLeseLink([aktiv, aktiv, aktiv], now)).toBe(false);
    expect(darfNeuenLeseLink([aktiv, aktiv, { ...aktiv, revokedAt: frueher }, { expiresAt: frueher, revokedAt: null }], now)).toBe(true);
  });

  it("endet mit dem Zugang des Patienten", () => {
    const p = { status: "ENTWURF", shareTokenHash: "h", shareExpiresAt: spaeter, shareCreatedAt: frueher, patient: { portalTokenHash: "p", portalExpiresAt: spaeter } };
    const link = { quelle: "LINK", zugangHash: "h" };
    const portal = { quelle: "PORTAL", zugangHash: "p" };
    expect(zugangBis(link, p, now)).toEqual(spaeter);
    // Link des Patienten gesperrt oder durch einen neuen ersetzt: Der Lese-Link gilt nicht mehr.
    expect(zugangBis(link, { ...p, shareTokenHash: null }, now)).toBeNull();
    expect(zugangBis(link, { ...p, shareTokenHash: "neu" }, now)).toBeNull();
    expect(zugangBis(link, { ...p, shareExpiresAt: frueher }, now)).toBeNull();
    expect(zugangBis({ quelle: "LINK", zugangHash: "" }, { ...p, shareTokenHash: "" }, now)).toBeNull();
    expect(zugangBis(portal, p, now)).toEqual(spaeter);
    expect(zugangBis(portal, { ...p, patient: { portalTokenHash: null, portalExpiresAt: spaeter } }, now)).toBeNull();
    expect(zugangBis(portal, { ...p, patient: { portalTokenHash: "neu", portalExpiresAt: spaeter } }, now)).toBeNull();
    expect(zugangBis(portal, { ...p, patient: { portalTokenHash: "p", portalExpiresAt: frueher } }, now)).toBeNull();
    // Interner Entwurf, der nie geteilt wurde: im Portal nicht sichtbar, also auch kein Lese-Link.
    expect(zugangBis(portal, { ...p, shareCreatedAt: null }, now)).toBeNull();
    expect(zugangBis(portal, { ...p, shareCreatedAt: null, status: "BESPROCHEN" }, now)).toEqual(spaeter);
  });

  it("sagt der Praxis nur, dass es Lese-Links gibt", () => {
    expect(leseLinkVermerk([], now)).toBe("");
    expect(leseLinkVermerk([aktiv], now)).toContain("einen Lese-Link");
    expect(leseLinkVermerk([aktiv], now)).toContain("1 aktiv");
    expect(leseLinkVermerk([aktiv, { ...aktiv, revokedAt: frueher }], now)).toContain("2 Lese-Links");
    expect(leseLinkVermerk([{ ...aktiv, revokedAt: frueher }], now)).toContain("keiner mehr aktiv");
  });
});
