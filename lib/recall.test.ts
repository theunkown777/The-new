import { describe, expect, it } from "vitest";
import { recallFor, recallText } from "@/lib/recall";

const now = new Date(2026, 10, 1);
const monthsAgo = (m: number) => new Date(now.getTime() - m * 30.44 * 86400000);

describe("recallFor", () => {
  it("Zahnmedizin: nach 6 Monaten fällig, vorher nicht", () => {
    expect(recallFor({ fach: "zahn", age: 40, letzterKontakt: monthsAgo(7) }, now)?.leistung).toContain("Kontrolluntersuchung");
    expect(recallFor({ fach: "zahn", age: 40, letzterKontakt: monthsAgo(3) }, now)).toBeNull();
  });
  it("Altersgrenzen", () => {
    expect(recallFor({ fach: "haut", age: 30, letzterKontakt: monthsAgo(30) }, now)).toBeNull();
    expect(recallFor({ fach: "haut", age: 50, letzterKontakt: monthsAgo(30) }, now)?.tage).toBeGreaterThan(0);
    expect(recallFor({ fach: "hausarzt", age: null, letzterKontakt: monthsAgo(40) }, now)).toBeNull();
  });
  it("kurz nach Erinnerung nicht erneut", () => {
    expect(recallFor({ fach: "zahn", age: 40, letzterKontakt: monthsAgo(8), erinnertAm: monthsAgo(0.3) }, now)).toBeNull();
  });
  it("Fächer ohne Regel", () => {
    expect(recallFor({ fach: "physio", age: 40, letzterKontakt: monthsAgo(40) }, now)).toBeNull();
  });
  it("Text nennt Leistung und Link", () => {
    const t = recallText({ firstName: "Anna", practiceName: "Praxis", leistung: "Kontrolluntersuchung (Bonusheft)", hinweis: "Kassenleistung.", url: "https://x" });
    expect(t).toContain("Kontrolluntersuchung");
    expect(t).toContain("https://x");
  });
});
