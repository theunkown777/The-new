// Zweiter Rechenweg für das Regelwerk.
//
// Diese Datei rechnet unabhängig nach, was lib/proposals.ts und lib/gebuehren.ts ausrechnen:
// bewusst einfach, in ganzen Cent und mit ganzen Zahlen (BigInt), ohne die Rechenfunktionen des
// Produkts zu benutzen. Importiert werden nur die amtlichen Tabellenwerte (Festzuschuss-Beträge
// je Befund und die Prozentsätze je Bewilligungsjahr) und die drei Funktionen, die geprüft werden.
//
// Regeln, aus denen die Nachrechnung geschrieben ist:
//  - § 55 Abs. 1 SGB V: Festzuschuss = Satz × Betrag der Regelversorgung je Befund (60/70/75 %,
//    für ab 1.1.2027 bewilligte Pläne 50/60/65 %). Bonus 5 bzw. 10 Jahre hebt den Satz.
//  - § 55 Abs. 2 SGB V (Härtefall): Bei der Regelversorgung trägt die Kasse die tatsächlichen Kosten,
//    bei anderer Versorgung den doppelten Festzuschuss (100-%-Betrag), höchstens die tatsächlichen Kosten.
//  - Die Kasse zahlt nie mehr als die Behandlung kostet. Eigenanteil = Kosten − Kassenanteil.
//  - Zusatzversicherung: erstattet ihren Prozentsatz vom Eigenanteil. Privat versichert: Der Tarif
//    erstattet seinen Prozentsatz von den Gesamtkosten; einen Festzuschuss gibt es nicht.
//  - § 32 Abs. 2, § 61 SGB V: Heilmittel 10 % der Kosten plus 10 € je Verordnung; Hilfs- und Arzneimittel
//    10 %, mindestens 5 €, höchstens 10 €, nie mehr als die Kosten. Ab 1.1.2027 (deutsche Zeit):
//    15 € je Verordnung, mindestens 7,50 €, höchstens 15 €.
//  - § 5 Abs. 1 GOÄ / GOZ: Gebühr = Punktzahl × Punktwert × Steigerungssatz; Bruchteile eines Cents
//    unter 0,5 werden abgerundet, ab 0,5 aufgerundet. Punktwert GOÄ 5,82873 Cent, GOZ 5,62421 Cent.
import { describe, expect, it } from "vitest";
import { FESTZUSCHUSS_BEFUNDE, FESTZUSCHUSS_SAETZE, money, zuzahlungBetrag, type OptionType, type PatientFactors, type ProposalOption } from "./proposals";
import { betragCent } from "./gebuehren";

// ------------------------------------------------------------ Zufall ----
// Eigener kleiner Zufallsgenerator mit festem Startwert (mulberry32): jeder Lauf prüft dieselben Fälle.
function zufall(start: number) {
  let a = start >>> 0;
  const naechste = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ganz = (von: number, bis: number) => von + Math.floor(naechste() * (bis - von + 1));
  const aus = <T,>(liste: readonly T[]): T => liste[ganz(0, liste.length - 1)];
  return { naechste, ganz, aus, wahr: (anteil: number) => naechste() < anteil };
}

// ------------------------------------------------- Nachrechnung in Cent ----
/** Kaufmännisch runden mit ganzen Zahlen: zaehler / nenner auf eine ganze Zahl, ab der Hälfte aufwärts. */
// (BigInt(…) statt der Kurzschreibweise 2n, weil das Projekt für ältere Laufzeiten übersetzt.)
const ZWEI = BigInt(2);
const HUNDERT = BigInt(100);
const runden = (zaehler: bigint, nenner: bigint): bigint => (zaehler * ZWEI + nenner) / (nenner * ZWEI);
const inCent = (euro: number): bigint => BigInt(Math.round(euro * 100));
const TOLERANZ_CENT = 1 + 1e-6;

interface ZeFall {
  art: "regel" | "gleichartig" | "andersartig";
  befunde: string[];
  /** Gesamtkosten in Cent */
  kostenCent: number;
  versichert: "GKV" | "PKV";
  bonus: 0 | 5 | 10;
  haertefall: boolean;
  jahr: 2026 | 2027;
  /** Erstattungssatz der Zusatzversicherung bzw. des Privattarifs in Zehntel-Prozent (625 = 62,5 %) */
  erstattungPromille: number;
}
interface Anteile { kasse: number; eigen: number; erstattet: number; netto: number }

