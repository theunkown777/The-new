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

describe("GDT 6310: Absender und deutsche Zeit", () => {
  it("trägt die Kennung ein, unter der die Praxissoftware Sorrida führt, und nutzt Berliner Zeit", () => {
    const g = buildGdt6310({ patId: "1", lastName: "A", firstName: "B", birthDate: new Date(Date.UTC(1980, 0, 1)), receiver: "MEDISTAR", sender: "SORR01", datum: new Date(Date.UTC(2026, 10, 7, 23, 30, 0)), titel: "T", text: "x" });
    expect(g).toContain("0178315MEDISTAR\r\n");
    expect(g).toContain("0158316SORR01\r\n");
    expect(g).toContain("017620008112026\r\n"); // 23:30 UTC = 00:30 am 08.11. in Berlin
    expect(g).toContain("0156201003000\r\n");
    expect(g).toContain("017310301011980\r\n");
  });
});
