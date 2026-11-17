import { describe, expect, it } from "vitest";
import { ANAMNESE_FRAGEN, ANLIEGEN, anamneseFuer } from "@/lib/anamneseProfile";
import { anamneseZeilen, anamnesePruefen, anamnesisFlags, anamnesisProposalGlobals, anamnesisSchemaFuer, anliegenTexte, parseAnamnesis } from "@/lib/anamnesis";

const zahn = anamneseFuer("zahn");
const hausarzt = anamneseFuer("hausarzt");
const allNo = (p: { fragen: { key: string }[] }) => Object.fromEntries(p.fragen.map((q) => [q.key, { yes: false }]));

describe("Anamnese", () => {
  it("verlangt alle Fragen des Bogens und eine Bestätigung", () => {
    const schema = anamnesisSchemaFuer(zahn);
    expect(schema.safeParse({ q: allNo(zahn), confirmName: "Martina Weber" }).success).toBe(true);
    const fehlt = schema.safeParse({ q: { rauchen: { yes: true } }, confirmName: "Martina Weber" });
    expect(fehlt.success).toBe(false);
    expect(fehlt.error?.issues[0]?.message).toBe("Bitte alle Fragen beantworten");
    expect(schema.safeParse({ q: allNo(zahn), confirmName: "" }).success).toBe(false);
  });

  it("Warnhinweise zuerst, mit Detail", () => {
    const p = anamnesePruefen({ q: { ...allNo(zahn), diabetes: { yes: true }, blutverduenner: { yes: true, detail: "Eliquis 5 mg" } }, wishes: ["angst"], confirmName: "M. Weber" }, zahn);
    if (!p.ok) throw new Error(p.fehler);
    const flags = anamnesisFlags(p.daten);
    expect(flags[0]).toEqual({ level: "warn", text: "Blutverdünner", detail: "Eliquis 5 mg" });
    expect(flags.map((f) => f.level)).toEqual(["warn", "info", "info"]);
  });

  it("übernimmt Raucher, Knirschen und Bleaching-Wunsch nur im zahnärztlichen Bogen in den Vorschlag", () => {
    const p = anamnesePruefen({ q: { ...allNo(zahn), rauchen: { yes: true }, knirschen: { yes: true } }, wishes: ["hell", "luecke"], confirmName: "M. Weber" }, zahn);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.daten).toMatchObject({ v: 2, fach: "zahn" });
    expect(anamnesisProposalGlobals(p.daten).sort()).toEqual(["bleaching", "bruxismus", "raucher"]);
    const h = anamnesePruefen({ q: { ...allNo(hausarzt), rauchen: { yes: true } }, wishes: [], confirmName: "M. Weber" }, hausarzt);
    if (!h.ok) throw new Error(h.fehler);
    expect(anamnesisProposalGlobals(h.daten)).toEqual([]);
    // Auch wenn die Praxis inzwischen Zahnmedizin wäre: Der Bogen war hausärztlich.
    expect(anamnesisProposalGlobals(h.daten, "zahn")).toEqual([]);
  });

  it("speichert Fassung 2 mit Fach und lehnt fremde Schlüssel ab", () => {
    const p = anamnesePruefen({ q: allNo(hausarzt), wishes: ["kasse"], confirmName: "M. Weber" }, hausarzt);
    expect(p.ok && p.daten).toMatchObject({ v: 2, fach: "hausarzt", ansprache: "patient", wishes: ["kasse"] });
    const knirschen = anamnesePruefen({ q: { ...allNo(hausarzt), knirschen: { yes: true } }, wishes: [], confirmName: "M. Weber" }, hausarzt);
    expect(knirschen.ok).toBe(false);
    expect(!knirschen.ok && knirschen.fehler).toMatch(/neu/);
    expect(anamnesePruefen({ q: allNo(hausarzt), wishes: ["hell"], confirmName: "M. Weber" }, hausarzt).ok).toBe(false);
    expect(anamnesePruefen({ q: allNo(hausarzt), wishes: [], confirmName: "M. Weber", fach: "zahn" }, hausarzt).ok).toBe(false);
  });
});

