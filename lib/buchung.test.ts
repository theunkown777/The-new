import { describe, expect, it } from "vitest";
import { STANDARD_SPRECHZEITEN, feiertage, freieZeiten, istFrei, sprechzeitenLesen, sprechzeitenSchema, uhr, type FreieZeitenEingabe } from "./buchung";

// Dienstag, 10.11.2026, 10:00 Uhr deutscher Zeit
const jetzt = new Date("2026-11-10T09:00:00Z");
const basis: FreieZeitenEingabe = { sprechzeiten: { "1": [["08:00", "10:00"]], "3": [["08:00", "09:00"], ["14:00", "15:00"]] }, minuten: 30, vorlaufStd: 0, tageVoraus: 7, plaetze: 1, termine: [], belegungen: [], jetzt };
const zeiten = (e: Partial<FreieZeitenEingabe> = {}) => freieZeiten({ ...basis, ...e }).map((t) => `${t.tag} ${t.zeiten.map(uhr).join(",")}`);

describe("Freie Termine für Patienten", () => {
  it("bietet nur Zeiten in der Sprechzeit an, in deutscher Uhrzeit", () => {
    expect(zeiten()).toEqual(["2026-11-11 08:00,08:30,14:00,14:30", "2026-11-16 08:00,08:30,09:00,09:30"]);
  });
  it("Termine aus Sorrida und aus dem Praxiskalender sperren ihr Zeitfenster", () => {
    expect(zeiten({ termine: [{ start: new Date("2026-11-11T07:00:00Z"), minutes: 30 }] })[0]).toBe("2026-11-11 08:30,14:00,14:30");
    // Kalendereintrag 08:15 bis 08:45 berührt beide Fenster am Vormittag
    expect(zeiten({ belegungen: [{ start: new Date("2026-11-11T07:15:00Z"), ende: new Date("2026-11-11T07:45:00Z") }] })[0]).toBe("2026-11-11 14:00,14:30");
    // Termin, der genau am Fensterende beginnt, stört nicht
    expect(zeiten({ termine: [{ start: new Date("2026-11-11T07:30:00Z"), minutes: 30 }] })[0]).toBe("2026-11-11 08:00,14:00,14:30");
  });
  it("mit zwei Behandlungsplätzen ist ein Fenster erst beim zweiten Termin voll", () => {
    const einer = [{ start: new Date("2026-11-11T07:00:00Z"), minutes: 30 }];
    expect(zeiten({ plaetze: 2, termine: einer })[0]).toBe("2026-11-11 08:00,08:30,14:00,14:30");
    expect(zeiten({ plaetze: 2, termine: [...einer, ...einer] })[0]).toBe("2026-11-11 08:30,14:00,14:30");
    expect(zeiten({ plaetze: 2, termine: einer, belegungen: [{ start: new Date("2026-11-11T07:00:00Z"), ende: new Date("2026-11-11T07:30:00Z") }] })[0]).toBe("2026-11-11 08:30,14:00,14:30");
  });
  it("ein ganztägiger Kalendereintrag (Urlaub) sperrt den Tag auch bei mehreren Plätzen", () => {
    const urlaub = [{ start: new Date("2026-11-10T23:00:00Z"), ende: new Date("2026-11-11T23:00:00Z"), ganztag: true }];
    expect(zeiten({ plaetze: 3, belegungen: urlaub })).toEqual(["2026-11-16 08:00,08:30,09:00,09:30"]);
  });
  it("beachtet Vorlauf und Buchungshorizont", () => {
    expect(zeiten({ vorlaufStd: 24 })[0]).toBe("2026-11-11 14:00,14:30"); // frühestens Mittwoch 10 Uhr
    expect(zeiten({ tageVoraus: 1 })).toEqual(["2026-11-11 08:00,08:30,14:00,14:30"]);
    // Heute vergangene Zeiten werden nicht angeboten
    expect(zeiten({ sprechzeiten: { "2": [["09:00", "11:00"]] }, tageVoraus: 0 })).toEqual(["2026-11-10 10:00,10:30"]);
  });
  it("lässt bundesweite Feiertage aus", () => {
    const f = feiertage(2026);
    expect(f.get("2026-04-03")).toBe("Karfreitag");
    expect(f.get("2026-04-06")).toBe("Ostermontag");
    expect(f.get("2026-05-14")).toBe("Christi Himmelfahrt");
    expect(f.get("2026-05-25")).toBe("Pfingstmontag");
    expect(feiertage(2027).get("2027-03-29")).toBe("Ostermontag");
    const weihnachten = freieZeiten({ ...basis, sprechzeiten: { "5": [["08:00", "09:00"]] }, jetzt: new Date("2026-12-21T09:00:00Z"), tageVoraus: 7 });
    expect(weihnachten.map((t) => t.tag)).toEqual([]); // Freitag, 25.12.
  });
  it("rechnet über die Zeitumstellung richtig (Sprechzeit bleibt 8 Uhr)", () => {
    const sommer = freieZeiten({ ...basis, sprechzeiten: { "1": [["08:00", "08:30"]] }, jetzt: new Date("2026-03-27T09:00:00Z"), tageVoraus: 4 });
    expect(sommer[0].zeiten).toEqual(["2026-03-30T06:00:00.000Z"]); // Montag nach der Umstellung: 8 Uhr = 6 Uhr UTC
  });
  it("prüft beim Buchen genau das gewählte Fenster", () => {
    expect(istFrei(basis, "2026-11-11T07:00:00.000Z")).toBe(true);
    expect(istFrei(basis, "2026-11-11T07:10:00.000Z")).toBe(false);
    expect(istFrei({ ...basis, termine: [{ start: new Date("2026-11-11T07:00:00Z"), minutes: 30 }] }, "2026-11-11T07:00:00.000Z")).toBe(false);
  });
  it("Sprechzeiten: ungültige Angaben werden abgelehnt, leere durch die Vorgabe ersetzt", () => {
    expect(sprechzeitenSchema.safeParse({ "1": [["08:00", "07:00"]] }).success).toBe(false);
    expect(sprechzeitenSchema.safeParse({ "8": [["08:00", "09:00"]] }).success).toBe(false);
    expect(sprechzeitenLesen(null)).toBe(STANDARD_SPRECHZEITEN);
    expect(sprechzeitenLesen({ "6": [["09:00", "12:00"]] })).toEqual({ "6": [["09:00", "12:00"]] });
  });
});
