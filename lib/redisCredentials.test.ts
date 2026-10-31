import { describe, expect, it } from "vitest";
import { redisCandidates } from "@/lib/redisCredentials";

describe("redisCandidates", () => {
  it("sammelt alte und neue Zugangsdaten, auch mit Präfix", () => {
    const c = redisCandidates({
      KV_REST_API_URL: "https://alt.upstash.io",
      KV_REST_API_TOKEN: "a",
      KV_REST_API_READ_ONLY_TOKEN: "ro",
      UPSTASH_REDIS_REST_URL: "https://neu.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "n",
      STORAGE_KV_REST_API_URL: "https://neu2.upstash.io",
      STORAGE_KV_REST_API_TOKEN: "s",
    });
    expect(c.map((x) => x.url)).toEqual(["https://alt.upstash.io", "https://neu2.upstash.io", "https://neu.upstash.io"]);
    expect(c[0].token).toBe("a");
  });
  it("ohne Token oder doppelt wird ignoriert", () => {
    expect(redisCandidates({ KV_REST_API_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" })).toHaveLength(1);
    expect(redisCandidates({ KV_REST_API_URL: "https://x.upstash.io" })).toEqual([]);
  });
});