/** Festzuschuss in Cent: je Befund Satz × Betrag, je Befund auf den Cent gerundet. */
function festzuschussCent(befunde: string[], prozent: number): bigint {
  let summe = BigInt(0);
  for (const b of befunde) summe += runden(inCent(FESTZUSCHUSS_BEFUNDE[b].euro) * BigInt(prozent), HUNDERT);
  return summe;
}

/** Nachrechnung eines Zahnersatz-Falls; alle Beträge in Cent (Erstattung mit Bruchteilen, wie sie anfällt). */
function nachrechnen(f: ZeFall): Anteile {
  const kosten = f.kostenCent;
  const quote = f.erstattungPromille / 1000;
  if (f.versichert === "PKV") {
    const kasse = kosten * quote;
    return { kasse, eigen: kosten - kasse, erstattet: 0, netto: kosten - kasse };
  }
  let kasse: number;
  if (f.haertefall && f.art === "regel") kasse = kosten;
  else {
    const prozent = f.haertefall ? 100 : Math.round(FESTZUSCHUSS_SAETZE[f.jahr][f.bonus] * 100);
    kasse = Math.min(Number(festzuschussCent(f.befunde, prozent)), kosten);
  }
  const eigen = kosten - kasse;
  const erstattet = eigen * quote;
  return { kasse, eigen, erstattet, netto: eigen - erstattet };
}

/** Derselbe Fall in der Form, die money() erwartet. */
function alsOption(f: ZeFall): { o: ProposalOption; p: PatientFactors } {
  return {
    o: { id: "x", type: f.art as OptionType, name: "Versorgung", total: f.kostenCent / 100, benefits: [], befunde: f.befunde },
    p: { age: 50, insurance: f.versichert, bonusYears: f.bonus, haertefall: f.haertefall, erstattungProzent: f.erstattungPromille / 10, zuschussJahr: f.jahr },
  };
}

const BEFUNDE = Object.keys(FESTZUSCHUSS_BEFUNDE);

/** Größte Abweichung zwischen Produkt (Euro) und Nachrechnung (Cent), in Cent. */
function abweichung(produkt: { kasse: number; eigen: number; erstattet: number; netto: number }, eigen: Anteile): number {
  return Math.max(
    Math.abs(produkt.kasse * 100 - eigen.kasse),
    Math.abs(produkt.eigen * 100 - eigen.eigen),
    Math.abs(produkt.erstattet * 100 - eigen.erstattet),
    Math.abs(produkt.netto * 100 - eigen.netto),
  );
}

// Halbe Cent: Bei manchen Befunden liegt Satz × Betrag rechnerisch genau auf einem halben Cent
// (z. B. 398,39 € × 50 % = 199,195 €). Die Nachrechnung rundet dann kaufmännisch auf. Ob das Produkt mit
// seinen Kommazahlen dasselbe tut, prüft der Test unten für jede Kombination aus Befund und Satz einzeln.
const halberCent = (befund: string, prozent: number) => (inCent(FESTZUSCHUSS_BEFUNDE[befund].euro) * BigInt(prozent)) % HUNDERT === BigInt(50);

