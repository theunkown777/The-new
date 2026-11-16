import { describe, expect, it } from "vitest";
import { analyze, kennzahlen, rowsOf, veraenderung, vergleichSatz, wochenSummen, zeitraumDavor, zeitvergleich, type ProposalFacts, type Row } from "@/lib/analytics";
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

describe("Vergleich mit dem Zeitraum davor", () => {
  const vorschlag = (id: string, tageHer: number, status: string, wahl = "auf") => {
    const createdAt = new Date(now.getTime() - tageHer * DAY);
    const p: ProposalFacts = { id, status, createdAt, updatedAt: createdAt, patient: gkv, linked: false, viewed: false, responded: false, wantsInstallments: false, shareCreatedAt: null, patientRespondedAt: null, dental: false };
    return { p, r: rowsOf(p, [item], { a: wahl }) };
  };
  // aktueller Zeitraum (30 Tage): 3 angenommen, 1 abgelehnt; davor: 1 angenommen, 1 abgelehnt
  const liste = [
    vorschlag("a1", 2, "ANGENOMMEN"), vorschlag("a2", 10, "ANGENOMMEN"), vorschlag("a3", 20, "ANGENOMMEN", "vid"), vorschlag("a4", 25, "ABGELEHNT"),
    vorschlag("b1", 35, "ANGENOMMEN"), vorschlag("b2", 50, "ABGELEHNT"), vorschlag("c1", 70, "ANGENOMMEN", "vid"),
  ];
  const proposals = liste.map((x) => x.p);
  const rows = liste.flatMap((x) => x.r);

  it("rechnet Kennzahlen je Zeitabschnitt wie die Analyse", () => {
    const von = new Date(now.getTime() - 30 * DAY);
    const k = kennzahlen(proposals, rows, von, new Date(now.getTime() + 1));
    const a = analyze({ proposals, rows, invoices: [], now, zeitraumTage: 30 });
    expect(k.umsatz).toBe(a.umsatz);
    expect(k.quote).toBe(a.quote);
    expect(k).toMatchObject({ entschieden: 4, angenommen: 3, quote: 75, privat: 40 + 40 + 100 });
  });

  it("stellt den gleich langen Zeitraum davor daneben", () => {
    const z = zeitvergleich({ proposals, rows, now, zeitraumTage: 30 });
    expect(z.davor).toMatchObject({ entschieden: 2, angenommen: 1, quote: 50, privat: 40 });
    // c1 (vor 70 Tagen) liegt außerhalb beider Zeiträume
    expect(z.davor.umsatz).toBeLessThan(100 + 40);
  });

  it("liefert eine Verlaufslinie mit 8 bis 12 Abschnitten, deren Summe dem Zeitraum entspricht", () => {
    const z = zeitvergleich({ proposals, rows, now, zeitraumTage: 30 });
    expect(z.verlauf.umsatz).toHaveLength(10);
    expect(z.verlauf.quote).toHaveLength(10);
    const a = analyze({ proposals, rows, invoices: [], now, zeitraumTage: 30 });
    expect(z.verlauf.umsatz.reduce((s, n) => s + n, 0)).toBe(a.umsatz);
    expect(zeitvergleich({ proposals, rows, now, zeitraumTage: 30, punkte: 3 }).verlauf.umsatz).toHaveLength(8);
    expect(zeitvergleich({ proposals, rows, now, zeitraumTage: 30, punkte: 40 }).verlauf.umsatz).toHaveLength(12);
    // Abschnitte ohne Entscheidung haben keine Quote
    expect(z.verlauf.quote.some((q) => q === null)).toBe(true);
  });

  it("nennt nur Zahl und Richtung, keine Wertung", () => {
    expect(veraenderung(75, 50)).toEqual({ differenz: 25, richtung: "mehr" });
    expect(veraenderung(40, 50)).toEqual({ differenz: -10, richtung: "weniger" });
    expect(veraenderung(50, 50)).toEqual({ differenz: 0, richtung: "gleich" });
    expect(veraenderung(null, 50)).toBeNull();
    expect(veraenderung(50, null)).toBeNull();
    expect(vergleichSatz(veraenderung(54, 50), "Punkte", zeitraumDavor(30))).toBe("+4 Punkte gegenüber den 30 Tagen davor");
    expect(vergleichSatz(veraenderung(51, 50), "Punkte", zeitraumDavor(90))).toBe("+1 Punkt gegenüber den 90 Tagen davor");
    expect(vergleichSatz(veraenderung(1000, 2500), "€", zeitraumDavor(365))).toBe("−1.500 € gegenüber den 12 Monaten davor");
    expect(vergleichSatz(veraenderung(5, 5), "", zeitraumDavor(30))).toBe("unverändert gegenüber den 30 Tagen davor");
    expect(vergleichSatz(null, "€", zeitraumDavor(30))).toBeNull();
    const alle = [vergleichSatz(veraenderung(1, 9), "Punkte", "x"), vergleichSatz(veraenderung(9, 1), "€", "x"), vergleichSatz(veraenderung(1, 1), "", "x")].join(" ");
    expect(alle).not.toMatch(/gut|schlecht|besser|schlechter|stark|schwach/i);
  });

  it("summiert Beträge je Woche, die laufende Woche zuletzt", () => {
    const e = [
      { datum: new Date(now.getTime() - 1 * DAY), betrag: 100 },
      { datum: new Date(now.getTime() - 6 * DAY), betrag: 50 },
      { datum: new Date(now.getTime() - 8 * DAY), betrag: 30 },
      { datum: new Date(now.getTime() - 55 * DAY), betrag: 7 },
      { datum: new Date(now.getTime() - 60 * DAY), betrag: 999 }, // älter als acht Wochen
      { datum: new Date(now.getTime() + 2 * DAY), betrag: 999 }, // Zukunft zählt nicht
      { datum: null, betrag: 999 },
    ];
    expect(wochenSummen(e, now, 8)).toEqual([7, 0, 0, 0, 0, 0, 30, 150]);
    expect(wochenSummen([], now, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
