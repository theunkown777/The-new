import { describe, expect, it } from "vitest";
import {
  MIN_SEKUNDEN, STANDARD_ANLAESSE, STEMPEL_MAX_STD, absageText, anfrageSchema, anlaesseLesen, einbettung, geburtstag, istReserviert, kennungGueltig, lockfeldGefuellt,
  namensSchluessel, neueKennung, patientAbgleich, reservierungen, reserviertBis, stempel, stempelPruefen, zusageText,
} from "./terminanfrage";
import { freieZeiten, istFrei, type FreieZeitenEingabe } from "./buchung";

const KENNUNG = "abcDEF123456_-xy";
const gut = {
  vorname: "Anna", nachname: "Müller-Lüdenscheidt", geburtsdatum: "1985-03-14", mobil: "0171 2345678", email: "", anlass: "Erster Termin",
  start: "2026-11-18T09:00:00.000Z", datenschutz: true, website: "", stempel: "x",
};

describe("Neupatienten-Buchung: Prüfung der Eingaben", () => {
  it("nimmt eine vollständige Anmeldung an", () => {
    expect(anfrageSchema.safeParse(gut).success).toBe(true);
    expect(anfrageSchema.safeParse({ ...gut, mobil: "", email: "anna@example.org" }).success).toBe(true);
    expect(anfrageSchema.safeParse({ ...gut, vorname: "José María", nachname: "O’Neil" }).success).toBe(true);
  });
  it("verlangt Mobilnummer oder E-Mail", () => {
    const p = anfrageSchema.safeParse({ ...gut, mobil: "", email: "" });
    expect(p.success).toBe(false);
    if (!p.success) expect(p.error.issues[0].message).toMatch(/Mobilnummer oder eine E-Mail/);
  });
  it("verlangt das Häkchen zu den Datenschutzhinweisen", () => {
    expect(anfrageSchema.safeParse({ ...gut, datenschutz: false }).success).toBe(false);
    const { datenschutz: _weg, ...ohne } = gut;
    expect(anfrageSchema.safeParse(ohne).success).toBe(false);
  });
  it("weist unmögliche Geburtsdaten ab", () => {
    for (const geburtsdatum of ["1985-02-31", "85-03-14", "14.03.1985", "1899-12-31", "2999-01-01", ""]) {
      expect(anfrageSchema.safeParse({ ...gut, geburtsdatum }).success, geburtsdatum).toBe(false);
    }
  });
  it("weist Namen mit Ziffern, Adressen oder Markup ab", () => {
    for (const vorname of ["A", "Anna1", "http://x.test", "<b>Anna</b>", "x".repeat(61)]) {
      expect(anfrageSchema.safeParse({ ...gut, vorname }).success, vorname).toBe(false);
    }
  });
  it("weist unvollständige Kontaktangaben ab", () => {
    expect(anfrageSchema.safeParse({ ...gut, mobil: "12345" }).success).toBe(false);
    expect(anfrageSchema.safeParse({ ...gut, mobil: "ruf mich an" }).success).toBe(false);
    expect(anfrageSchema.safeParse({ ...gut, mobil: "", email: "anna@" }).success).toBe(false);
  });
  it("weist fehlende Zeit, fehlenden Anlass und fremde Felder ab", () => {
    expect(anfrageSchema.safeParse({ ...gut, start: "morgen" }).success).toBe(false);
    expect(anfrageSchema.safeParse({ ...gut, anlass: "" }).success).toBe(false);
    expect(anfrageSchema.safeParse({ ...gut, practiceId: "fremd" }).success).toBe(false);
    expect(anfrageSchema.safeParse({ ...gut, status: "BESTAETIGT" }).success).toBe(false);
  });
  it("erkennt das ausgefüllte Lockfeld", () => {
    expect(lockfeldGefuellt({ website: "" })).toBe(false);
    expect(lockfeldGefuellt({ website: "   " })).toBe(false);
    expect(lockfeldGefuellt({})).toBe(false);
    expect(lockfeldGefuellt({ website: "https://spam.test" })).toBe(true);
  });
  it("speichert das Geburtsdatum als Mitternacht UTC", () => {
    expect(geburtstag("1985-03-14").toISOString()).toBe("1985-03-14T00:00:00.000Z");
  });
});

