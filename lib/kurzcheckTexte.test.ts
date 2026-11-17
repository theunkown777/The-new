import { describe, expect, it } from "vitest";
import { PORTAL_LANGS } from "./portalI18n";
import { KURZ_PAKETE, KURZ_UI, kurzUebersetzer, kurzWoerter } from "./kurzcheckTexte";
import { orteFuer } from "./kurzcheck";

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
    for (const l of PORTAL_LANGS) for (const s of [...Object.values(KURZ_PAKETE[l].ui), ...Object.values(KURZ_PAKETE[l].w), ...Object.values(KURZ_UI)]) expect(s, s).not.toMatch(/ [–—] /);
  });
});
