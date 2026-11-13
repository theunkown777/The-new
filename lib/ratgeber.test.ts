import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RATGEBER, RATGEBER_GRUPPEN, ratgeberFuerFach, ratgeberNachGruppen, weitereRatgeber } from "./ratgeber";
import { ALLE_SPECIALTIES } from "./specialties";

describe("Ratgeber", () => {
  it("hat zu jedem Slug eine Seite und zu jeder Seite einen Eintrag", () => {
    for (const a of RATGEBER) expect(existsSync(join(process.cwd(), "app", "ratgeber", a.slug, "page.tsx")), a.slug).toBe(true);
    expect(new Set(RATGEBER.map((a) => a.slug)).size).toBe(RATGEBER.length);
  });

  it("ordnet jeden Artikel einer gültigen Gruppe zu, „alle Praxen“ zuerst, Zahnmedizin zuletzt", () => {
    const ids: string[] = RATGEBER_GRUPPEN.map((g) => g.id);
    for (const a of RATGEBER) expect(ids, a.slug).toContain(a.gruppe);
    const gruppen = ratgeberNachGruppen().map((x) => x.gruppe.id);
    expect(gruppen[0]).toBe("alle");
    expect(gruppen.at(-1)).toBe("zahn");
    expect(ratgeberNachGruppen().reduce((n, x) => n + x.artikel.length, 0)).toBe(RATGEBER.length);
  });

  it("hat gültige Daten, Slugs und Fach-Kennungen", () => {
    const faecher = new Set(ALLE_SPECIALTIES.map((s) => s.id));
    for (const a of RATGEBER) {
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(a.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.title.length).toBeGreaterThan(20);
      expect(a.description.length).toBeGreaterThan(60);
      if ("faecher" in a) for (const f of a.faecher) expect(faecher.has(f), `${a.slug}: ${f}`).toBe(true);
    }
  });

  it("zeigt unter einem Artikel zuerst dieselbe Gruppe", () => {
    const w = weitereRatgeber("igel-vereinbarung");
    expect(w.some((x) => x.slug === "igel-vereinbarung")).toBe(false);
    expect(w[0].gruppe).toBe("arzt");
    const erstesFremdes = w.findIndex((x) => x.gruppe !== "arzt");
    expect(w.slice(erstesFremdes).every((x) => x.gruppe !== "arzt")).toBe(true);
    expect(w[erstesFremdes].gruppe).toBe("alle");
  });

  it("wählt für Fachseiten passende Artikel", () => {
    expect(ratgeberFuerFach("psych", "arzt")[0].slug).toBe("kostenerstattung-psychotherapie");
    expect(ratgeberFuerFach("hno", "arzt")[0].slug).toBe("hilfsmittel-zuzahlung-mehrkosten");
    expect(ratgeberFuerFach("physio", "therapie").map((x) => x.slug)).toContain("heilmittel-zuzahlung");
    expect(ratgeberFuerFach("logo", "therapie").map((x) => x.slug)).not.toContain("selbstzahler-physiotherapie");
    expect(ratgeberFuerFach("zahn", "zahn").every((x) => x.gruppe === "zahn" || x.gruppe === "alle")).toBe(true);
    // Arztfächer bekommen keine Zahn- oder Therapie-Artikel, Versorger nur Allgemeines und ausdrücklich Zugeordnetes.
    expect(ratgeberFuerFach("kardio", "arzt", 99).every((x) => x.gruppe === "arzt" || x.gruppe === "alle")).toBe(true);
    expect(ratgeberFuerFach("hoerakustik", null, 99).map((x) => x.slug)).toContain("hilfsmittel-zuzahlung-mehrkosten");
    expect(ratgeberFuerFach("pflege", null, 99).every((x) => x.gruppe === "alle")).toBe(true);
  });
});
