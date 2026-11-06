import { describe, expect, it } from "vitest";
import { FACHPROFILE, fachprofil, passtZuPerson } from "./fachprofile";
import { SPECIALTIES, DENTAL_ID } from "./specialties";

describe("Fachprofile", () => {
  it("jedes Fach hat ein eigenes Profil", () => {
    for (const id of [DENTAL_ID, ...SPECIALTIES.map((s) => s.id)]) expect(FACHPROFILE[id], id).toBeDefined();
  });
  it("kein nicht-zahnärztliches Fach nennt Zähne in Sitzungstypen, Terminen oder Region", () => {
    for (const [id, p] of Object.entries(FACHPROFILE)) {
      if (id === "zahn") continue;
      const text = JSON.stringify([p.region, p.termine, p.sitzungstypen, p.berichtStil]);
      expect(/zahn|zähne|BEMA|GOZ/i.test(text), id).toBe(false);
    }
  });
  it("jedes Fach außer Zahn hat Sitzungstypen mit Leistungen und eindeutige Schlüssel", () => {
    const keys = new Set<string>();
    for (const [id, p] of Object.entries(FACHPROFILE)) {
      if (id === "zahn") continue;
      expect(p.sitzungstypen.length, id).toBeGreaterThan(0);
      for (const s of p.sitzungstypen) {
        expect(s.leistungen.length, `${id}/${s.name}`).toBeGreaterThan(0);
        for (const l of s.leistungen) { expect(keys.has(l.key)).toBe(false); keys.add(l.key); }
      }
    }
  });
  it("Gynäkologie und Hebammenhilfe nur Frauen, Apotheke spricht von Kunden, Pflege von Klienten", () => {
    expect(fachprofil("gyn").nurGeschlecht).toBe("W");
    expect(fachprofil("hebamme").nurGeschlecht).toBe("W");
    expect(fachprofil("uro").nurGeschlecht).toBeUndefined();
    expect(fachprofil("apotheke").person.pl).toBe("Kunden");
    expect(fachprofil("pflege").person.pl).toBe("Klienten");
  });
  it("Kinderarzt nur Kinder und Jugendliche", () => {
    expect(fachprofil("kinder").alter[1]).toBeLessThan(18);
  });
  it("prüft Geschlecht und Alter, unbekannt schließt nichts aus", () => {
    expect(passtZuPerson({ geschlecht: "M" }, { geschlecht: "W" })).toBe(false);
    expect(passtZuPerson({ geschlecht: "M" }, { geschlecht: "M" })).toBe(true);
    expect(passtZuPerson({ geschlecht: "M" }, { geschlecht: null })).toBe(true);
    expect(passtZuPerson({ abAlter: 45 }, { alter: 30 })).toBe(false);
    expect(passtZuPerson({ bisAlter: 21 }, { alter: 30 })).toBe(false);
  });
});
