import { describe, expect, it } from "vitest";
import { diktatModus, lokalLaden, lokalStatus } from "./diktat";

describe("diktatModus", () => {
  it("ohne Spracherkennung im Browser gibt es kein Diktat", () => {
    expect(diktatModus({ unterstuetzt: false, lokal: "available", cloudErlaubt: true })).toBe("ohne");
  });
  it("Erkennung auf dem Gerät hat Vorrang, auch wenn der Dienst erlaubt wäre", () => {
    expect(diktatModus({ unterstuetzt: true, lokal: "available", cloudErlaubt: true })).toBe("lokal");
    expect(diktatModus({ unterstuetzt: true, lokal: "available", cloudErlaubt: false })).toBe("lokal");
  });
  it("ladbares Sprachpaket wird angeboten", () => {
    expect(diktatModus({ unterstuetzt: true, lokal: "downloadable", cloudErlaubt: false })).toBe("ladbar");
    expect(diktatModus({ unterstuetzt: true, lokal: "downloading", cloudErlaubt: true })).toBe("ladbar");
  });
  it("ohne Erkennung auf dem Gerät entscheidet der Schalter der Praxis", () => {
    expect(diktatModus({ unterstuetzt: true, lokal: "unavailable", cloudErlaubt: false })).toBe("aus");
    expect(diktatModus({ unterstuetzt: true, lokal: "unbekannt", cloudErlaubt: false })).toBe("aus");
    expect(diktatModus({ unterstuetzt: true, lokal: "unbekannt", cloudErlaubt: true })).toBe("cloud");
  });
});

describe("Abfrage beim Browser", () => {
  it("ältere Browser ohne Abfrage gelten als unbekannt", async () => {
    expect(await lokalStatus(class {})).toBe("unbekannt");
    expect(await lokalStatus(null)).toBe("unbekannt");
    expect(await lokalLaden(class {})).toBe(false);
  });
  it("übernimmt die Antwort des Browsers und fragt nach Deutsch auf dem Gerät", async () => {
    let gefragt: unknown;
    const SR = { available: async (o: unknown) => ((gefragt = o), "downloadable"), install: async () => true };
    expect(await lokalStatus(SR)).toBe("downloadable");
    expect(gefragt).toEqual({ langs: ["de-DE"], processLocally: true });
    expect(await lokalLaden(SR)).toBe(true);
  });
  it("Fehler und unbekannte Antworten öffnen nicht den Weg über das Gerät", async () => {
    expect(await lokalStatus({ available: async () => "irgendwas" })).toBe("unbekannt");
    expect(await lokalStatus({ available: async () => { throw new Error("x"); } })).toBe("unbekannt");
    expect(await lokalLaden({ install: async () => { throw new Error("x"); } })).toBe(false);
  });
});
