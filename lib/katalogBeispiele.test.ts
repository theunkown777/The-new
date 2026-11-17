import { describe, expect, it } from "vitest";
import { faktorVerzeichnisse, kategorieBeispiel, SYSTEME_JE_GRUPPE, suchBeispiel, systemeFuer } from "@/lib/katalogBeispiele";
import { systemGruppe } from "@/lib/fachprofile";
import { stammdatenBeispiele } from "@/lib/praxisStammdaten";
import { ALLE_SPECIALTIES } from "@/lib/specialties";
import { ZAHN_BEGRIFFE } from "@/lib/zahnBegriffe";

// Beispiele und Felder in den Einstellungen (Katalog, Leistungsverzeichnis, Stammdaten): Zahnärztliches nur bei Zahnmedizin.

const FAECHER = [...ALLE_SPECIALTIES.map((s) => s.id), "andere", "", null, undefined];

describe("Katalog und Leistungsverzeichnis je Fach", () => {
  it("Beispiele ohne Zahnbegriffe außerhalb der Zahnmedizin", () => {
    for (const fach of FAECHER) {
      const g = systemGruppe(fach);
      const t = [kategorieBeispiel(g), suchBeispiel(fach), faktorVerzeichnisse(g), systemeFuer(g).join(" ")].join(" | ");
      expect(t, `${fach}: ${t.match(ZAHN_BEGRIFFE)?.[0]}`).not.toMatch(ZAHN_BEGRIFFE);
    }
    // Gegenprobe
    expect(suchBeispiel("zahn")).toBe(", z. B. Füllung oder Krone");
    expect(kategorieBeispiel("zahn")).toBe("Prophylaxe");
    expect(systemeFuer("zahn")).toContain("GOZ");
  });

  it("Faktor-Feld nur, wo es GOZ oder GOÄ gibt", () => {
    expect(faktorVerzeichnisse("zahn")).toBe("GOZ/GOÄ");
    expect(faktorVerzeichnisse("arzt")).toBe("GOÄ");
    for (const g of ["therapie", "pflege", "apotheke", "versorgung", "hebamme", "selbst"]) expect(faktorVerzeichnisse(g), g).toBe("");
    for (const g of Object.keys(SYSTEME_JE_GRUPPE)) expect(faktorVerzeichnisse(g) !== "", g).toBe(systemeFuer(g).some((s) => s === "GOZ" || s === "GOAE"));
  });

  it("ohne Fach kein Suchbeispiel und kein Rückfall auf BEMA oder GOZ", () => {
    for (const f of ["", null, undefined]) expect(suchBeispiel(f)).toBe("");
    expect(systemeFuer("unbekannt")).toEqual(SYSTEME_JE_GRUPPE.arzt);
    expect(suchBeispiel("physio")).toBe(", z. B. Hausbesuch");
    expect(suchBeispiel("augen")).toBe(", z. B. Sonographie oder 03000");
  });
});

describe("Beispiele in den Stammdaten", () => {
  it("Berufsbezeichnung und Aufsicht ohne Zahnbegriffe außerhalb der Zahnmedizin", () => {
    for (const fach of FAECHER) {
      const b = stammdatenBeispiele(fach);
      expect(JSON.stringify(b), String(fach)).not.toMatch(/zahn/i);
    }
    expect(stammdatenBeispiele("zahn").aufsicht).toBe("Zum Beispiel Ihre Kassenzahnärztliche Vereinigung.");
    expect(stammdatenBeispiele("zahn").berufsbezeichnung).toContain("Zahnärztin");
  });

  it("Kassenärztliche Vereinigung nur bei Kassenpraxen; Klinik bei der Landesbehörde", () => {
    expect(stammdatenBeispiele("hausarzt").aufsicht).toBe("Zum Beispiel Ihre Kassenärztliche Vereinigung.");
    expect(stammdatenBeispiele("psych").aufsicht).toBe("Zum Beispiel Ihre Kassenärztliche Vereinigung.");
    expect(stammdatenBeispiele("klinik").aufsicht).toBe("Zum Beispiel die zuständige Behörde Ihres Landes.");
    expect(stammdatenBeispiele("aesthetik").aufsicht).toMatch(/^Mit Kassenzulassung .*, sonst die zuständige Behörde Ihres Landes\.$/);
    for (const fach of ["physio", "heilpraktiker", "optik", "andere", null]) expect(stammdatenBeispiele(fach).aufsicht, String(fach)).not.toMatch(/Kassen/);
  });
});
