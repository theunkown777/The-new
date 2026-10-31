import { describe, expect, it } from "vitest";
import { analyze, rowsOf, type ProposalFacts, type Row } from "@/lib/analytics";
import type { ProposalItem } from "@/lib/proposals";

const now = new Date(2026, 9, 31);
const DAY = 86400000;
const gkv = { age: 50, insurance: "GKV" as const, bonusYears: 0 as const, haertefall: false, erstattungProzent: 0 };

const item: ProposalItem = {
  key: "a",
  where: "Vorsorge",
  title: "Hautkrebs-Früherkennung",
  recommended: null,
  notes: [],
  excluded: [],
  options: [
    { id: "k", type: "kasse", name: "Screening", total: 30, benefits: [] },
    { id: "auf", type: "igel", name: "Auflicht", total: 40, benefits: [], nutzen: "Ohne Verdacht ist ein Zusatznutzen nicht belegt." },
    { id: "vid", type: "igel", name: "Video", total: 100, benefits: [] },
  ],
};

function facts(i: number, over: Partial<ProposalFacts> = {}): ProposalFacts {
  const createdAt = new Date(now.getTime() - (10 + i) * DAY);
  return { id: `p${i}`, status: "ANGENOMMEN", createdAt, updatedAt: createdAt, patient: gkv, linked: false, viewed: false, responded: false, wantsInstallments: false, shareCreatedAt: null, patientRespondedAt: null, dental: false, ...over };
}

describe("rowsOf", () => {
  it("trennt Kassen- und Privatanteil", () => {
    expect(rowsOf(facts(1), [item], { a: "k" })[0]).toMatchObject({ kasse: 30, privat: 0, art: "Kassenleistung" });
    expect(rowsOf(facts(1), [item], { a: "auf" })[0]).toMatchObject({ kasse: 0, privat: 40, unbelegt: true });
    expect(rowsOf(facts(1, { patient: { ...gkv, insurance: "PKV" } }), [item], { a: "k" })[0]).toMatchObject({ kasse: 0, privat: 30 });
  });
});

describe("analyze", () => {
  it("findet die umsatzstärkste Leistung, Faktoren und Risiken", () => {
    const proposals: ProposalFacts[] = [];
    const rows: Row[] = [];
    for (let i = 0; i < 12; i++) {
      const linked = i < 6;
      const p = facts(i, { linked, viewed: linked, shareCreatedAt: linked ? new Date(now.getTime() - 20 * DAY) : null, status: linked || i % 3 === 0 ? "ANGENOMMEN" : "ABGELEHNT" });
      proposals.push(p);
      rows.push(...rowsOf(p, [item], { a: "auf" }));
    }
    // Rückmeldung, die seit Tagen wartet
    const waiting = facts(20, { status: "BESPROCHEN", linked: true, viewed: true, responded: true, shareCreatedAt: new Date(now.getTime() - 9 * DAY), patientRespondedAt: new Date(now.getTime() - 5 * DAY) });
    proposals.push(waiting);
    rows.push(...rowsOf(waiting, [item], { a: "vid" }));

    const a = analyze({ proposals, rows, invoices: [{ status: "OFFEN", amountCent: 50000, dueDate: new Date(now.getTime() - 3 * DAY) }], now, zeitraumTage: 90 });
    expect(a.angenommen).toBe(8);
    expect(a.entschieden).toBe(12);
    expect(a.quote).toBe(67);
    expect(a.privat).toBe(320);
    expect(a.offenPotenzial).toBe(100);
    expect(a.leistungen[0]).toMatchObject({ name: "Auflicht", angenommen: 8, quote: 67, anteil: 1 });
    expect(a.faktoren[0]).toMatchObject({ a: { quote: 100, n: 6 }, b: { quote: 33, n: 6 }, punkte: 67 });
    const ids = a.risiken.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["konzentration", "unbelegt", "rueckmeldung", "ueberfaellig"]));
    expect(a.risiken[0].stufe).not.toBe("info");
    expect(a.staerken.join(" ")).toContain("Prozentpunkte");
  });

  it("zeigt keine Quoten bei zu wenigen Fällen", () => {
    const p = facts(1);
    const a = analyze({ proposals: [p], rows: rowsOf(p, [item], { a: "k" }), invoices: [], now, zeitraumTage: 30 });
    expect(a.leistungen[0].quote).toBeNull();
    expect(a.faktoren.every((f) => f.punkte === null)).toBe(true);
    expect(a.risiken).toEqual([]);
  });
});
