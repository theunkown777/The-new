import { describe, expect, it } from "vitest";
import { analyze, kennzahlen, rowsOf, veraenderung, vergleichSatz, wochenSummen, zeitraumDavor, zeitvergleich, type ProposalFacts, type Row } from "@/lib/analytics";
import type { ProposalItem } from "@/lib/proposals";
import { igelMonitor } from "@/lib/nutzenQuelle";

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
    { id: "auf", type: "igel", name: "Auflicht", total: 40, benefits: [], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Test“ mit „tendenziell negativ“.", nutzenQuelle: igelMonitor("Test", "test", "17.11.2026", "tendenziell negativ") },
    { id: "vid", type: "igel", name: "Video", total: 100, benefits: [] },
    // Vorschlag aus der Zeit vor den Quellen: nur Text, keine hinterlegte Bewertung
    { id: "alt", type: "igel", name: "Alt", total: 50, benefits: [], nutzen: "Ohne Verdacht ist ein Zusatznutzen nicht belegt." },
    { id: "unklar", type: "igel", name: "Unklar", total: 60, benefits: [], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Test 2“ mit „unklar“.", nutzenQuelle: igelMonitor("Test 2", "test-2", "17.11.2026", "unklar") },
    { id: "zwei", type: "igel", name: "Zwei", total: 70, benefits: [], nutzenQuelle: [igelMonitor("A", "a", "17.11.2026", "unklar"), igelMonitor("B", "b", "17.11.2026", "negativ")] },
  ],
};

function facts(i: number, over: Partial<ProposalFacts> = {}): ProposalFacts {
  const createdAt = new Date(now.getTime() - (10 + i) * DAY);
  return { id: `p${i}`, status: "ANGENOMMEN", createdAt, updatedAt: createdAt, patient: gkv, linked: false, viewed: false, responded: false, wantsInstallments: false, shareCreatedAt: null, patientRespondedAt: null, dental: false, ...over };
}

