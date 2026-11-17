import { describe, expect, it } from "vitest";
import { PORTAL_LANGS } from "./portalI18n";
import { readFileSync } from "node:fs";
import { KURZ_ELTERN, KURZ_PAKETE, KURZ_UI, KURZ_UI_ELTERN, KURZ_W_ELTERN, kurzPaket, kurzUebersetzer, kurzWoerter } from "./kurzcheckTexte";
import { orteFuer } from "./kurzcheck";
import { anspracheFuer } from "./anamneseProfile";

const platzhalter = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(",");

describe("Texte des Kurz-Fragebogens in den Portalsprachen", () => {
  it("jede Sprache des Portals hat ein Paket", () => {
    for (const l of PORTAL_LANGS) expect(KURZ_PAKETE[l]?.lang).toBe(l);
  });
  for (const l of PORTAL_LANGS.filter((x) => x !== "de")) {
    it(`${l}: Oberfläche und alle Wörter übersetzt, Platzhalter erhalten`, () => {
      const p = KURZ_PAKETE[l];
      const fehlt = (Object.keys(KURZ_UI) as (keyof typeof KURZ_UI)[]).filter((k) => !p.ui[k]?.trim());
      expect(fehlt).toEqual([]);
      for (const k of Object.keys(KURZ_UI) as (keyof typeof KURZ_UI)[]) expect(platzhalter(p.ui[k]!), `${l}.${k}`).toBe(platzhalter(KURZ_UI[k]));
      expect(kurzWoerter().filter((w) => !p.w[w]?.trim())).toEqual([]);
      expect(Object.keys(p.w).filter((w) => !kurzWoerter().includes(w))).toEqual([]);
    });
  }
  it("setzt die Seite passend zur Sprache", () => {
    expect(kurzUebersetzer(KURZ_PAKETE.de).ort("knie:R")).toBe("Knie rechts");
    expect(kurzUebersetzer(KURZ_PAKETE.en).ort("knie:R")).toBe("Right knee");
    expect(kurzUebersetzer(KURZ_PAKETE.en).ort("bauch:lo")).toBe("Left upper abdomen");
    expect(kurzUebersetzer(KURZ_PAKETE.tr).ort("knie:L")).toBe("Sol diz");
    expect(kurzUebersetzer(KURZ_PAKETE.uk).ort("auge:B")).toBe("Обидва ока");
    expect(kurzUebersetzer(KURZ_PAKETE.en).ort("zahn:36")).toBe("Tooth 36");
    expect(kurzUebersetzer(KURZ_PAKETE.ar).dir).toBe("rtl");
    for (const l of PORTAL_LANGS) for (const o of orteFuer("koerper")) expect(kurzUebersetzer(KURZ_PAKETE[l]).ort(o.id)).not.toContain("{x}");
  });
  it("schreibt ohne Gedankenstriche als Satzzeichen", () => {
    for (const l of PORTAL_LANGS)
      for (const s of [...Object.values(KURZ_PAKETE[l].ui), ...Object.values(KURZ_PAKETE[l].w), ...Object.values(KURZ_UI), ...Object.values(KURZ_ELTERN[l].ui), ...Object.values(KURZ_ELTERN[l].w)])
        expect(s, s).not.toMatch(/ [–—] /);
  });
});

describe("Fassung für Eltern (Kind, wie im Anamnesebogen)", () => {
  it("jede Sprache hat alle Texte für Eltern, mit denselben Platzhaltern, und alle Antworten in der Ich-Form", () => {
    for (const l of PORTAL_LANGS) {
      const e = KURZ_ELTERN[l];
      expect(Object.keys(e.ui).sort(), l).toEqual(Object.keys(KURZ_UI_ELTERN).sort());
      for (const [k, v] of Object.entries(e.ui)) {
        expect(v.trim(), `${l}.${k}`).not.toBe("");
        expect(platzhalter(v), `${l}.${k}`).toBe(platzhalter(KURZ_UI[k as keyof typeof KURZ_UI]));
      }
      expect(Object.keys(e.w).sort(), l).toEqual([...KURZ_W_ELTERN].sort());
      for (const w of KURZ_W_ELTERN) expect(kurzWoerter(), w).toContain(w);
    }
    // Jede Antwort in der Ich-Form hat eine Fassung für Eltern.
    expect(kurzWoerter().filter((w) => /^Ich\b/.test(w) && w !== "Ich weiß nicht genau, wo").sort()).toEqual([...KURZ_W_ELTERN].sort());
  });
  it("fragt Eltern nach „Ihrem Kind“ und lässt die übrigen Texte stehen", () => {
    const de = kurzUebersetzer(kurzPaket("de", { eltern: true }));
    expect(de.t("wo")).toBe("Wo hat Ihr Kind Beschwerden?");
    expect(de.t("seit")).toBe("Seit wann hat Ihr Kind das?");
    expect(de.t("keine")).toBe("Mein Kind hat keine Beschwerden");
    expect(de.t("danke", { name: "Jonas" })).toBe("Danke für Ihre Angaben zu Jonas.");
    expect(de.w("Ich höre schlechter")).toBe("Mein Kind hört schlechter");
    expect(de.t("staerke")).toBe(KURZ_UI.staerke);
    for (const k of Object.keys(KURZ_UI_ELTERN) as (keyof typeof KURZ_UI_ELTERN)[]) expect(KURZ_UI_ELTERN[k], k).not.toMatch(/\b(Sie haben|haben Sie|Ich habe|Ihr eigene[rs]?)\b/);
    const en = kurzUebersetzer(kurzPaket("en", { eltern: true }));
    expect(en.t("wo")).toBe("Where does your child have symptoms?");
    expect(en.t("staerke")).toBe(KURZ_PAKETE.en.ui.staerke);
    // Ohne Eltern bleibt alles wie bisher.
    expect(kurzUebersetzer(kurzPaket("de")).t("wo")).toBe("Wo haben Sie Beschwerden?");
    expect(kurzPaket("tr")).toBe(KURZ_PAKETE.tr);
  });
  it("wählt die Fassung mit derselben Regel wie der Anamnesebogen", () => {
    expect(anspracheFuer("kinder", 6)).toBe("eltern");
    expect(anspracheFuer("kinder", 17)).toBe("eltern");
    expect(anspracheFuer("kinder", null)).toBe("eltern");
    expect(anspracheFuer("zahn", 11)).toBe("eltern");
    expect(anspracheFuer("logo", 5)).toBe("eltern");
    expect(anspracheFuer("zahn", 16)).toBe("patient");
    expect(anspracheFuer("physio", null)).toBe("patient");
    expect(anspracheFuer("gyn", 13)).toBe("patient");
    const seite = readFileSync("app/portal/[token]/fragen/page.tsx", "utf8");
    expect(seite).toContain('anspracheFuer(gefunden.practice.specialty, ageFromBirthDate(gefunden.birthDate)) === "eltern"');
    expect(seite).toContain("kurzPaket(lang, { eltern })");
    // Das Geburtsdatum geht nicht an den Browser: Kurzcheck bekommt nur das Paket.
    expect(seite).not.toMatch(/<Kurzcheck[^>]*birthDate/);
  });
});
