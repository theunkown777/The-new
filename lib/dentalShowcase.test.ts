import { afterEach, describe, expect, it, vi } from "vitest";
import { DENTAL_SHOWCASE } from "./dentalShowcase";
import { FESTZUSCHUSS_BEFUNDE } from "./proposals";

// Die Beispielkarte auf /fachgebiete/zahn rechnet den Kassenanteil beim Implantat mit dem Satz des
// Bewilligungsjahres: bis 31.12.2026 60 %, ab 1.1.2027 50 % (deutsches Datum).
const implantat = () => DENTAL_SHOWCASE.anlaesse.flatMap((a) => a.options).find((o) => o.id === "implantat")!;

describe("Beispielkarte Zahn: Kassenanteil Implantat", () => {
  afterEach(() => vi.useRealTimers());

  it("rechnet bis 31.12.2026 mit 60 %", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T22:00:00Z")); // 23:00 Uhr in Berlin, noch 2026
    expect(implantat().kasseAnteil).toBe(Math.round(FESTZUSCHUSS_BEFUNDE["2.1"].euro * 0.6));
  });

  it("rechnet ab 1.1.2027 mit 50 %, ohne neuen Bau", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T23:30:00Z")); // 0:30 Uhr in Berlin, schon 2027
    expect(implantat().kasseAnteil).toBe(Math.round(FESTZUSCHUSS_BEFUNDE["2.1"].euro * 0.5));
  });
});