describe("rowsOf", () => {
  it("trennt Kassen- und Privatanteil", () => {
    expect(rowsOf(facts(1), [item], { a: "k" })[0]).toMatchObject({ kasse: 30, privat: 0, art: "Kassenleistung" });
    expect(rowsOf(facts(1), [item], { a: "auf" })[0]).toMatchObject({ kasse: 0, privat: 40, igelNegativ: true });
    expect(rowsOf(facts(1, { patient: { ...gkv, insurance: "PKV" } }), [item], { a: "k" })[0]).toMatchObject({ kasse: 0, privat: 30 });
  });

  it("zählt nach der hinterlegten Bewertung des IGeL-Monitors, nicht nach dem Text", () => {
    const wahl = (id: string) => rowsOf(facts(1), [item], { a: id })[0].igelNegativ;
    expect(wahl("auf")).toBe(true); // „tendenziell negativ“
    expect(wahl("zwei")).toBe(false); // gemischt: „unklar“ und „negativ“ zählt nicht
    expect(wahl("unklar")).toBe(false);
    expect(wahl("alt")).toBe(false); // alter Vorschlag ohne Quelle
    expect(wahl("vid")).toBe(false);
    expect(wahl("k")).toBe(false);
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
    expect(ids).toEqual(expect.arrayContaining(["konzentration", "igel-monitor", "rueckmeldung", "ueberfaellig"]));
    expect(a.risiken[0].stufe).not.toBe("info");
    expect(a.staerken.join(" ")).toContain("Prozentpunkte");
    // Hinweis zum IGeL-Monitor: Zahl mit Quelle, ohne Wertung und ohne Rat
    const igel = a.risiken.find((r) => r.id === "igel-monitor")!;
    expect(igel.titel).toBe("100 % der Selbstzahler-Einnahmen aus Leistungen, bei denen jede im Kasten „Zum Nutzen“ genannte Bewertung des IGeL-Monitors „negativ“ oder „tendenziell negativ“ lautet");
    expect(igel.stufe).toBe("info");
    expect(igel.tun).toBeUndefined();
    expect(igel.warum).toContain("„Auflicht“");
    expect(igel.warum).toContain("auch bei älteren Vorschlägen");
    expect(igel.warum).toContain("nur für bestimmte Gruppen");
    expect(`${igel.titel} ${igel.warum}`).not.toMatch(/belegt|Kritik|Vertrauen|anbieten|stärker|sollte|empfehl/i);
  });

  it("IGeL-Monitor: nur angenommene Leistungen mit Quelle zählen, Anteil an den Selbstzahler-Einnahmen", () => {
    const proposals: ProposalFacts[] = [];
    const rows: Row[] = [];
    const wahl = ["auf", "alt", "unklar", "vid", "zwei"]; // 40 + 50 + 60 + 100 + 70 = 320 privat
    wahl.forEach((id, i) => {
      const p = facts(i);
      proposals.push(p);
      rows.push(...rowsOf(p, [item], { a: id }));
    });
    // abgelehnt: zählt nicht
    const abgelehnt = facts(9, { status: "ABGELEHNT" });
    proposals.push(abgelehnt);
    rows.push(...rowsOf(abgelehnt, [item], { a: "zwei" }));
    const a = analyze({ proposals, rows, invoices: [], now, zeitraumTage: 90 });
    const igel = a.risiken.find((r) => r.id === "igel-monitor")!;
    // 40 / 320 = 13 %; „Zwei“ hat gemischte Bewertungen und zählt nicht
    expect(igel.titel).toMatch(/^13 % der Selbstzahler-Einnahmen aus Leistungen, bei denen jede/);
    expect(igel.warum).toContain("„Auflicht“");
    expect(igel.warum).not.toContain("„Zwei“");
    expect(igel.warum).not.toContain("„Alt“");

    // Nur alte Vorschläge ohne Quelle: kein Hinweis
    const nurAlt = facts(1);
    const b = analyze({ proposals: [nurAlt], rows: rowsOf(nurAlt, [item], { a: "alt" }), invoices: [], now, zeitraumTage: 90 });
    expect(b.risiken.map((r) => r.id)).not.toContain("igel-monitor");
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

// Die Analyse sieht jede Praxis und jeder Gast in der Demo-Praxis. Sie rät nicht zu Raten (lib/installments.ts:
// Raten sind angehalten), fordert nicht pauschal zum Anruf auf (Erinnern nur mit dokumentierter Einwilligung)
// und behauptet keine Wirkung, für die es keine Belege gibt („erfahrungsgemäß“, „entscheidet sich öfter“).
describe("Texte der Analyse", () => {
  const lies = async (datei: string) => (await import("node:fs")).readFileSync((await import("node:path")).join(process.cwd(), datei), "utf8");
  const DATEIEN = ["lib/analytics.ts", "components/AnalyseExplorer.tsx", "app/(app)/analyse/page.tsx"];

  it("kein Rat zu Ratenzahlung, kein Vergleich zum Ratenwunsch, solange Raten angehalten sind", async () => {
    const { RATEN_ANGEHALTEN } = await import("@/lib/installments");
    for (const datei of DATEIEN) expect(await lies(datei), datei).not.toMatch(/Raten(zahlung)? (an)?bieten|Ratenzahlung anbieten|Teilzahlung/i);
    const proposals = Array.from({ length: 12 }, (_, i) => facts(i, { responded: true, wantsInstallments: i % 2 === 0, status: i % 3 === 0 ? "ABGELEHNT" : "ANGENOMMEN" }));
    const a = analyze({ proposals, rows: proposals.flatMap((p) => rowsOf(p, [item], { a: "auf" })), invoices: [], now, zeitraumTage: 90 });
    const alles = JSON.stringify(a);
    if (RATEN_ANGEHALTEN) {
      // Als ganzes Wort: „privaten“ ist kein Treffer.
      expect(alles).not.toMatch(/\bRaten/);
      expect(a.faktoren.map((f) => f.frage).join(" ")).not.toMatch(/\bRaten/);
    }
    // Der Patienten-Link bleibt der erste Vergleich (darauf baut der Satz unter „Stärken“).
    expect(a.faktoren[0].a.label).toBe("mit Link");
  });

  it("kein Aufruf zum Anruf ohne das Wort Einwilligung, keine behauptete Erfahrung", async () => {
    for (const datei of DATEIEN) {
      const text = await lies(datei);
      for (const zeile of text.split("\n")) {
        if (/\b(Anruf|anrufen|zurückrufen|Rückruf)\b/i.test(zeile)) expect(zeile, datei).toMatch(/Einwilligung/);
      }
      expect(text, datei).not.toMatch(/erfahrungsgemäß|entscheidet sich öfter|hebt die Quote|geht häufig woanders|lohnt ein/i);
    }
    const proposals = Array.from({ length: 12 }, (_, i) => facts(i, { linked: i < 6, responded: i < 3, status: i < 6 ? "ANGENOMMEN" : "ABGELEHNT" }));
    const a = analyze({ proposals, rows: proposals.flatMap((p) => rowsOf(p, [item], { a: "auf" })), invoices: [], now, zeitraumTage: 90 });
    for (const f of a.faktoren) {
      expect(f.erklaerung, f.frage).toMatch(/^Der Vergleich zeigt Ihre eigenen Zahlen\./);
      if (/Anruf|anrufen/i.test(f.erklaerung)) expect(f.erklaerung).toMatch(/Einwilligung/);
    }
  });
});
