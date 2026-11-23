import { describe, expect, it } from "vitest";
import { FACHPROFILE, fachprofil, passtZuPerson } from "./fachprofile";
import { ALLE_SPECIALTIES, DENTAL_ID } from "./specialties";

describe("Fachprofile", () => {
  it("jedes Fach hat ein eigenes Profil", () => {
    for (const id of [DENTAL_ID, ...ALLE_SPECIALTIES.map((s) => s.id)]) expect(FACHPROFILE[id], id).toBeDefined();
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

  // Hinweis zu GOÄ Nr. 3: nur als einzige Leistung oder neben einer Untersuchung nach Nr. 5, 6, 7, 8, 800 oder 801.
  // EBM und Sonstiges stehen in gemischten Vorlagen für Kassenpatienten und zählen hier nicht mit.
  it("GOÄ 3 steht nur neben erlaubten GOÄ-Untersuchungen", () => {
    const erlaubt = new Set(["3", "5", "6", "7", "8", "800", "801"]);
    for (const [id, p] of Object.entries(FACHPROFILE))
      for (const st of p.sitzungstypen) {
        const goae = st.leistungen.filter((l) => l.system === "GOAE");
        if (!goae.some((l) => l.code === "3")) continue;
        const andere = goae.filter((l) => !erlaubt.has(l.code)).map((l) => `${l.code} ${l.title}`);
        expect(andere, `${id}: ${st.name}`).toEqual([]);
      }
  });

  it("Check-up hat für Privatpatienten die Gesundheitsuntersuchung nach GOÄ 29", () => {
    const checkup = FACHPROFILE.hausarzt.sitzungstypen.find((s) => s.name.startsWith("Gesundheitsuntersuchung"));
    expect(checkup?.leistungen.some((l) => l.system === "GOAE" && l.code === "29")).toBe(true);
  });

  // Beträge ändern sich mit dem Jahr (ab 1.1.2027 höher). Den Betrag rechnet lib/proposals.ts nach Datum.
  it("Vorlagen nennen keine festen Zuzahlungsbeträge", () => {
    for (const [id, p] of Object.entries(FACHPROFILE))
      for (const st of p.sitzungstypen)
        for (const text of [st.name, st.description, ...st.leistungen.map((l) => l.title)])
          if (/zuzahlung/i.test(text)) expect(text, `${id}: ${st.name}`).not.toMatch(/\d\s*(€|%)/);
  });

  it("Vorsorge-Koloskopie: Kasse ab 50 für Frauen und Männer", () => {
    const kolo = FACHPROFILE.gastro.sitzungstypen.find((s) => s.name === "Vorsorge-Koloskopie");
    expect(kolo?.description).toMatch(/ab 50 für Frauen und Männer/);
    expect(kolo?.description).not.toMatch(/55/);
  });

  it("Leistungstexte der Fächer nennen keine festen Zuzahlungsbeträge", () => {
    for (const sp of ALLE_SPECIALTIES)
      for (const a of sp.anlaesse)
        for (const o of a.options)
          for (const text of [o.name, ...o.benefits])
            if (/zuzahlung/i.test(text)) expect(text, `${sp.id}: ${o.id}`).not.toMatch(/\d\s*€/);
  });
});
