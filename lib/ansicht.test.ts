import { describe, expect, it } from "vitest";
import { ANSICHT_SCHLUESSEL, ANSICHT_SKRIPT, ansichtAus, ansichtSpeicherwert } from "./ansicht";

const laufen = (gespeichert: string | null, kaputt = false) => {
  const klassen: string[] = [];
  const localStorage = { getItem: (k: string) => { if (kaputt) throw new Error("gesperrt"); return k === ANSICHT_SCHLUESSEL ? gespeichert : null; } };
  const document = { documentElement: { classList: { add: (k: string) => klassen.push(k) } } };
  new Function("localStorage", "document", ANSICHT_SKRIPT)(localStorage, document);
  return klassen;
};

describe("Dunkle Ansicht", () => {
  it("ist ohne Wahl hell", () => {
    expect(ansichtAus(null)).toBe("hell");
    expect(ansichtAus(undefined)).toBe("hell");
    expect(ansichtAus("irgendwas")).toBe("hell");
    expect(ansichtAus("dunkel")).toBe("dunkel");
  });

  it("speichert nur die ausdrückliche Wahl; hell löscht den Eintrag", () => {
    expect(ansichtSpeicherwert("dunkel")).toBe("dunkel");
    expect(ansichtSpeicherwert("hell")).toBeNull();
  });

  it("das Skript setzt die Klasse nur bei gespeicherter Wahl", () => {
    expect(laufen("dunkel")).toEqual(["dunkel"]);
    expect(laufen(null)).toEqual([]);
    expect(laufen("hell")).toEqual([]);
  });

  it("das Skript scheitert leise, wenn der Speicher gesperrt ist, und lädt nichts nach", () => {
    expect(laufen("dunkel", true)).toEqual([]);
    expect(ANSICHT_SKRIPT).not.toMatch(/https?:|fetch|import|cookie/i);
    expect(ANSICHT_SKRIPT.length).toBeLessThan(200);
  });
});