// Bögen von vor November 2026 (Fassung 1): ohne Fach, mit festem Fragensatz. Sie bleiben lesbar und gehen nicht verloren.
describe("Ältere Bögen (Fassung 1)", () => {
  const v1 = {
    q: { medikamente: { yes: true, detail: "Ramipril" }, blutverduenner: { yes: true, detail: "ASS 100" }, gerinnung: { yes: false }, bisphosphonate: { yes: false }, allergien: { yes: false }, herz: { yes: false }, blutdruck: { yes: true }, diabetes: { yes: false }, infektion: { yes: false }, bestrahlung: { yes: false }, schwanger: { yes: false }, rauchen: { yes: true }, knirschen: { yes: true } },
    wishes: ["hell", "kosten"],
    confirmName: "Anna Krüger",
  };

  it("bleiben lesbar mit Hinweisen und Anliegen", () => {
    const a = parseAnamnesis(v1)!;
    expect(a).toMatchObject({ v: 1, fach: null });
    expect(anamnesisFlags(a).map((f) => f.text)).toContain("Blutverdünner");
    expect(anliegenTexte(a)).toEqual(["hellere Zähne", "Kosten gering halten"]);
    expect(anamneseZeilen(a)).toHaveLength(13);
  });

  it("übernehmen in den Vorschlag nach dem Fach der Praxis", () => {
    const a = parseAnamnesis(v1)!;
    expect(anamnesisProposalGlobals(a, "zahn").sort()).toEqual(["bleaching", "bruxismus", "raucher"]);
    expect(anamnesisProposalGlobals(a, "hausarzt")).toEqual([]);
    expect(anamnesisProposalGlobals(a, null)).toEqual([]);
  });

  it("zeigen nur, was gefragt wurde (kein „Nein“ für Ungefragtes)", () => {
    const a = parseAnamnesis({ q: { medikamente: { yes: false }, rauchen: { yes: true } }, wishes: [], confirmName: "X Y" })!;
    const zeilen = anamneseZeilen(a);
    expect(zeilen.map((z) => z.antwort)).toEqual(["Nein", "Ja"]);
    expect(JSON.stringify(zeilen)).not.toMatch(/Knirschen|Zähne/);
  });

  it("vor dem Fach angelegte, offene Bögen werden noch angenommen; fremde Anliegen fallen weg", () => {
    const alt = { ...v1, q: Object.fromEntries(Object.entries(v1.q).filter(([k]) => k !== "knirschen")), wishes: ["hell", "angst"] };
    expect(anamnesePruefen(alt, hausarzt).ok).toBe(false);
    const p = anamnesePruefen(alt, hausarzt, { altbestand: true });
    if (!p.ok) throw new Error(p.fehler);
    expect(p.daten.wishes).toEqual(["angst"]);
    expect(p.daten.q.bisphosphonate).toEqual({ yes: false });
    expect(anamnesePruefen({ ...alt, q: { medikamente: { yes: false } } }, hausarzt, { altbestand: true }).ok).toBe(false);
  });
});

// Die Hinweise aus dem Fragebogen nennen nur, was der Patient angegeben hat. Was daraus für die Behandlung folgt,
// entscheidet die Praxis (lib/zweckbestimmung.ts: keine Therapieempfehlungen, keine Bewertung von Befunden).
describe("Hinweise aus dem Anamnesebogen", () => {
  it("nennen die Angabe, kein Risiko und keine Anweisung", () => {
    const texte = Object.values(ANAMNESE_FRAGEN).flatMap((q) => (q.hinweis ? [q.hinweis.text] : []));
    expect(texte.length).toBeGreaterThan(8);
    for (const t of texte) expect(t, t).not.toMatch(/risiko|prophylaxe|prüfen|ggf\.|:|\bvor\b|wundheilung|nekrose|einplanen|abklären|empfohlen/i);
  });

  it("Anliegen: Angst wird beschrieben, nicht angewiesen", () => {
    expect(ANLIEGEN.angst.hinweis?.text).toBe("Angst vor der Behandlung angegeben");
    for (const a of Object.values(ANLIEGEN)) if (a.hinweis) expect(a.hinweis.text, a.key).not.toMatch(/patient:|einplanen|mehr Zeit|risiko|:/i);
  });
});
