import { describe, it, expect } from "vitest";
import {
  buildProposal,
  money,
  summarize,
  resolvePrices,
  neighbors,
  buildLetter,
  ageFromBirthDate,
  vergleicheJahre,
  defaultZuschussJahr,
  tageBisStichtag,
  DEFAULT_PRICES,
  planKiefer,
  festzuschussEuro,
  berlinTag,
  showsJahresvergleich,
  hilfsmittelZuzahlung,
  hilfsmittelZuzahlungText,
  UPPER_TEETH,
  LOWER_TEETH,
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
  it("plans two adjacent missing teeth as one bridge (finding 2.2), not as two entries", () => {
    const items = buildProposal(input({ teeth: { "36": "fehlt", "35": "fehlt" } }), DEFAULT_PRICES);
    expect(items.map((i) => i.key)).toEqual(["l35-36"]);
    expect(items[0].options.map((o) => o.id)).toEqual(["br", "brvk", "impl"]);
    expect(items[0].options[0].befunde).toEqual(["2.2", "2.7"]);
    expect(items[0].recommended).toBe("br");
  });
  it("offers a partial denture once per jaw when the last tooth of the row is missing", () => {
    const items = buildProposal(input({ teeth: { "36": "fehlt", "37": "fehlt" } }), DEFAULT_PRICES);
    expect(items.map((i) => i.key)).toEqual(["kUK"]);
    expect(items[0].options.map((o) => o.id)).toEqual(["tp", "impl"]);
    expect(items[0].excluded.join(" ")).toMatch(/Brücke/);
  });
  it("lets the crown of an abutment tooth drop out when the gap gets a bridge", () => {
    const items = buildProposal(input({ teeth: { "36": "fehlt", "37": "zerstoert" } }), DEFAULT_PRICES);
    const krone = items.find((i) => i.key === "t37")!;
    expect(krone.options.map((o) => o.id)).toEqual(["kr", "krvk", "anker"]);
    expect(krone.recommended).toBe("anker");
    expect(money(krone.options[2], GKV10)).toMatchObject({ total: 0, eigen: 0 });
    // Empfehlung zusammen: Brücke mit Festzuschuss 2.1, keine zweite Krone
    expect(summarize(items, {}, GKV10).netto).toBeCloseTo(921.6 - 691.2);
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
  it("applies the fixed Festzuschuss of the finding (2.1, 75 %) with 10 years of Bonusheft", () => {
    expect(money(bridge.options[0], GKV10).kasse).toBeCloseTo(691.2);
    expect(money(bridge.options[2], GKV10).eigen).toBeCloseTo(2708.8);
  });
  it("estimates the Regelversorgung for GKV patients with the average costs of the finding, not the practice price", () => {
    expect(bridge.options[0].total).toBeCloseTo(921.6);
    expect(money(bridge.options[0], GKV10).eigen).toBeCloseTo(230.4);
    expect(money(bridge.options[0], { ...GKV10, bonusYears: 0 }).eigen).toBeCloseTo(368.64);
    const pkv = item(input({ teeth: { "36": "fehlt" }, patient: { ...GKV10, insurance: "PKV", erstattungProzent: 80 } }), "t36");
    expect(pkv.options[0].total).toBe(1750);
  });
  it("covers the whole Regelversorgung for Härtefälle and pays the double Festzuschuss otherwise", () => {
    const h = { ...GKV10, haertefall: true };
    expect(money(bridge.options[0], h).eigen).toBe(0);
    expect(money(bridge.options[1], h).kasse).toBeCloseTo(921.6);
    expect(money(bridge.options[1], h).eigen).toBeCloseTo(2450 - 921.6);
  });
  it("treats a ceramic inlay as Mehrkosten with the GKV share of the filling", () => {
    const inlay = item(input({ teeth: { "16": "karies_gross" } }), "t16").options.find((o) => o.id === "inlay")!;
    expect(money(inlay, GKV10)).toMatchObject({ kasse: 85, eigen: 805 });
  });
  it("never lets the patient share go negative or NaN", () => {
    const billig = buildProposal(input({ teeth: { "25": "karies_klein" } }), { ...DEFAULT_PRICES, komp_klein: 40 })[0].options[1];
    expect(money(billig, GKV10).eigen).toBe(0);
    expect(money(bridge.options[1], { ...GKV10, erstattungProzent: NaN }).netto).toBeCloseTo(2450 - 691.2);
  });
  it("does not reimburse cosmetic bleaching", () => {
    const bl = item(input({ globals: { bleaching: true }, patient: { ...GKV10, erstattungProzent: 50 } }), "gbleaching").options[0];
    expect(money(bl, { ...GKV10, erstattungProzent: 50 }).netto).toBe(390);
  });
  it("uses finding 1.1 for a crown and adds 1.3 in the visible area", () => {
    const molar = item(input({ teeth: { "36": "zerstoert" } }), "t36");
    expect(molar.options[0].befunde).toEqual(["1.1"]);
    expect(money(molar.options[0], GKV10).kasse).toBeCloseTo(298.79);
    expect(money(molar.options[1], GKV10).kasse).toBeCloseTo(298.79);
    const front = item(input({ teeth: { "21": "zerstoert" } }), "t21");
    expect(front.options[0].befunde).toEqual(["1.1", "1.3"]);
    expect(money(front.options[0], GKV10).kasse).toBeCloseTo(298.79 + 100.83);
    expect(money(front.options[0], { ...GKV10, bonusYears: 0 }).kasse).toBeCloseTo(239.03 + 80.66);
  });
  it("adds a veneer (2.7) per visible tooth of a bridge", () => {
    const b = item(input({ teeth: { "24": "fehlt" } }), "t24");
    expect(b.options[0].befunde).toEqual(["2.1", "2.7", "2.7", "2.7"]);
    expect(money(b.options[0], GKV10).kasse).toBeCloseTo(691.2 + 3 * 99.33);
  });
  it("never pays more than the costs", () => {
    const cheap = buildProposal(input({ teeth: { "36": "zerstoert" } }), { ...DEFAULT_PRICES, krone_vk: 200 })[0];
    expect(money(cheap.options[1], GKV10)).toMatchObject({ kasse: 200, eigen: 0 });
  });
  it("describes the crown by the visible area, not by tooth type", () => {
    expect(item(input({ teeth: { "35": "zerstoert" } }), "t35").options[0].benefits[0]).toMatch(/unverblendet/);
    expect(item(input({ teeth: { "34": "zerstoert" } }), "t34").options[0].benefits[0]).toMatch(/Keramikverblendung/);
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
    expect(s.baseTotal).toBeCloseTo(85 + 921.6 + 18);
    expect(s.planTotal).toBe(890 + 3400 + 110);
  });
  it("respects explicit choices", () => {
    const s = summarize(items, { t36: "br" }, GKV10);
    expect(s.planTotal).toBeCloseTo(890 + 921.6 + 110);
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

describe("Festzuschuss 2026 vs. 2027", () => {
  const bridge = item(input({ teeth: { "36": "fehlt" } }), "t36");
  const p2026 = { ...GKV10, zuschussJahr: 2026 as const };

  it("lowers every bonus level by ten points for approvals from 2027", () => {
    const p = { ...GKV10, bonusYears: 0 as const };
    expect(money(bridge.options[0], p, 2026).kasse).toBeCloseTo(552.96);
    expect(money(bridge.options[0], p, 2027).kasse).toBeCloseTo(460.8);
    expect(money(bridge.options[0], GKV10, 2027).kasse).toBeCloseTo(599.04);
  });
  it("keeps Härtefälle at the double Festzuschuss in both years", () => {
    const p = { ...GKV10, haertefall: true };
    expect(money(bridge.options[0], p, 2027).kasse).toBeCloseTo(921.6);
    expect(money(bridge.options[0], p, 2026).kasse).toBeCloseTo(921.6);
  });
  it("does not change GKV benefits without Festzuschuss", () => {
    const f = item(input({ teeth: { "25": "karies_klein" } }), "t25").options[1];
    expect(money(f, GKV10, 2026).eigen).toBe(money(f, GKV10, 2027).eigen);
  });
  it("compares the chosen plan across both years", () => {
    const items = buildProposal(input({ teeth: { "36": "fehlt", "25": "karies_klein" } }), DEFAULT_PRICES);
    const v = vergleicheJahre(items, {}, p2026);
    expect(v.betroffen).toBe(true);
    expect(v.netto2027 - v.netto2026).toBeCloseTo(921.6 * 0.1);
  });
  it("switches the default year after the deadline", () => {
    expect(defaultZuschussJahr(new Date(2026, 11, 31, 18))).toBe(2026);
    expect(defaultZuschussJahr(new Date(2027, 0, 1, 8))).toBe(2027);
    expect(tageBisStichtag(new Date(2026, 9, 30))).toBe(62);
  });
  it("adds the 2027 amounts and the deadline to the patient letter before the deadline", () => {
    const items = buildProposal(input({ teeth: { "36": "fehlt" } }), DEFAULT_PRICES);
    const text = buildLetter({ items, choices: {}, patient: p2026, patientName: "Frau Weber", practiceName: "Praxis Test", date: new Date(2026, 9, 30) });
    expect(text).toMatch(/bei Bewilligung ab 1\.1\.2027/);
    expect(text).toMatch(/31\.12\.2026/);
    const after = buildLetter({ items, choices: {}, patient: { ...GKV10, zuschussJahr: 2027 }, patientName: "Frau Weber", practiceName: "Praxis Test", date: new Date(2027, 1, 1) });
    expect(after).not.toMatch(/31\.12\.2026/);
  });
});

describe("Zuzahlung Heilmittel ab 2027", () => {
  it("rechnet bis Ende 2026 mit 10 €, danach mit 15 € je Verordnung", async () => {
    const { heilmittelZuzahlung, heilmittelZuzahlungText } = await import("@/lib/proposals");
    expect(heilmittelZuzahlung(200, new Date(2026, 11, 31))).toBeCloseTo(30);
    expect(heilmittelZuzahlung(200, new Date(2027, 0, 1))).toBeCloseTo(35);
    expect(heilmittelZuzahlungText(new Date(2027, 0, 2))).toMatch(/15 €/);
  });
});

describe("Lücken je Kiefer (Festzuschuss-Befunde)", () => {
  const fz = (teeth: Record<string, "fehlt" | "zerstoert">, satz: PatientFactors) =>
    [...planKiefer(UPPER_TEETH, teeth), ...planKiefer(LOWER_TEETH, teeth)].map((g) => [g.befunde.join("+"), festzuschussEuro(g, satz)]);
  const F = (...z: number[]) => Object.fromEntries(z.map((n) => [String(n), "fehlt" as const]));
  const H = { ...GKV10, haertefall: true };
  const B0 = { ...GKV10, bonusYears: 0 as const };

  it("Einzelzahnlücke im Seitenzahnbereich: 2.1", () => {
    expect(fz(F(36), H)).toEqual([["2.1", 921.6]]);
    expect(fz(F(36), GKV10)).toEqual([["2.1", 691.2]]);
  });
  it("zwei fehlende Zähne: 2.2 und eine Verblendung für den sichtbaren Pfeiler 34", () => {
    expect(fz(F(35, 36), H)).toEqual([["2.2+2.7", 1184.28]]);
    expect(fz(F(35, 36), B0)).toEqual([["2.2+2.7", 710.56]]);
  });
  it("drei fehlende Zähne: 2.3 mit Verblendungen", () => {
    expect(fz(F(14, 15, 16), H)).toEqual([["2.3+2.7+2.7+2.7", 1572.21]]);
  });
  it("vier Schneidezähne: 2.4 mit sechs Verblendungen", () => {
    expect(fz(F(12, 11, 21, 22), H)).toEqual([["2.4+2.7+2.7+2.7+2.7+2.7+2.7", 2082.54]]);
  });
  it("Lücke über die Mittellinie: 2.2", () => {
    expect(fz(F(11, 21), H)).toEqual([["2.2+2.7+2.7+2.7+2.7", 1581.6]]);
  });
  it("zwei Einzellücken mit gemeinsamem Pfeiler: 2.1 und 2.5", () => {
    expect(fz(F(24, 26), H)).toEqual([["2.1+2.5+2.7+2.7+2.7", 1830.27]]);
    expect(fz(F(24, 26), GKV10)).toEqual([["2.1+2.5+2.7+2.7+2.7", 1372.7]]);
  });
  it("Einzellücke neben größerer Lücke: die größere bekommt 2.2, die einzelne 2.5", () => {
    expect(fz(F(14, 16, 17), H)[0][0]).toBe("3.1"); // 17 fehlt: Ende der Zahnreihe
    expect(fz(F(13, 15, 16), H)[0][0]).toMatch(/^2\.2\+2\.5/); // Reihenfolge entlang der Zahnreihe: Lücke 16/15 zuerst
  });
  it("je Kiefer getrennt", () => {
    expect(fz(F(36, 46), H)).toEqual([["2.1", 921.6], ["2.1", 921.6]]);
    expect(fz(F(16, 36), H)).toEqual([["2.1+2.7", 1054.04], ["2.1", 921.6]]); // Pfeiler 15 liegt im sichtbaren Bereich
  });
  it("Freiend oder mehr als vier fehlende Zähne: einmal 3.1 je Kiefer", () => {
    expect(fz(F(36, 37), H)).toEqual([["3.1", 952.15]]);
    expect(fz(F(35, 36, 45, 46, 47), H)).toEqual([["3.1", 952.15]]);
    expect(fz(F(14, 15, 16, 17), GKV10)).toEqual([["3.1", 714.11]]);
  });
  it("Restbestand und zahnloser Kiefer: Klasse 4", () => {
    const ok = UPPER_TEETH.filter((n) => n % 10 !== 8 && n !== 13 && n !== 23);
    expect(fz(F(...ok), H)).toEqual([["4.1", 994.8]]);
    expect(fz(F(...LOWER_TEETH.filter((n) => n % 10 !== 8)), GKV10)).toEqual([["4.4", 772.16]]);
  });
  it("Weisheitszähne zählen nicht", () => {
    expect(fz(F(18, 28, 38, 48), H)).toEqual([]);
  });
  it("erzeugt je Lücke genau einen Eintrag und behält den Schlüssel der Einzelzahnlücke", () => {
    const keys = (t: Record<string, "fehlt">) => buildProposal(input({ teeth: t }), DEFAULT_PRICES).map((i) => i.key);
    expect(keys(F(36))).toEqual(["t36"]);
    expect(keys(F(24, 26))).toEqual(["l24-26"]);
    expect(keys(F(36, 46))).toEqual(["t46", "t36"]);
    expect(keys(F(35, 36, 45, 46, 47))).toEqual(["kUK"]);
  });
  it("fehlt nur der letzte Backenzahn, steht der Hinweis auf die verkürzte Zahnreihe da", () => {
    const i = item(input({ teeth: F(37) }), "t37");
    expect(i.options.map((o) => o.id)).toEqual(["tp", "impl"]);
    expect(i.notes.map((n) => n.text).join(" ")).toMatch(/verkürzte Zahnreihe/);
  });
});

describe("Stichtag in deutscher Zeit", () => {
  it("wechselt um Mitternacht deutscher Zeit, auch wenn der Server in UTC läuft", () => {
    const kurzVor = new Date("2026-12-31T22:30:00Z"); // 23:30 in Deutschland
    const kurzNach = new Date("2026-12-31T23:30:00Z"); // 00:30 am 1.1. in Deutschland
    expect(berlinTag(kurzVor)).toBe("2026-12-31");
    expect(defaultZuschussJahr(kurzVor)).toBe(2026);
    expect(defaultZuschussJahr(kurzNach)).toBe(2027);
    expect(showsJahresvergleich(kurzNach)).toBe(false);
    expect(tageBisStichtag(kurzVor)).toBe(0);
  });
});

describe("Brief: Wahl und Empfehlung", () => {
  const items = buildProposal(input({ teeth: { "36": "fehlt", "25": "karies_klein" } }), DEFAULT_PRICES);
  const brief = (choices: Record<string, string>, patient = GKV10) =>
    buildLetter({ items, choices, patient, patientName: "Frau Weber", practiceName: "Praxis Test", date: new Date(2026, 9, 30) });
  it("nennt nur eine wirklich getroffene Auswahl „besprochene Wahl“", () => {
    expect(brief({})).toMatch(/Noch nicht entschieden\. Unsere Empfehlung: Implantat mit Krone/);
    expect(brief({})).toMatch(/Wenn Sie überall die zuerst genannte Leistung wählen/);
    expect(brief({ t36: "br", t25: "fk" })).toMatch(/Besprochene Wahl: Brücke, Regelversorgung/);
    expect(brief({ t36: "br", t25: "fk" })).not.toMatch(/Noch nicht entschieden/);
  });
  it("behauptet die Kassenleistung nur, wo es sie gibt", () => {
    expect(brief({})).toMatch(/Die Kassenleistung ist bei jedem Punkt möglich/);
    const mitBleaching = buildProposal(input({ globals: { bleaching: true } }), DEFAULT_PRICES);
    const text = buildLetter({ items: mitBleaching, choices: {}, patient: GKV10, patientName: "Frau Weber", practiceName: "Praxis Test", date: new Date(2026, 9, 30) });
    expect(text).not.toMatch(/bei jedem Punkt möglich/);
  });
  it("kennzeichnet die Beträge für 2027 als vorläufig", () => {
    expect(brief({ t36: "br" }, { ...GKV10, zuschussJahr: 2026 })).toMatch(/per Gesetz[\s\S]*vorläufig/);
  });
});

describe("Krone mit Stiftaufbau und Teilkrone", () => {
  it("Stiftaufbau: Befund 1.4 kommt zum Kronenbefund dazu", () => {
    const it36 = item(input({ teeth: { "36": "stift" } }), "t36");
    const kr = it36.options.find((o) => o.id === "kr")!;
    expect(kr.befunde).toEqual(["1.1", "1.4"]);
    expect(kr.total).toBeCloseTo(398.39 + 83.52, 2);
    const m = money(kr, GKV10);
    expect(m.kasse).toBeCloseTo((398.39 + 83.52) * 0.75, 1);
    expect(it36.notes.some((n) => /Stiftaufbau gibt der Krone Halt/.test(n.text))).toBe(true);
    // Im sichtbaren Bereich zusätzlich die Verblendung
    expect(item(input({ teeth: { "21": "stift" } }), "t21").options.find((o) => o.id === "kr")!.befunde).toEqual(["1.1", "1.3", "1.4"]);
  });

  it("Stiftaufbau bei Privatpatienten: Praxispreis mit Stift, keine Kassenwörter", () => {
    const pkv = item(input({ teeth: { "36": "stift" }, patient: { ...GKV10, insurance: "PKV", erstattungProzent: 80 } }), "t36");
    const kr = pkv.options.find((o) => o.id === "kr")!;
    expect(kr.total).toBe(DEFAULT_PRICES.krone_regel + DEFAULT_PRICES.stift);
    expect(kr.name).toBe("Krone mit Stiftaufbau, Standardausführung");
    expect(JSON.stringify(pkv)).not.toMatch(/Festzuschuss|Kasse /);
  });

  it("Teilkrone: Befund 1.2, Keramik als gleichartige Versorgung mit demselben Festzuschuss", () => {
    const it47 = item(input({ teeth: { "47": "teilkrone" } }), "t47");
    const tk = it47.options.find((o) => o.id === "tk")!;
    const tkk = it47.options.find((o) => o.id === "tkk")!;
    expect(tk.befunde).toEqual(["1.2"]);
    expect(tk.total).toBeCloseTo(457.27, 2);
    expect(money(tk, GKV10).kasse).toBeCloseTo(457.27 * 0.75, 1);
    expect(money(tkk, GKV10).kasse).toBeCloseTo(money(tk, GKV10).kasse, 2);
    expect(money(tkk, GKV10).netto).toBeCloseTo(DEFAULT_PRICES.teilkrone_keramik - 457.27 * 0.75, 1);
    expect(it47.recommended).toBe("tk");
    expect(item(input({ teeth: { "14": "teilkrone" } }), "t14").recommended).toBe("tkk");
  });

  it("Härtefall: Krone mit Stiftaufbau in der Regelversorgung ohne Eigenanteil", () => {
    const kr = item(input({ teeth: { "36": "stift" }, patient: { ...GKV10, haertefall: true } }), "t36").options.find((o) => o.id === "kr")!;
    expect(money(kr, { ...GKV10, haertefall: true }).netto).toBeCloseTo(0, 2);
  });
});

describe("Zuzahlung bei Hilfs- und Arzneimitteln ab 2027", () => {
  const d26 = new Date("2026-12-31T12:00:00+01:00");
  const d27 = new Date("2027-01-01T00:30:00+01:00");
  it("bis 31.12.2026: 10 %, mindestens 5 €, höchstens 10 €", () => {
    expect(hilfsmittelZuzahlung(30, d26)).toBe(5);
    expect(hilfsmittelZuzahlung(80, d26)).toBe(8);
    expect(hilfsmittelZuzahlung(900, d26)).toBe(10);
    expect(hilfsmittelZuzahlung(3, d26)).toBe(3);
    expect(hilfsmittelZuzahlungText(d26)).toBe("10 % des Preises, mindestens 5 €, höchstens 10 €");
  });
  it("ab 1.1.2027 (deutsche Zeit): mindestens 7,50 €, höchstens 15 €", () => {
    expect(hilfsmittelZuzahlung(30, d27)).toBe(7.5);
    expect(hilfsmittelZuzahlung(120, d27)).toBe(12);
    expect(hilfsmittelZuzahlung(900, d27)).toBe(15);
    expect(hilfsmittelZuzahlung(3, d27)).toBe(3);
    expect(hilfsmittelZuzahlungText(d27)).toBe("10 % des Preises, mindestens 7,50 €, höchstens 15 €");
  });
});
