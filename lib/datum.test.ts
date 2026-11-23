import { describe, expect, it } from "vitest";
import { datumDE, uhrzeitDE } from "@/lib/datum";

// Kurz nach Mitternacht in Berlin ist es in UTC noch der Vortag. Das Datum muss trotzdem der Berliner Tag sein,
// egal in welcher Zeitzone der Server läuft.
describe("datumDE", () => {
  const winter = new Date("2026-11-22T23:30:00Z"); // 23.11.2026, 00:30 Uhr in Berlin
  const sommer = new Date("2026-06-30T22:30:00Z"); // 01.07.2026, 00:30 Uhr in Berlin

  it("zeigt den Berliner Tag, auch kurz nach Mitternacht", () => {
    expect(datumDE(winter)).toBe("23.11.2026");
    expect(datumDE(sommer)).toBe("1.7.2026");
    expect(datumDE(winter, { day: "2-digit", month: "2-digit", year: "numeric" })).toBe("23.11.2026");
  });

  it("Tag und Monat einzeln, auch in anderen Sprachen", () => {
    expect(datumDE(winter, { day: "numeric" })).toBe("23");
    expect(datumDE(sommer, { month: "short" }, "en-GB")).toBe("Jul");
  });

  it("nimmt auch Text und Zahl", () => {
    expect(datumDE(winter.toISOString())).toBe("23.11.2026");
    expect(datumDE(winter.getTime())).toBe("23.11.2026");
  });

  it("Uhrzeit in Berliner Zeit", () => {
    expect(uhrzeitDE(winter)).toBe("00:30");
    expect(uhrzeitDE(sommer)).toBe("00:30");
  });
});
