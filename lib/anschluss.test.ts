import { describe, expect, it } from "vitest";
import { anschluss, anschlussAus } from "./anschluss";

const kopf = (o: Record<string, string>) => new Headers(o);

describe("Adresse des Absenders für die Begrenzungen", () => {
  it("ohne Vercel zählt der letzte Eintrag von X-Forwarded-For, nicht der vom Absender vorangestellte", () => {
    expect(anschluss(kopf({ "x-forwarded-for": "203.0.113.77, 198.51.100.4" }), {})).toBe("198.51.100.4");
    expect(anschluss(kopf({ "x-forwarded-for": "198.51.100.4" }), {})).toBe("198.51.100.4");
  });
  it("auf Vercel zählen die Kopfzeilen der Plattform, ein mitgeschicktes X-Forwarded-For nicht", () => {
    const env = { VERCEL: "1" };
    expect(anschluss(kopf({ "x-forwarded-for": "203.0.113.77", "x-vercel-forwarded-for": "198.51.100.4" }), env)).toBe("198.51.100.4");
    expect(anschluss(kopf({ "x-forwarded-for": "203.0.113.77", "x-real-ip": "198.51.100.9" }), env)).toBe("198.51.100.9");
    expect(anschluss(kopf({ "x-forwarded-for": "198.51.100.4" }), env)).toBe("198.51.100.4");
  });
  it("ohne Angabe oder mit unbrauchbarem Wert gilt ein gemeinsamer Zähler", () => {
    expect(anschluss(kopf({}), {})).toBe("unknown");
    expect(anschluss(kopf({ "x-forwarded-for": "<script>" }), {})).toBe("unknown");
    expect(anschluss(kopf({ "x-forwarded-for": "a".repeat(200) }), {})).toBe("unknown");
  });
  it("IPv6 und Schreibweise", () => {
    expect(anschluss(kopf({ "x-forwarded-for": "2001:DB8::1" }), {})).toBe("2001:db8::1");
  });
  it("Kopfzeilen als Objekt (next-auth)", () => {
    expect(anschlussAus({ "x-forwarded-for": "203.0.113.77, 198.51.100.4" }, {})).toBe("198.51.100.4");
    expect(anschlussAus({ "x-forwarded-for": ["203.0.113.77", "198.51.100.4"] }, {})).toBe("198.51.100.4");
    expect(anschlussAus(undefined, {})).toBe("unknown");
  });
});
