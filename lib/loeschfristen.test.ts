import { describe, expect, it } from "vitest";
import { LOESCHFRISTEN, anfragenFaellig, stichtag } from "./loeschfristen";
describe("Löschfristen", () => {
  it("rechnet Stichtage", () => {
    const now = new Date("2026-11-02T00:00:00Z");
    expect(stichtag("token", now).toISOString().slice(0, 10)).toBe("2026-10-03");
    expect(stichtag("protokoll", now).getUTCFullYear()).toBe(2023);
  });
  it("Anfragen der Website: höchstens 12 Monate nach Eingang, auch wenn sie nie erledigt wurden", () => {
    const f = LOESCHFRISTEN.find((x) => x.id === "anfragen")!;
    expect(f.tage).toBeLessThanOrEqual(364); // der Lauf kommt nur einmal in der Nacht
    expect(f.frist).toMatch(/12 Monate nach Eingang/);
    expect(f.daten).not.toMatch(/, erledigt$/);
    const now = new Date("2026-11-15T03:17:00Z");
    const eingang = new Date("2025-11-16T12:00:00Z");
    expect(eingang < stichtag("anfragen", now)).toBe(true);
    expect(new Date("2026-06-01T00:00:00Z") < stichtag("anfragen", now)).toBe(false);
    // Der Filter fragt nur nach dem Eingang, nicht nach "erledigt"
    expect(anfragenFaellig(now)).toEqual({ createdAt: { lt: stichtag("anfragen", now) } });
    expect(JSON.stringify(anfragenFaellig(now))).not.toContain("handledAt");
  });
  it("jede Frist hat Grund und Dauer", () => {
    for (const f of LOESCHFRISTEN) { expect(f.tage).toBeGreaterThan(0); expect(f.grund.length).toBeGreaterThan(5); }
  });
});
