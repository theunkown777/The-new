import { describe, expect, it } from "vitest";
import {
  BAUSTEINE, GEBUEHRENORDNUNGEN, HINWEIS_ENTWURF, MAX_POSTEN, ZITAT_BEMESSUNG, briefAlsText, briefDateiname, briefMoeglich, briefSchema, briefText, druckbar, faktorLesen, faktorText, postenBegruendung, postenTitel,
} from "@/lib/erstattungsbrief";

const KONTEXT = { patientName: "Anna Meier", practiceName: "Praxis am Markt", rechnungNummer: "2026-0042", rechnungDatum: "03.11.2026", heute: "15.11.2026" };
const eingabe = (ueber: Record<string, unknown> = {}) =>
  briefSchema.parse({
    gebuehrenordnung: "GOZ",
    versicherung: "Beispiel Krankenversicherung AG",
    posten: [{ nummer: "2197", bezeichnung: "Adhäsive Befestigung", faktor: "3,5", gruende: ["zeitaufwand", "umstaende"], ergaenzung: "" }],
    ...ueber,
  });

describe("Textbausteine", () => {
  it("decken genau die Kriterien aus § 5 Abs. 2 ab", () => {
    expect(BAUSTEINE.map((b) => b.key)).toEqual(["zeitaufwand", "schwierigkeit", "umstaende", "krankheitsfall"]);
    expect(BAUSTEINE.map((b) => b.label)).toEqual(["Überdurchschnittlicher Zeitaufwand", "Besondere Schwierigkeit der Leistung", "Besondere Umstände bei der Ausführung", "Schwierigkeit des Krankheitsfalles"]);
  });
  it("nennen jedes Kriterium so, wie es in der Verordnung steht", () => {
    expect(ZITAT_BEMESSUNG).toContain("Schwierigkeit und des Zeitaufwandes der einzelnen Leistung sowie der Umstände bei der Ausführung");
    for (const b of BAUSTEINE.filter((x) => x.key !== "krankheitsfall")) {
      const kern = b.kriterium.replace("Zeitaufwand ", "Zeitaufwandes ").replace(" der einzelnen Leistung", "");
      expect(ZITAT_BEMESSUNG).toContain(kern.split(" ")[0]);
    }
  });
  it("sind ganze Sätze ohne Diagnose, Betrag oder Versprechen", () => {
    for (const b of BAUSTEINE) {
      expect(b.satz).toMatch(/^[A-ZÄÖÜ].*\.$/);
      expect(b.satz).not.toMatch(/€|Diagnose|Anspruch|müssen Sie|rechtswidrig|verpflichtet/i);
    }
  });
  it("kennt GOÄ und GOZ mit den richtigen Fundstellen", () => {
    expect(GEBUEHRENORDNUNGEN.GOAE).toMatchObject({ kurz: "GOÄ", bemessung: "§ 5 Abs. 2 GOÄ", erlaeuterung: "§ 12 Abs. 3 GOÄ" });
    expect(GEBUEHRENORDNUNGEN.GOZ).toMatchObject({ kurz: "GOZ", bemessung: "§ 5 Abs. 2 GOZ", erlaeuterung: "§ 10 Abs. 3 GOZ" });
  });
  it("der Hinweis im Dialog steht wörtlich fest", () => {
    expect(HINWEIS_ENTWURF).toBe("Entwurf – bitte prüfen. Sorrida leistet keine Rechtsberatung; der Brief ersetzt keine anwaltliche Vertretung.");
  });
});

describe("Steigerungssatz", () => {
  it("liest übliche Schreibweisen", () => {
    expect(faktorLesen("3,5")).toBe(3.5);
    expect(faktorLesen("3.5")).toBe(3.5);
    expect(faktorLesen(" 2,3fach ")).toBe(2.3);
    expect(faktorLesen("2,3-fach")).toBe(2.3);
    expect(faktorLesen("3,5 fache")).toBe(3.5);
    expect(faktorLesen(3.5)).toBe(3.5);
    expect(faktorLesen("1")).toBe(1);
  });
  it("lehnt Unlesbares und Unmögliches ab", () => {
    expect(faktorLesen("")).toBeNull();
    expect(faktorLesen("hoch")).toBeNull();
    expect(faktorLesen("0,5")).toBeNull();
    expect(faktorLesen("35")).toBeNull();
    expect(faktorLesen("3,5 €")).toBeNull();
    expect(faktorLesen(null)).toBeNull();
    expect(faktorLesen(Number.NaN)).toBeNull();
  });
  it("schreibt wie die Verordnung", () => {
    expect(faktorText(3.5)).toBe("3,5fach");
    expect(faktorText(2.3)).toBe("2,3fach");
    expect(faktorText(3)).toBe("3,0fach");
    expect(faktorText(1.15)).toBe("1,15fach");
  });
});

