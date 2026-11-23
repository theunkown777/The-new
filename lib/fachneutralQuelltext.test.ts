import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ZAHN_BEGRIFFE } from "@/lib/zahnBegriffe";

// Quelltext-Wächter: In Dateien, die Patientinnen und Patienten sehen (und in den Einstellungen mit Beispielen je Fach),
// darf ein zahnärztlicher Text nur stehen, wenn dieselbe Zeile ihn an die Zahnmedizin bindet. Geprüft werden nur Texte
// (Zeichenketten und JSX-Text), keine Namen im Code wie isZahnersatz. So wäre „von Ihrer Zahnarztpraxis“ in der
// Vorschau beim Teilen (app/p/[token]/page.tsx) früher aufgefallen.
// Nicht geprüft: components/kurzcheck/* (eigener Bereich mit eigener Prüfung).

const ORDNER = ["app/a", "app/portal", "app/p", "app/t", "app/uebergabe"];
const DATEIEN = [
  "components/AnamnesisForm.tsx",
  "components/AnamnesisPanel.tsx",
  "components/PatientProposalView.tsx",
  "components/PraxisStammdaten.tsx",
  "components/CatalogSettings.tsx",
  "components/Erstattungsbrief.tsx",
];

/** Eine Zeile bindet den Text an die Zahnmedizin. */
const BEDINGUNG = /\bdental\b|isDental|DENTAL_ID|istZahn|=== ?"(zahn|GOZ|BEMA|gebiss)"|\bzahn: /;

function dateienIn(ordner: string): string[] {
  return readdirSync(ordner).flatMap((n) => {
    const p = join(ordner, n);
    return statSync(p).isDirectory() ? dateienIn(p) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

/** Alle Texte einer Datei mit Zeile: Zeichenketten, Vorlagen und JSX-Text. Importe zählen nicht. */
function texte(datei: string): { zeile: number; text: string; quelle: string }[] {
  const code = readFileSync(datei, "utf8");
  const zeilen = code.split("\n");
  const sf = ts.createSourceFile(datei, code, ts.ScriptTarget.Latest, true, datei.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: { zeile: number; text: string; quelle: string }[] = [];
  const besuch = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) {
      const zeile = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
      out.push({ zeile: zeile + 1, text: n.getText(sf), quelle: zeilen[zeile] });
    }
    ts.forEachChild(n, besuch);
  };
  besuch(sf);
  return out;
}

const ALLE = [...ORDNER.flatMap(dateienIn), ...DATEIEN];

describe("Patientenseiten: keine zahnärztlichen Texte ohne Bedingung", () => {
  it("findet die Dateien", () => {
    expect(ALLE.length).toBeGreaterThan(15);
    expect(ALLE).toContain(join("app/p/[token]/page.tsx"));
    expect(ALLE).toContain(join("app/a/[token]/page.tsx"));
  });

  it("jeder zahnärztliche Text steht in einer Zeile mit Bedingung", () => {
    const funde: string[] = [];
    for (const datei of ALLE)
      for (const t of texte(datei)) if (ZAHN_BEGRIFFE.test(t.text) && !BEDINGUNG.test(t.quelle)) funde.push(`${datei}:${t.zeile}: ${t.text.trim().slice(0, 80)}`);
    expect(funde).toEqual([]);
  });

  it("Gegenprobe: der Wächter findet einen ungebundenen Zahntext", () => {
    const zeile = 'openGraph: { description: "Ihre Möglichkeiten, von Ihrer Zahnarztpraxis." },';
    expect(ZAHN_BEGRIFFE.test('"Ihre Möglichkeiten, von Ihrer Zahnarztpraxis."') && !BEDINGUNG.test(zeile)).toBe(true);
  });

  it("Vorschau beim Teilen eines Vorschlags ist fachneutral", () => {
    const seite = readFileSync("app/p/[token]/page.tsx", "utf8");
    const og = seite.match(/openGraph: \{ title: "([^"]+)", description: "([^"]+)"/);
    expect(og).not.toBeNull();
    expect(`${og![1]} ${og![2]}`).not.toMatch(ZAHN_BEGRIFFE);
    expect(og![2]).toContain("von Ihrer Praxis");
  });
});
