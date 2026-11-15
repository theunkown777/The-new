import { describe, expect, it } from "vitest";
import { OHNE_AKTE, anrede, istOhneAkte, kuerzelSchema, kuerzelVorschlag, nameFuerSchreiben, vornameFuerText } from "@/lib/ohneAkte";

describe("Schnellvorschlag ohne Akte", () => {
  it("lässt den Vornamen in Texten an den Patienten weg", () => {
    expect(vornameFuerText(OHNE_AKTE)).toBe("");
    expect(vornameFuerText("Anna")).toBe("Anna");
    expect(anrede("Hallo", OHNE_AKTE)).toBe("Hallo");
    expect(anrede("Guten Tag", "Anna")).toBe("Guten Tag Anna");
    expect(anrede("Hallo", null)).toBe("Hallo");
  });
  it("erkennt Datensätze ohne Akte am Kennzeichen oder am Vornamen", () => {
    expect(istOhneAkte({ firstName: "Anna", ohneAkte: true })).toBe(true);
    expect(istOhneAkte({ firstName: OHNE_AKTE })).toBe(true);
    expect(istOhneAkte({ firstName: "Anna", ohneAkte: false })).toBe(false);
  });
  it("schreibt ohne Akte keinen Namen in das Schreiben", () => {
    expect(nameFuerSchreiben({ firstName: OHNE_AKTE, lastName: "K-1511-3", ohneAkte: true })).toBe("");
    expect(nameFuerSchreiben({ firstName: "Anna", lastName: "Krüger" })).toBe("Anna Krüger");
  });
  it("prüft das Kürzel", () => {
    expect(kuerzelSchema.safeParse("K-1511-3").success).toBe(true);
    expect(kuerzelSchema.safeParse("  Zi 2 ").success).toBe(true);
    expect(kuerzelSchema.safeParse("K").success).toBe(false);
    expect(kuerzelSchema.safeParse("<b>x</b>").success).toBe(false);
    expect(kuerzelSchema.safeParse("x".repeat(25)).success).toBe(false);
  });
  it("schlägt das nächste Kürzel des Tages vor", () => {
    expect(kuerzelVorschlag(new Date("2026-11-15T10:00:00Z"), 2)).toBe("K-1511-3");
    expect(kuerzelVorschlag(new Date("2026-01-05T23:30:00Z"), 0)).toBe("K-0601-1");
  });
});
