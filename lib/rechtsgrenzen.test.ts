// Angebote, die das Recht so nicht zulässt, stehen nicht im Katalog (Stand 17.11.2026, gelesen auf
// gesetze-im-internet.de):
// - § 10 NiSV: Bei Ultraschall zu nichtmedizinischen Zwecken (§ 2 Abs. 2 Nr. 1 NiSV) darf ein Fötus nicht exponiert
//   werden („Babyfernsehen“). Kein Ultraschall „auf Wunsch“ in der Schwangerschaft.
// - § 84 Abs. 1 StrlSchG: Früherkennung mit Röntgenstrahlung (§ 5 Abs. 16 StrlSchG: Menschen ohne Krankheitszeichen und
//   ohne konkreten Verdacht) nur, wenn eine Rechtsverordnung sie vorsieht; es gibt sie nur für Brustkrebs und für
//   Lungenkrebs bei rauchenden Personen. Keine Selbstzahler-DXA „zur Vorsorge“, kein CT „auf Wunsch“.
// - §§ 5, 6, 7, 9 NiSV: Wo die NiSV Ärztinnen und Ärzten vorbehält oder Fachkunde verlangt, sagt der Leistungskatalog das.
import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES } from "./specialties";
import { LEISTUNGEN, leistung } from "./leistungskatalog";

const optionen = () => ALLE_SPECIALTIES.flatMap((s) => s.anlaesse.flatMap((a) => a.options.map((o) => ({ wo: `${s.id}/${a.id}/${o.id}`, a, o }))));

describe("Rechtsgrenzen im Katalog", () => {
  it("kein Ultraschall ohne medizinischen Zweck in der Schwangerschaft (§ 10 NiSV)", () => {
    for (const { wo, o } of optionen()) {
      const text = [o.name, ...o.benefits, o.nutzen ?? ""].join(" ");
      expect(text, wo).not.toMatch(/\b[34]D\b|Baby-?(TV|Kino|fernsehen)|Bilder Ihres Kindes/i);
    }
    expect(optionen().some(({ o }) => o.id === "us_extra")).toBe(false);
    for (const l of LEISTUNGEN) {
      const text = [l.name, l.fachbegriff, ...l.synonyme, l.beschreibung].join(" ");
      expect(text, l.id).not.toMatch(/Baby-?(TV|Kino|fernsehen)/i);
      if (/Ultraschall|Sonograph/i.test(text) && /schwanger|Geburtshilfe/i.test(`${l.bereich} ${text}`)) expect(text, l.id).not.toMatch(/auf Wunsch/i);
    }
    expect(leistung("gynaekologie-geburtshilfe-3d-4d-ultraschall")).toBeNull();
  });

  it("keine Selbstzahler-Untersuchung mit Röntgenstrahlung ohne Anlass (§ 84 Abs. 1 StrlSchG)", () => {
    for (const { wo, a, o } of optionen()) {
      if (o.type !== "igel") continue;
      expect([o.name, ...o.benefits].join(" "), wo).not.toMatch(/\bDXA\b|Knochendichte|Röntgen|\bCT\b|Computertomogra/i);
      expect(a.label, wo).not.toMatch(/\bCT\b/);
    }
    // Im Leistungskatalog steht bei Selbstzahler- und Indikationsleistungen mit Röntgen ohne Anlass die Norm dabei.
    for (const id of ["innere-medizin-osteoporose-diagnostik", "radiologie-nuklearmedizin-herz-ct-kalk-score", "vorsorge-check-ups-manager-executive-check-up"]) {
      expect(leistung(id)?.hinweis, id).toMatch(/§ 84 Abs\. 1 StrlSchG/);
    }
  });

  it("NiSV: Arztvorbehalt und Fachkunde stehen beim Angebot", () => {
    const erwartet: Record<string, RegExp> = {
      "aesthetische-medizin-minimal-invasiv-tattooentfernung": /§ 5 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-ipl-photoverjuengung": /§ 5 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-radiofrequenz-microneedling": /§ 6 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-ultraschall-lifting": /§ 9 Abs\. 2 NiSV/,
    };
    for (const [id, norm] of Object.entries(erwartet)) {
      const l = leistung(id);
      expect(l, id).not.toBeNull();
      expect(l!.hinweis, id).toMatch(norm);
      expect(l!.behandler, id).toMatch(/Arzt|Dermatolog/);
    }
    expect(leistung("aesthetische-medizin-minimal-invasiv-laser-haarentfernung")?.behandler).toMatch(/Fachkunde nach § 5 Abs\. 1 NiSV/);
    expect(leistung("aesthetische-medizin-minimal-invasiv-muskelaufbau-fettreduktion-per-geraet")?.behandler).toMatch(/Fachkunde nach § 7 NiSV/);
  });
});
