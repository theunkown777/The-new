import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_REPORT_LIMIT } from "@/lib/demo";

let praxis: { isDemo: boolean; createdAt: Date } | null;
let berichte = 0;
let kiLaeufe = 0;
vi.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: async () => praxis },
    report: { count: async () => berichte },
    auditLog: { count: async (args: { where: { action: string } }) => (args.where.action === "bericht.ki" ? kiLaeufe : 0) },
  },
}));

let nr = 0;
beforeEach(() => { praxis = { isDemo: true, createdAt: new Date() }; berichte = 0; kiLaeufe = 0; nr++; });

describe("demoGuard", () => {
  it("zählt im Gastzugang auch neu erzeugte Berichte (KI-Läufe)", async () => {
    const { demoGuard } = await import("@/lib/demoGuard");
    berichte = 2;
    kiLaeufe = DEMO_REPORT_LIMIT - 1;
    expect(await demoGuard("p", "report")).toBeNull();
    kiLaeufe = DEMO_REPORT_LIMIT;
    expect((await demoGuard("p", "report"))?.status).toBe(429);
  });
  it("sperrt wie bisher bei zu vielen angelegten Berichten und nie außerhalb des Gastzugangs", async () => {
    const { demoGuard } = await import("@/lib/demoGuard");
    berichte = DEMO_REPORT_LIMIT;
    expect((await demoGuard("p", "report"))?.status).toBe(429);
    praxis = { isDemo: false, createdAt: new Date() };
    kiLaeufe = 999;
    expect(await demoGuard("p", "report")).toBeNull();
  });
});

describe("kiLimit", () => {
  it("Gastzugang: 20 KI-Aufrufe je Stunde und Praxis, je Art getrennt", async () => {
    const { kiLimit, KI_PRO_STUNDE } = await import("@/lib/demoGuard");
    const id = `demo-${nr}`;
    for (let i = 0; i < KI_PRO_STUNDE.demo; i++) expect(await kiLimit(id, "regenerate")).toBeNull();
    expect((await kiLimit(id, "regenerate"))?.status).toBe(429);
    expect(await kiLimit(id, "briefing")).toBeNull();
  });
  it("echte Praxen haben mehr Spielraum", async () => {
    const { kiLimit, KI_PRO_STUNDE } = await import("@/lib/demoGuard");
    praxis = { isDemo: false, createdAt: new Date() };
    const id = `praxis-${nr}`;
    for (let i = 0; i < KI_PRO_STUNDE.demo + 1; i++) expect(await kiLimit(id, "briefing")).toBeNull();
  });
});
