import { describe, expect, it } from "vitest";
import { abrechnungsStelle, artenFuer, rechnetUeberKv } from "@/lib/abrechnungsarten";
import { FACHPROFILE, NEUTRALES_PROFIL, fachprofil, preisRahmen, termineFuer, vereinbarungFuer } from "@/lib/fachprofile";

// Ohne Fach und bei „andere“ gilt nichts Hausärztliches und nichts Zahnärztliches. Geprüft jeweils mit Zahnmedizin
// und zwei weiteren Fächern, damit die Fachwerte nicht mit verschwinden.
const OHNE = [null, undefined, ""] as const;

describe("neutrales Profil für „andere“ und ohne Fach", () => {
  it("fachprofil fällt auf das neutrale Profil zurück, nicht auf den Hausarzt", () => {
    for (const f of [...OHNE, "andere", "unbekannt"]) {
      const p = fachprofil(f);
      expect(p, String(f)).toBe(NEUTRALES_PROFIL);
      expect(p.termine).toEqual(["Erstgespräch", "Kontrolle", "Befundbesprechung", "Folgetermin"]);
      expect(p.region).toBe("Region");
      expect(p.berichtStil).not.toMatch(/allgemeinmedizin|Arztbrief|ICD|zahn|FDI/i);
    }
    expect(fachprofil("zahn").region).toBe("Zahn/Region");
    expect(fachprofil("hausarzt").termine.join(" ")).toMatch(/Check-up/);
    expect(fachprofil("physio")).toBe(FACHPROFILE.physio);
  });

  it("neutrale Terminanlässe ohne Check-up, Impfung, DMP oder Zahnbezug", () => {
    for (const f of [...OHNE, "andere"]) expect(termineFuer(f, {}).join(" ")).not.toMatch(/Check-up|Impf|DMP|Hausbesuch|Füllung|Zahn/);
  });

  it("das neutrale Profil steht nicht in FACHPROFILE (der Seed legt dafür keine Vorlagen an)", () => {
    expect(Object.values(FACHPROFILE)).not.toContain(NEUTRALES_PROFIL);
    expect(FACHPROFILE.andere).toBeUndefined();
  });

  it("artenFuer ohne Fach wie „andere“, nie Zahn oder Hausarzt", () => {
    const andere = artenFuer("andere").map((a) => a.id);
    for (const f of OHNE) expect(artenFuer(f).map((a) => a.id), String(f)).toEqual(andere);
    expect(andere).not.toContain("gkv_bema");
    expect(andere).not.toContain("bg");
    const ebm = artenFuer(null).find((a) => a.id === "gkv_ebm")!;
    expect(ebm.begriffe.map(([b]) => b)).not.toContain("Versichertenpauschale");
    expect(artenFuer("zahn")[0].id).toBe("gkv_bema");
    expect(artenFuer("hausarzt").map((a) => a.id)).toContain("bg");
    expect(artenFuer("logo").map((a) => a.id)).toEqual(["heilmittel", "selbstzahler_therapie"]);
  });

  it("rechnetUeberKv: Zahn und Heilmittel nicht, Ärzte ja", () => {
    expect(rechnetUeberKv("zahn")).toBe(false);
    expect(rechnetUeberKv("physio")).toBe(false);
    expect(rechnetUeberKv("kardio")).toBe(true);
    expect(rechnetUeberKv("andere")).toBe(rechnetUeberKv(null));
  });

  it("abrechnungsStelle: ohne Fach keine Stelle, sonst die des Fachs", () => {
    for (const f of OHNE) expect(abrechnungsStelle(f), String(f)).toBeNull();
    expect(abrechnungsStelle("zahn")?.wer).toBe("Ihre KZV");
    expect(abrechnungsStelle("hno")?.wer).toBe("Ihre KV");
    expect(abrechnungsStelle("pflege")?.wer).toBe("die Pflegekasse oder Ihr Abrechnungszentrum");
    expect(abrechnungsStelle("heilpraktiker")).toBeNull();
  });

  it("vereinbarungFuer und preisRahmen: ohne Fach neutral", () => {
    for (const f of OHNE) {
      expect(vereinbarungFuer(f), String(f)).toBe("Vereinbarung");
      expect(preisRahmen(f), String(f)).toBe("Beispielwerte.");
    }
    expect(vereinbarungFuer("zahn")).toBe("Mehrkosten- bzw. Privatvereinbarung");
    expect(vereinbarungFuer("augen")).toBe("IGeL-Vereinbarung");
    expect(vereinbarungFuer("ergo")).toBe("Privatvereinbarung");
    expect(vereinbarungFuer("klinik")).toBe("Wahlleistungsvereinbarung");
    expect(preisRahmen("augen")).toMatch(/GOÄ/);
    expect(preisRahmen("heilpraktiker")).toMatch(/GebüH/);
  });
});

describe("Beihilfe je Fach", () => {
  const beihilfe = (f: string) => artenFuer(f).find((a) => a.id === "beihilfe")!.rechenweg;
  it("Ärzte: wie GOÄ, ohne GOZ", () => {
    for (const f of ["hausarzt", "kardio", "andere"]) {
      expect(beihilfe(f), f).toMatch(/^Wie GOÄ;/);
      expect(beihilfe(f), f).not.toMatch(/GOZ/);
    }
  });
  it("Zahnmedizin: wie GOZ, einzelne Positionen nach GOÄ", () => {
    expect(beihilfe("zahn")).toMatch(/^Wie GOZ, einzelne Positionen nach GOÄ;/);
  });
});
