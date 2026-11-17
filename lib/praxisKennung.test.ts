import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DENTAL_ID, SPECIALTY_IDS } from "@/lib/specialties";
import { GRUPPEN_FARBE, GRUPPEN_SYMBOL, PRAXIS_GRUPPEN } from "@/lib/praxisGruppe";
import { KURZNAME_MAX, fachKurz, kennzeile, kurzerPraxisname, monogramm, ortAus, praxisGruppe, praxisKennzeichen } from "@/lib/praxisKennung";

describe("Kennzeichen einer Praxis (Fach, Ort, Gruppe, Farbe)", () => {
  it("jedes Fach hat eine Kurzbezeichnung und eine Gruppe", () => {
    for (const id of SPECIALTY_IDS) {
      expect(fachKurz(id).length, id).toBeGreaterThan(3);
      expect(PRAXIS_GRUPPEN, id).toContain(praxisGruppe(id));
    }
    expect(praxisGruppe(DENTAL_ID)).toBe("zahn");
    expect(fachKurz(DENTAL_ID)).toBe("Zahnarztpraxis");
    expect(praxisGruppe("hausarzt")).toBe("arzt");
    expect(fachKurz("hausarzt")).toBe("Hausarztpraxis");
    expect(praxisGruppe("physio")).toBe("therapie");
    expect(praxisGruppe("andere")).toBe("arzt");
    expect(fachKurz("andere")).toBe("Praxis");
  });

  it("jede Gruppe hat eine eigene Farbe und eigene Symbole, die es als Datei gibt", () => {
    const farben = PRAXIS_GRUPPEN.map((g) => GRUPPEN_FARBE[g].farbe);
    expect(new Set(farben).size).toBe(PRAXIS_GRUPPEN.length);
    for (const g of PRAXIS_GRUPPEN) {
      for (const datei of Object.values(GRUPPEN_SYMBOL[g])) expect(existsSync(join(process.cwd(), "public", datei)), datei).toBe(true);
      // Das Symbol hat die Farbe der Gruppe (eine Quelle für Manifest, Kopf und Liste).
      expect(readFileSync(join(process.cwd(), "public", GRUPPEN_SYMBOL[g].svg), "utf8")).toContain(GRUPPEN_FARBE[g].farbe);
    }
  });

  it("weiße Schrift erreicht auf jeder Gruppenfarbe mindestens 4,5 : 1", () => {
    const kanal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const leucht = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => kanal(parseInt(hex.slice(i, i + 2), 16) / 255));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const g of PRAXIS_GRUPPEN) expect((1 + 0.05) / (leucht(GRUPPEN_FARBE[g].farbe) + 0.05), g).toBeGreaterThanOrEqual(4.5);
  });

  it("Ort ohne Postleitzahl, leer ohne Angabe", () => {
    expect(ortAus({ plzOrt: "48143 Münster" })).toBe("Münster");
    expect(ortAus({ plzOrt: "D-10115 Berlin" })).toBe("Berlin");
    expect(ortAus({ plzOrt: "Bad Homburg vor der Höhe" })).toBe("Bad Homburg vor der Höhe");
    expect(ortAus(null)).toBe("");
    expect(ortAus({ plzOrt: 42 })).toBe("");
    expect(kennzeile({ fachKurz: "Zahnarztpraxis", ort: "Münster" })).toBe("Zahnarztpraxis · Münster");
    expect(kennzeile({ fachKurz: "Hausarztpraxis", ort: "" })).toBe("Hausarztpraxis");
  });

  it("kurzer Name für den Startbildschirm: das Unterscheidende, höchstens 12 Zeichen", () => {
    const faelle: [string, string | null, string][] = [
      ["Zahnarztpraxis Dr. Sonnenberg", DENTAL_ID, "Sonnenberg"],
      ["Zahnarztpraxis Dr. Sonnenberg (Testpraxis 5)", DENTAL_ID, "Sonnenberg"],
      ["Praxis Dr. med. Anna Weber", "hausarzt", "Anna Weber"],
      ["Hausarztpraxis am Markt (Demo)", "hausarzt", "Am Markt"],
      ["Gemeinschaftspraxis Dres. Kaya und Brandt", "hausarzt", "Kaya und"],
      ["Physiotherapie Müller & Partner", "physio", "Müller"],
      ["Dr. Anna Weber, Fachärztin für Allgemeinmedizin", "hausarzt", "Anna Weber"],
      ["Praxis Weber", "hausarzt", "Praxis Weber"],
      ["Hausarztpraxis", "hausarzt", "Hausarzt"],
      ["Zahnarztpraxis", DENTAL_ID, "Zahnarzt"],
    ];
    for (const [name, fach, soll] of faelle) {
      const kurz = kurzerPraxisname(name, fach);
      expect(kurz.length, name).toBeLessThanOrEqual(KURZNAME_MAX);
      expect(kurz.length, name).toBeGreaterThan(0);
      if (name !== "Gemeinschaftspraxis Dres. Kaya und Brandt") expect(kurz, name).toBe(soll);
    }
    // Endet nie mit einem Verbindewort.
    expect(kurzerPraxisname("Gemeinschaftspraxis Dres. Kaya und Brandt", "hausarzt")).toBe("Kaya");
    // Lange Wörter werden gekürzt, nie länger als erlaubt.
    expect(kurzerPraxisname("Rehabilitationszentrumsgesellschaft Nord", "physio").length).toBeLessThanOrEqual(KURZNAME_MAX);
  });

  it("Monogramm aus dem kurzen Namen", () => {
    expect(monogramm("Anna Weber")).toBe("AW");
    expect(monogramm("Sonnenberg")).toBe("S");
    expect(monogramm("Am Markt")).toBe("M");
    expect(monogramm("")).toBe("P");
  });

  it("zwei Praxen verschiedener Gruppen sehen verschieden aus, auch bei gleichem Namen", () => {
    const hausarzt = praxisKennzeichen({ name: "Praxis am Markt", specialty: "hausarzt", stammdaten: { plzOrt: "48143 Münster" } });
    const zahnarzt = praxisKennzeichen({ name: "Praxis am Markt", specialty: DENTAL_ID, stammdaten: { plzOrt: "48143 Münster" } });
    expect(hausarzt.fachKurz).not.toBe(zahnarzt.fachKurz);
    expect(hausarzt.farbe).not.toBe(zahnarzt.farbe);
    expect(hausarzt.symbol.png512).not.toBe(zahnarzt.symbol.png512);
    expect(kennzeile(hausarzt)).toBe("Hausarztpraxis · Münster");
    expect(kennzeile(zahnarzt)).toBe("Zahnarztpraxis · Münster");
  });

  it("liest nur die Angaben der einen Praxis (keine Datenbank, kein Abgleich)", () => {
    const quelle = readFileSync(join(process.cwd(), "lib/praxisKennung.ts"), "utf8");
    expect(quelle).not.toMatch(/@\/lib\/prisma|fetch\(/);
  });
});
