import { describe, expect, it } from "vitest";
import quelle from "./quelle.json";
import en from "./en.json";
import tr from "./tr.json";
import pl from "./pl.json";
import ru from "./ru.json";
import uk from "./uk.json";
import { sammleModellTexte } from "./sammeln";
import { MODELL_SPRACHEN_FERTIG, textSchluessel, uebersetze } from "./schluessel";

const SPRACHEN: Record<string, Record<string, string>> = { en, tr, pl, ru, uk };
const platzhalter = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(",");

describe("Übersetzungen der Modelle", () => {
  it("quelle.json entspricht den Texten im Code (sonst: npx tsx scripts/modell-texte.ts)", () => {
    const { alle } = sammleModellTexte();
    expect(Object.keys(alle).length).toBeGreaterThan(600);
    expect(quelle).toEqual(alle);
  });
  it("jeder deutsche Text hat einen eigenen Schlüssel", () => {
    for (const [k, de] of Object.entries(quelle)) expect(textSchluessel(de)).toBe(k);
  });
  for (const [lang, w] of Object.entries(SPRACHEN)) {
    const fertig = (MODELL_SPRACHEN_FERTIG as readonly string[]).includes(lang);
    it(`${lang}: ${fertig ? "vollständig, " : "(angefangen) "}nichts leer, Platzhalter erhalten`, () => {
      const fehlend = Object.keys(quelle).filter((k) => !w[k]?.trim());
      if (fertig) expect(fehlend.map((k) => (quelle as Record<string, string>)[k].slice(0, 40))).toEqual([]);
      for (const [k, de] of Object.entries(quelle)) if (w[k]) expect(platzhalter(w[k]), de).toBe(platzhalter(de));
      // nichts Überzähliges und nichts einfach deutsch gelassen (längere Sätze)
      expect(Object.keys(w).filter((k) => !(k in quelle))).toEqual([]);
      const gleich = Object.entries(quelle).filter(([k, de]) => de.length > 40 && w[k] === de);
      expect(gleich.map(([, de]) => de.slice(0, 40))).toEqual([]);
    });
  }
  it("übersetzt mit Platzhaltern und fällt auf Deutsch zurück", () => {
    expect(uebersetze(en, "Zahn {nr}", { nr: 36 })).toMatch(/36/);
    expect(uebersetze(en, "Zahn {nr}", { nr: 36 })).not.toMatch(/Zahn/);
    expect(uebersetze(null, "Zahn {nr}", { nr: 36 })).toBe("Zahn 36");
    expect(uebersetze(en, "Gibt es nicht {n}", { n: 2 })).toBe("Gibt es nicht 2");
  });
});
