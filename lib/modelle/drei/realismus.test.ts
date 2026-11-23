import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { ANATOMIE, type DateiId } from "./anatomie";
import { DEKO_SCHNITT, schnittZuDeko } from "../schnitt";
import { leseGlb } from "../../../scripts/anatomie-3d/lesen.mjs";

describe("Realistischere Modelle", () => {
  it("Umgebungsverdeckung ist eingebacken, wo sie angemeldet ist, und die Größe stimmt", async () => {
    const mitAo = (Object.keys(ANATOMIE) as DateiId[]).filter((d) => ANATOMIE[d].ao);
    expect(mitAo.sort()).toEqual(["auge", "gehirn", "harnwege", "haut", "herz", "hno", "lunge", "mund", "muskeln", "sehnen", "skelett", "verdauung"]);
    for (const d of mitAo) {
      expect(statSync(`public/anatomie-3d/${d}.glb`).size, d).toBe(ANATOMIE[d].bytes);
      const { teile } = await leseGlb(`public/anatomie-3d/${d}.glb`);
      for (const t of teile) {
        const c = t.attribute.COLOR_0?.daten;
        expect(c, `${d}/${t.name}`).toBeDefined();
        // Rotkanal frei (Kiefer-Gewicht gibt es nur beim Kopf-Scan; beim Gebiss trägt er die Wurzel, siehe unten),
        // Grünkanal = Verdeckung zwischen 0 und 1
        for (let i = 0; i < c!.length; i += 4 * 97) {
          if (d !== "mund") expect(c![i]).toBe(0);
          expect(c![i + 1]).toBeGreaterThanOrEqual(0); expect(c![i + 1]).toBeLessThanOrEqual(1);
        }
      }
    }
    // Kopf-Scan: Kiefer-Gewicht im Rotkanal, keine Verdeckung angemeldet
    expect(ANATOMIE.kopf.ao).toBeFalsy();
  });
  it("Gebiss: klein genug, Wurzel und Saum in der Eckenfarbe, Oberkiefer oben geschlossen", async () => {
    expect(statSync("public/anatomie-3d/mund.glb").size).toBeLessThanOrEqual(700 * 1024);
    expect(statSync("public/anatomie-3d/mund-leicht.glb").size).toBeLessThanOrEqual(350 * 1024);
    for (const datei of ["mund", "mund-leicht"]) {
      const { teile } = await leseGlb(`public/anatomie-3d/${datei}.glb`);
      const namen = new Set(teile.map((t) => String(t.extras.k ?? t.name)));
      // alle 32 Zähne zum Antippen, keine Schläfen- oder Jochbeinstücke mehr
      for (const q of [1, 2, 3, 4]) for (let n = 1; n <= 8; n++) expect(namen.has(`${q}${n}`), `${datei}/${q}${n}`).toBe(true);
      expect([...namen].some((n) => n.startsWith("deko:"))).toBe(false);
      for (const t of teile) {
        const c = t.attribute.COLOR_0!.daten, k = String(t.extras.k ?? ""), zahn = !!t.extras.zahn;
        let rot = 0, blau = 0;
        for (let i = 0; i < c.length; i += 4) {
          for (const w of [c[i], c[i + 2]]) { expect(w).toBeGreaterThanOrEqual(0); expect(w).toBeLessThanOrEqual(1); }
          rot = Math.max(rot, c[i]); blau = Math.max(blau, c[i + 2]);
        }
        // Rot nur bei Zähnen (Wurzel unter Knochen und Zahnfleisch), Blau nur bei Zähnen (Schneidekante) und Zahnfleisch (Saum)
        if (zahn) expect(rot, `${datei}/${k} Wurzel`).toBeGreaterThan(0.5); else expect(rot, `${datei}/${k}`).toBe(0);
        if (!zahn && k !== "mund:zahnfleisch") expect(blau, `${datei}/${k}`).toBe(0);
        if (k === "mund:zahnfleisch") expect(blau, `${datei} Saum`).toBeGreaterThan(0.5);
      }
      // Oberkiefer: ein geschlossener Körper mit waagerechtem Abschluss (keine offenen Schnittkanten am Schädel)
      const ok = teile.find((t) => t.extras.k === "mund:oberkiefer")!;
      const kanten = new Map<string, number>();
      for (let i = 0; i < ok.idx.length; i += 3) for (const [a, b] of [[ok.idx[i], ok.idx[i + 1]], [ok.idx[i + 1], ok.idx[i + 2]], [ok.idx[i + 2], ok.idx[i]]]) {
        const s = a < b ? `${a},${b}` : `${b},${a}`; kanten.set(s, (kanten.get(s) ?? 0) + 1);
      }
      const offen = [...kanten.values()].filter((z) => z === 1).length;
      expect(offen / kanten.size, `${datei} offene Kanten am Oberkiefer`).toBeLessThan(0.005);
    }
  });
  it("Teile des echten Auges und des Ohrs tragen die Erklärung des Schnittmodells", () => {
    const vorhanden = new Set([...ANATOMIE.auge.teile, ...ANATOMIE.hno.teile].map((t) => t.name));
    for (const k of Object.keys(DEKO_SCHNITT)) {
      expect(vorhanden.has(k), k).toBe(true);
      expect(schnittZuDeko(k)?.was, k).toBeTruthy();
    }
    expect(schnittZuDeko("deko:Hornhaut")?.name).toBe("Hornhaut");
    expect(schnittZuDeko("deko:Strahlenkörper")?.name).toBe("Ziliarkörper");
    expect(schnittZuDeko("deko:Tränendrüse")).toBeNull();
    expect(schnittZuDeko(null)).toBeNull();
  });
});
