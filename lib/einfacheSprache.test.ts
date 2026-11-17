import { describe, expect, it } from "vitest";
import { EINFACH_SCHALTER, uiEinfach } from "@/lib/i18n/de-einfach";
import { UI, uiFuer } from "@/lib/patientI18n";

// Beispielwerte wie in lib/patientI18n.test.ts.
const ARGS: Record<string, unknown[][]> = {
  hello: [["Zofia"]],
  intro: [[undefined], [undefined, true], ["Ihrer Hautärztin oder Ihrem Hautarzt"]],
  fineMed: [["24.11.2026"]],
  deadline: [[48]],
  open: [[1], [3]],
  fineTherapie: [["24.11.2026"]],
  fine: [[true, "24.11.2026"], [false, "24.11.2026"]],
  remindSet: [["24.11.2026"]],
};

const texte = (): { key: string; text: string }[] =>
  Object.entries(uiEinfach).flatMap(([key, v]) =>
    typeof v === "string" ? [{ key, text: v }] : (ARGS[key] ?? []).map((a) => ({ key, text: (v as (...x: unknown[]) => string)(...a) })),
  );

/** Sätze eines Textes; Abkürzungen und Datumsangaben mit Punkt trennen nicht. */
const saetze = (s: string) =>
  s
    .replace(/(\d)\.(\d)/g, "$1·$2")
    .split(/(?<=[.!?:])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
const woerter = (s: string) => s.split(/\s+/).filter((w) => /\p{L}|\d/u.test(w)).length;

describe("Einfache Sprache (deutsche Patientenansicht)", () => {
  it("heißt Einfache Sprache, nicht Leichte Sprache", () => {
    expect(EINFACH_SCHALTER).toBe("Einfache Sprache");
    expect(JSON.stringify(texte())).not.toMatch(/Leichte Sprache/i);
  });

  it("kennt nur Schlüssel der deutschen Fassung, mit derselben Art von Wert", () => {
    for (const [key, v] of Object.entries(uiEinfach)) {
      expect(Object.keys(UI.de), key).toContain(key);
      expect(typeof v, key).toBe(typeof (UI.de as Record<string, unknown>)[key]);
      if (typeof v === "function") expect(ARGS[key], `Beispielwerte für ${key}`).toBeDefined();
    }
  });

  it("hat keinen Satz mit mehr als 15 Wörtern", () => {
    expect(texte().length).toBeGreaterThan(30);
    for (const { key, text } of texte()) for (const s of saetze(text)) expect(woerter(s), `${key}: „${s}“`).toBeLessThanOrEqual(15);
  });

  it("behält Zahlen, Daten und Namen und wertet nicht", () => {
    expect(uiEinfach.hello!("Zofia")).toContain("Zofia");
    expect(uiEinfach.fine!(true, "24.11.2026")).toContain("24.11.2026");
    expect(uiEinfach.deadline!(48)).toContain("48");
    expect(uiEinfach.deadline!(48)).toContain("31.12.2026");
    expect(uiEinfach.fine!(true, "x").length).toBeGreaterThan(uiEinfach.fine!(false, "x").length);
    expect(JSON.stringify(texte())).not.toMatch(/Empfehlung|empfehlen|empfohlen|sinnvoll|beste|Rate/i);
  });

  it("gilt nur auf Deutsch und fällt sonst auf die übliche Fassung zurück", () => {
    expect(uiFuer("de", true).pick).toBe("Bitte wählen Sie eine Möglichkeit.");
    expect(uiFuer("de", true).seeRec).toBe(UI.de.seeRec);
    expect(uiFuer("de", false)).toBe(UI.de);
    expect(uiFuer("en", true)).toBe(UI.en);
  });
});
