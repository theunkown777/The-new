import { describe, expect, it } from "vitest";
import { DEMO_KENNZAHLEN, erwarteteAuslastung } from "./demoKennzahlen";
import { FACHPROFILE } from "./fachprofile";

describe("Demo-Kennzahlen je Fach", () => {
  it("jedes Fach hat Kennzahlen mit plausibler Auslastung", () => {
    for (const fach of Object.keys(FACHPROFILE)) {
      const k = DEMO_KENNZAHLEN[fach];
      expect(k, fach).toBeTruthy();
      const a = erwarteteAuslastung(k);
      expect(a, `${fach}: ${Math.round(a * 100)} %`).toBeGreaterThan(0.12);
      expect(a, `${fach}: ${Math.round(a * 100)} %`).toBeLessThan(0.95);
    }
  });
  it("Größenordnungen stimmen", () => {
    expect(DEMO_KENNZAHLEN.psych.patienten).toBeLessThan(200);
    expect(DEMO_KENNZAHLEN.hausarzt.termine[0]).toBeGreaterThan(DEMO_KENNZAHLEN.psych.termine[1] * 3);
    expect(DEMO_KENNZAHLEN.aesthetik.quote).toBeGreaterThan(DEMO_KENNZAHLEN.hausarzt.quote * 5);
    expect(DEMO_KENNZAHLEN.psych.dauer).toEqual([50]);
  });
});
