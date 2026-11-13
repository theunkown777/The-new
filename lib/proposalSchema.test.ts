import { describe, expect, it } from "vitest";
import { computeProposal } from "@/lib/proposalSchema";
import { DEFAULT_PRICES, type ProposalInput } from "@/lib/proposals";

const patient = { age: 50, insurance: "GKV" as const, bonusYears: 0 as const, haertefall: false, erstattungProzent: 0 };
const haut: ProposalInput = { teeth: {}, globals: {}, patient, fach: "haut", anlaesse: ["hautkrebs", "aesthetik"] };
const rechne = (choices: Record<string, string>) => computeProposal({ input: haut, choices, prices: DEFAULT_PRICES, patientName: "Frau Test", practiceName: "Praxis", date: new Date("2026-11-02") });

describe("computeProposal: gespeicherte Wahl", () => {
  it("verwirft Wahlen für Positionen oder Optionen, die es nicht gibt", () => {
    expect(rechne({ a_gibtsnicht: "x", a_hautkrebs: "unbekannt" }).choices).toEqual({});
  });

  it("Zusatzleistung zählt nur, wenn sie angekreuzt ist", () => {
    expect(rechne({}).eigenanteilCent).toBe(rechne({ a_hautkrebs__auflicht: "-" }).eigenanteilCent);
    expect(rechne({ a_hautkrebs__auflicht: "auflicht" }).eigenanteilCent - rechne({}).eigenanteilCent).toBe(3500);
  });

  it("„nicht gewünscht“ bleibt bei freiwilligen Leistungen gespeichert", () => {
    const ohne = rechne({ a_hautkrebs__video: "-" });
    expect(ohne.choices).toEqual({ a_hautkrebs__video: "-" });
    expect(ohne.letterText).not.toContain("Videodermatoskopie");
    // Einzelne Selbstzahlerleistung ohne Kassenleistung daneben (Sehtest für den Führerschein)
    const augen = computeProposal({ input: { teeth: {}, globals: {}, patient, fach: "augen", anlaesse: ["fuehrerschein"] }, choices: { a_fuehrerschein: "-" }, prices: DEFAULT_PRICES, patientName: "Herr Test", practiceName: "Praxis", date: new Date("2026-11-02") });
    expect(augen.choices).toEqual({ a_fuehrerschein: "-" });
    expect(augen.eigenanteilCent).toBe(0);
    // Bei einer Position mit Kassenleistung oder mehreren Möglichkeiten gibt es kein „nicht gewünscht“
    expect(rechne({ a_hautkrebs: "-", a_aesthetik: "-" }).choices).toEqual({});
  });
});
