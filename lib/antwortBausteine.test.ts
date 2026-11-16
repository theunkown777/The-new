import { describe, expect, it, vi } from "vitest";
import { ANTWORT_EINGANG_ARTEN, antwortAnrede, antwortBausteine, antwortBetreff, antwortEntwurf, hatAntwortEntwurf, rueckmeldungArt, type RueckmeldungArt } from "@/lib/antwortBausteine";

// lib/eingang.ts lädt die Datenbank; für die Liste der Arten braucht der Test sie nicht.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { EINGANG_ARTEN } from "@/lib/eingang";

const ARTEN: RueckmeldungArt[] = ["rueckruf", "frage", "wahl", "interesse", "unterschrift", "zweitmeinung", "erinnerung"];
const basis = { anrede: "Guten Tag Frau Muster", praxis: "Praxis am Markt", telefon: "0221 123456" };

describe("Welche Einträge einen Antwortentwurf haben", () => {
  it("nur Rückmeldungen zum Vorschlag", () => {
    for (const a of ANTWORT_EINGANG_ARTEN) expect(hatAntwortEntwurf(a)).toBe(true);
    for (const a of ["ZAHLUNG_GEMELDET", "ANAMNESE", "TERMIN_GEBUCHT", "TERMINANFRAGE", "RATEN", "unbekannt"]) expect(hatAntwortEntwurf(a)).toBe(false);
  });
  it("jede Art gibt es im Eingang", () => {
    for (const a of ANTWORT_EINGANG_ARTEN) expect(EINGANG_ARTEN, a).toHaveProperty(a);
  });
  it("Bezug auf die Rückmeldung: Rückruf, Frage, Wahl", () => {
    expect(rueckmeldungArt("VORSCHLAG_RUECKRUF")).toBe("rueckruf");
    expect(rueckmeldungArt("VORSCHLAG_INTERESSE", { nachricht: true, wahl: true })).toBe("frage");
    expect(rueckmeldungArt("VORSCHLAG_INTERESSE", { wahl: true })).toBe("wahl");
    expect(rueckmeldungArt("VORSCHLAG_INTERESSE")).toBe("interesse");
    expect(rueckmeldungArt("VEREINBARUNG")).toBe("unterschrift");
    expect(rueckmeldungArt("ZWEITMEINUNG")).toBe("zweitmeinung");
    expect(rueckmeldungArt("ERINNERUNG_GEWUENSCHT")).toBe("erinnerung");
    expect(rueckmeldungArt("ZAHLUNG_GEMELDET")).toBeNull();
  });
});

describe("Anrede", () => {
  it("Frau, Herr, ohne Angabe, ohne Akte", () => {
    expect(antwortAnrede({ firstName: "Erika", lastName: "Muster", geschlecht: "W" })).toBe("Guten Tag Frau Muster");
    expect(antwortAnrede({ firstName: "Max", lastName: "Muster", geschlecht: "M" })).toBe("Guten Tag Herr Muster");
    expect(antwortAnrede({ firstName: "Kim", lastName: "Muster", geschlecht: "D" })).toBe("Guten Tag Kim Muster");
    expect(antwortAnrede({ firstName: "Kim", lastName: "Muster" })).toBe("Guten Tag Kim Muster");
    expect(antwortAnrede({ firstName: "ohne Akte", lastName: "K-1511-3", ohneAkte: true })).toBe("Guten Tag");
    expect(antwortAnrede({})).toBe("Guten Tag");
  });
});

describe("Antwortentwurf", () => {
  it("enthält Dank, Bezug, Angebot von Termin oder Rückruf und den Praxisnamen", () => {
    for (const art of ARTEN) {
      const t = antwortEntwurf({ ...basis, art });
      expect(t, art).toMatch(/^Guten Tag Frau Muster,\n/);
      expect(t, art).toContain("vielen Dank für Ihre Rückmeldung.");
      expect(t, art).toMatch(/Termin|rufen Sie an|anrufen/);
      expect(t, art).toMatch(/Freundliche Grüße\nPraxis am Markt$/);
    }
  });
  it("Bezug je Rückmeldung", () => {
    expect(antwortEntwurf({ ...basis, art: "rueckruf" })).toContain("Sie haben um einen Rückruf gebeten.");
    expect(antwortEntwurf({ ...basis, art: "frage" })).toContain("Sie haben uns eine Frage geschrieben.");
    expect(antwortEntwurf({ ...basis, art: "wahl" })).toContain("Ihre Auswahl ist bei uns angekommen.");
    expect(antwortEntwurf({ ...basis, art: "unterschrift" })).toContain("unterschriebene Vereinbarung");
  });
  it("ohne Befund, ohne Leistung, ohne Betrag, ohne Empfehlung, ohne Zeitdruck", () => {
    for (const art of ARTEN) {
      const t = antwortEntwurf({ ...basis, art, telefon: null });
      expect(t, art).not.toMatch(/\d/);
      expect(t, art).not.toMatch(/€|Euro|Preis|Kosten|Betrag|Rabatt|Rate/i);
      expect(t, art).not.toMatch(/Befund|Diagnose|Behandlung|Therapie|Zahn|Vorschlag/i);
      expect(t, art).not.toMatch(/empfehl|Empfehlung|sinnvoll|\bbeste|optimal|sollten/i);
      expect(t, art).not.toMatch(/dringend|schnell|sofort|umgehend|Frist|bis zum|nur noch|baldmöglichst|verfällt|läuft ab/i);
      expect(t, art).not.toMatch(/ – | — /);
    }
  });
  it("nimmt den Druck ausdrücklich heraus, wo eine Entscheidung offen ist", () => {
    for (const art of ["frage", "wahl", "interesse", "zweitmeinung", "erinnerung"] as const) expect(antwortBausteine({ ...basis, art }).ruhe).toBe("Lassen Sie sich so viel Zeit, wie Sie brauchen.");
    expect(antwortBausteine({ ...basis, art: "unterschrift" }).ruhe).toBeNull();
    expect(antwortBausteine({ ...basis, art: "rueckruf" }).ruhe).toBeNull();
  });
  it("Telefon nur, wenn die Praxis eins hinterlegt hat", () => {
    expect(antwortEntwurf({ ...basis, art: "frage" })).toContain("Sie erreichen uns unter 0221 123456.");
    expect(antwortEntwurf({ ...basis, art: "frage", telefon: "" })).toContain("Melden Sie sich dazu gern bei uns.");
    expect(antwortEntwurf({ ...basis, art: "rueckruf", telefon: null })).toContain("Sie können uns auch selbst anrufen.");
  });
  it("leere Angaben brechen den Text nicht", () => {
    const t = antwortEntwurf({ art: "frage", anrede: "", praxis: " " });
    expect(t).toMatch(/^Guten Tag,\n/);
    expect(t).toMatch(/Ihre Praxis$/);
    expect(antwortBetreff("Praxis am Markt")).toBe("Ihre Rückmeldung an Praxis am Markt");
  });
});
