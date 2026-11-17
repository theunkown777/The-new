import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anmeldungEingerichtet, anmeldungPunkte, cronSecretPasst, datenbankPunkt, fehlerPunkt, kernAusPunkten, kernStatus, kurzfassung, redisPunkt } from "@/lib/betriebsStatus";

describe("Selbsttest /api/status", () => {
  it("Redis: in Produktion ohne erreichbaren Store nicht ok, sonst in Ordnung", () => {
    const prod = { VERCEL_ENV: "production" };
    expect(redisPunkt({ state: "nicht angebunden", tried: 0 }, prod).ok).toBe(false);
    expect(redisPunkt({ state: "nicht erreichbar", tried: 2 }, prod).ok).toBe(false);
    expect(redisPunkt({ state: "erreichbar", source: "KV", tried: 1 }, prod).ok).toBe(true);
    expect(redisPunkt({ state: "nicht angebunden", tried: 0 }, {}).ok).toBe(true);
    expect(redisPunkt({ state: "nicht erreichbar", tried: 1 }, { VERCEL_ENV: "preview" }).ok).toBe(true);
  });
  it("Kurzfassung nennt jeden Punkt mit ok / nicht ok, aber keine Details", () => {
    const kurz = kurzfassung({
      Datenbank: { ok: true, info: "erreichbar" },
      "Standort Datenbank": { ok: true, info: "Neon, Region eu-central-1 (EU)" },
      Deployment: { ok: true, info: "production, Stand abc1234 (main)" },
      NEXTAUTH_SECRET: { ok: false, info: "fehlt: in Vercel als Environment Variable setzen und neu deployen" },
    });
    expect(Object.keys(kurz)).toEqual(["Datenbank", "Standort Datenbank", "Deployment", "NEXTAUTH_SECRET"]);
    expect(kurz.NEXTAUTH_SECRET).toEqual({ ok: false, info: "nicht ok" });
    expect(kurz.Datenbank).toEqual({ ok: true, info: "ok" });
    const text = JSON.stringify(kurz);
    for (const geheim of ["Neon", "eu-central-1", "abc1234", "Vercel"]) expect(text).not.toContain(geheim);
  });
  it("CRON_SECRET nur als passendes Bearer-Token", () => {
    expect(cronSecretPasst("Bearer abc", "abc")).toBe(true);
    expect(cronSecretPasst("Bearer abd", "abc")).toBe(false);
    expect(cronSecretPasst("Bearer abcd", "abc")).toBe(false);
    expect(cronSecretPasst("Bearer ", undefined)).toBe(false);
    expect(cronSecretPasst("Bearer undefined", undefined)).toBe(false);
    expect(cronSecretPasst(null, "abc")).toBe(false);
  });
});

