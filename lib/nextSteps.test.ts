import { describe, it, expect } from "vitest";
import { buildNextSteps } from "./nextSteps";
import { buildProposal, DEFAULT_PRICES, type PatientFactors, type ProposalInput, type ProposalItem } from "./proposals";

const GKV10: PatientFactors = { age: 46, insurance: "GKV", bonusYears: 10, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026 };
const OCT = new Date(2026, 9, 30);

function steps(input: Partial<ProposalInput>, opts: { reportFinal?: boolean; choices?: Record<string, string>; patient?: PatientFactors; today?: Date } = {}) {
  const patient = opts.patient ?? GKV10;
  const items = buildProposal({ teeth: {}, globals: {}, patient, ...input }, DEFAULT_PRICES);
  return buildNextSteps({
    items,
    choices: opts.choices ?? {},
    patient,
    reportFinal: opts.reportFinal ?? false,
    hasProposal: items.length > 0,
    today: opts.today ?? OCT,
    fach: "zahn",
  });
}
const ids = (s: ReturnType<typeof steps>) => s.map((x) => x.id);

describe("Vereinbarung vor einer Selbstzahlerleistung je Fach", () => {
  const item: ProposalItem = {
    key: "a", where: "Allgemein", title: "Wunschleistung", recommended: null, notes: [], excluded: [],
    options: [{ id: "wunsch", type: "igel", name: "Wunschleistung", total: 50, benefits: [] }],
  };
  const igel = (fach: string) =>
    buildNextSteps({ items: [item], choices: { a: "wunsch" }, patient: GKV10, reportFinal: true, hasProposal: true, today: OCT, fach }).find((x) => x.id === "igel")!;
  it("Ärzte: IGeL nach BMV-Ä; Therapie: Privatvereinbarung; Hilfsmittel: Mehrkostenerklärung; Klinik: Wahlleistungsvereinbarung", () => {
    expect(igel("ortho").text).toBe("Schriftliche Vereinbarung über Selbstzahlerleistungen (IGeL) vor der Leistung unterschreiben lassen");
    expect(igel("ortho").detail).toBe("Allgemein: Wunschleistung. Gilt, falls der Patient diese Leistung wählt. Kosten nach GOÄ, ausreichende Bedenkzeit (§ 18 Abs. 8 BMV-Ä).");
    expect(igel("physio").text).toBe("Privatvereinbarung über Selbstzahlerleistungen vor der Behandlung unterschreiben lassen");
    expect(igel("physio").detail).not.toMatch(/GOÄ|BMV-Ä|IGeL/);
    expect(igel("optik").text).toContain("Mehrkostenerklärung vor der Versorgung");
    expect(igel("optik").detail).toContain("falls der Kunde diese Ausführung wählt");
    expect(igel("klinik").text).toContain("Wahlleistungsvereinbarung");
    expect(igel("klinik").text).toContain("§ 17 KHEntgG");
    expect(igel("hebamme").text).toContain("vor dem Besuch");
    expect(igel("hebamme").detail).toContain("falls die Frau diese Leistung wählt");
    for (const fach of ["physio", "optik", "klinik", "hebamme", "pflege"]) expect(igel(fach).detail, fach).not.toContain("Praxispreisliste");
  });
});

describe("buildNextSteps", () => {
  it("asks only to release the report when there are no findings", () => {
    expect(ids(steps({}))).toEqual(["bericht"]);
    expect(ids(steps({}, { reportFinal: true }))).toEqual([]);
  });

  it("plans a HKP with the 2026 deadline for prosthetics", () => {
    const s = steps({ teeth: { "36": "fehlt" } });
    expect(ids(s)).toEqual(["bericht", "schreiben", "hkp", "haertefall-hinweis", "frist2027"]);
    expect(s.find((x) => x.id === "frist2027")!.detail).toMatch(/92 €/);
    expect(s.find((x) => x.id === "frist2027")!.text).toMatch(/noch 62 Tage/);
  });

  it("drops the deadline after 2026 and for Härtefälle", () => {
    expect(ids(steps({ teeth: { "36": "fehlt" } }, { today: new Date(2027, 1, 1) }))).not.toContain("frist2027");
    expect(ids(steps({ teeth: { "36": "fehlt" } }, { patient: { ...GKV10, haertefall: true } }))).not.toContain("frist2027");
  });

  it("weist bei Zahnersatz auf die Härtefallprüfung hin, außer bei Härtefall und Privatpatienten", () => {
    const hinweis = steps({ teeth: { "36": "fehlt" } }).find((x) => x.id === "haertefall-hinweis")!;
    expect(hinweis.detail).toMatch(/gleitende Regelung/);
    expect(ids(steps({ teeth: { "36": "fehlt" } }, { patient: { ...GKV10, haertefall: true } }))).not.toContain("haertefall-hinweis");
    expect(ids(steps({ teeth: { "36": "fehlt" } }, { patient: { ...GKV10, insurance: "PKV", erstattungProzent: 80 } }))).not.toContain("haertefall-hinweis");
    expect(ids(steps({ teeth: { "25": "karies_klein" } }))).not.toContain("haertefall-hinweis");
  });

  it("asks for a cost estimate instead of a HKP for private patients", () => {
    const s = steps({ teeth: { "36": "fehlt" } }, { patient: { ...GKV10, insurance: "PKV", erstattungProzent: 80 } });
    expect(s.find((x) => x.id === "hkp")!.text).toMatch(/Kostenvoranschlag/);
    expect(ids(s)).not.toContain("frist2027");
  });

  it("needs a Mehrkostenvereinbarung only if the paid composite is chosen", () => {
    expect(ids(steps({ teeth: { "25": "karies_klein" } }, { choices: { t25: "komp" } }))).toContain("mkv");
    expect(ids(steps({ teeth: { "25": "karies_klein" } }))).not.toContain("mkv");
    expect(ids(steps({ teeth: { "25": "karies_klein" } }, { choices: { t25: "fk" } }))).not.toContain("mkv");
  });

  it("collects follow-up appointments and the PAR application", () => {
    const s = steps({ teeth: { "16": "karies_gross" }, globals: { zahnstein: true, psi: true } });
    expect(ids(s)).toContain("par");
    expect(s.find((x) => x.id === "termine")!.detail).toMatch(/Zahn 16/);
  });
});
