// Die Sätze des Festzuschusses hängen am Datum der Bewilligung: bis 31.12.2026 gelten 60, 70 und 75 %, ab 1.1.2027
// 50, 60 und 65 %. Wo die Website oder die App die Sätze als Regel nennt, stehen beide Jahre. Dazu: keine Zusage
// „richtig“ oder „korrekt“ für das Rechnen und keine Wirkung, die mangels Kunden nicht belegt ist.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FESTZUSCHUSS_SAETZE, festzuschussRegelText, festzuschussSaetzeText } from "./proposals";
import { ARTEN } from "./abrechnungsarten";

const lies = (datei: string) => readFileSync(join(process.cwd(), datei), "utf8");

describe("Festzuschuss-Sätze als Text", () => {
  it("nennt die drei Sätze eines Jahres aus der Tabelle", () => {
    expect(festzuschussSaetzeText(2026)).toBe("60, 70 oder 75 %");
    expect(festzuschussSaetzeText(2027)).toBe("50, 60 oder 65 %");
    expect(festzuschussSaetzeText(2026, "/")).toBe("60/70/75 %");
    expect(festzuschussSaetzeText(2027, "/")).toBe("50/60/65 %");
    expect(FESTZUSCHUSS_SAETZE[2027][10]).toBe(0.65);
  });

  it("die Regel nennt immer beide Jahre", () => {
    expect(festzuschussRegelText()).toBe("bis 31.12.2026 bewilligt 60, 70 oder 75 %, ab 1.1.2027 50, 60 oder 65 %, je nach Bonusheft");
  });

  it("Fachseite und Abrechnungsarten nennen nicht nur die Sätze von 2026", () => {
    const fachseite = lies("app/fachgebiete/[id]/page.tsx");
    expect(fachseite).toMatch(/<b>Festzuschuss mit Bonus:<\/b> \{festzuschussRegelText\(\)\}/);
    expect(fachseite).not.toMatch(/60, 70 oder 75 % je nach Bonusheft/);
    const zahnersatz = ARTEN.zahnersatz.zahler;
    expect(zahnersatz).toContain(festzuschussSaetzeText(2026, "/"));
    expect(zahnersatz).toContain(festzuschussSaetzeText(2027, "/"));
    expect(lies("lib/dentalShowcase.ts")).not.toMatch(/bis 75 %/);
  });

  it("der Editor zeigt beim Bonusheft den Satz des gewählten Jahres", () => {
    const editor = lies("components/ProposalEditor.tsx");
    expect(editor).not.toMatch(/5 Jahre \(70 %\)|10 Jahre \(75 %\)/);
    expect(editor).toMatch(/FESTZUSCHUSS_SAETZE\[jahr\]\[10\]/);
  });

  it("keine Zusage „richtig“ oder „korrekt“ und keine unbelegte Wirkung auf Fachseite, Fragen und Karten", () => {
    for (const datei of ["app/fachgebiete/[id]/page.tsx", "components/PraxisFaq.tsx", "components/Entlastung.tsx"]) {
      const text = lies(datei).replace(/\/\/.*$/gm, "");
      expect(text, datei).not.toMatch(/\b(richtig:|korrekt)\b/);
      expect(text, datei).not.toMatch(/Weniger Rückfragen|Nichts wird doppelt getippt/);
    }
  });

  // data/festzuschuss-2027.json ist leer, solange die Beträge 2027 nicht veröffentlicht sind. Bis dahin steht bei
  // jedem Betrag für 2027 „voraussichtlich“, auch in den Texten nur für die Praxis: Sie gibt die Zahl im Gespräch weiter.
  it("Aufgabenliste nach dem Gespräch und Zusammenfassung nennen den Mehrbetrag 2027 mit „voraussichtlich“", async () => {
    const { wort2027, festzuschuss2027Amtlich } = await import("./proposals");
    expect(wort2027("dahinter", null)).toBe("voraussichtlich ");
    expect(wort2027("dahinter", { "1.1": 100 })).toBe("");
    expect(lies("lib/nextSteps.ts")).toMatch(/zahlt der Patient \$\{wort2027\("dahinter"\)\}ca\. /);
    expect(lies("components/WrapUpSummary.tsx")).toMatch(/ab 2027 \{wort2027\("dahinter"\)\}ca\. /);
    // Kein Betrag „ab 2027 ca. …“ oder „ab 1.1.2027 … ca. …“ ohne das Wort, in keiner Datei der App.
    const { readdirSync } = await import("node:fs");
    const lauf = (ordner: string): string[] => readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lauf(join(ordner, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [join(ordner, e.name)] : []));
    for (const datei of [...lauf("app"), ...lauf("components"), ...lauf("lib")]) {
      for (const zeile of lies(datei).split("\n")) {
        if (/2027[^\n]{0,40}\bca\. /.test(zeile) && /formatEuro|\$\{|\{/.test(zeile)) expect(zeile, datei).toMatch(/wort2027|voraussichtlich/);
      }
    }
    if (!festzuschuss2027Amtlich()) {
      const { buildNextSteps } = await import("./nextSteps");
      expect(typeof buildNextSteps).toBe("function");
    }
  });
});
