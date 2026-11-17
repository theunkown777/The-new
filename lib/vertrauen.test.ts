import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { KI_ERSETZT, KI_HINWEISE, NOCH_NICHT, ORT, SCHUTZ, alleTexte } from "@/lib/vertrauen";

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

  it("sagt, was vor dem Versand an die KI ersetzt wird, und verspricht kein „nie“", () => {
    expect(KI_ERSETZT.join(" ")).toMatch(/Name der Patientin oder des Patienten.*Geburtsdatum.*Versichertennummer.*E-Mail-Adressen und Telefonnummern/);
    // Ein Foto oder PDF lässt sich nicht bereinigen, und im Freitext erkennt Sorrida nur bekannte Namen.
    expect(KI_HINWEISE.join(" ")).toMatch(/Preisliste \(Foto oder PDF\) geht unverändert an den KI-Dienst/);
    expect(KI_HINWEISE.join(" ")).toMatch(/Andere Namen bleiben stehen/);
    for (const satz of alleTexte()) expect(satz, satz).not.toMatch(/\bnie\b.*KI-Dienst|KI-Dienst.*\bnie\b|keine Namen/i);
    const seite = fs.readFileSync(path.join(process.cwd(), "app/vertrauen/page.tsx"), "utf8");
    expect(seite).not.toMatch(/geht nie an den KI-Dienst|und was nie/);
  });

  it("die übrigen Stellen behaupten ebenfalls nicht, dass keine Namen an den KI-Dienst gehen", () => {
    for (const datei of ["app/datenschutz/page.tsx", "components/PraxisFaq.tsx", "components/KiHilfenSettings.tsx", "components/TerminUeberblick.tsx", "lib/dienstleister.ts", "app/(app)/settings/protokoll/page.tsx", "lib/hilfeWissen.ts"]) {
      const text = fs.readFileSync(path.join(process.cwd(), datei), "utf8").replace(/\s+/g, " ");
      expect(text, datei).not.toMatch(/gehen keine Namen|geht nie an den KI-Dienst|gehen nicht an den KI-Dienst|und was nie/);
    }
    // Alle Seiten und Bausteine: kein Satz, der ohne Einschränkung zusagt, was nicht an den KI-Dienst geht.
    const lauf = (ordner: string): string[] => fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lauf(path.join(ordner, e.name)) : /\.tsx$/.test(e.name) ? [path.join(ordner, e.name)] : []));
    for (const datei of [...lauf("app"), ...lauf("components")]) {
      const text = fs.readFileSync(path.join(process.cwd(), datei), "utf8").replace(/\s+/g, " ");
      expect(text, datei).not.toMatch(/(gehen|geht) (nie|nicht|keine Namen) an (den|einen) KI-Dienst|und was nie\b/);
    }
    expect(fs.readFileSync(path.join(process.cwd(), "app/(app)/settings/protokoll/page.tsx"), "utf8")).toMatch(/ersetzt Sorrida vor dem Versand durch Platzhalter\. Freitext und eine hochgeladene Preisliste können weitere Angaben enthalten/);
    for (const datei of ["app/datenschutz/page.tsx", "lib/dienstleister.ts", "components/KiHilfenSettings.tsx"]) {
      const text = fs.readFileSync(path.join(process.cwd(), datei), "utf8").replace(/\s+/g, " ");
      expect(text, datei).toMatch(/Preisliste[^.]*geht unverändert an den KI-Dienst/);
    }
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
