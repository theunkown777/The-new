import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { berichtFachFuerApi, generateReportSchema } from "@/lib/berichtApi";
import { fachprofil } from "@/lib/fachprofile";
import { SPECIALTY_IDS } from "@/lib/specialties";

// Partner-Schnittstelle POST /api/v1/reports/generate: Das Fach bestimmt Stil und Platzhalter des Berichts.
// Ohne Angabe bleibt es bewusst bei der Zahnmedizin wie bisher, nicht still beim hausärztlichen Stil.

const anfrage = {
  reportType: "BEFUND",
  practiceName: "Praxis Beispiel",
  authorName: "Dr. Beispiel",
  patient: { firstName: "Max", lastName: "Mustermann" },
  entries: [{ system: "GOZ", code: "0010", title: "Eingehende Untersuchung", performed: true }],
};

describe("Partner-Schnittstelle: Fach im Bericht", () => {
  it("ohne fach wie bisher zahnmedizinisch (Zahnangaben, Fach Zahnmedizin)", () => {
    const p = generateReportSchema.parse(anfrage);
    expect(p.fach).toBeUndefined();
    expect(berichtFachFuerApi(p.fach)).toBe("zahn");
    expect(berichtFachFuerApi(null)).toBe("zahn");
    expect(fachprofil(berichtFachFuerApi(p.fach)).berichtStil).toMatch(/zahnmedizinisch/);
  });

  it("mit fach im Stil des Fachs; unbekanntes Fach wird abgelehnt", () => {
    for (const fach of SPECIALTY_IDS) {
      const p = generateReportSchema.safeParse({ ...anfrage, fach });
      expect(p.success, fach).toBe(true);
      expect(berichtFachFuerApi(p.data!.fach), fach).toBe(fach);
    }
    expect(fachprofil(berichtFachFuerApi("augen")).berichtStil).not.toMatch(/zahn/i);
    const falsch = generateReportSchema.safeParse({ ...anfrage, fach: "Zahnarzt" });
    expect(falsch.success).toBe(false);
    expect(falsch.error?.issues[0]?.message).toBe("Unbekannte Fachrichtung (fach)");
  });

  it("die Route gibt das Fach weiter, openapi.yaml beschreibt alle Fächer", () => {
    expect(readFileSync("app/api/v1/reports/generate/route.ts", "utf8")).toContain("fach: berichtFachFuerApi(fach)");
    const api = readFileSync("openapi.yaml", "utf8");
    const liste = api.match(/GenerateReportRequest:[\s\S]*?fach:[\s\S]*?enum: \[([^\]]+)\]/)?.[1].split(",").map((x) => x.trim());
    expect(liste).toEqual([...SPECIALTY_IDS]);
  });
});
