import { describe, expect, it } from "vitest";
import { buildProposal, DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, LOWER_TEETH, optionTypeLabel, UPPER_TEETH, type FindingCode, type ProposalInput } from "@/lib/proposals";
import { euro, hasTranslation, pickLang, tr } from "@/lib/patientI18n";

// Alle Texte, die das Regelwerk für die Patientenansicht erzeugen kann.
function patientTexts(): Set<string> {
  const out = new Set<string>();
  const teeth = [...UPPER_TEETH, ...LOWER_TEETH];
  const findings = Object.keys(FINDINGS) as FindingCode[];
  for (const insurance of ["GKV", "PKV"] as const)
    for (const age of [10, 16, 40, 75])
      for (const n of teeth)
        for (const f of findings)
          for (const nb of [undefined, ...findings]) {
            const t: Record<string, string> = { [String(n)]: f };
            if (nb) {
              t[String(n + 1)] = nb;
              t[String(n - 1)] = nb;
            }
            for (const globals of [{}, { raucher: true, bruxismus: true, psi: true, bleaching: true, zahnstein: true }]) {
              const input = { teeth: t, globals, patient: { age, insurance, bonusYears: 10, haertefall: false, erstattungProzent: 0 } } as unknown as ProposalInput;
              for (const it of buildProposal(input, DEFAULT_PRICES)) {
                out.add(it.title);
                out.add(it.where);
                for (const o of it.options) {
                  out.add(o.name);
                  o.benefits.forEach((b) => out.add(b));
                  out.add(optionTypeLabel(o.type, insurance));
                }
                it.notes.filter((x) => x.kind === "info").forEach((x) => out.add(x.text));
              }
            }
          }
  for (const g of Object.values(GLOBAL_FINDINGS)) out.add(g);
  return out;
}

describe("Patientenansicht Englisch", () => {
  it("übersetzt jeden Text, den das Regelwerk erzeugen kann", () => {
    const missing = [...patientTexts()].filter((t) => !hasTranslation(t));
    expect(missing).toEqual([]);
  });

  it("übersetzt Zahlen und Muster", () => {
    expect(tr("Zahn 36", "en")).toBe("Tooth 36");
    expect(tr("Die Nachbarzähne 35 und 37 sind gesund. Ein Implantat erspart das Beschleifen.", "en")).toContain("35 and 37");
    expect(tr("Zahn 36", "de")).toBe("Zahn 36");
    expect(euro(2088, "en")).toBe("€2,088");
    expect(euro(2088, "de")).toBe("2.088 €");
  });

  it("wählt die Sprache aus Parameter oder Browser", () => {
    expect(pickLang("en", null)).toBe("en");
    expect(pickLang(undefined, "de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(pickLang(undefined, "en-GB,en;q=0.9")).toBe("en");
    expect(pickLang(undefined, "tr-TR,tr;q=0.9,en;q=0.5")).toBe("en");
    expect(pickLang(undefined, "tr-TR")).toBe("de");
    expect(pickLang(undefined, null)).toBe("de");
  });
});