describe("Neupatienten-Buchung: Zeitstempel der Seite", () => {
  const t0 = Date.UTC(2026, 10, 15, 10, 0, 0);
  it("ist erst nach der Mindestzeit gültig", () => {
    const s = stempel(KENNUNG, t0);
    expect(stempelPruefen(s, KENNUNG, t0 + 1000)).toBe("zu-schnell");
    expect(stempelPruefen(s, KENNUNG, t0 + MIN_SEKUNDEN * 1000 - 1)).toBe("zu-schnell");
    expect(stempelPruefen(s, KENNUNG, t0 + MIN_SEKUNDEN * 1000)).toBe("ok");
    expect(stempelPruefen(s, KENNUNG, t0 + 20 * 60_000)).toBe("ok");
  });
  it("läuft ab", () => {
    const s = stempel(KENNUNG, t0);
    expect(stempelPruefen(s, KENNUNG, t0 + STEMPEL_MAX_STD * 3600e3 + 1)).toBe("abgelaufen");
  });
  it("gilt nur für die eigene Praxis und nur unverändert", () => {
    const s = stempel(KENNUNG, t0);
    const spaeter = t0 + 60_000;
    expect(stempelPruefen(s, "andereKennung123", spaeter)).toBe("ungueltig");
    const [zeit, sig] = s.split(".");
    expect(stempelPruefen(`${Number(zeit) - 60_000}.${sig}`, KENNUNG, spaeter)).toBe("ungueltig");
    expect(stempelPruefen(`${zeit}.${sig.slice(0, -2)}xx`, KENNUNG, spaeter)).toBe("ungueltig");
    expect(stempelPruefen(`${zeit}.${sig}.mehr`, KENNUNG, spaeter)).toBe("ungueltig");
  });
  it("weist leere, kaputte und zukünftige Stempel ab", () => {
    expect(stempelPruefen("", KENNUNG, t0)).toBe("ungueltig");
    expect(stempelPruefen(null, KENNUNG, t0)).toBe("ungueltig");
    expect(stempelPruefen("abc", KENNUNG, t0)).toBe("ungueltig");
    expect(stempelPruefen(stempel(KENNUNG, t0 + 3600e3), KENNUNG, t0)).toBe("ungueltig");
  });
});

describe("Neupatienten-Buchung: Reservierung", () => {
  const jetzt = new Date("2026-11-16T08:00:00Z"); // Montag
  const start = new Date("2026-11-18T08:00:00Z"); // Mittwoch, 09:00 Uhr in Berlin
  const lage = (termine: { start: Date; minutes: number }[]): FreieZeitenEingabe => ({
    sprechzeiten: { "3": [["09:00", "10:00"]] }, minuten: 30, vorlaufStd: 0, tageVoraus: 3, plaetze: 1, termine, belegungen: [], jetzt,
  });
  it("reserviert 24 Stunden", () => {
    expect(reserviertBis(jetzt).toISOString()).toBe("2026-11-17T08:00:00.000Z");
  });
  it("zählt nur offene Anfragen mit laufender Frist", () => {
    const bis = reserviertBis(jetzt);
    expect(istReserviert({ status: "OFFEN", reserviertBis: bis }, jetzt)).toBe(true);
    expect(istReserviert({ status: "OFFEN", reserviertBis: bis }, new Date(bis.getTime() + 1))).toBe(false);
    expect(istReserviert({ status: "OFFEN", reserviertBis: bis }, bis)).toBe(false);
    expect(istReserviert({ status: "ABGELEHNT", reserviertBis: bis }, jetzt)).toBe(false);
    // Bestätigt: Die Zeit belegt jetzt der angelegte Termin, nicht mehr die Anfrage.
    expect(istReserviert({ status: "BESTAETIGT", reserviertBis: bis }, jetzt)).toBe(false);
  });
  it("eine reservierte Zeit gilt in der Frei-Berechnung als belegt", () => {
    expect(istFrei(lage([]), start.toISOString())).toBe(true);
    const anfragen = [{ start, minutes: 30, status: "OFFEN", reserviertBis: reserviertBis(jetzt) }];
    const belegt = reservierungen(anfragen, jetzt);
    expect(belegt).toEqual([{ start, minutes: 30 }]);
    expect(istFrei(lage(belegt), start.toISOString())).toBe(false);
    // Die Nachbarzeit bleibt frei.
    expect(freieZeiten(lage(belegt)).flatMap((t) => t.zeiten)).toEqual(["2026-11-18T08:30:00.000Z"]);
  });
  it("nach Ablauf der Frist oder nach Ablehnung ist die Zeit wieder frei", () => {
    const abgelaufen = [{ start, minutes: 30, status: "OFFEN", reserviertBis: new Date(jetzt.getTime() - 1000) }];
    expect(reservierungen(abgelaufen, jetzt)).toEqual([]);
    const abgelehnt = [{ start, minutes: 30, status: "ABGELEHNT", reserviertBis: reserviertBis(jetzt) }];
    expect(istFrei(lage(reservierungen(abgelehnt, jetzt)), start.toISOString())).toBe(true);
  });
  it("mit zwei Plätzen bleibt die Zeit trotz einer Reservierung frei", () => {
    const belegt = reservierungen([{ start, minutes: 30, status: "OFFEN", reserviertBis: reserviertBis(jetzt) }], jetzt);
    expect(istFrei({ ...lage(belegt), plaetze: 2 }, start.toISOString())).toBe(true);
    expect(istFrei({ ...lage([...belegt, ...belegt]), plaetze: 2 }, start.toISOString())).toBe(false);
  });
});