describe("Fehler (24 Std.) und Kurzfassung für /status", () => {
  it("Fehler: in Ordnung bis einschließlich 20 verschiedene, genannt wird nur die Zahl", () => {
    expect(fehlerPunkt(0)).toEqual({ ok: true, info: "0 verschiedene" });
    expect(fehlerPunkt(1)).toEqual({ ok: true, info: "1 verschiedener" });
    expect(fehlerPunkt(20).ok).toBe(true);
    expect(fehlerPunkt(21).ok).toBe(false);
    expect(fehlerPunkt(21).info).toContain("21");
  });

  it("Anmeldung: Schlüssel und Adresse", () => {
    expect(anmeldungPunkte("sorrida.de", { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://sorrida.de" })).toEqual({ NEXTAUTH_SECRET: { ok: true, info: "gesetzt" }, NEXTAUTH_URL: { ok: true, info: "sorrida.de" } });
    expect(anmeldungPunkte("sorrida.de", {}).NEXTAUTH_SECRET.ok).toBe(false);
    expect(anmeldungPunkte("sorrida.de", { NEXTAUTH_SECRET: "x" }).NEXTAUTH_URL.ok).toBe(false);
    expect(anmeldungPunkte("a.vercel.app", { NEXTAUTH_SECRET: "x", VERCEL_URL: "a.vercel.app" }).NEXTAUTH_URL.ok).toBe(true);
    expect(anmeldungPunkte("anders.de", { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://sorrida.de" }).NEXTAUTH_URL.ok).toBe(false);
    expect(anmeldungPunkte("a.vercel.app", { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://sorrida.de" }).NEXTAUTH_URL.ok).toBe(true);
    expect(anmeldungPunkte("sorrida.de", { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "kein url" }).NEXTAUTH_URL.ok).toBe(false);
  });

  it("Datenbank: erreichbar oder nicht, ohne abzustürzen", async () => {
    expect(await datenbankPunkt(async () => 1)).toEqual({ ok: true, info: "erreichbar" });
    const aus = await datenbankPunkt(async () => { throw Object.assign(new Error("geheim: postgres://nutzer:pw@host"), { code: "P1001" }); });
    expect(aus.ok).toBe(false);
    expect(aus.info).toContain("P1001");
    expect(aus.info).not.toContain("geheim");
  });

  it("öffentliche Angaben: nur drei Ja/Nein-Werte", async () => {
    const env = { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://sorrida.de" };
    expect(await kernStatus(async () => 1, env)).toEqual({ website: true, anmeldung: true, datenbank: true });
    expect(await kernStatus(async () => { throw new Error("aus"); }, env)).toEqual({ website: true, anmeldung: true, datenbank: false });
    expect(await kernStatus(async () => 1, {})).toEqual({ website: true, anmeldung: false, datenbank: true });
    expect(kernAusPunkten({})).toEqual({ website: true, anmeldung: false, datenbank: false });
  });

  // Die öffentliche Seite meldete „Anmeldung erreichbar: nein“, sobald sie unter einem anderen Hostnamen geöffnet wurde
  // (127.0.0.1 statt localhost, Domain ohne www). Das war eine falsche Angabe; der Hostname zählt dort nicht mehr.
  it("öffentliche Angabe zur Anmeldung hängt nicht am Hostnamen, unter dem die Seite geöffnet ist", async () => {
    const env = { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "http://localhost:3000" };
    // Der interne Bericht vergleicht weiter und meldet den abweichenden Host.
    expect(anmeldungPunkte("127.0.0.1:3000", env).NEXTAUTH_URL.ok).toBe(false);
    expect(anmeldungPunkte("localhost:3000", env).NEXTAUTH_URL.ok).toBe(true);
    // Die öffentliche Kurzfassung kennt den Host gar nicht.
    expect(kernStatus.length).toBe(1);
    expect((await kernStatus(async () => 1, env)).anmeldung).toBe(true);
    expect((await kernStatus(async () => 1, { NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://www.sorrida.de" })).anmeldung).toBe(true);
  });

  it("öffentliche Angabe zur Anmeldung: nein nur, wenn Schlüssel oder Adresse fehlen oder die Adresse ungültig ist", () => {
    const ok = (env: Record<string, string | undefined>) => { const p = anmeldungEingerichtet(env); return p.NEXTAUTH_SECRET.ok && p.NEXTAUTH_URL.ok; };
    expect(ok({ NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "https://sorrida.de" })).toBe(true);
    expect(ok({ NEXTAUTH_SECRET: "x", VERCEL_URL: "sorrida.vercel.app" })).toBe(true);
    expect(ok({ NEXTAUTH_URL: "https://sorrida.de" })).toBe(false);
    expect(ok({ NEXTAUTH_SECRET: "x" })).toBe(false);
    expect(ok({ NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "kein-link" })).toBe(false);
    expect(ok({ NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "ftp://sorrida.de" })).toBe(false);
    // Keine Einzelheiten in den Angaben (keine Adresse, kein Hostname).
    expect(JSON.stringify(anmeldungEingerichtet({ NEXTAUTH_SECRET: "geheim", NEXTAUTH_URL: "https://sorrida.de" }))).not.toMatch(/sorrida|geheim/);
  });

  it("die Seite /status liest den Hostnamen nicht", () => {
    const seite = readFileSync(join(process.cwd(), "app/status/page.tsx"), "utf8");
    expect(seite).not.toMatch(/headers\(\)|x-forwarded-host/);
    expect(seite).toMatch(/export const dynamic = "force-dynamic"/);
  });
});
