import { describe, expect, it } from "vitest";
import { AUFZEICHNUNG_SEIT, STOERUNGEN, datumDe, dauerText, keineStoerungSatz, stoerungenSortiert, type Stoerung } from "@/lib/stoerungen";

describe("Störungen (/status)", () => {
  it("der Satz ohne Einträge nennt den Start der Aufzeichnung", () => {
    expect(AUFZEICHNUNG_SEIT).toBe("2026-11-15");
    expect(keineStoerungSatz()).toBe("Seit dem Start der Aufzeichnung am 15.11.2026 ist keine Störung eingetragen.");
  });

  it("schreibt Datum und Dauer in Worten", () => {
    expect(datumDe("2026-12-03")).toBe("03.12.2026");
    expect(datumDe("kaputt")).toBe("kaputt");
    expect(dauerText(35)).toBe("35 Minuten");
    expect(dauerText(1)).toBe("1 Minute");
    expect(dauerText(60)).toBe("1 Stunde");
    expect(dauerText(150)).toBe("2 Stunden 30 Minuten");
    expect(dauerText(0)).toBe("läuft noch");
  });

  it("sortiert neueste zuerst und lässt unbrauchbare Einträge weg", () => {
    const liste: Stoerung[] = [
      { datum: "2026-11-20", beginn: "08:00", dauerMinuten: 10, was: "A", behoben: true },
      { datum: "2026-12-01", dauerMinuten: 5, was: "B", behoben: true },
      { datum: "2026-11-20", beginn: "14:00", dauerMinuten: 10, was: "C", behoben: true },
      { datum: "20.11.2026", dauerMinuten: 10, was: "falsches Datum", behoben: true },
      { datum: "2026-11-21", dauerMinuten: 10, was: "  ", behoben: true },
    ];
    expect(stoerungenSortiert(liste).map((s) => s.was)).toEqual(["B", "C", "A"]);
  });

  it("jeder eingetragene Fall ist vollständig und liegt nicht vor dem Start der Aufzeichnung", () => {
    for (const s of STOERUNGEN) {
      expect(s.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.datum >= AUFZEICHNUNG_SEIT).toBe(true);
      expect(s.was.length).toBeGreaterThan(5);
      expect(s.dauerMinuten).toBeGreaterThanOrEqual(0);
      if (s.beginn) expect(s.beginn).toMatch(/^\d{2}:\d{2}$/);
      // Keine E-Mail-Adressen und keine langen Ziffernfolgen in öffentlichen Texten
      expect(`${s.was} ${s.ursache ?? ""}`).not.toMatch(/@|\d{5,}/);
    }
    expect(stoerungenSortiert()).toHaveLength(STOERUNGEN.length);
  });
});
