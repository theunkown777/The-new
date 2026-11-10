import { describe, expect, it } from "vitest";
import { REGIONEN, ZEICHEN, kurzArt, kurzcheckLesen, kurzcheckSchema, kurzcheckText, ortGueltig, ortName, staerkeWort } from "./kurzcheck";

describe("Kurz-Fragebogen", () => {
  it("stellt höchstens fünf Fragen (Wo, Wie stark, Seit wann, Wie zeigt es sich, Was ist wichtig)", () => {
    const felder = Object.keys(kurzcheckSchema("zahn").parse({ keine: true, wichtig: "kontrolle" })).filter((k) => !["keine", "art", "notiz"].includes(k));
    expect(felder.sort()).toEqual(["orte", "seit", "staerke", "wichtig", "zeichen"]);
  });
  it("wählt Zähne für die Zahnarztpraxis und den Körper für alle anderen", () => {
    expect(kurzArt("zahn")).toBe("zahn");
    expect(kurzArt(null)).toBe("zahn");
    expect(kurzArt("ortho")).toBe("koerper");
  });
  it("prüft Orte", () => {
    expect(ortGueltig("zahn", "zahn:36")).toBe(true);
    expect(ortGueltig("zahn", "zahn:99")).toBe(false);
    expect(ortGueltig("zahn", "mund:zahnfleisch")).toBe(true);
    expect(ortGueltig("zahn", "knie:R")).toBe(false);
    expect(ortGueltig("koerper", "knie:R")).toBe(true);
    expect(ortGueltig("koerper", "knie")).toBe(false);
    expect(ortGueltig("koerper", "kopf")).toBe(true);
    expect(ortGueltig("koerper", "kopf:L")).toBe(false);
    expect(ortName("knie:L")).toBe("Knie links");
    expect(ortName("zahn:36")).toBe("Zahn 36");
    expect(new Set(REGIONEN.map((r) => r.id)).size).toBe(REGIONEN.length);
  });
  it("verlangt bei Beschwerden Ort, Stärke und Dauer", () => {
    const s = kurzcheckSchema("koerper");
    expect(s.safeParse({ orte: [], staerke: 5, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], staerke: 11, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["a", "b", "c", "d"], staerke: 5, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], staerke: 5, seit: "tage", zeichen: ["kalt"], wichtig: "schnell" }).success).toBe(false);
    const ok = s.safeParse({ orte: ["knie:R", "knie:R"], staerke: 7, seit: "wochen", zeichen: ["stechend", "bewegung"], wichtig: "ursache", notiz: "  beim   Treppensteigen " });
    expect(ok.success && ok.data.orte).toEqual(["knie:R"]);
    expect(ok.success && ok.data.notiz).toBe("beim Treppensteigen");
  });
  it("lässt ohne Beschwerden nur „Was ist wichtig“ übrig", () => {
    const d = kurzcheckSchema("zahn").parse({ keine: true, orte: ["zahn:36"], staerke: 4, seit: "tage", zeichen: ["kalt"], wichtig: "kontrolle" });
    expect(d).toMatchObject({ keine: true, orte: [], staerke: null, seit: null, zeichen: [] });
    expect(kurzcheckText(d)).toEqual(["Keine Beschwerden angegeben.", "Wichtig für den Termin: Nur Kontrolle oder Vorsorge"]);
  });
  it("fasst die Antworten für die Praxis zusammen", () => {
    const d = kurzcheckSchema("zahn").parse({ orte: ["zahn:36", "mund:zahnfleisch"], staerke: 8, seit: "tage", zeichen: ["kalt", "pochend"], wichtig: "angst", notiz: "links unten" });
    expect(kurzcheckText(d)).toEqual([
      "Wo: Zahn 36, Zahnfleisch",
      "Wie stark: 8 von 10 (stark), seit ein paar Tagen",
      "Wie es sich zeigt: Bei Kaltem, Pochend, auch nachts",
      "Wichtig für den Termin: Ich bin nervös vor der Behandlung",
      "Eigene Worte: „links unten“",
    ]);
    expect(kurzcheckLesen(d)).toEqual(d);
    expect(kurzcheckLesen({ quatsch: 1 })).toBeNull();
    expect(staerkeWort(0)).toBe("keine");
    expect(staerkeWort(10)).toBe("sehr stark");
    expect(ZEICHEN.zahn.length).toBeLessThanOrEqual(8);
  });
});
