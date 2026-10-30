import { describe, it, expect } from "vitest";
import {
  buildProposal,
  money,
  summarize,
  resolvePrices,
  neighbors,
  buildLetter,
  ageFromBirthDate,
  DEFAULT_PRICES,
  type ProposalInput,
  type PatientFactors,
} from "./proposals";

const GKV10: PatientFactors = { age: 46, insurance: "GKV", bonusYears: 10, haertefall: false, erstattungProzent: 0 };

function input(partial: Partial<ProposalInput>): ProposalInput {
  return { teeth: {}, globals: {}, patient: GKV10, ...partial };
}
const item = (inp: ProposalInput, key: string) => buildProposal(inp, DEFAULT_PRICES).find((i) => i.key === key)!;

describe("neighbors", () => {
  it("crosses the midline between quadrants", () => {
    expect(neighbors(11)).toEqual([21, 12]);
    expect(neighbors(31)).toEqual([41, 32]);
  });
  it("has no distal neighbour for wisdom teeth", () => {
    expect(neighbors(38)).toEqual([37]);
  });
});

describe("Füllungen", () => {
  it("offers no paid composite in the front, because composite is a GKV benefit there", () => {
    const i = item(input({ teeth: { "12": "karies_klein" } }), "t12");
    expect(i.options.map((o) => o.id)).toEqual(["fk"]);
    expect(i.excluded.join(" ")).toMatch(/Frontzahnbereich/);
  });
  it("never suggests an inlay for small defects", () => {
    const i = item(input({ teeth: { "25": "karies_klein" } }), "t25");
    expect(i.options.map((o) => o.id)).toEqual(["fk", "komp"]);
    expect(i.excluded.join(" ")).toMatch(/Inlay/);
  });
  it("recommends an inlay for large molar defects", () => {
    expect(item(input({ teeth: { "16": "karies_gross" } }), "t16").recommended).toBe("inlay");
  });
});

describe("Zahn fehlt", () => {
  it("recommends an implant when both neighbours are healthy", () => {
    expect(item(input({ teeth: { "36": "fehlt" } }), "t36").recommended).toBe("impl");
  });
  it("recommends a bridge when a neighbour needs a crown anyway", () => {
    expect(item(input({ teeth: { "36": "fehlt", "37": "zerstoert" } }), "t36").recommended).toBe("br");
  });
  it("does not recommend an implant for smokers", () => {
    const i = item(input({ teeth: { "36": "fehlt" }, globals: { raucher: true } }), "t36");
    expect(i.recommended).toBe("br");
    expect(i.notes.some((n) => n.kind === "warn")).toBe(true);
  });
  it("offers no bridge next to another gap", () => {
    const i = item(input({ teeth: { "36": "fehlt", "35": "fehlt" } }), "t36");
    expect(i.options.map((o) => o.id)).toEqual(["tp", "impl"]);
  });
  it("offers nothing for a missing wisdom tooth", () => {
    expect(item(input({ teeth: { "38": "fehlt" } }), "t38").options).toHaveLength(0);
  });
});

describe("Prophylaxe und Wunschleistungen", () => {
  it("holds back PZR while periodontitis is untreated", () => {
    const i = item(input({ globals: { zahnstein: true, psi: true } }), "gzahnstein");
    expect(i.options.map((o) => o.id)).toEqual(["zst"]);
  });
  it("only offers bleaching when the patient asked for it", () => {
    const items = buildProposal(input({ teeth: { "11": "karies_klein" } }), DEFAULT_PRICES);
    expect(items.some((i) => i.key === "gbleaching")).toBe(false);
  });
  it("does not offer sealing to adults without risk", () => {
    expect(item(input({ teeth: { "36": "fissur" } }), "t36").options).toHaveLength(0);
  });
  it("seals children's molars as a GKV benefit", () => {
    const kid = { ...GKV10, age: 12 };
    const i = item(input({ teeth: { "36": "fissur" }, patient: kid }), "t36");
    expect(i.options[0].type).toBe("kasse");
  });
});

describe("money", () => {
  const bridge = item(input({ teeth: { "36": "fehlt" } }), "t36");
  it("applies the 75 % Festzuschuss with 10 years of Bonusheft", () => {
    expect(money(bridge.options[0], GKV10).eigen).toBeCloseTo(437.5);
    expect(money(bridge.options[2], GKV10).eigen).toBeCloseTo(2087.5);
  });
  it("covers the whole Regelversorgung for Härtefälle", () => {
    expect(money(bridge.options[0], { ...GKV10, haertefall: true }).eigen).toBe(0);
  });
  it("lets the GKV pay the equivalent filling under a Mehrkostenvereinbarung", () => {
    const f = item(input({ teeth: { "25": "karies_klein" } }), "t25").options[1];
    expect(money(f, GKV10)).toMatchObject({ kasse: 55, eigen: 105 });
  });
  it("applies the PKV tariff to the full amount", () => {
    const m = money(bridge.options[2], { ...GKV10, insurance: "PKV", erstattungProzent: 80 });
    expect(m.netto).toBeCloseTo(680);
  });
});

describe("summarize and letter", () => {
  const inp = input({ teeth: { "16": "karies_gross", "36": "fehlt" }, globals: { zahnstein: true } });
  const items = buildProposal(inp, DEFAULT_PRICES);
  it("uses the first option as baseline and the recommendation as default choice", () => {
    const s = summarize(items, {}, GKV10);
    expect(s.baseTotal).toBe(85 + 1750 + 18);
    expect(s.planTotal).toBe(890 + 3400 + 110);
  });
  it("respects explicit choices", () => {
    const s = summarize(items, { t36: "br" }, GKV10);
    expect(s.planTotal).toBe(890 + 1750 + 110);
  });
  it("mentions the legal basis in the letter", () => {
    const text = buildLetter({ items, choices: {}, patient: GKV10, patientName: "Frau Weber", practiceName: "Praxis Test", date: new Date(2026, 9, 30) });
    expect(text).toMatch(/§ 630c Abs. 3 BGB/);
    expect(text).toMatch(/unsere Empfehlung/);
  });
});

describe("resolvePrices", () => {
  it("ignores invalid overrides", () => {
    const p = resolvePrices({ inlay: 950, pzr: -5, krone_vk: "x", unknown: 1 });
    expect(p.inlay).toBe(950);
    expect(p.pzr).toBe(DEFAULT_PRICES.pzr);
    expect(p.krone_vk).toBe(DEFAULT_PRICES.krone_vk);
  });
});

describe("ageFromBirthDate", () => {
  it("counts birthdays correctly", () => {
    expect(ageFromBirthDate(new Date(2010, 10, 1), new Date(2026, 9, 30))).toBe(15);
    expect(ageFromBirthDate(null)).toBeNull();
  });
});
