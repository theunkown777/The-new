import { describe, expect, it } from "vitest";
import { resolveDatabaseUrls } from "@/lib/databaseUrl";

const pooled = "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const direct = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require";

describe("resolveDatabaseUrls", () => {
  it("nimmt DATABASE_URL wie bisher", () => {
    expect(resolveDatabaseUrls({ DATABASE_URL: "postgresql://localhost/x" })).toEqual({ runtime: "postgresql://localhost/x", direct: "postgresql://localhost/x", source: "DATABASE_URL" });
  });
  it("erkennt die Neon-Variablen von Vercel und trennt Pooler und Direktverbindung", () => {
    const r = resolveDatabaseUrls({ POSTGRES_PRISMA_URL: pooled, POSTGRES_URL_NON_POOLING: direct })!;
    expect(r.runtime).toBe(pooled + "&pgbouncer=true");
    expect(r.direct).toBe(direct);
  });
  it("erkennt Präfixe", () => {
    expect(resolveDatabaseUrls({ STORAGE_DATABASE_URL: direct })?.source).toBe("STORAGE_DATABASE_URL");
  });
  it("ignoriert leere und fremde Werte", () => {
    expect(resolveDatabaseUrls({ DATABASE_URL: "", REDIS_URL: "redis://x" })).toBeNull();
  });
});
