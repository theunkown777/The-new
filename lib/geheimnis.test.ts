import { afterEach, describe, expect, it, vi } from "vitest";
import { signaturSecret } from "@/lib/geheimnis";
import { vorschauCookie, vorschauCookieGueltig, vorschauPassGueltig } from "@/lib/vorschau";

const prodOhne = { NODE_ENV: "production", VERCEL_ENV: "production", VORSCHAU_PASSWORT: "pw" };

describe("signaturSecret", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("nimmt NEXTAUTH_SECRET, wenn gesetzt", () => {
    expect(signaturSecret({ NEXTAUTH_SECRET: "s", NODE_ENV: "production", VERCEL_ENV: "production" })).toBe("s");
  });
  it("lokal und in Tests gibt es ohne Secret den Ersatzwert", () => {
    expect(signaturSecret({})).toBe("dev-secret-nur-lokal");
    expect(signaturSecret({ NODE_ENV: "production" })).toBe("dev-secret-nur-lokal");
  });
  it("in Produktion auf Vercel ohne Secret: Fehler statt bekanntem Schlüssel", () => {
    expect(() => signaturSecret(prodOhne)).toThrow(/NEXTAUTH_SECRET fehlt/);
    expect(() => signaturSecret({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toThrow();
  });
  it("während next build kein Fehler", () => {
    expect(signaturSecret({ ...prodOhne, NEXT_PHASE: "phase-production-build" })).toBe("dev-secret-nur-lokal");
  });
  it("Vorschau: ohne Secret wird nichts signiert und nichts anerkannt", async () => {
    await expect(vorschauCookie(Date.now(), prodOhne)).rejects.toThrow(/NEXTAUTH_SECRET fehlt/);
    // Mit dem früheren Ersatzwert signiertes Cookie (lokal erzeugbar) gilt in Produktion nicht.
    const lokal = await vorschauCookie(Date.now(), { VORSCHAU_PASSWORT: "pw" });
    expect(await vorschauCookieGueltig(lokal, Date.now(), { VORSCHAU_PASSWORT: "pw" })).toBe(true);
    expect(await vorschauCookieGueltig(lokal, Date.now(), prodOhne)).toBe(false);
    expect(await vorschauPassGueltig(`${Date.now() + 60_000}.abc`, Date.now(), prodOhne)).toBe(false);
  });
  it("Mein Bereich und Stripe-Verbindung werfen in Produktion ohne Secret", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const { bereichToken } = await import("@/lib/bereichSchutz");
    const { connectState } = await import("@/lib/onlineZahlung");
    expect(() => bereichToken("u1")).toThrow(/NEXTAUTH_SECRET fehlt/);
    expect(() => connectState("p1")).toThrow(/NEXTAUTH_SECRET fehlt/);
  });
});
