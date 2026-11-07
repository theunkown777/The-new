import { describe, expect, it } from "vitest";
import { bereichToken, bereichTokenGueltig, passwortProblem } from "./bereichSchutz";

describe("Mein Bereich: Passwortschutz", () => {
  it("Token gilt nur für dasselbe Konto und nur 30 Minuten", () => {
    const t = bereichToken("u1", 1000);
    expect(bereichTokenGueltig(t, "u1", 2000)).toBe(true);
    expect(bereichTokenGueltig(t, "u2", 2000)).toBe(false);
    expect(bereichTokenGueltig(t, "u1", 1000 + 31 * 60_000)).toBe(false);
    expect(bereichTokenGueltig(t.replace(/.$/, (c) => (c === "A" ? "B" : "A")), "u1", 2000)).toBe(false);
    expect(bereichTokenGueltig(`u1.${9e15}.falsch`, "u1", 2000)).toBe(false);
    expect(bereichTokenGueltig(undefined, "u1")).toBe(false);
  });
  it("Passwortregeln", () => {
    expect(passwortProblem("12345")).toMatch(/6 Zeichen/);
    expect(passwortProblem("123456")).toMatch(/Zahlenfolge/);
    expect(passwortProblem("aaaaaaa")).toMatch(/wiederholen/);
    expect(passwortProblem("Zahn-2026")).toBeNull();
  });
});
