import { describe, expect, it } from "vitest";
import { AKTIONEN, ROLLEN, darf, freigabeLabel, istRolle, menueRechte, rolleVon, rollenLabel, type Aktion, type Rolle } from "@/lib/rollen";

// Die ganze Matrix an einer Stelle: Rolle × Aktion, ohne und mit Freigabe.
// j = ja, n = nein, f = nur mit Freigabe.
const MATRIX: Record<Aktion, Record<Rolle, "j" | "n" | "f">> = {
  patienten: { admin: "j", staff: "j", behandler: "j" },
  vorschlaege: { admin: "j", staff: "j", behandler: "j" },
  berichte: { admin: "j", staff: "j", behandler: "j" },
  termine: { admin: "j", staff: "j", behandler: "j" },
  modelle: { admin: "j", staff: "j", behandler: "j" },
  meinBereich: { admin: "j", staff: "j", behandler: "j" },
  konto: { admin: "j", staff: "j", behandler: "j" },
  zahlungen: { admin: "j", staff: "j", behandler: "f" },
  analyse: { admin: "j", staff: "f", behandler: "f" },
  "einstellungen.ansehen": { admin: "j", staff: "j", behandler: "n" },
  "einstellungen.aendern": { admin: "j", staff: "n", behandler: "n" },
  team: { admin: "j", staff: "n", behandler: "n" },
  protokoll: { admin: "j", staff: "n", behandler: "n" },
  "standorte.verwalten": { admin: "j", staff: "n", behandler: "n" },
  "patienten.import": { admin: "j", staff: "n", behandler: "n" },
};

describe("Rechte-Matrix (Rolle × Aktion)", () => {
  it("deckt jede Aktion und jede Rolle ab", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...AKTIONEN].sort());
    for (const a of AKTIONEN) expect(Object.keys(MATRIX[a]).sort()).toEqual([...ROLLEN].sort());
  });

  for (const aktion of AKTIONEN) {
    for (const rolle of ROLLEN) {
      const soll = MATRIX[aktion][rolle];
      it(`${rolle} · ${aktion}: ${soll === "j" ? "erlaubt" : soll === "n" ? "verboten" : "nur mit Freigabe"}`, () => {
        expect(darf(rolle, aktion)).toBe(soll === "j");
        expect(darf(rolle, aktion, { freigabe: false })).toBe(soll === "j");
        expect(darf(rolle, aktion, { freigabe: true })).toBe(soll !== "n");
      });
    }
  }

  it("die Freigabe öffnet nie Verwaltungsrechte", () => {
    for (const rolle of ["staff", "behandler"] as const) {
      for (const a of ["einstellungen.aendern", "team", "protokoll", "standorte.verwalten", "patienten.import"] as const) {
        expect(darf(rolle, a, { freigabe: true })).toBe(false);
      }
    }
    expect(darf("behandler", "einstellungen.ansehen", { freigabe: true })).toBe(false);
  });

  it("behandelt unbekannte oder fehlende Rollen wie die engste Rolle", () => {
    for (const r of ["", "ADMIN", "Admin", "root", null, undefined, 7]) {
      expect(rolleVon(r)).toBe("behandler");
      expect(darf(r, "team")).toBe(false);
      expect(darf(r, "einstellungen.ansehen")).toBe(false);
      expect(darf(r, "zahlungen")).toBe(false);
      expect(darf(r, "patienten")).toBe(true);
    }
  });

  it("erkennt gültige Rollen", () => {
    expect(istRolle("admin")).toBe(true);
    expect(istRolle("behandler")).toBe(true);
    expect(istRolle("BEHANDLER")).toBe(false);
    expect(rollenLabel("behandler")).toBe("Behandler/in");
    expect(rollenLabel("staff")).toBe("Mitarbeiter/in");
  });
});

describe("menueRechte", () => {
  it("Behandler ohne Freigabe: kein Geld, keine Einstellungen", () => {
    expect(menueRechte("behandler")).toEqual({ zahlungen: false, analyse: false, einstellungen: false, team: false, import: false });
  });
  it("Behandler mit Freigabe: Zahlungen und Analyse, sonst nichts", () => {
    expect(menueRechte("behandler", true)).toEqual({ zahlungen: true, analyse: true, einstellungen: false, team: false, import: false });
  });
  it("Mitarbeiter/in wie bisher", () => {
    expect(menueRechte("staff")).toEqual({ zahlungen: true, analyse: false, einstellungen: true, team: false, import: false });
    expect(menueRechte("staff", true).analyse).toBe(true);
  });
  it("Geschäftsführung: alles", () => {
    expect(menueRechte("admin")).toEqual({ zahlungen: true, analyse: true, einstellungen: true, team: true, import: true });
  });
});

describe("freigabeLabel", () => {
  it("nennt, was die Freigabe je Rolle öffnet", () => {
    expect(freigabeLabel("admin")).toBeNull();
    expect(freigabeLabel("staff")).toBe("Analyse freigeben");
    expect(freigabeLabel("behandler")).toBe("Zahlungen und Analyse freigeben");
  });
});
