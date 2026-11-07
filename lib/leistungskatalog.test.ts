import { describe, expect, it } from "vitest";
import { BEREICHE, KATALOG, LEISTUNGEN, abstand, filtern, kostenHinweis, leistung, navigation, normalisieren, suchen, vorherNachherErlaubt } from "./leistungskatalog";

const erster = (q: string) => suchen(q)[0]?.id;

describe("Leistungskatalog", () => {
  it("lädt, Meta stimmt, alle IDs eindeutig und als Slug", () => {
    expect(LEISTUNGEN.length).toBe(KATALOG.meta.anzahl);
    expect(LEISTUNGEN.length).toBeGreaterThanOrEqual(538);
    const ids = LEISTUNGEN.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("jede Leistung hat Pflichtfelder und gültige Codes", () => {
    for (const l of LEISTUNGEN) {
      expect(l.name && l.bereich && l.kategorie && l.beschreibung && l.behandler).toBeTruthy();
      expect(["GKV", "GKV_EA", "IND", "PKV", "SZ"]).toContain(l.kostentraeger_code);
      expect(["ja", "prüfen", "nein"]).toContain(l.hwg_vorher_nachher);
    }
  });

  it("Navigation Bereich → Kategorie → Leistung deckt alles ab", () => {
    const nav = navigation();
    expect(nav.map((b) => b.bereich)).toEqual(BEREICHE);
    expect(nav.flatMap((b) => b.kategorien.flatMap((k) => k.leistungen)).length).toBe(LEISTUNGEN.length);
  });

  it("Umlaute und Tippfehler", () => {
    expect(normalisieren("Hüft-TEP & Knie")).toBe("hueft tep und knie");
    expect(abstand("kreutzband", "kreuzband")).toBe(1);
    expect(erster("Kreuzbandriss")).toBe("orthopaedie-unfallchirurgie-kreuzband-op");
    expect(erster("kreuzband riss")).toBe("orthopaedie-unfallchirurgie-kreuzband-op");
    expect(erster("Kreutzbandriss")).toBe("orthopaedie-unfallchirurgie-kreuzband-op");
    expect(erster("Hueftprothese")).toBe("orthopaedie-unfallchirurgie-kuenstliches-hueftgelenk");
    expect(erster("hüftprotese")).toBe("orthopaedie-unfallchirurgie-kuenstliches-hueftgelenk");
    expect(erster("Grauer Star")).toBe("augenheilkunde-grauer-star-op");
    expect(erster("gelber Schein")).toBe("allgemeinmedizin-hausarzt-krankschreibung");
    // steht als Synonym bei beiden Leistungen
    expect(suchen("Abnehmspritze").slice(0, 2).map((l) => l.id)).toContain("innere-medizin-medikamentoese-adipositastherapie");
    expect(suchen("Zecke").map((l) => l.id)).toContain("impfungen-reisemedizin-fsme-impfung");
    expect(suchen("xyzqv")).toEqual([]);
  });

  it("Zahnmedizin: „dritte Zähne“ findet die Vollprothese", () => {
    expect(suchen("dritte Zähne")[0]?.name).toMatch(/Vollprothese/);
  });
  it("Ästhetik: „Hollywood-Lächeln“ findet Keramik-Veneers", () => {
    expect(suchen("Hollywood-Lächeln")[0]?.name).toMatch(/Veneer/);
  });
  it("HWG: keine Galerie bei Lippenunterspritzung", () => {
    const l = suchen("Lippenunterspritzung")[0];
    expect(l).toBeTruthy();
    expect(vorherNachherErlaubt(l, true)).toBe(false);
  });

  it("HWG-Regel: ja verbietet, prüfen braucht Admin-Freigabe", () => {
    expect(vorherNachherErlaubt({ hwg_vorher_nachher: "ja" }, true)).toBe(false);
    expect(vorherNachherErlaubt({ hwg_vorher_nachher: "prüfen" })).toBe(false);
    expect(vorherNachherErlaubt({ hwg_vorher_nachher: "prüfen" }, true)).toBe(true);
    expect(vorherNachherErlaubt({ hwg_vorher_nachher: "nein" })).toBe(true);
  });

  it("Kostenhinweis: Selbstzahler mit USt, keine Gebührenziffern", () => {
    expect(kostenHinweis({ kostentraeger_code: "SZ", ust_pflichtig: true })).toBe("Selbstzahlerleistung, zzgl. 19 % USt.");
    expect(kostenHinweis({ kostentraeger_code: "SZ", ust_pflichtig: false })).toBe("Selbstzahlerleistung.");
    for (const l of LEISTUNGEN) expect(kostenHinweis(l)).not.toMatch(/EBM|GOÄ|GOZ|BEMA/);
  });

  it("Filter nach Bereich, Kostenträger, Invasivität, Ausfallzeit", () => {
    const op = filtern(LEISTUNGEN, { inv: "operativ", kt: "GKV" });
    expect(op.length).toBeGreaterThan(10);
    expect(op.every((l) => l.invasivitaet === "operativ" && l.kostentraeger_code === "GKV")).toBe(true);
    expect(suchen("OP", { bereich: "Chirurgie" }).every((l) => l.bereich === "Chirurgie")).toBe(true);
    expect(leistung("orthopaedie-unfallchirurgie-kreuzband-op")?.ausfallzeit).toBe("mehr als 3 Wochen");
  });
});

describe("Fach → Katalog-Bereich", () => {
  it("jeder Eintrag trifft Leistungen, jedes Fach hat ein volles Angebot", async () => {
    const { FACH_LEISTUNGEN, leistungenFuerFach, LEISTUNGEN, leistung } = await import("./leistungskatalog");
    const { FACHPROFILE } = await import("./fachprofile");
    for (const fach of Object.keys(FACHPROFILE)) {
      expect(FACH_LEISTUNGEN[fach], fach).toBeTruthy();
      for (const e of FACH_LEISTUNGEN[fach]) {
        const n = e.startsWith("#") ? (leistung(e.slice(1)) ? 1 : 0) : LEISTUNGEN.filter((l) => l.bereich === e.split(" › ")[0] && (!e.includes(" › ") || l.kategorie === e.split(" › ")[1])).length;
        expect(n, `${fach}: ${e}`).toBeGreaterThan(0);
      }
      expect(leistungenFuerFach(fach).length, fach).toBeGreaterThanOrEqual(7);
    }
    // keine fachfremden Leistungen
    expect(leistungenFuerFach("kardio").some((l) => /Magen|Darm/.test(l.kategorie))).toBe(false);
    expect(leistungenFuerFach("optik").some((l) => /Hörgerät|Rollstuhl/.test(l.name))).toBe(false);
  });
});

describe("Zuordnung Anlass → Katalog", () => {
  it("jede Zuordnung zeigt auf vorhandene Anlässe und Katalog-IDs", async () => {
    const { ZUORDNUNG_ANLAESSE, leistung } = await import("./leistungskatalog");
    const { SPECIALTIES } = await import("./specialties");
    const { DENTAL_SHOWCASE } = await import("./dentalShowcase");
    const anlaesse = new Set([DENTAL_SHOWCASE, ...SPECIALTIES].flatMap((s) => s.anlaesse.map((a) => `${s.id}:${a.id}`)));
    expect(Object.keys(ZUORDNUNG_ANLAESSE).length).toBeGreaterThan(80);
    for (const [k, ids] of Object.entries(ZUORDNUNG_ANLAESSE)) {
      expect(anlaesse.has(k), k).toBe(true);
      for (const id of ids) expect(leistung(id), `${k} → ${id}`).not.toBeNull();
    }
  });
});
