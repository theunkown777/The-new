import { describe, expect, it } from "vitest";
import { LOESCHFRISTEN, stichtag } from "./loeschfristen";
describe("Löschfristen", () => {
  it("rechnet Stichtage", () => {
    const now = new Date("2026-11-02T00:00:00Z");
    expect(stichtag("token", now).toISOString().slice(0, 10)).toBe("2026-10-03");
    expect(stichtag("protokoll", now).getUTCFullYear()).toBe(2023);
  });
  it("jede Frist hat Grund und Dauer", () => {
    for (const f of LOESCHFRISTEN) { expect(f.tage).toBeGreaterThan(0); expect(f.grund.length).toBeGreaterThan(5); }
  });
});
