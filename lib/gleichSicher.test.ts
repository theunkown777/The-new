import { describe, expect, it } from "vitest";
import { gleichSicher } from "./gleichSicher";
import { stempel, stempelPruefen } from "./terminanfrage";

describe("gleichSicher", () => {
  it("vergleicht Texte", () => {
    expect(gleichSicher("abc", "abc")).toBe(true);
    expect(gleichSicher("abc", "abd")).toBe(false);
    expect(gleichSicher("abc", "abcd")).toBe(false);
    expect(gleichSicher("", "")).toBe(true);
  });
  it("wirft nicht bei gleich vielen Zeichen, aber verschieden vielen Bytes", () => {
    expect(() => gleichSicher("abc", "äbc")).not.toThrow();
    expect(gleichSicher("abc", "äbc")).toBe(false);
    expect(gleichSicher("a".repeat(43), "ä".repeat(43))).toBe(false);
    expect(gleichSicher("😀", "ab")).toBe(false);
  });
});

describe("Stempel der Buchungsseite: Werte von außen führen nie zu einem Absturz", () => {
  it("Signatur mit Mehrbyte-Zeichen in gleicher Zeichenlänge ist ungültig, kein Fehler", () => {
    const jetzt = Date.now();
    const echt = stempel("kennung", jetzt);
    const [zeit, s] = echt.split(".");
    for (const falsch of [`${zeit}.${"ä".repeat(s.length)}`, `${zeit}.${s.slice(0, -1)}é`, `${zeit}.${"€".repeat(s.length)}`, `${zeit}.😀${s.slice(2)}`]) {
      expect(() => stempelPruefen(falsch, "kennung", jetzt + 60_000)).not.toThrow();
      expect(stempelPruefen(falsch, "kennung", jetzt + 60_000)).toBe("ungueltig");
    }
    expect(stempelPruefen(echt, "kennung", jetzt + 60_000)).toBe("ok");
  });
});
