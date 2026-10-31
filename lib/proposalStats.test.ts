import { describe, expect, it } from "vitest";
import { proposalStats, type StatInput } from "@/lib/proposalStats";

const d = new Date("2026-10-01");
const p = (status: string, link = false, viewed = false, responded = false): StatInput => ({
  status,
  shareCreatedAt: link ? d : null,
  patientViewedAt: viewed ? d : null,
  patientRespondedAt: responded ? d : null,
  baseTotalCent: 10000,
  planTotalCent: 30000,
});

describe("proposalStats", () => {
  it("zählt Trichter und Quote", () => {
    const s = proposalStats([p("ANGENOMMEN", true, true, true), p("ABGELEHNT", true, true), p("ENTWURF", true), p("ANGENOMMEN")]);
    expect(s.funnel).toEqual({ sent: 3, viewed: 2, responded: 1, accepted: 1 });
    expect(s.withLink.rate).toBe(50);
    expect(s.withoutLink.rate).toBe(100);
    expect(s.all.rate).toBe(67);
    expect(s.acceptedDeltaCent).toBe(40000);
  });

  it("vergleicht erst ab fünf entschiedenen je Gruppe", () => {
    const few = proposalStats([p("ANGENOMMEN", true), p("ABGELEHNT")]);
    expect(few.linkEffectPoints).toBeNull();
    const many = proposalStats([
      ...Array.from({ length: 4 }, () => p("ANGENOMMEN", true)),
      p("ABGELEHNT", true),
      ...Array.from({ length: 2 }, () => p("ANGENOMMEN")),
      ...Array.from({ length: 3 }, () => p("ABGELEHNT")),
    ]);
    expect(many.withLink.rate).toBe(80);
    expect(many.withoutLink.rate).toBe(40);
    expect(many.linkEffectPoints).toBe(40);
  });

  it("leer ohne Fehler", () => {
    expect(proposalStats([]).all.rate).toBeNull();
  });
});
