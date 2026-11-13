import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, buildLetter, buildProposal, money, summarize, type ProposalInput } from "@/lib/proposals";
import { ALLE_SPECIALTIES } from "@/lib/specialties";

const patient = (age: number | null, insurance: "GKV" | "PKV" = "GKV") => ({ age, insurance, bonusYears: 0 as const, haertefall: false, erstattungProzent: insurance === "PKV" ? 100 : 0 });

describe("Vorschläge für Arztpraxen", () => {
  it("Hautkrebs-Screening ist ab 35 Kasse, davor Selbstzahler mit Hinweis", () => {
    const base: ProposalInput = { teeth: {}, globals: {}, patient: patient(40), fach: "haut", anlaesse: ["hautkrebs"] };
    const [item] = buildProposal(base, DEFAULT_PRICES);
    expect(item.options[0]).toMatchObject({ id: "hks", type: "kasse" });
    expect(item.recommended).toBe("hks");
    const [young] = buildProposal({ ...base, patient: patient(28) }, DEFAULT_PRICES);
    expect(young.options[0].type).toBe("igel");
    expect(young.options[0].hinweis).toContain("ab 35");
    expect(money(young.options[0], patient(28)).netto).toBe(40);
  });

  it("empfiehlt nie eine IGeL von sich aus", () => {
    for (const s of ALLE_SPECIALTIES) {
      const items = buildProposal({ teeth: {}, globals: {}, patient: patient(50), fach: s.id, anlaesse: s.anlaesse.map((a) => a.id) }, DEFAULT_PRICES);
      expect(items).toHaveLength(s.anlaesse.length);
      for (const it of items) {
        const rec = it.options.find((o) => o.id === it.recommended);
        if (rec) expect(rec.type).toBe("kasse");
        // Kassenleistung steht vor den Selbstzahlerleistungen
        const firstIgel = it.options.findIndex((o) => o.type === "igel");
        const lastKasse = it.options.map((o) => o.type).lastIndexOf("kasse");
        if (firstIgel >= 0 && lastKasse >= 0) expect(lastKasse).toBeLessThan(firstIgel);
      }
    }
  });

  it("nutzt Praxispreise und eigene Leistungen", () => {
    const input: ProposalInput = {
      teeth: {},
      globals: {},
      patient: patient(50),
      fach: "augen",
      anlaesse: ["glaukom", "eigen_tropfen"],
      med: { prices: { glaukom_igel: 35 }, custom: [{ id: "tropfen", anlass: "Trockenes Auge", name: "Lidrandpflege-Behandlung", price: 60 }] },
    };
    const items = buildProposal(input, DEFAULT_PRICES);
    expect(items[0].options.find((o) => o.id === "glaukom_igel")?.total).toBe(35);
    expect(items[1]).toMatchObject({ title: "Trockenes Auge", where: "Leistung der Praxis" });
    expect(items[1].options[0]).toMatchObject({ id: "eigen_tropfen", type: "igel", total: 60 });
  });

  it("Mehrumsatz zählt IGeL ohne Kassenalternative voll", () => {
    const input: ProposalInput = { teeth: {}, globals: {}, patient: patient(50), fach: "hausarzt", anlaesse: ["sport"] };
    const items = buildProposal(input, DEFAULT_PRICES);
    const s = summarize(items, { a_sport: "sportcheck" }, input.patient);
    expect(s.baseTotal).toBe(0);
    expect(s.planTotal).toBe(120);
    // IGeL zusätzlich zur Kassenleistung: Mehrumsatz = Selbstzahleranteil, nie negativ
    const haut = buildProposal({ teeth: {}, globals: {}, patient: patient(50), fach: "haut", anlaesse: ["hautkrebs"] }, DEFAULT_PRICES);
    expect(summarize(haut, { a_hautkrebs: "auflicht" }, patient(50)).planTotal).toBe(35);
    expect(summarize(haut, {}, patient(50)).planTotal).toBe(0);
  });

  it("Schreiben nennt Nutzen, Kassenhinweis und IGeL-Regeln statt HKP", () => {
    const input: ProposalInput = { teeth: {}, globals: {}, patient: patient(50), fach: "gyn", anlaesse: ["krebsvorsorge"] };
    const items = buildProposal(input, DEFAULT_PRICES);
    const letter = buildLetter({ items, choices: {}, patient: input.patient, patientName: "Frau Test", practiceName: "Praxis", date: new Date("2026-11-02"), fach: "gyn" });
    expect(letter).toContain("Zum Nutzen: Zur Früherkennung bei beschwerdefreien Frauen ist kein Nutzen belegt");
    expect(letter).toContain("Selbstzahlerleistungen (IGeL) sind freiwillig");
    expect(letter).not.toContain("Heil- und Kostenplan");
  });

  it("Zahnmedizin bleibt unverändert", () => {
    const items = buildProposal({ teeth: { "36": "fehlt" }, globals: {}, patient: { ...patient(40), bonusYears: 10 } }, DEFAULT_PRICES);
    expect(items[0].where).toBe("Zahn 36");
  });
});

