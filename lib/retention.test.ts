import { describe, expect, it } from "vitest";
import { deletionCheck } from "./retention";
const now = new Date("2026-11-01");
const empty = { reports: [], proposals: [], anamnesis: [], invoices: [] };
describe("Löschen gegen Aufbewahrungspflicht", () => {
  it("erlaubt Löschen ohne Dokumentation", () => {
    expect(deletionCheck(empty, now)).toEqual({ allowed: true, reason: "leer" });
  });
  it("sperrt bei Dokumentation innerhalb von zehn Jahren", () => {
    const r = deletionCheck({ ...empty, reports: [new Date("2020-05-01")], invoices: [new Date("2021-01-10")] }, now);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.until.toISOString().slice(0, 10)).toBe("2031-01-10");
      expect(r.counts.reports).toBe(1);
    }
  });
  it("erlaubt Löschen nach Ablauf der Frist", () => {
    expect(deletionCheck({ ...empty, reports: [new Date("2016-10-01")] }, now)).toEqual({ allowed: true, reason: "frist_abgelaufen" });
  });
});
