// Die Datenschutzerklärung (app/datenschutz/page.tsx, Abschnitt 3) nennt jeden Zugriff auf den Speicher des Browsers
// und sagt: „Auf der öffentlichen Website speichern wir nichts im Speicher Ihres Browsers.“ § 25 TDDDG erfasst auch
// das Lesen. Dieser Test hält fest, welche Dateien den Speicher anfassen. Kommt eine dazu, schlägt er fehl:
// Dann gehört der Zugriff in die Erklärung oder aus dem Code.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const lauf = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? lauf(join(ordner, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(ordner, e.name)] : [],
  );
const ohneKommentare = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");

/** Dateien, die den Speicher nutzen, und wo das in der Erklärung steht. */
const ERLAUBT: Record<string, string> = {
  "components/Ansicht.tsx": "dunkle Ansicht (angemeldete Praxen)",
  "lib/ansicht.ts": "dunkle Ansicht (angemeldete Praxen)",
  "components/HinweisMerker.tsx": "zugeklappte Erklärtexte (angemeldete Praxen)",
  "components/DemoFuehrung.tsx": "Führung im Gastzugang",
  "components/ProposalEditor.tsx": "angefangener Vorschlag (angemeldete Praxen)",
  "components/SignOutButton.tsx": "löscht den angefangenen Vorschlag beim Abmelden",
  // Nur außerhalb des Betriebs (Testschalter für Bildschirmfotos), siehe zweiter Test.
  "components/modelle/drei/Buehne.ts": "Testschalter, im ausgelieferten Code abgeschaltet",
};

describe("Zugriffe auf den Speicher des Browsers", () => {
  it("nur die bekannten Dateien nutzen localStorage oder sessionStorage", () => {
    const treffer = [...lauf("app"), ...lauf("components"), ...lauf("lib")].filter((datei) => /\b(localStorage|sessionStorage)\b\s*[.[]|\b(localStorage|sessionStorage)\.(get|set|remove)Item/.test(ohneKommentare(readFileSync(datei, "utf8"))));
    expect(treffer.sort()).toEqual(Object.keys(ERLAUBT).sort());
  });

  it("das Modell liest den Testschalter nur außerhalb des Betriebs", () => {
    const zeilen = ohneKommentare(readFileSync("components/modelle/drei/Buehne.ts", "utf8")).split("\n").filter((z) => /localStorage/.test(z));
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toMatch(/process\.env\.NODE_ENV !== "production" && \(\(\) => \{ try \{ return localStorage\.getItem\("modell-scharf"\)/);
  });

  it("die Erklärung nennt die Zugriffe und die Zusage für die öffentliche Website", () => {
    const seite = readFileSync("app/datenschutz/page.tsx", "utf8").replace(/\s+/g, " ");
    for (const wort of ["Sitzungsspeicher", "dunkle Ansicht", "Erklärtext", "Führung", "Auf der öffentlichen Website speichern wir nichts im Speicher Ihres Browsers."]) expect(seite).toContain(wort);
  });

  it("keine Seite außerhalb der angemeldeten App bindet die dunkle Ansicht oder die Merker ein", () => {
    for (const datei of lauf("app").filter((d) => !d.startsWith(join("app", "(app)")))) {
      const text = readFileSync(datei, "utf8");
      expect(text, datei).not.toMatch(/ANSICHT_SKRIPT|AnsichtWaechter|HinweisMerker|from "@\/components\/Hinweis"/);
    }
  });
});
