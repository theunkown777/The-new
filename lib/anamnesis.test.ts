import { describe, expect, it } from "vitest";
import { QUESTIONS, anamnesisFlags, anamnesisProposalGlobals, anamnesisSchema } from "@/lib/anamnesis";

const allNo = Object.fromEntries(QUESTIONS.map((q) => [q.key, { yes: false }]));

describe("Anamnese", () => {
  it("verlangt alle Fragen und eine Bestätigung", () => {
    expect(anamnesisSchema.safeParse({ q: allNo, confirmName: "Martina Weber" }).success).toBe(true);
    expect(anamnesisSchema.safeParse({ q: { rauchen: { yes: true } }, confirmName: "Martina Weber" }).success).toBe(false);
    expect(anamnesisSchema.safeParse({ q: allNo, confirmName: "" }).success).toBe(false);
  });

  it("Warnhinweise zuerst, mit Detail", () => {
    const a = anamnesisSchema.parse({
      q: { ...allNo, diabetes: { yes: true }, blutverduenner: { yes: true, detail: "Eliquis 5 mg" } },
      wishes: ["angst"],
      confirmName: "M. Weber",
    });
    const flags = anamnesisFlags(a);
    expect(flags[0]).toEqual({ level: "warn", text: "Blutverdünner", detail: "Eliquis 5 mg" });
    expect(flags.map((f) => f.level)).toEqual(["warn", "info", "info"]);
  });

  it("übernimmt Raucher, Knirschen und Bleaching-Wunsch in den Vorschlag", () => {
    const a = anamnesisSchema.parse({
      q: { ...allNo, rauchen: { yes: true }, knirschen: { yes: true } },
      wishes: ["hell", "luecke"],
      confirmName: "M. Weber",
    });
    expect(anamnesisProposalGlobals(a).sort()).toEqual(["bleaching", "bruxismus", "raucher"]);
  });
});

// Die Hinweise aus dem Fragebogen nennen nur, was der Patient angegeben hat. Was daraus für die Behandlung folgt,
// entscheidet die Praxis (lib/zweckbestimmung.ts: keine Therapieempfehlungen, keine Bewertung von Befunden).
describe("Hinweise aus dem Anamnesebogen", () => {
  it("nennen die Angabe, kein Risiko und keine Anweisung", async () => {
    const { QUESTIONS } = await import("@/lib/anamnesis");
    const texte = QUESTIONS.flatMap((q) => (q.flag ? [q.flag.text] : []));
    expect(texte.length).toBeGreaterThan(8);
    for (const t of texte) expect(t, t).not.toMatch(/risiko|prophylaxe|prüfen|ggf\.|:|\bvor\b|wundheilung|nekrose/i);
  });
});
