// Die Datenschutzerklärung (app/datenschutz/page.tsx, Abschnitt 3) nennt jeden Zugriff auf den Speicher des Browsers
// und sagt, dass die öffentliche Website nur einen Eintrag speichert: „sorrida-rundgang“ = „zu“, und nur nach einem Klick
// auf „Nein danke“ oder „Rundgang beenden“. § 25 TDDDG erfasst auch das Lesen.
// Dieser Test hält fest, welche Dateien den Speicher anfassen. Kommt eine dazu, schlägt er fehl:
// Dann gehört der Zugriff in die Erklärung oder aus dem Code.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ANGABEN_SCHLUESSEL, ablageLesen, ablageSchreiben, kopieVerschluesseln, type Kopie } from "@/lib/meineAngaben";

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
  "components/start/Rundgang.tsx": "Rundgang der Startseite: nur nach „Nein danke“ oder „Rundgang beenden“, Wert „zu“",
  "components/ProposalEditor.tsx": "angefangener Vorschlag (angemeldete Praxen)",
  "components/SignOutButton.tsx": "löscht den angefangenen Vorschlag beim Abmelden",
  "lib/geraeteSpeicher.ts": "„Meine Praxen auf diesem Gerät“ und „Meine Angaben auf diesem Gerät“ (Patientenseiten, nur nach Klick, Angaben nur verschlüsselt)",
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
    for (const wort of ["Sitzungsspeicher", "dunkle Ansicht", "Erklärtext", "Führung", "„sorrida-rundgang“", "Wert „zu“", "Ohne diesen Klick wird nichts gespeichert", "Sonst speichern wir auf der öffentlichen Website nichts im Speicher Ihres Browsers.", "Meine Praxen auf diesem Gerät", "Erst wenn Sie dafür auf „Diese Praxis auf diesem Gerät merken“ tippen", "Meine Angaben auf diesem Gerät", "Erst wenn Sie auf „Kopie meiner Angaben auf diesem Gerät behalten“ tippen"]) expect(seite).toContain(wort);
  });

  it("„Meine Angaben“: der Schlüssel wird nur über ablageSchreiben beschrieben, also nur mit verschlüsselten Kopien", () => {
    const text = ohneKommentare(readFileSync("lib/geraeteSpeicher.ts", "utf8"));
    const schreiben = text.match(/localStorage\.setItem\([^;]*\)/g) ?? [];
    expect(schreiben.filter((z) => /ANGABEN_SCHLUESSEL/.test(z))).toEqual(["localStorage.setItem(ANGABEN_SCHLUESSEL, ablageSchreiben(ablage))"]);
    // Sonst nennt keine Datei den Schlüssel; Komponenten gehen nur über lib/geraeteSpeicher.ts.
    for (const datei of [...lauf("app"), ...lauf("components"), ...lauf("lib")].filter((d) => d !== join("lib", "meineAngaben.ts"))) {
      expect(readFileSync(datei, "utf8"), datei).not.toContain(ANGABEN_SCHLUESSEL);
    }
  });

  it("„Meine Angaben“: im Speicher stehen keine Antworten, kein Praxisname und keine fremden Felder", async () => {
    const kopie = await kopieVerschluesseln(
      { v: 1, fach: "zahn", ansprache: "patient", praxis: "Zahnarztpraxis Sonnenweg", q: { allergie: { yes: true, detail: "Penicillinunverträglichkeit" }, blutverduenner: { yes: false } } },
      "Leuchtturm-123",
      { bezeichnung: "Meine Angaben", stand: "2026-11-01", gruppe: "zahn" },
      250_000,
    );
    // Was eine fremde Hand dazulegen wollte, wird beim Schreiben verworfen.
    const untergeschoben = { ...kopie, name: "Erika Muster", geburtsdatum: "1980-01-01", token: "abc", code: "Leuchtturm-123" } as Kopie;
    const roh = ablageSchreiben({ kopien: [untergeschoben], protokoll: [] });
    for (const wort of ["Penicillin", "allergie", "blutverduenner", "Sonnenweg", "Leuchtturm-123", "Erika", "1980-01-01", "token", "patient"]) expect(roh).not.toContain(wort);
    const gelesen = ablageLesen(roh, new Date("2026-11-17T12:00:00Z"));
    expect(Object.keys(gelesen.kopien[0]).sort()).toEqual(["bezeichnung", "daten", "gruppe", "id", "iter", "iv", "salt", "stand"]);
  });

  it("der Rundgang der Startseite schreibt nur „zu“ und nur beim Beenden", () => {
    const text = ohneKommentare(readFileSync("components/start/Rundgang.tsx", "utf8"));
    const schreiben = text.match(/sessionStorage\.setItem\([^)]*\)/g) ?? [];
    expect(schreiben).toEqual(["sessionStorage.setItem(RUNDGANG_SCHLUESSEL, RUNDGANG_ZU)"]);
    expect(text).not.toMatch(/localStorage/);
    expect(text).not.toMatch(/sessionStorage\.(removeItem|clear)/);
  });

  it("keine Seite außerhalb der angemeldeten App bindet die dunkle Ansicht oder die Merker ein", () => {
    for (const datei of lauf("app").filter((d) => !d.startsWith(join("app", "(app)")))) {
      const text = readFileSync(datei, "utf8");
      expect(text, datei).not.toMatch(/ANSICHT_SKRIPT|AnsichtWaechter|HinweisMerker|from "@\/components\/Hinweis"/);
    }
  });
});
