import { describe, expect, it } from "vitest";
import { databaseLocation } from "@/lib/hostingRegion";

describe("databaseLocation", () => {
  it("erkennt Neon in Frankfurt", () => {
    expect(databaseLocation("postgresql://u:p@ep-cool-1234-pooler.eu-central-1.aws.neon.tech/db?sslmode=require")).toEqual({ provider: "Neon", region: "eu-central-1", eu: true });
  });
  it("erkennt Neon in den USA", () => {
    expect(databaseLocation("postgres://u:p@ep-x.us-east-1.aws.neon.tech/db").eu).toBe(false);
  });
  it("erkennt Supabase", () => {
    expect(databaseLocation("postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")).toEqual({ provider: "Supabase", region: "eu-central-1", eu: true });
  });
  it("gibt nie Zugangsdaten aus", () => {
    const r = databaseLocation("postgresql://geheim:passwort@db.example.com/x");
    expect(JSON.stringify(r)).not.toContain("geheim");
    expect(r.eu).toBeNull();
  });
});
