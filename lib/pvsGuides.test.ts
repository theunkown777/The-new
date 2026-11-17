// In der App stehen keine namentlich genannten Praxisprogramme als Tatsache („lässt sich aus … öffnen“), solange es
// je Programm kein Testprotokoll aus einer Praxis gibt. Die Anleitungen behalten den Namen als Überschrift und
// tragen sichtbar den Vermerk, dass sie noch nicht in einer Praxis geprüft sind.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PVS_GUIDES, PVS_GUIDES_HINWEIS, PVS_GUIDE_VERMERK, PVS_GUIDE_VERMERK_OHNE_HERSTELLER, guideVermerk } from "./pvsGuides";

const PROGRAMME = /DS-Win|Dampsoft|CGM|Z1\b|charly|solutio|EVIDENT|Medistar|TURBOMED|M1 PRO|x\.isynet|ALBIS|LinuDent|T2med/i;
const lies = (datei: string) => readFileSync(join(process.cwd(), datei), "utf8");

describe("Anleitungen zur Praxissoftware", () => {
  it("jede Anleitung hat Schritte, Quelle und einen Vermerk „noch nicht in einer Praxis geprüft“", () => {
    expect(PVS_GUIDE_VERMERK).toBe("Nach Unterlagen des Herstellers. Von uns noch nicht in einer Praxis geprüft.");
    for (const g of PVS_GUIDES) {
      expect(g.steps.length, g.name).toBeGreaterThan(0);
      expect(g.source.length, g.name).toBeGreaterThan(3);
      expect(guideVermerk(g), g.name).toMatch(/Von uns noch nicht in einer Praxis geprüft\.$/);
    }
    expect(PVS_GUIDES_HINWEIS).toMatch(/noch keine in einer Praxis geprüft/);
  });

  it("„Nach Unterlagen des Herstellers“ steht nur dort, wo die Quelle der Hersteller ist", () => {
    const mit = PVS_GUIDES.filter((g) => g.hersteller);
    expect(mit.map((g) => g.name)).toEqual(["DS-Win (Dampsoft)", "EVIDENT"]);
    expect(mit[0].source).toMatch(/^Dampsoft/);
    expect(mit[1].source).toMatch(/^EVIDENT/);
    for (const g of PVS_GUIDES.filter((x) => !x.hersteller)) expect(guideVermerk(g)).toBe(PVS_GUIDE_VERMERK_OHNE_HERSTELLER);
  });

  it("nennt keinen Marktanteil und behauptet nichts über Programme ohne Unterlagen des Herstellers", () => {
    expect(JSON.stringify(PVS_GUIDES)).not.toMatch(/Marktanteil|ca\. \d+ %|"share"/);
    for (const g of PVS_GUIDES.filter((x) => !x.hersteller)) {
      // Der Name darf in der Überschrift stehen; die Schritte sagen nicht, was das Programm kann („unterstützt“, „bindet … an“).
      for (const s of g.steps) expect(s, g.name).not.toMatch(/\b(unterstützt|bindet|bietet)\b[^.]*\b(VDDS|GDT)/);
    }
    // Sammelüberschriften nennen keine Programme als Beispiel.
    for (const g of PVS_GUIDES.filter((x) => /^(Andere Systeme|Arztpraxen|Berichte)/.test(x.name))) expect(g.name).not.toMatch(PROGRAMME);
  });

  it("die Seite zeigt den Vermerk an jeder Anleitung und darüber", () => {
    const seite = lies("app/(app)/settings/connector/page.tsx");
    expect(seite).toMatch(/data-testid="pvs-anleitung-vermerk">\{PVS_GUIDES_HINWEIS\}/);
    expect(seite).toMatch(/Quelle: \{g\.source\}\. \{guideVermerk\(g\)\}/);
    expect(seite).not.toMatch(/Marktanteil/);
  });

  it("die Texte der Einstellungen nennen kein Praxisprogramm beim Namen", () => {
    for (const datei of ["app/(app)/settings/page.tsx", "app/(app)/settings/connector/page.tsx"]) {
      const ohneKommentare = lies(datei).replace(/\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      expect(ohneKommentare, datei).not.toMatch(PROGRAMME);
    }
  });

  // Auch die Sammelanleitungen und die Anleitungen mit Herstellerquelle sagen nichts zu, was nicht in einer Praxis
  // geprüft ist: kein „jede Praxissoftware“, kein „automatisch“, keine Zeitangabe für den Abgleich.
  it("kein Schritt sagt zu, was nicht geprüft ist („jede“, „automatisch findet“, „innerhalb von 2 Minuten“, „bietet … an“)", () => {
    const alle = PVS_GUIDES.flatMap((g) => g.steps.map((s) => ({ name: g.name, s })));
    for (const { name, s } of alle) {
      expect(s, name).not.toMatch(/\bJede Praxissoftware\b|findet Sorrida[^.]*automatisch|innerhalb von \d+ (Minuten|Sekunden)|\bbietet\b[^.]*\b(VDDS|GDT)[^.]*\ban\./);
      expect(s, name).not.toMatch(/^Danach lässt sich Sorrida/);
    }
    expect(alle.map((x) => x.s).join(" ")).toContain("Bietet Ihre Praxissoftware VDDS-media an, erscheint Sorrida nach der Installation in ihrer VDDS-Programmliste.");
  });

  it("der Text zum Kalender nennt keine Praxisprogramme und sagt nicht „mit jedem Kalender“", () => {
    const text = lies("components/BuchungSettings.tsx");
    expect(text).not.toMatch(/viele Praxisprogramme|funktioniert mit jedem Kalender/);
    expect(text).toMatch(/Dieses Format geben zum Beispiel Google, Outlook und Apple aus\./);
  });
});
