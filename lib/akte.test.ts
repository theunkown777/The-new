import { describe, expect, it } from "vitest";
import { buildBriefing, briefingAsText, dokumentSpeicherVoll, entrySchema, sniffMime } from "./akte";
const now = new Date("2026-11-20");
const e = (art: string, text: string, extra: Partial<{ code: string; datum: Date; inaktiv: boolean }> = {}) => ({
  art, text, code: extra.code ?? null, datum: extra.datum ?? null, inaktiv: extra.inaktiv ?? false, createdAt: new Date("2026-10-01"),
});
const base = { now, alter: 54, versicherung: "GKV", entries: [], anamneseWarnungen: [], letzteBehandlung: null, offeneVorschlaege: [], offeneRechnungenCent: 0, ueberfaellig: false, dokumente: 0, anlass: null };

describe("Akte", () => {
  it("prüft ICD-10-Codes", () => {
    expect(entrySchema.safeParse({ art: "DIAGNOSE", text: "Karies", code: "k02.1" }).success).toBe(true);
    expect(entrySchema.safeParse({ art: "DIAGNOSE", text: "Diabetes", code: "E11.9 G" }).success).toBe(true);
    expect(entrySchema.safeParse({ art: "DIAGNOSE", text: "Quatsch", code: "123" }).success).toBe(false);
  });
  it("erkennt Dateitypen am Inhalt", () => {
    expect(sniffMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0x4d, 0x5a, 0, 0]))).toBeNull();
  });
  it("stellt Allergien und Warnungen nach vorn und lässt Inaktives weg", () => {
    const b = buildBriefing({
      ...base,
      anlass: "Kontrolle",
      entries: [e("ALLERGIE", "Penicillin"), e("DIAGNOSE", "Diabetes Typ 2", { code: "E11.9" }), e("DIAGNOSE", "Alte Gingivitis", { inaktiv: true }), e("MEDIKATION", "Metformin 1000")],
      anamneseWarnungen: ["Blutverdünner"],
      offeneRechnungenCent: 12000,
      ueberfaellig: true,
    });
    expect(b.achtung).toEqual(["Allergie: Penicillin", "Anamnese: Blutverdünner"]);
    expect(b.zeilen.map((z) => z.label)).toEqual(["Anlass", "Patient", "Diagnosen", "Medikation", "Zahlung"]);
    expect(b.zeilen[2].text).toBe("Diabetes Typ 2 (E11.9)");
    expect(briefingAsText(b)).not.toMatch(/Gingivitis/);
  });
  it("erfindet nichts bei leerer Akte", () => {
    expect(buildBriefing({ ...base, alter: null, versicherung: null })).toEqual({ achtung: [], zeilen: [{ label: "Patient", text: "Alter unbekannt" }] });
  });
});

describe("Dokumentenspeicher je Praxis", () => {
  const MB = 1024 * 1024;
  it("Gastzugang: zusammen höchstens 10 MB", () => {
    expect(dokumentSpeicherVoll(6 * MB, 4 * MB, true)).toBeNull();
    expect(dokumentSpeicherVoll(6 * MB, 4 * MB + 1, true)).toContain("10 MB");
  });
  it("Praxis: zusammen höchstens 400 MB", () => {
    expect(dokumentSpeicherVoll(6 * MB, 5 * MB, false)).toBeNull();
    expect(dokumentSpeicherVoll(398 * MB, 5 * MB, false)).toContain("400 MB");
  });
});
