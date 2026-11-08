import { describe, expect, it } from "vitest";
import { freiOhneZugang, istVorschauHost, vorschauCookie, vorschauCookieGueltig, zugangPasst } from "./vorschau";

const env = { VORSCHAU_HOSTS: "sorrida.de, www.sorrida.de", VORSCHAU_BENUTZER: "partner", VORSCHAU_PASSWORT: "geheim-123", NEXTAUTH_SECRET: "s" };

describe("Vorschau-Schloss für die eigene Domain", () => {
  it("greift nur auf den eingetragenen Hosts", () => {
    expect(istVorschauHost("sorrida.de", env)).toBe(true);
    expect(istVorschauHost("WWW.Sorrida.de:443", env)).toBe(true);
    expect(istVorschauHost("zahnarzt-berichte.vercel.app", env)).toBe(false);
    expect(istVorschauHost("sorrida.de", {})).toBe(false);
  });
  it("Zugangsdaten müssen genau stimmen", async () => {
    expect(await zugangPasst("partner", "geheim-123", env)).toBe(true);
    expect(await zugangPasst("partner", "geheim-12", env)).toBe(false);
    expect(await zugangPasst("Partner", "geheim-123", env)).toBe(false);
    expect(await zugangPasst("partner", "geheim-123", { ...env, VORSCHAU_PASSWORT: "" })).toBe(false);
  });
  it("Cookie ist signiert, läuft ab und wird mit neuem Passwort ungültig", async () => {
    const jetzt = 1_800_000_000_000;
    const c = await vorschauCookie(jetzt, env);
    expect(await vorschauCookieGueltig(c, jetzt + 1000, env)).toBe(true);
    expect(await vorschauCookieGueltig(c, jetzt + 31 * 86_400_000, env)).toBe(false);
    expect(await vorschauCookieGueltig(c.replace(/.$/, (x) => (x === "A" ? "B" : "A")), jetzt, env)).toBe(false);
    expect(await vorschauCookieGueltig(c, jetzt, { ...env, VORSCHAU_PASSWORT: "neu" })).toBe(false);
  });
  it("Demnächst-Seite und ihre Bausteine bleiben erreichbar", () => {
    expect(freiOhneZugang("/demnaechst")).toBe(true);
    expect(freiOhneZugang("/brand/sorrida-mark-hell.svg")).toBe(true);
    expect(freiOhneZugang("/login")).toBe(false);
    expect(freiOhneZugang("/api/auth/session")).toBe(false);
  });
});
