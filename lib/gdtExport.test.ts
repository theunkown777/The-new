import { describe, expect, it } from "vitest";
import { buildGdt6310, gdtZeile, latin1, umbrechen } from "./gdtExport";
import { parseGdt } from "./connector";

describe("GDT-Export 6310", () => {
  it("Zeilenlänge zählt Kennung, Inhalt und CR LF", () => {
    expect(gdtZeile("3101", "Müller")).toBe("0153101Müller\r\n");
  });
  it("bricht Text auf höchstens 60 Zeichen um", () => {
    const z = umbrechen("Wort ".repeat(40).trim());
    expect(z.every((l) => l.length <= 60)).toBe(true);
    expect(z.join(" ")).toBe("Wort ".repeat(40).trim());
  });
  it("erzeugt eine gültige Datei, die sich wieder einlesen lässt, mit richtiger Gesamtlänge", () => {
    const g = buildGdt6310({ patId: "4711", lastName: "Müller", firstName: "Anna", birthDate: new Date(1980, 3, 3), receiver: "MEDISTAR", datum: new Date(2026, 10, 5, 9, 30, 0), titel: "Befundbericht (Sorrida)", text: "Füllung 36.\nKontrolle in 6 Monaten." });
    const f = parseGdt(g);
    expect(f["8000"]).toBe("6310");
    expect(f["3000"]).toBe("4711");
    expect(f["3103"]).toBe("03041980");
    expect(f["6200"]).toBe("05112026");
    expect(f["8315"]).toBe("MEDISTAR");
    expect(Number(f["8100"])).toBe(latin1(g).length);
    for (const line of g.split("\r\n").filter(Boolean)) expect(Number(line.slice(0, 3))).toBe(line.length + 2);
    expect(g.split("\r\n").filter((l) => l.slice(3, 7) === "6220")).toHaveLength(2);
  });
});
