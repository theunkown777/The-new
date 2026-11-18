import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { berichtFachFuerApi, generateReportSchema } from "@/lib/berichtApi";
import { fachprofil } from "@/lib/fachprofile";
import { SPECIALTY_IDS } from "@/lib/specialties";

// Partner-Schnittstelle POST /api/v1/reports/generate: Das Fach bestimmt Stil und Platzhalter des Berichts.
// Ohne Angabe gilt das Fach des Schlüssels; Zahnmedizin nur bei GOZ/BEMA-Einträgen, sonst neutral. Nie still Zahn.

const anfrage = {
  reportType: "BEFUND",
  practiceName: "Praxis Beispiel",
  authorName: "Dr. Beispiel",
  patient: { firstName: "Max", lastName: "Mustermann" },
  entries: [{ system: "GOZ", code: "0010", title: "Eingehende Untersuchung", performed: true }],
};
const ebm = [{ system: "EBM", code: "03000", title: "Versichertenpauschale", performed: true }];
const heilmittel = [{ system: "HEILMITTEL", code: "X0501", title: "Krankengymnastik", performed: true }];

describe("Partner-Schnittstelle: Fach im Bericht", () => {
  it("ohne fach gilt das Fach des Schlüssels (zahn, ortho, physio)", () => {
    expect(berichtFachFuerApi(undefined, "zahn", anfrage.entries)).toBe("zahn");
    expect(berichtFachFuerApi(undefined, "ortho", anfrage.entries)).toBe("ortho");
    expect(berichtFachFuerApi(null, "physio", heilmittel)).toBe("physio");
    // Ein unbekanntes Fach am Schlüssel zählt nicht.
    expect(berichtFachFuerApi(null, "Zahnarzt", ebm)).toBe("andere");
  });

  it("ohne fach und ohne Fach am Schlüssel: Zahn nur bei GOZ/BEMA, sonst neutral", () => {
    const p = generateReportSchema.parse(anfrage);
    expect(p.fach).toBeUndefined();
    expect(berichtFachFuerApi(p.fach, null, p.entries)).toBe("zahn");
    expect(fachprofil(berichtFachFuerApi(p.fach, null, p.entries)).berichtStil).toMatch(/zahnmedizinisch/);
    expect(berichtFachFuerApi(null, null, [{ system: "BEMA" }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, ebm)).toBe("andere");
    expect(berichtFachFuerApi(undefined, undefined, heilmittel)).toBe("andere");
    expect(fachprofil(berichtFachFuerApi(null, null, ebm)).berichtStil).not.toMatch(/zahn/i);
  });

  it("mit fach im Stil des Fachs, auch gegen das Fach des Schlüssels; unbekanntes Fach wird abgelehnt", () => {
    for (const fach of SPECIALTY_IDS) {
      const p = generateReportSchema.safeParse({ ...anfrage, fach });
      expect(p.success, fach).toBe(true);
      expect(berichtFachFuerApi(p.data!.fach, "zahn", p.data!.entries), fach).toBe(fach);
    }
    expect(fachprofil(berichtFachFuerApi("augen", null, ebm)).berichtStil).not.toMatch(/zahn/i);
    const falsch = generateReportSchema.safeParse({ ...anfrage, fach: "Zahnarzt" });
    expect(falsch.success).toBe(false);
    expect(falsch.error?.issues[0]?.message).toBe("Unbekannte Fachrichtung (fach)");
  });

  it("die Route gibt das Fach des Schlüssels weiter, openapi.yaml beschreibt alle Fächer", () => {
    expect(readFileSync("app/api/v1/reports/generate/route.ts", "utf8")).toContain("fach: berichtFachFuerApi(fach, auth.client.fach, entries)");
    const api = readFileSync("openapi.yaml", "utf8");
    const liste = api.match(/GenerateReportRequest:[\s\S]*?fach:[\s\S]*?enum: \[([^\]]+)\]/)?.[1].split(",").map((x) => x.trim());
    expect(liste).toEqual([...SPECIALTY_IDS]);
    expect(api).not.toMatch(/bleibt es wie bisher bei der Zahnmedizin/);
  });
});
