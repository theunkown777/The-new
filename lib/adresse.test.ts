import { describe, expect, it } from "vitest";
import { adressePruefen, einWert, seiteAus } from "@/lib/adresse";

describe("adressePruefen", () => {
  it("weist ein Null-Zeichen in Pfad oder Abfrage-Teil ab", () => {
    for (const [p, s] of [["/api/appointments/%00", ""], ["/api/patients/%00/entries/%00", ""], ["/patients/a%00b", ""], ["/patients", "?q=%00"], ["/p/x", "?lang=de%00"], ["/x\0y", ""], ["/api/reports/%00/pdf", ""]]) {
      expect(adressePruefen(p, s), `${p}${s}`).toEqual({ art: "ungueltig" });
    }
  });

  it("lässt normale Adressen durch", () => {
    for (const [p, s] of [["/", ""], ["/patients", "?q=Meier&page=2"], ["/p/abcdefghijklmnop", "?lang=en"], ["/api/patients/cmabc123", ""], ["/x", "?"], ["/x", "?a=%2500"]]) {
      expect(adressePruefen(p, s), `${p}${s}`).toEqual({ art: "ok" });
    }
  });

  it("doppelter Parameter: Adresse mit dem jeweils ersten Wert", () => {
    expect(adressePruefen("/p/abcdefghijklmnop", "?lang=a&lang=b")).toEqual({ art: "doppelt", search: "?lang=a" });
    expect(adressePruefen("/patients", "?q=a&page=2&q=b&q=c")).toEqual({ art: "doppelt", search: "?q=a&page=2" });
    expect(adressePruefen("/embed/launch", "?t=1&t=2")).toEqual({ art: "doppelt", search: "?t=1" });
    expect(adressePruefen("/patients", "?q=M%C3%BCller&q=x")).toEqual({ art: "doppelt", search: "?q=M%C3%BCller" });
    // Nach der Weiterleitung ist die Adresse in Ordnung
    expect(adressePruefen("/patients", "?q=a&page=2")).toEqual({ art: "ok" });
  });
});

describe("einWert", () => {
  it("liefert nur Text", () => {
    expect(einWert("de")).toBe("de");
    expect(einWert(["en", "de"])).toBe("en");
    expect(einWert(undefined)).toBeUndefined();
    expect(einWert([])).toBeUndefined();
    expect(einWert(3)).toBeUndefined();
  });
});

describe("seiteAus", () => {
  it("begrenzt die Seitenzahl", () => {
    expect(seiteAus("3")).toBe(3);
    expect(seiteAus("99999999999999999999")).toBe(100_000);
    expect(seiteAus("-1")).toBe(1);
    expect(seiteAus("abc")).toBe(1);
    expect(seiteAus("2.7")).toBe(2);
    expect(seiteAus(undefined)).toBe(1);
    expect(seiteAus(["4", "5"])).toBe(4);
    expect(seiteAus("Infinity")).toBe(1);
  });
});
