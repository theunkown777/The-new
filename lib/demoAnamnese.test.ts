import { describe, expect, it } from "vitest";
import { anamneseZeilen, anamnesisFlags, anamnesisProposalGlobals, anliegenTexte, type Anamnese } from "@/lib/anamnesis";
import { anamneseFuer } from "@/lib/anamneseProfile";
import { demoAnamneseBeispiel, demoAnamneseZufall } from "@/lib/demoAnamnese";
import { rng } from "@/lib/demoData";
import { ALLE_SPECIALTIES } from "@/lib/specialties";
import { ZAHN_BEGRIFFE } from "@/lib/zahnBegriffe";

// Die Demo-Anamnesen (Gastzugang) je Fach, ohne Datenbank erzeugt: keine zahnärztlichen Fragen, Wünsche oder Hinweise
// außerhalb der Zahnmedizin. Früher bekam die Beispielpatientin in jedem Fach „Knirschen“ und „hellere Zähne“.

const NICHT_ZAHN = [...ALLE_SPECIALTIES.map((s) => s.id), "andere"];
const PERSONEN = [{ geschlecht: "W", alter: 51 }, { geschlecht: "M", alter: 34 }, { geschlecht: "W", alter: 6 }, { geschlecht: "D", alter: 80 }];

/** Was die Praxis von dieser Anamnese sieht: Antworten, Anliegen, Hinweise. */
const sichtbar = (a: Anamnese) => JSON.stringify({ zeilen: anamneseZeilen(a), anliegen: anliegenTexte(a), hinweise: anamnesisFlags(a), q: Object.keys(a.q), wishes: a.wishes });

describe("Demo-Anamnesen je Fach", () => {
  it("Beispielbogen: nur Fragen und Anliegen des Fachs, keine Zahn-Begriffe", () => {
    for (const fach of NICHT_ZAHN)
      for (const person of PERSONEN) {
        const a = demoAnamneseBeispiel(fach, person, "Anna Krüger");
        const t = sichtbar(a);
        expect(t, `${fach}: ${t.match(ZAHN_BEGRIFFE)?.[0]}`).not.toMatch(ZAHN_BEGRIFFE);
        expect(Object.keys(a.q).sort(), fach).toEqual(anamneseFuer(fach, person).fragen.map((f) => f.key).sort());
        expect(anamnesisProposalGlobals(a, "zahn"), fach).toEqual([]);
        expect(anamnesisFlags(a).map((f) => f.text), fach).toContain("Blutverdünner");
      }
  });

  it("Zufallsbögen für den Demo-Stamm: keine Zahn-Begriffe, auch über viele Durchläufe", () => {
    for (const fach of NICHT_ZAHN) {
      const r = rng(4711);
      for (let i = 0; i < 60; i++) {
        const t = sichtbar(demoAnamneseZufall(fach, PERSONEN[i % PERSONEN.length], r, "Vor Nach"));
        expect(t, `${fach}: ${t.match(ZAHN_BEGRIFFE)?.[0]}`).not.toMatch(ZAHN_BEGRIFFE);
      }
    }
  });

  it("jedes Fach zeigt im Beispiel eine eigene Angabe als Hinweis", () => {
    for (const fach of ALLE_SPECIALTIES.map((s) => s.id)) {
      const a = demoAnamneseBeispiel(fach, { geschlecht: "W", alter: 40 }, "Anna Krüger");
      expect(anamnesisFlags(a).length, fach).toBe(3);
      expect(a.wishes.length, fach).toBe(1);
    }
  });

  it("Gegenprobe Zahnmedizin: Knirschen und hellere Zähne wie bisher, mit Übernahme in den Vorschlag", () => {
    const a = demoAnamneseBeispiel("zahn", { geschlecht: "W", alter: 51 }, "Anna Krüger");
    expect(a.q.knirschen).toEqual({ yes: true });
    expect(a.wishes).toEqual(["hell"]);
    expect(anamnesisProposalGlobals(a).sort()).toEqual(["bleaching", "bruxismus"]);
  });
});
