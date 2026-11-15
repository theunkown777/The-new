import { describe, expect, it } from "vitest";
import { buildProposal, DEFAULT_PRICES, money, type ProposalInput } from "@/lib/proposals";
import { PATIENT_LANGS, UI, euro } from "@/lib/patientI18n";
import { SPRECH_SPRACHE, vorleseTeile, vorleseText } from "@/lib/vorlesen";

const patient = { age: 45, insurance: "GKV" as const, bonusYears: 0 as const, haertefall: false, erstattungProzent: 0 };
const items = buildProposal({ teeth: { "36": "zerstoert" }, globals: {}, patient } as unknown as ProposalInput, DEFAULT_PRICES).filter((i) => i.options.length > 0);
const erste = items[0];
const basis = (lang: (typeof PATIENT_LANGS)[number]) => ({ ueberschrift: UI[lang].pageTitle, items, patient, choices: { [erste.key]: erste.options[0].id }, summe: money(erste.options[0], patient).netto, lang, t: UI[lang] });

describe("Vorlesen", () => {
  it("liest Überschrift, Positionen, Möglichkeiten mit Eigenanteil und die Summe", () => {
    const text = vorleseText(basis("de"));
    expect(text.startsWith("Ihr Behandlungsvorschlag.")).toBe(true);
    for (const i of items) {
      expect(text).toContain(i.title);
      for (const o of i.options) {
        expect(text).toContain(o.name);
        expect(text).toContain(`Ihr Anteil: ${euro(money(o, patient).netto, "de")}`);
      }
    }
    expect(text).toContain("Ihre Wahl.");
    expect(text.endsWith(`Ihr Eigenanteil für diese Auswahl: ${euro(money(erste.options[0], patient).netto, "de")}.`)).toBe(true);
  });

  it("sagt die eigene Wahl nur bei der gewählten Möglichkeit", () => {
    const teile = vorleseTeile(basis("de")).map((x) => x.text);
    expect(teile.filter((x) => x === "Ihre Wahl.").length).toBe(1);
    expect(vorleseTeile({ ...basis("de"), choices: {} }).some((x) => x.text === "Ihre Wahl.")).toBe(false);
  });

  it("übersetzt in jede Sprache, ohne unsichtbare Richtungszeichen, und kennt je Sprache eine Stimme", () => {
    for (const lang of PATIENT_LANGS) {
      const teile = vorleseTeile(basis(lang));
      expect(teile.length).toBeGreaterThan(4);
      for (const t of teile) {
        expect(t.text).not.toMatch(/[⁦-⁩‎‏]/);
        expect(t.text).toMatch(/[.!?:]$/);
        expect(t.lang).toBe(lang);
      }
      expect(SPRECH_SPRACHE[lang]).toMatch(new RegExp(`^${lang}-`));
    }
    expect(vorleseText(basis("en"))).toContain("Your share: €");
  });

  it("lässt in der Lese-Ansicht Wahl und Summe weg", () => {
    const text = vorleseText({ ...basis("de"), choices: {}, summe: null });
    expect(text).not.toContain("Ihre Wahl");
    expect(text).not.toContain("Ihr Eigenanteil für diese Auswahl");
    expect(text).toContain("Ihr Anteil:");
  });

  it("liest mit deutscher Stimme, was es nur auf Deutsch gibt", () => {
    const fremd = [{ ...erste, title: "Diesen Titel kennt keine Sprache" }];
    const teile = vorleseTeile({ ...basis("en"), items: fremd });
    expect(teile.find((x) => x.text.startsWith("Diesen Titel"))?.lang).toBe("de");
  });
});
