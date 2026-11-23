import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { berichtFachFuerApi, generateReportSchema, katalogFachFuerApi } from "@/lib/berichtApi";
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

  it("Zahnmedizin auch bei BEL II, Zahnangaben und anderer Schreibweise; Heilmittel bleibt neutral", () => {
    expect(berichtFachFuerApi(null, null, [{ system: "GOAE", toothNumbers: "36" }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, [{ system: "GOAE", toothNumbers: "  " }])).toBe("andere");
    expect(berichtFachFuerApi(null, null, [{ system: "BEL_II" }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, [{ system: "bel ii" }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, [{ system: "goz" }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, [{ system: " Bema " }])).toBe("zahn");
    expect(berichtFachFuerApi(null, null, heilmittel)).toBe("andere");
    // Das Fach des Schlüssels geht den Einträgen vor.
    expect(berichtFachFuerApi(null, "physio", [{ system: "goz" }])).toBe("physio");
  });

  it("„andere“ schreibt neutral, nicht im allgemeinmedizinischen Stil und ohne Körperregion", () => {
    const p = fachprofil(berichtFachFuerApi(null, null, heilmittel));
    expect(p.berichtStil).not.toMatch(/allgemeinmedizin|Arztbrief|ICD|zahn/i);
    expect(p.region).toBe("Region");
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
    expect(api).toMatch(/BEL II oder Zahnangaben/);
    expect(api).toMatch(/set-api-client-fach/);
  });
});

describe("Partner-Schnittstelle: Katalog je Fach", () => {
  it("?fach= vor dem Fach des Schlüssels, ohne beides alle Fächer", () => {
    expect(katalogFachFuerApi("physio", "zahn")).toEqual({ ok: true, fach: "physio" });
    expect(katalogFachFuerApi(null, "zahn")).toEqual({ ok: true, fach: "zahn" });
    expect(katalogFachFuerApi(undefined, "ortho")).toEqual({ ok: true, fach: "ortho" });
    expect(katalogFachFuerApi(null, null)).toEqual({ ok: true, fach: null });
    expect(katalogFachFuerApi(null, "Zahnarzt")).toEqual({ ok: true, fach: null });
    expect(katalogFachFuerApi("Zahnarzt", "zahn")).toEqual({ ok: false });
  });
  it("die Route filtert nach diesem Fach, openapi.yaml nennt alle Verzeichnisse", () => {
    const route = readFileSync("app/api/v1/catalog/route.ts", "utf8");
    expect(route).toContain("katalogFachFuerApi(new URL(req.url).searchParams.get(\"fach\"), auth.client.fach)");
    const api = readFileSync("openapi.yaml", "utf8");
    expect(api).toMatch(/system: \{ type: string, enum: \[GOZ, BEMA, BEL_II, EBM, GOAE, UVGOAE, HEILMITTEL, HEBAMME, PFLEGE, APO, HILFSMITTEL, SELBST, SONSTIGES\] \}/);
  });
});
