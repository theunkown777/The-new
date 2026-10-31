import { describe, expect, it } from "vitest";
import { ageOn, generatePatients } from "@/lib/demoData";

const today = new Date("2026-11-01");

describe("Demo-Patienten", () => {
  it("erzeugt die gewünschte Anzahl, deterministisch je Startwert", () => {
    const a = generatePatients(1000, "zahn", 42, today);
    expect(a).toHaveLength(1000);
    expect(generatePatients(5, "zahn", 42, today)).toEqual(a.slice(0, 5));
  });
  it("hält die Alters- und Geschlechtergrenzen des Fachs ein", () => {
    const kinder = generatePatients(500, "kinder", 1, today);
    expect(Math.max(...kinder.map((p) => ageOn(p.birthDate, today)))).toBeLessThanOrEqual(17);
    const gyn = generatePatients(500, "gyn", 2, today);
    expect(gyn.every((p) => p.sex === "W")).toBe(true);
    const uro = generatePatients(1000, "uro", 3, today);
    expect(uro.filter((p) => p.sex === "M").length).toBeGreaterThan(700);
  });
  it("etwa 12 % privat versichert", () => {
    const pkv = generatePatients(2000, "hausarzt", 7, today).filter((p) => p.insuranceType === "PKV").length;
    expect(pkv).toBeGreaterThan(160);
    expect(pkv).toBeLessThan(320);
  });
});
