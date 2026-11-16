import { describe, expect, it } from "vitest";
import { AUSWAHL_MAX, patientenFiltern, suchform } from "./patientAuswahl";

const p = (id: string, firstName: string, lastName: string) => ({ id, firstName, lastName });
const viele = Array.from({ length: 300 }, (_, i) => p(`n${i}`, `Vor${i}`, `Nach${i}`));

describe("Patienten-Auswahl in langen Listen", () => {
  it("vergleicht ohne Großschreibung, Umlautpunkte und ß", () => {
    expect(suchform("Müller")).toBe("muller");
    expect(suchform("Weiß")).toBe("weiss");
    expect(suchform("René")).toBe("rene");
  });

  it("zeigt ohne Suche höchstens die Obergrenze und nennt den Rest", () => {
    const r = patientenFiltern(viele, "", "");
    expect(r.liste).toHaveLength(AUSWAHL_MAX);
    expect(r.weitere).toBe(300 - AUSWAHL_MAX);
  });

  it("findet nach Nachname, Vorname und beidem in jeder Reihenfolge", () => {
    const alle = [p("a", "Anna", "Müller"), p("b", "Bernd", "Maier"), p("c", "Anna", "Schmidt")];
    expect(patientenFiltern(alle, "muller", "").liste.map((x) => x.id)).toEqual(["a"]);
    expect(patientenFiltern(alle, "anna", "").liste.map((x) => x.id)).toEqual(["a", "c"]);
    expect(patientenFiltern(alle, "Schmidt, Anna", "").liste.map((x) => x.id)).toEqual(["c"]);
    expect(patientenFiltern(alle, "anna schmidt", "").liste.map((x) => x.id)).toEqual(["c"]);
    expect(patientenFiltern(alle, "xyz", "").liste).toEqual([]);
  });

  it("hält den gewählten Patienten in der Liste, auch wenn die Suche ihn nicht trifft", () => {
    const r = patientenFiltern(viele, "Nach12", "n299");
    expect(r.liste[0].id).toBe("n299");
    expect(r.liste.filter((x) => x.id === "n299")).toHaveLength(1);
    const ohneDoppel = patientenFiltern(viele, "Nach299", "n299");
    expect(ohneDoppel.liste.map((x) => x.id)).toEqual(["n299"]);
  });

  it("lässt kurze Listen unverändert", () => {
    const alle = [p("a", "Anna", "Müller"), p("b", "Bernd", "Maier")];
    expect(patientenFiltern(alle, "", "b")).toEqual({ liste: alle, weitere: 0 });
  });
});