describe("Eingabe prüfen", () => {
  it("nimmt eine gültige Eingabe an und füllt Leeres", () => {
    const e = eingabe();
    expect(e.posten[0]).toEqual({ nummer: "2197", bezeichnung: "Adhäsive Befestigung", faktor: 3.5, gruende: ["zeitaufwand", "umstaende"], ergaenzung: "" });
    expect(e).toMatchObject({ versicherungAnschrift: "", versicherungsnummer: "", bezug: "", absenderAnschrift: "", ort: "" });
  });
  it("erlaubt Posten ohne Ziffer und ohne Steigerungssatz (freier Text)", () => {
    const e = eingabe({ posten: [{ bezeichnung: "Beratung", ergaenzung: "Ausführliches Gespräch von 40 Minuten" }] });
    expect(e.posten[0]).toMatchObject({ nummer: "", faktor: null, gruende: [], ergaenzung: "Ausführliches Gespräch von 40 Minuten" });
  });
  it("verlangt je Posten eine Bezeichnung und eine Begründung", () => {
    const ohneGrund = briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [{ bezeichnung: "Füllung", gruende: [], ergaenzung: " " }] });
    expect(ohneGrund.success).toBe(false);
    expect(!ohneGrund.success && ohneGrund.error.issues[0].message).toMatch(/mindestens einen Grund/);
    const ohneName = briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [{ bezeichnung: "", gruende: ["zeitaufwand"] }] });
    expect(!ohneName.success && ohneName.error.issues[0].message).toMatch(/Bezeichnung/);
  });
  it("verlangt mindestens einen und höchstens 20 Posten", () => {
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [] }).success).toBe(false);
    const viele = Array.from({ length: MAX_POSTEN + 1 }, () => ({ bezeichnung: "Posten", gruende: ["zeitaufwand"] }));
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: viele }).success).toBe(false);
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: viele.slice(0, MAX_POSTEN) }).success).toBe(true);
  });
  it("lehnt unbekannte Bausteine, fremde Gebührenordnungen und unlesbare Sätze ab", () => {
    const p = { bezeichnung: "Füllung", gruende: ["zeitaufwand"] };
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [{ ...p, gruende: ["erfunden"] }] }).success).toBe(false);
    expect(briefSchema.safeParse({ gebuehrenordnung: "EBM", versicherung: "XY Versicherung", posten: [p] }).success).toBe(false);
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [{ ...p, faktor: "sehr hoch" }] }).success).toBe(false);
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "", posten: [p] }).success).toBe(false);
  });
  it("begrenzt die Länge der Ergänzung", () => {
    expect(briefSchema.safeParse({ gebuehrenordnung: "GOZ", versicherung: "XY Versicherung", posten: [{ bezeichnung: "Füllung", ergaenzung: "x".repeat(601) }] }).success).toBe(false);
  });
});

describe("Posten", () => {
  it("Titel mit Ziffer und Steigerungssatz", () => {
    expect(postenTitel({ nummer: "2197", bezeichnung: "Adhäsive Befestigung", faktor: 3.5 })).toBe("Nr. 2197 – Adhäsive Befestigung (Steigerungssatz 3,5fach)");
    expect(postenTitel({ nummer: "Nr. 5", bezeichnung: "Untersuchung", faktor: null })).toBe("Nr. 5 – Untersuchung");
    expect(postenTitel({ nummer: "", bezeichnung: "Beratung", faktor: null })).toBe("Beratung");
  });
  it("Begründung: Bausteine in fester Reihenfolge, dann die Ergänzung", () => {
    expect(postenBegruendung({ gruende: ["umstaende", "zeitaufwand"], ergaenzung: "" })).toBe(
      "Der Zeitaufwand für diese Leistung lag deutlich über dem Durchschnitt. Bei der Ausführung lagen besondere Umstände vor, die den Aufwand erhöht haben.",
    );
    expect(postenBegruendung({ gruende: ["schwierigkeit"], ergaenzung: "Stark eingeschränkte Mundöffnung" })).toBe("Die Leistung war in diesem Fall besonders schwierig auszuführen. Stark eingeschränkte Mundöffnung.");
    expect(postenBegruendung({ gruende: [], ergaenzung: "Nur eigener Text!" })).toBe("Nur eigener Text!");
  });
});

