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

describe("zwei verbundene Datenbanken", () => {
  const altPooled = "postgresql://u:p@ep-alt-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const neuDirect = "postgresql://u:p@ep-neu.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  it("nimmt Migrations- und Laufzeitadresse nie aus verschiedenen Datenbanken", () => {
    const r = resolveDatabaseUrls({ DATABASE_URL: altPooled, NEON2_DATABASE_URL_UNPOOLED: neuDirect, NEON2_DATABASE_URL: neuDirect.replace("ep-neu", "ep-neu-pooler") })!;
    expect(r.runtime).toContain("ep-alt-pooler");
    expect(r.direct).toBe("postgresql://u:p@ep-alt.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  });
  it("ignoriert eine Direktadresse ohne Präfix, die zu einer anderen Datenbank gehört", () => {
    const r = resolveDatabaseUrls({ DATABASE_URL: altPooled, DATABASE_URL_UNPOOLED: neuDirect })!;
    expect(r.direct).toContain("ep-alt.");
  });
  it("nutzt die passende Direktadresse desselben Satzes", () => {
    const r = resolveDatabaseUrls({ DATABASE_URL: altPooled, DATABASE_URL_UNPOOLED: altPooled.replace("-pooler", "") })!;
    expect(r.source).toBe("DATABASE_URL + DATABASE_URL_UNPOOLED");
  });
});

import { describeDatabaseEnv } from "@/lib/databaseUrl";
describe("Diagnose und Bereinigung", () => {
  it("akzeptiert Werte mit Anführungszeichen", () => {
    expect(resolveDatabaseUrls({ DATABASE_URL: ' "postgresql://u:p@h/db" ' })?.runtime).toBe("postgresql://u:p@h/db");
  });
  it("nennt nur Namen, nie Werte", () => {
    const d = describeDatabaseEnv({ DATABASE_URL: "postgresql://geheim@h/db", PGHOST: "h", NEON_PROJECT_ID: "", OTHER: "x" });
    expect(d).toEqual(["DATABASE_URL (postgres-Adresse)", "NEON_PROJECT_ID (leer)", "PGHOST (anderer Wert)"]);
    expect(d.join()).not.toContain("geheim");
  });
});