describe("Neupatienten-Buchung: Abgleich mit vorhandenen Patienten", () => {
  const tag = (t: string) => new Date(`${t}T00:00:00Z`);
  const anfrage = { firstName: "Anna", lastName: "Müller", birthDate: tag("1985-03-14") };
  const p = (id: string, firstName: string, lastName: string, geb: string | null) => ({ id, firstName, lastName, birthDate: geb ? tag(geb) : null });
  it("findet gleichen Namen mit gleichem Geburtsdatum", () => {
    expect(patientAbgleich(anfrage, [p("1", "Anna", "Müller", "1985-03-14")]).map((x) => x.id)).toEqual(["1"]);
  });
  it("ist bei Schreibweise großzügig: Groß/Klein, Umlaute, Akzente, Bindestrich, Leerzeichen", () => {
    expect(namensSchluessel("Müller")).toBe(namensSchluessel("MUELLER"));
    expect(namensSchluessel("Weiß")).toBe(namensSchluessel("weiss"));
    expect(namensSchluessel("René")).toBe(namensSchluessel("Rene"));
    expect(namensSchluessel("Meyer-Schmidt")).toBe(namensSchluessel("Meyer Schmidt"));
    expect(patientAbgleich(anfrage, [p("1", " anna ", "MUELLER", "1985-03-14")]).map((x) => x.id)).toEqual(["1"]);
  });
  it("verlangt das gleiche Geburtsdatum", () => {
    expect(patientAbgleich(anfrage, [p("1", "Anna", "Müller", "1985-03-15"), p("2", "Anna", "Müller", null)])).toEqual([]);
  });
  it("verlangt den gleichen Nachnamen", () => {
    expect(patientAbgleich(anfrage, [p("1", "Anna", "Möller", "1985-03-14"), p("2", "Anna", "Muller", "1985-03-14")])).toEqual([]);
  });
  it("erkennt den ersten Vornamen und stellt genaue Treffer nach vorn", () => {
    const liste = [p("zweit", "Anna Maria", "Müller", "1985-03-14"), p("genau", "Anna", "Müller", "1985-03-14"), p("zwilling", "Berta", "Müller", "1985-03-14")];
    expect(patientAbgleich(anfrage, liste).map((x) => x.id)).toEqual(["genau", "zweit"]);
    expect(patientAbgleich({ ...anfrage, firstName: "Anna-Maria" }, [p("1", "Anna", "Müller", "1985-03-14")]).map((x) => x.id)).toEqual(["1"]);
  });
  it("liefert nichts ohne Bestand", () => {
    expect(patientAbgleich(anfrage, [])).toEqual([]);
  });
});

describe("Neupatienten-Buchung: Kennung, Anlässe, Texte", () => {
  it("erzeugt nicht erratbare Kennungen mit mindestens 12 Zeichen", () => {
    const a = neueKennung(), b = neueKennung();
    expect(a.length).toBeGreaterThanOrEqual(12);
    expect(a).not.toBe(b);
    expect(kennungGueltig(a)).toBe(true);
    expect(kennungGueltig("kurz")).toBe(false);
    expect(kennungGueltig("mit/schraegstrich12")).toBe(false);
  });
  it("liest die Anlässe der Praxis, sonst die Standardliste", () => {
    expect(anlaesseLesen(null)).toEqual(STANDARD_ANLAESSE);
    expect(anlaesseLesen("kaputt")).toEqual(STANDARD_ANLAESSE);
    expect(anlaesseLesen([])).toEqual(STANDARD_ANLAESSE);
    expect(anlaesseLesen(["Beratung", " Beratung ", "Erster  Termin"])).toEqual(["Beratung", "Erster Termin"]);
  });
  it("schreibt Zusage und Absage ohne Anlass", () => {
    const a = { firstName: "Anna", practiceName: "Praxis am Markt", start: new Date("2026-11-18T09:00:00Z") };
    expect(zusageText(a)).toContain("10:00 Uhr");
    expect(absageText(a)).toContain("leider nicht");
    expect(zusageText(a) + absageText(a)).not.toMatch(/Erster Termin|Beschwerden/);
  });
  it("liefert Knopf und Rahmen für die Website der Praxis", () => {
    const e = einbettung("https://sorrida.test/t/abc");
    expect(e.knopf).toMatch(/^<a href="https:\/\/sorrida\.test\/t\/abc"/);
    expect(e.rahmen).toMatch(/^<iframe src="https:\/\/sorrida\.test\/t\/abc"/);
  });
});