describe("Brieftext", () => {
  it("geht im Namen des Patienten an die Versicherung", () => {
    const b = briefText(eingabe({ versicherungAnschrift: "Postfach 1\n12345 Musterstadt", absenderAnschrift: "Weg 2\n54321 Beispielort", ort: "Beispielort", versicherungsnummer: "KV 123", bezug: "Schreiben vom 10.11.2026" }), KONTEXT);
    expect(b.absender).toEqual(["Anna Meier", "Weg 2", "54321 Beispielort"]);
    expect(b.empfaenger).toEqual(["Beispiel Krankenversicherung AG", "Postfach 1", "12345 Musterstadt"]);
    expect(b.ortDatum).toBe("Beispielort, 15.11.2026");
    expect(b.unterschrift).toBe("Anna Meier");
    expect(b.bezugszeilen).toEqual(["Versicherungsnummer: KV 123", "Ihr Zeichen / Ihr Schreiben: Schreiben vom 10.11.2026", "Rechnung von: Praxis am Markt"]);
  });
  it("nennt Rechnungsnummer und Rechnungsdatum im Betreff", () => {
    expect(briefText(eingabe(), KONTEXT).betreff).toBe("Rechnung Nr. 2026-0042 vom 03.11.2026 – Bitte um erneute Prüfung der Erstattung");
  });
  it("zitiert § 5 Abs. 2 wörtlich und nennt die passende Verordnung", () => {
    const goz = briefAlsText(briefText(eingabe(), KONTEXT));
    expect(goz).toContain("Nach § 5 Abs. 2 GOZ sind die Gebühren „unter Berücksichtigung der Schwierigkeit und des Zeitaufwandes der einzelnen Leistung sowie der Umstände bei der Ausführung nach billigem Ermessen zu bestimmen“.");
    expect(goz).toContain("(§ 10 Abs. 3 GOZ)");
    expect(goz).not.toContain("GOÄ");
    const goae = briefAlsText(briefText(eingabe({ gebuehrenordnung: "GOAE" }), KONTEXT));
    expect(goae).toContain("Nach § 5 Abs. 2 GOÄ");
    expect(goae).toContain("(§ 12 Abs. 3 GOÄ)");
    expect(goae).not.toContain("GOZ");
    // Das Zitat im Brief ist ein Stück des wörtlichen Satzes.
    const zitat = /„([^“]+)“/.exec(goz)![1];
    expect(ZITAT_BEMESSUNG).toContain(zitat);
  });
  it("listet die Posten nummeriert mit Begründung", () => {
    const b = briefText(eingabe({ posten: [
      { nummer: "2197", bezeichnung: "Adhäsive Befestigung", faktor: "3,5", gruende: ["zeitaufwand"] },
      { bezeichnung: "Aufbaufüllung", gruende: [], ergaenzung: "Tiefe Zerstörung, erschwerter Zugang" },
    ] }), KONTEXT);
    expect(b.posten).toEqual([
      { titel: "1. Nr. 2197 – Adhäsive Befestigung (Steigerungssatz 3,5fach)", text: "Der Zeitaufwand für diese Leistung lag deutlich über dem Durchschnitt." },
      { titel: "2. Aufbaufüllung", text: "Tiefe Zerstörung, erschwerter Zugang." },
    ]);
    expect(b.einleitung[0]).toContain("der folgenden Posten");
    expect(briefText(eingabe(), KONTEXT).einleitung[0]).toContain("des folgenden Postens");
  });
  it("enthält ohne Zutun der Praxis keine Diagnose, keinen Betrag und keine Drohung", () => {
    const text = briefAlsText(briefText(eingabe(), KONTEXT));
    expect(text).not.toMatch(/Diagnose|ICD|€|Euro|Anwalt|Klage|Frist|Ombudsmann|Verzug/i);
    expect(text).toContain("Sehr geehrte Damen und Herren,");
    expect(text).toContain("Mit freundlichen Grüßen");
    expect(text).toContain("Die Erläuterungen zu den einzelnen Posten stammen von Praxis am Markt.");
  });
  it("übernimmt, was die Praxis selbst eintippt – und nur das", () => {
    const text = briefAlsText(briefText(eingabe({ posten: [{ bezeichnung: "Füllung", gruende: [], ergaenzung: "Diagnose laut Praxis: tiefe Karies" }] }), KONTEXT));
    expect(text).toContain("Diagnose laut Praxis: tiefe Karies.");
  });
  it("enthält nicht den Entwurfs-Hinweis (der steht nur im Dialog)", () => {
    expect(briefAlsText(briefText(eingabe(), KONTEXT))).not.toContain("Entwurf");
  });
});

describe("Hilfen", () => {
  it("macht Text druckbar: einzeilig, ohne Steuerzeichen, Fremdes wird zu ?", () => {
    expect(druckbar("  Meier\n Anna\t ")).toBe("Meier Anna");
    expect(druckbar("Zeile 1\r\n\r\nZeile 2", true)).toBe("Zeile 1\nZeile 2");
    expect(druckbar("Größe „groß“ – 5 €")).toBe("Größe „groß“ – 5 €");
    expect(druckbar("Praxis 😀 Łódź")).toBe("Praxis ? ?ód?");
  });
  it("Dateiname ohne Patientennamen", () => {
    expect(briefDateiname("2026-0042")).toBe("Begleitbrief-Rechnung-2026-0042.pdf");
    expect(briefDateiname("A/7 ä")).toBe("Begleitbrief-Rechnung-A_7_.pdf");
  });
  it("wird nur für privat Versicherte angeboten", () => {
    expect(briefMoeglich("PKV")).toBe(true);
    expect(briefMoeglich("GKV")).toBe(false);
    expect(briefMoeglich(null)).toBe(false);
  });
});
