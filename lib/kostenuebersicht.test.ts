import { describe, expect, it } from "vitest";
import { ABGEWAEHLT, buildProposal, DEFAULT_PRICES, money, type ProposalInput } from "@/lib/proposals";
import { KOSTEN_EINREICHEN, hinweisText, kostenuebersicht } from "@/lib/kostenuebersicht";
import { buildKostenuebersichtPdf } from "@/lib/pdf";
import { LEERE_STAMMDATEN } from "@/lib/praxisStammdaten";

const patient = { age: 45, insurance: "GKV" as const, bonusYears: 0 as const, haertefall: false, erstattungProzent: 0 };
const input = { teeth: { "36": "zerstoert", "46": "fehlt" }, globals: { bleaching: true }, patient } as unknown as ProposalInput;
const items = buildProposal(input, DEFAULT_PRICES).filter((i) => i.options.length > 0);
const basis = { praxis: "Zahnarztpraxis Beispiel", items, patient, dental: true, therapie: false, now: new Date("2026-11-15T10:00:00Z") };
const mehr = items.find((i) => i.options.length > 1)!;

describe("Kostenübersicht für Patienten", () => {
  it("zeigt je Position alle Möglichkeiten mit Art und Eigenanteil", () => {
    const k = kostenuebersicht({ ...basis, praxisWahl: {}, patientWahl: null });
    expect(k.datum).toBe("15.11.2026");
    expect(k.positionen.length).toBe(items.length);
    k.positionen.forEach((p, i) => {
      expect(p.optionen.map((o) => o.name)).toEqual(items[i].options.map((o) => o.name));
      for (const o of p.optionen) {
        expect(o.art).not.toBe("");
        expect(o.eigen).toMatch(/€|Zuzahlung/);
        expect(o.markierung).toBe("");
      }
    });
  });

  it("rechnet ohne Wahl und ohne Vormerkung mit der Kassen- bzw. Regelleistung und hebt nichts hervor", () => {
    const k = kostenuebersicht({ ...basis, praxisWahl: {}, patientWahl: null });
    expect(k.grundlage).toBe("kasse");
    const erwartet = items.filter((i) => !(i.zusatz || (i.options.length === 1 && i.options[0].type !== "kasse" && i.options[0].type !== "regel"))).reduce((s, i) => s + money(i.options[0], patient).netto, 0);
    expect(k.summe).toBe(`ca. ${Math.round(erwartet).toLocaleString("de-DE")} €`);
    expect(k.summeText).toContain("Kassen- bzw. Regelleistung");
  });

  it("markiert die Vormerkung der Praxis, solange der Patient nichts gesendet hat", () => {
    const vor = mehr.options[mehr.options.length - 1];
    const k = kostenuebersicht({ ...basis, praxisWahl: { [mehr.key]: vor.id }, patientWahl: null });
    expect(k.grundlage).toBe("praxis");
    const marken = k.positionen.flatMap((p) => p.optionen).filter((o) => o.markierung);
    expect(marken.map((o) => [o.name, o.markierung])).toEqual([[vor.name, "von Ihrer Praxis vorgemerkt"]]);
  });

  it("zeigt nach dem Senden die Wahl des Patienten statt der Vormerkung", () => {
    const wahl = Object.fromEntries(items.map((i) => [i.key, i.options.length === 1 && i.options[0].type !== "kasse" && i.options[0].type !== "regel" ? ABGEWAEHLT : i.options[0].id]));
    const k = kostenuebersicht({ ...basis, praxisWahl: { [mehr.key]: mehr.options[mehr.options.length - 1].id }, patientWahl: wahl });
    expect(k.grundlage).toBe("patient");
    const marken = k.positionen.flatMap((p) => p.optionen).filter((o) => o.markierung);
    expect(new Set(marken.map((o) => o.markierung))).toEqual(new Set(["Ihre Wahl"]));
    expect(k.positionen.some((p) => p.abgewaehlt)).toBe(items.some((i) => wahl[i.key] === ABGEWAEHLT));
  });

  it("nennt die Praxisangaben nur, soweit vorhanden", () => {
    expect(kostenuebersicht({ ...basis, praxisWahl: {}, patientWahl: null }).praxisZeilen).toEqual([]);
    const k = kostenuebersicht({ ...basis, stammdaten: { ...LEERE_STAMMDATEN, strasse: "Hauptstr. 1", plzOrt: "10115 Berlin", telefon: "030 123456" }, praxisWahl: {}, patientWahl: null });
    expect(k.praxisZeilen).toEqual(["Hauptstr. 1", "10115 Berlin", "Telefon 030 123456"]);
  });

  it("trägt Hinweis und Einreichen-Zeile, aber keine internen Zahlen, Raten oder Wertungen", () => {
    const k = kostenuebersicht({ ...basis, praxisWahl: {}, patientWahl: null });
    expect(k.hinweis).toMatch(/^Unverbindliche Kostenschätzung/);
    expect(k.hinweis).not.toContain("Dieser Link");
    expect(k.einreichen).toBe(KOSTEN_EINREICHEN);
    expect(hinweisText({ gkv: true, dental: false, therapie: false })).toContain("GOÄ");
    expect(hinweisText({ gkv: true, dental: false, therapie: true })).toContain("Preisliste");
    const alles = JSON.stringify(k);
    expect(alles).not.toMatch(/Mehrumsatz|Volumen|Rate|Teilzahlung|Empfehlung|empfohlen|sinnvoll|beste|Geburt|Versichertennummer/i);
  });

  it("erzeugt ein PDF", async () => {
    const pdf = await buildKostenuebersichtPdf(kostenuebersicht({ ...basis, praxisWahl: {}, patientWahl: null }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