// ----------------------------------------------------------- Prüfungen ----
describe("Zweitrechner: feste Beispiele von Hand", () => {
  it("Festzuschuss Befund 1.1 (398,39 €) je Satz", () => {
    expect(Number(festzuschussCent(["1.1"], 60))).toBe(23903); // 239,034
    expect(Number(festzuschussCent(["1.1"], 70))).toBe(27887); // 278,873
    expect(Number(festzuschussCent(["1.1"], 75))).toBe(29879); // 298,7925
    expect(Number(festzuschussCent(["1.1"], 65))).toBe(25895); // 258,9535
    expect(Number(festzuschussCent(["1.1"], 50))).toBe(19920); // 199,195 → kaufmännisch 199,20
    expect(Number(festzuschussCent(["1.1", "1.3"], 60))).toBe(23903 + 8066); // 134,44 × 60 % = 80,664
  });

  it("Krone mit Verblendung, Regelversorgung 532,83 €, ohne Bonus, Plan 2026: Kasse 319,69 €, Eigenanteil 213,14 €", () => {
    const f: ZeFall = { art: "regel", befunde: ["1.1", "1.3"], kostenCent: 53283, versichert: "GKV", bonus: 0, haertefall: false, jahr: 2026, erstattungPromille: 0 };
    expect(nachrechnen(f)).toEqual({ kasse: 31969, eigen: 21314, erstattet: 0, netto: 21314 });
    const { o, p } = alsOption(f);
    expect(abweichung(money(o, p), nachrechnen(f))).toBeLessThanOrEqual(TOLERANZ_CENT);
  });

  it("gleichartige Krone 890 €, 10 Jahre Bonus, Plan 2027, Zusatzversicherung 80 %", () => {
    const f: ZeFall = { art: "gleichartig", befunde: ["1.1", "1.3"], kostenCent: 89000, versichert: "GKV", bonus: 10, haertefall: false, jahr: 2027, erstattungPromille: 800 };
    // 398,39 × 65 % = 258,9535 → 258,95; 134,44 × 65 % = 87,386 → 87,39; Kasse 346,34; Eigenanteil 543,66; erstattet 434,928
    const n = nachrechnen(f);
    expect(n.kasse).toBe(34634);
    expect(n.eigen).toBe(54366);
    expect(n.erstattet).toBeCloseTo(43492.8, 6);
    const { o, p } = alsOption(f);
    expect(abweichung(money(o, p), n)).toBeLessThanOrEqual(TOLERANZ_CENT);
  });

  it("Härtefall: Regelversorgung ganz von der Kasse, andere Versorgung doppelter Festzuschuss, nie mehr als die Kosten", () => {
    const regel: ZeFall = { art: "regel", befunde: ["2.1"], kostenCent: 104500, versichert: "GKV", bonus: 0, haertefall: true, jahr: 2026, erstattungPromille: 0 };
    expect(nachrechnen(regel)).toMatchObject({ kasse: 104500, eigen: 0 });
    const andere: ZeFall = { ...regel, art: "andersartig", kostenCent: 280000 };
    expect(nachrechnen(andere)).toMatchObject({ kasse: 92160, eigen: 187840 });
    const guenstig: ZeFall = { ...regel, art: "gleichartig", kostenCent: 80000 };
    expect(nachrechnen(guenstig)).toMatchObject({ kasse: 80000, eigen: 0 });
    for (const f of [regel, andere, guenstig]) {
      const { o, p } = alsOption(f);
      expect(abweichung(money(o, p), nachrechnen(f))).toBeLessThanOrEqual(TOLERANZ_CENT);
    }
  });

  it("privat versichert: Der Tarif erstattet seinen Satz von den Gesamtkosten, Bonus und Härtefall spielen keine Rolle", () => {
    const f: ZeFall = { art: "andersartig", befunde: ["2.1"], kostenCent: 250000, versichert: "PKV", bonus: 10, haertefall: true, jahr: 2026, erstattungPromille: 750 };
    expect(nachrechnen(f)).toEqual({ kasse: 187500, eigen: 62500, erstattet: 0, netto: 62500 });
    const { o, p } = alsOption(f);
    expect(abweichung(money(o, p), nachrechnen(f))).toBeLessThanOrEqual(TOLERANZ_CENT);
  });
});

