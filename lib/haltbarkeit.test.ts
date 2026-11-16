// Grundsatz 1, zweiter Teil: Sorrida sagt Patienten nichts zur Haltbarkeit einer Behandlung
// („hält länger“, „begrenzt haltbar“, „bewährt und haltbar“, „Ergebnis hält 1–3 Jahre“).
// Geprüft wird alles, was die Patientenansicht je Möglichkeit zeigt und vorliest: Name, Stichpunkte und
// die Hinweise der Art „info“. Hinweise der Art „warn“ sieht nur die Praxis im Editor.
import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, buildProposal, type FindingCode, type GlobalCode, type PatientFactors, type ProposalInput } from "./proposals";
import { ALLE_SPECIALTIES, DENTAL_ID } from "./specialties";

const HALTBARKEIT = /haltbar|langlebig|lebensdauer|hält\s+(\d|lange|länger|am längsten|ein leben)|jahre haltbar/i;
const BEFUNDE = Object.keys(FINDINGS) as FindingCode[];
const ALLGEMEIN = Object.keys(GLOBAL_FINDINGS) as GlobalCode[];
const ZAEHNE = [11, 13, 14, 25, 16, 36, 47, 18];
const basis: PatientFactors = { age: 45, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 };
const PATIENTEN: PatientFactors[] = [basis, { ...basis, age: 9 }, { ...basis, age: 16 }, { ...basis, insurance: "PKV", erstattungProzent: 80 }];

/** Alle Texte, die ein Patient zu den Möglichkeiten sieht. */
function patiententexte(input: ProposalInput): string[] {
  return buildProposal(input, DEFAULT_PRICES).flatMap((i) => [
    i.title,
    ...i.options.flatMap((o) => [o.name, ...(o.benefits ?? [])]),
    ...i.notes.filter((n) => n.kind === "info").map((n) => n.text),
  ]);
}

describe("keine Aussage zur Haltbarkeit in den Texten für Patienten", () => {
  it("Zahnbefunde und allgemeine Befunde", () => {
    let texte = 0;
    for (const patient of PATIENTEN) {
      for (const befund of BEFUNDE) {
        for (const zahn of ZAEHNE) {
          for (const t of patiententexte({ teeth: { [String(zahn)]: befund }, globals: {}, patient })) {
            texte++;
            expect(t, `Zahn ${zahn} ${befund}`).not.toMatch(HALTBARKEIT);
          }
        }
      }
      for (const g of ALLGEMEIN) {
        // mit und ohne Karies im Mund (das ändert z. B. die Hinweise beim Aufhellen)
        for (const teeth of [{}, { "16": "karies_klein" as FindingCode }]) {
          for (const t of patiententexte({ teeth, globals: { [g]: true }, patient })) {
            texte++;
            expect(t, `allgemein ${g}`).not.toMatch(HALTBARKEIT);
          }
        }
      }
    }
    expect(texte).toBeGreaterThan(500);
  });

  it("alle anderen Fachrichtungen mit allen Anlässen", () => {
    let texte = 0;
    for (const s of ALLE_SPECIALTIES) {
      if (s.id === DENTAL_ID) continue;
      const anlaesse = (s.anlaesse ?? []).map((a) => a.id);
      for (const patient of PATIENTEN) {
        for (const t of patiententexte({ teeth: {}, globals: {}, patient, fach: s.id, anlaesse })) {
          texte++;
          expect(t, `${s.id}`).not.toMatch(HALTBARKEIT);
        }
      }
    }
    expect(texte).toBeGreaterThan(100);
  });
});
