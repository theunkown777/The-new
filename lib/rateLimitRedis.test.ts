import { describe, expect, it, vi, beforeEach } from "vitest";

// Mit angebundenem Redis: Zählen und Ablauf laufen als ein Befehl (Skript),
// nicht als INCR und danach EXPIRE.
const aufrufe: { befehl: string; args: unknown[] }[] = [];
const zaehler = new Map<string, number>();
let ausfall = false;

vi.mock("@/lib/redisCredentials", () => ({ redisCandidates: () => [{ url: "https://redis.test", token: "t", source: "TEST" }] }));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    async eval(script: string, keys: string[], args: string[]) {
      aufrufe.push({ befehl: "eval", args: [script, keys, args] });
      if (ausfall) throw new Error("nicht erreichbar");
      const alt = zaehler.get(keys[0]) ?? 0;
      const neu = script.includes("INCR") ? alt + 1 : Math.max(0, alt - 1);
      zaehler.set(keys[0], neu);
      return neu;
    }
    async get(key: string) { aufrufe.push({ befehl: "get", args: [key] }); return zaehler.get(key) ?? null; }
    async incr() { throw new Error("INCR einzeln darf nicht mehr vorkommen"); }
    async expire() { throw new Error("EXPIRE einzeln darf nicht mehr vorkommen"); }
    async del(key: string) { zaehler.delete(key); return 1; }
    async ping() { return "PONG"; }
  },
}));

describe("rateLimit mit Redis", () => {
  beforeEach(() => { aufrufe.length = 0; zaehler.clear(); ausfall = false; vi.resetModules(); });

  it("zählt mit einem einzigen Skriptaufruf, der den Ablauf gleich mitsetzt", async () => {
    const { recordAttempt, consumeAttempt, isRateLimited } = await import("./rateLimit");
    expect(await recordAttempt("k", 15 * 60 * 1000)).toBe(1);
    expect(aufrufe).toHaveLength(1);
    const [script, keys, args] = aufrufe[0].args as [string, string[], string[]];
    expect(script).toContain("INCR");
    expect(script).toContain("PEXPIRE");
    expect(keys).toEqual(["ratelimit:k"]);
    expect(args).toEqual(["900000"]);
    expect(await consumeAttempt("k", 2, 1000)).toBe(true);
    expect(await consumeAttempt("k", 2, 1000)).toBe(false);
    expect(await isRateLimited("k", 2, 1000)).toBe(true);
  });

  it("releaseAttempt zählt zurück", async () => {
    const { recordAttempt, releaseAttempt } = await import("./rateLimit");
    await recordAttempt("r", 1000);
    await releaseAttempt("r");
    expect(zaehler.get("ratelimit:r")).toBe(0);
  });

  it("fällt bei nicht erreichbarem Redis auf den Zähler im Speicher zurück", async () => {
    const fehler = vi.spyOn(console, "error").mockImplementation(() => {});
    ausfall = true;
    const { consumeAttempt } = await import("./rateLimit");
    expect(await consumeAttempt("x", 1, 1000)).toBe(true);
    expect(await consumeAttempt("x", 1, 1000)).toBe(false);
    fehler.mockRestore();
  });
});