describe("Zweitrechner: 10.000 zufällige Fälle mit festem Startwert", () => {
  it("6.000 Fälle Zahnersatz: Kassenanteil, Eigenanteil, Erstattung und Rest stimmen auf 1 Cent", () => {
    const z = zufall(20261116);
    const fehler: string[] = [];
    let geprueft = 0;
    let groessteAbweichung = 0;
    for (let i = 0; i < 6000; i++) {
      const art = z.aus(["regel", "gleichartig", "andersartig"] as const);
      const befunde = Array.from({ length: z.ganz(1, 4) }, () => z.aus(BEFUNDE));
      const regelCent = befunde.reduce((s, b) => s + Number(inCent(FESTZUSCHUSS_BEFUNDE[b].euro)), 0);
      // Regelversorgung: meist die Beträge der Tabelle, sonst etwas darüber oder darunter (Punktwert, Labor).
      const kostenCent = art === "regel" && z.wahr(0.6) ? regelCent : art === "regel" ? Math.max(100, regelCent + z.ganz(-15000, 15000)) : z.ganz(5000, 600000);
      const f: ZeFall = {
        art, befunde, kostenCent,
        versichert: z.wahr(0.2) ? "PKV" : "GKV",
        bonus: z.aus([0, 5, 10] as const),
        haertefall: z.wahr(0.15),
        jahr: z.aus([2026, 2027] as const),
        erstattungPromille: z.wahr(0.4) ? 0 : z.aus([250, 500, 625, 700, 800, 900, 1000, z.ganz(0, 1000)]),
      };
      const { o, p } = alsOption(f);
      // Das Bewilligungsjahr kommt mal aus den Patientenangaben, mal als eigener Wert (beide Wege gibt es im Produkt).
      const produkt = i % 2 ? money(o, p) : money(o, { ...p, zuschussJahr: f.jahr === 2026 ? 2027 : 2026 }, f.jahr);
      const eigen = nachrechnen(f);
      const d = abweichung(produkt, eigen);
      geprueft++;
      groessteAbweichung = Math.max(groessteAbweichung, d);
      if (d > TOLERANZ_CENT) fehler.push(`Fall ${i}: ${JSON.stringify(f)} Produkt ${JSON.stringify(produkt)} Nachrechnung ${JSON.stringify(eigen)} Abweichung ${d.toFixed(3)} Cent`);
    }
    expect(geprueft).toBe(6000);
    expect(fehler.slice(0, 10), `${fehler.length} Abweichungen über 1 Cent`).toEqual([]);
    expect(groessteAbweichung).toBeLessThanOrEqual(TOLERANZ_CENT);
  });

  it("jede Kombination aus Befund, Bonus und Bewilligungsjahr einzeln: Festzuschuss auf den Cent gleich, auch bei halben Cent", () => {
    let kombinationen = 0;
    let halbe = 0;
    for (const jahr of [2026, 2027] as const) {
      for (const bonus of [0, 5, 10] as const) {
        for (const befund of BEFUNDE) {
          const prozent = Math.round(FESTZUSCHUSS_SAETZE[jahr][bonus] * 100);
          // Kosten weit über dem Festzuschuss, damit die Kasse genau den Festzuschuss zahlt.
          const f: ZeFall = { art: "andersartig", befunde: [befund], kostenCent: 900000, versichert: "GKV", bonus, haertefall: false, jahr, erstattungPromille: 0 };
          const { o, p } = alsOption(f);
          const produktCent = Math.round(money(o, p).kasse * 100);
          expect(produktCent, `Befund ${befund}, ${prozent} %, Plan ${jahr}`).toBe(Number(festzuschussCent([befund], prozent)));
          kombinationen++;
          if (halberCent(befund, prozent)) halbe++;
        }
      }
    }
    expect(kombinationen).toBe(BEFUNDE.length * 6);
    // Die Grenzfälle kommen wirklich vor (sonst prüfte der Test sie nicht).
    expect(halbe).toBeGreaterThan(0);
  });

  it("2.000 Fälle Zuzahlung: Heilmittel und Hilfs-/Arzneimittel vor und ab 1.1.2027", () => {
    const z = zufall(20270101);
    // 1.1.2027, 0:00 Uhr in Deutschland (Winterzeit, eine Stunde vor Weltzeit)
    const stichtag = Date.UTC(2026, 11, 31, 23, 0, 0);
    const fehler: string[] = [];
    let davor = 0, danach = 0;
    for (let i = 0; i < 2000; i++) {
      const art = z.aus(["heilmittel", "hilfsmittel", true] as const);
      const kostenCent = z.wahr(0.3) ? z.ganz(1, 20000) : z.ganz(1, 400000);
      // Zeitpunkte rund um den Stichtag, oft nur Sekunden davor oder danach
      const abstand = z.wahr(0.3) ? z.ganz(-3600, 3600) * 1000 : z.ganz(-400, 400) * 86400000 + z.ganz(0, 86399) * 1000;
      const zeit = new Date(stichtag + abstand);
      const neu = zeit.getTime() >= stichtag;
      if (neu) danach++;
      else davor++;
      let eigenCent: number;
      if (art === "hilfsmittel") {
        const [min, max] = neu ? [750, 1500] : [500, 1000];
        eigenCent = Math.min(kostenCent, Math.min(max, Math.max(min, kostenCent / 10)));
      } else {
        // Heilmittel (auch die allgemeine Angabe „true“ rechnet das Produkt als Heilmittel-Verordnung)
        eigenCent = kostenCent / 10 + (neu ? 1500 : 1000);
      }
      const produktCent = zuzahlungBetrag(art, kostenCent / 100, zeit) * 100;
      if (Math.abs(produktCent - eigenCent) > TOLERANZ_CENT) fehler.push(`Fall ${i}: ${String(art)} ${kostenCent} Cent am ${zeit.toISOString()} Produkt ${produktCent.toFixed(3)} Nachrechnung ${eigenCent}`);
    }
    expect(Math.min(davor, danach)).toBeGreaterThan(500);
    expect(fehler.slice(0, 10), `${fehler.length} Abweichungen über 1 Cent`).toEqual([]);
    expect(zuzahlungBetrag(undefined, 100, new Date(stichtag))).toBe(0);
    expect(zuzahlungBetrag(false, 100, new Date(stichtag))).toBe(0);
  });

  it("2.000 Fälle GOÄ und GOZ: Punkte × Punktwert × Faktor, kaufmännisch auf den Cent", () => {
    const z = zufall(5082873);
    // Punktwerte in hunderttausendstel Cent (§ 5 Abs. 1 GOÄ: 5,82873 Cent; § 5 Abs. 1 GOZ: 5,62421 Cent)
    const PUNKTWERT = { GOAE: BigInt(582873), GOZ: BigInt(562421) } as const;
    const fehler: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const werk = z.aus(["GOAE", "GOZ"] as const);
      const punkte = z.wahr(0.5) ? z.aus([40, 50, 70, 80, 100, 110, 130, 150, 180, 200, 250, 300, 360, 500, 750, 900, 1200, 1500, 2000, 3500]) : z.ganz(1, 6000);
      // Faktor in Hundertsteln: die üblichen Sätze und beliebige zwischen 1,00 und 3,50
      const faktorHundertstel = z.wahr(0.5) ? z.aus([100, 115, 130, 180, 230, 250, 350]) : z.ganz(100, 350);
      const zaehler = BigInt(punkte) * PUNKTWERT[werk] * BigInt(faktorHundertstel);
      const nenner = BigInt(100000) * HUNDERT;
      const eigenCent = Number(runden(zaehler, nenner));
      const produkt = betragCent({ werk, punkte, faktor: faktorHundertstel / 100 });
      if (Math.abs(produkt - eigenCent) > 1) fehler.push(`Fall ${i}: ${werk} ${punkte} Punkte × ${faktorHundertstel / 100} Produkt ${produkt} Nachrechnung ${eigenCent}`);
      // Mehrere gleiche Leistungen: je Leistung gerundet, dann mal Anzahl.
      const anzahl = z.ganz(2, 6);
      expect(betragCent({ werk, punkte, faktor: faktorHundertstel / 100, anzahl })).toBe(produkt * anzahl);
    }
    expect(fehler.slice(0, 10), `${fehler.length} Abweichungen über 1 Cent`).toEqual([]);
  });

  it("bekannte Gebühren: GOÄ 1 und 3, GOZ 0010 und 2197", () => {
    expect(betragCent({ werk: "GOAE", punkte: 80, faktor: 1 })).toBe(466); // 466,2984
    expect(betragCent({ werk: "GOAE", punkte: 80, faktor: 2.3 })).toBe(1072); // 1072,486
    expect(betragCent({ werk: "GOAE", punkte: 150, faktor: 2.3 })).toBe(2011); // 2010,912
    expect(betragCent({ werk: "GOZ", punkte: 100, faktor: 2.3 })).toBe(1294); // 1293,568
    expect(betragCent({ werk: "GOZ", punkte: 130, faktor: 2.3 })).toBe(1682); // 1681,639
    expect(betragCent({ werk: "GOZ", punkte: 130, faktor: 3.5 })).toBe(2559); // 2559,016
  });

  it("bekannte Zuzahlungen", () => {
    const alt = new Date("2026-11-16T10:00:00Z");
    const neu = new Date("2027-01-01T10:00:00Z");
    expect(zuzahlungBetrag("heilmittel", 150, alt)).toBeCloseTo(25, 9);
    expect(zuzahlungBetrag("heilmittel", 150, neu)).toBeCloseTo(30, 9);
    expect([3, 30, 80, 200].map((k) => zuzahlungBetrag("hilfsmittel", k, alt))).toEqual([3, 5, 8, 10]);
    expect([3, 30, 80, 120, 200].map((k) => zuzahlungBetrag("hilfsmittel", k, neu))).toEqual([3, 7.5, 8, 12, 15]);
    // Silvester 23:59:59 in Deutschland gilt noch alt, eine Sekunde später neu.
    expect(zuzahlungBetrag("heilmittel", 100, new Date("2026-12-31T22:59:59Z"))).toBeCloseTo(20, 9);
    expect(zuzahlungBetrag("heilmittel", 100, new Date("2026-12-31T23:00:00Z"))).toBeCloseTo(25, 9);
  });
});
