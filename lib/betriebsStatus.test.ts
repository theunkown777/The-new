import { describe, expect, it } from "vitest";
import { cronSecretPasst, kurzfassung, redisPunkt } from "@/lib/betriebsStatus";

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
