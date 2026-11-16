import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { KI_NIE, NOCH_NICHT, ORT, SCHUTZ, alleTexte } from "@/lib/vertrauen";

describe("Seite /vertrauen", () => {
  it("verspricht nichts: keine Wörter wie sicher, konform, garantiert, keine Siegel", () => {
    // „Sicherheitstest“ und „sichert“ beschreiben, sie versprechen nichts; das Wort „sicher“ allein und Zusagen sind tabu.
    const verboten = [/\bsicher(e|er|es|en|em)?\b/i, /konform/i, /garantie/i, /garantiert/i, /zertifiziert/i, /siegel/i, /rechtssicher/i, /(^|\s)höchste[rsmn]?(?=[\s.,;]|$)/i, /(^|\s)beste[rsmn]?(?=[\s.,;]|$)/i, /optimal/i, /bank(en)?niveau/i, /militär/i];
    for (const satz of alleTexte()) for (const muster of verboten) expect(muster.test(satz), `„${satz}“ enthält ${muster}`).toBe(false);
  });

  it("nennt ehrlich, was es noch nicht gibt", () => {
    const titel = NOCH_NICHT.map((p) => p.titel).join(" | ");
    expect(titel).toMatch(/Kein Zertifikat/);
    expect(titel).toMatch(/Kein unabhängiger Sicherheitstest/);
    expect(titel).toMatch(/Wiederherstellung noch nicht geübt/);
    expect(titel).toMatch(/Einzelperson/);
  });

  it("sagt, was nie an die KI geht", () => {
    expect(KI_NIE.join(" ")).toMatch(/Namen.*Geburtsdatum.*Versichertennummer.*E-Mail-Adressen und Telefonnummern/);
  });

  it("jeder Punkt hat einen Beleg, und genannte Dateien gibt es", () => {
    for (const p of [...ORT, ...SCHUTZ]) {
      expect(p.beleg.length, p.titel).toBeGreaterThan(3);
      for (const datei of p.beleg.split(",").map((b) => b.trim().split(" ")[0]).filter((b) => /\.(ts|tsx|js|json|md)$/.test(b))) {
        expect(fs.existsSync(path.join(process.cwd(), datei)), `${p.titel}: ${datei} fehlt`).toBe(true);
      }
    }
  });

  it("kurze Sätze ohne Gedankenstrich-Einschübe", () => {
    for (const satz of alleTexte()) expect(satz).not.toMatch(/ [–—] /);
  });
});