import { buildNextSteps } from "@/lib/nextSteps";
describe("To-dos für Arztpraxen", () => {
  it("verlangt die IGeL-Vereinbarung, keinen Heil- und Kostenplan", () => {
    const input: ProposalInput = { teeth: {}, globals: {}, patient: patient(50), fach: "uro", anlaesse: ["prostata"] };
    const items = buildProposal(input, DEFAULT_PRICES);
    const steps = buildNextSteps({ items, choices: { a_prostata: "psa" }, patient: input.patient, reportFinal: true, hasProposal: true });
    expect(steps.map((s) => s.id)).toContain("igel");
    expect(steps.map((s) => s.id)).not.toContain("hkp");
  });
});

import { heilmittelZuzahlung, typeLabelOf } from "@/lib/proposals";
describe("Gesundheitsberufe (Heilmittel)", () => {
  const physio = (age: number): ProposalInput => ({ teeth: {}, globals: {}, patient: patient(age), fach: "physio", anlaesse: ["ruecken"] });
  it("Erwachsene zahlen 10 % plus 10 € zu, Kinder nichts", () => {
    const [it] = buildProposal(physio(40), DEFAULT_PRICES);
    const kg = it.options[0];
    expect(kg).toMatchObject({ id: "kg_rezept", type: "kasse", zuzahlung: true });
    expect(heilmittelZuzahlung(180)).toBe(28);
    expect(money(kg, patient(40)).netto).toBe(28);
    expect(money(kg, patient(12)).netto).toBe(0);
  });
  it("heißt in Therapiepraxen Selbstzahlerleistung, nicht IGeL", () => {
    const [it] = buildProposal(physio(40), DEFAULT_PRICES);
    expect(typeLabelOf(it.options[0], "GKV")).toBe("Kassenleistung mit Zuzahlung");
    expect(typeLabelOf(it.options[1], "GKV")).toBe("Selbstzahlerleistung");
  });
  it("Schreiben und To-dos ohne IGeL-Regeln, mit Zuzahlungshinweis", () => {
    const input = physio(40);
    const items = buildProposal(input, DEFAULT_PRICES);
    const letter = buildLetter({ items, choices: {}, patient: input.patient, patientName: "Herr Test", practiceName: "Physio", date: new Date("2026-11-02"), fach: "physio" });
    expect(letter).toContain("10 % der Kosten plus 10 € je Verordnung");
    expect(letter).not.toContain("IGeL");
    const steps = buildNextSteps({ items, choices: { a_ruecken: "kg_selbst" }, patient: input.patient, reportFinal: true, hasProposal: true, fach: "physio" });
    expect(steps.find((s) => s.id === "igel")?.text).toContain("Privatvereinbarung");
  });
  it("alle Fächer liefern Kasse vor Selbstzahler und keine IGeL-Empfehlung", () => {
    expect(ALLE_SPECIALTIES.length).toBeGreaterThanOrEqual(21);
  });
});

import { hilfsmittelZuzahlung } from "@/lib/proposals";
describe("Versorgung: Hilfsmittel, Apotheke, Klinik", () => {
  it("Hilfs- und Arzneimittel: 10 %, mindestens 5 €, höchstens 10 €", () => {
    expect(hilfsmittelZuzahlung(40)).toBe(5);
    expect(hilfsmittelZuzahlung(80)).toBe(8);
    expect(hilfsmittelZuzahlung(750)).toBe(10);
    expect(hilfsmittelZuzahlung(3)).toBe(3);
    const [it] = buildProposal({ teeth: {}, globals: {}, patient: patient(70), fach: "apotheke", anlaesse: ["rezept"] }, DEFAULT_PRICES);
    expect(money(it.options[0], patient(70)).netto).toBe(5);
  });
  it("höherwertiges Hörgerät: Kasse zahlt den Festbetrag, Eigenanteil ist die Differenz plus gesetzliche Zuzahlung", () => {
    const [it] = buildProposal({ teeth: {}, globals: {}, patient: patient(75), fach: "hoerakustik", anlaesse: ["hoergeraet"] }, DEFAULT_PRICES);
    const plus = it.options.find((o) => o.id === "hg_plus")!;
    expect(plus).toMatchObject({ type: "mehrkosten", base: 750 });
    expect(money(plus, patient(75)).netto).toBe(910); // 900 € Aufzahlung + 10 € Zuzahlung
    expect(money(it.options[0], patient(75)).netto).toBe(10);
    const sum = summarize([it], { a_hoergeraet: "hg_plus" }, patient(75));
    expect(sum.planTotal - sum.baseTotal).toBe(900);
    expect(it.recommended).toBe("hg_kasse");
  });
  it("alle Bereiche bauen ohne Fehler und mit Kassenleistung zuerst", () => {
    expect(ALLE_SPECIALTIES.length).toBeGreaterThanOrEqual(29);
    for (const s of ALLE_SPECIALTIES) {
      const items = buildProposal({ teeth: {}, globals: {}, patient: patient(40), fach: s.id, anlaesse: s.anlaesse.map((a) => a.id) }, DEFAULT_PRICES);
      expect(items.length).toBe(s.anlaesse.length);
    }
  });
});
