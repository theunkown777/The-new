import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { ANATOMIE, type DateiId } from "./anatomie";
import { DEKO_SCHNITT, schnittZuDeko } from "../schnitt";
import { leseGlb } from "../../../scripts/anatomie-3d/lesen.mjs";

/** Liegt p im geschlossenen Netz? Schnitte eines schrägen Strahls zählen (ungerade = innen). */
function innen(n: { pos: Float32Array; idx: Uint32Array | number[] }, p: number[]): boolean {
  const d = [0.31, -0.93, 0.19], P = n.pos, I = n.idx;
  let z = 0;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const s = [p[0] - P[a], p[1] - P[a + 1], p[2] - P[a + 2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const w = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (w < 0 || u + w > 1) continue;
    if ((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det > 0) z++;
  }
  return z % 2 === 1;
}

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
  it("Gebiss: klein genug, Wurzel, Saum und Schleimhaut in der Eckenfarbe, Kiefer geschlossen", async () => {
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
        // Rot: Wurzel (Zähne) bzw. freier Rand (Zahnfleisch); Blau: Schneidekante (Zähne), feste Gingiva (Zahnfleisch, über 0,5)
        // und Mittelfurche (Zunge); sonst beides 0
        const fleisch = k === "mund:zahnfleisch";
        if (zahn) expect(rot, `${datei}/${k} Wurzel`).toBeGreaterThan(0.5);
        else if (fleisch) expect(rot, `${datei} freier Rand`).toBeGreaterThan(0.5);
        else expect(rot, `${datei}/${k}`).toBe(0);
        if (!zahn && !fleisch && k !== "mund:zunge") expect(blau, `${datei}/${k}`).toBe(0);
        if (fleisch) {
          expect(blau, `${datei} feste Gingiva`).toBeGreaterThan(0.5);
          let min = 1; for (let i = 2; i < c.length; i += 4) min = Math.min(min, c[i]);
          expect(min, `${datei} bewegliche Schleimhaut`).toBeLessThan(0.5);
        }
      }
      // Ober- und Unterkiefer: geschlossene Körper (höchstens 16 offene Kanten, etwa von winzigen Spalten beim Vereinfachen)
      for (const kk of ["mund:oberkiefer", "mund:unterkiefer"]) {
        const ok = teile.find((t) => t.extras.k === kk)!;
        const kanten = new Map<string, number>();
        for (let i = 0; i < ok.idx.length; i += 3) for (const [a, b] of [[ok.idx[i], ok.idx[i + 1]], [ok.idx[i + 1], ok.idx[i + 2]], [ok.idx[i + 2], ok.idx[i]]]) {
          const s = a < b ? `${a},${b}` : `${b},${a}`; kanten.set(s, (kanten.get(s) ?? 0) + 1);
        }
        expect([...kanten.values()].filter((z) => z === 1).length, `${datei} offene Kanten ${kk}`).toBeLessThanOrEqual(16);
      }
      // Oberkiefer oben bei 707 abgeschnitten (nicht höher)
      const ok = teile.find((t) => t.extras.k === "mund:oberkiefer")!;
      let oben = -Infinity; for (let i = 1; i < ok.pos.length; i += 3) oben = Math.max(oben, ok.pos[i]);
      expect(oben, `${datei} Oberkiefer oben`).toBeLessThanOrEqual(707.5);
      // Wurzeln der unteren Frontzähne (33 bis 43): unterhalb des Zahnfleischs liegen sie im Knochen (keine weißen Spitzen)
      const uk = teile.find((t) => t.extras.k === "mund:unterkiefer")!;
      const gu = teile.filter((t) => t.extras.k === "mund:zahnfleisch").find((t) => { let m = 0; for (let i = 1; i < t.pos.length; i += 3) m += t.pos[i]; return m / (t.pos.length / 3) < 676; })!;
      const unterkante = new Map<number, number>(); // tiefster Punkt des Zahnfleischs je Millimeter in x
      for (let i = 0; i < gu.pos.length; i += 3) { const x = Math.round(gu.pos[i]); unterkante.set(x, Math.min(unterkante.get(x) ?? Infinity, gu.pos[i + 1])); }
      let geprueft = 0, draussen = 0;
      for (const t of teile.filter((x) => ["31", "32", "33", "41", "42", "43"].includes(String(x.extras.k)))) {
        for (let v = 0; v < t.pos.length / 3; v += 2) {
          const p = [t.pos[v * 3], t.pos[v * 3 + 1], t.pos[v * 3 + 2]];
          if (p[1] > (unterkante.get(Math.round(p[0])) ?? -Infinity) - 0.5) continue;
          geprueft++;
          if (!innen(uk, p)) draussen++;
        }
      }
      expect(geprueft, `${datei} Wurzelpunkte unter dem Zahnfleisch`).toBeGreaterThan(50);
      expect(draussen / geprueft, `${datei} Wurzelpunkte außerhalb des Knochens`).toBeLessThan(0.02);
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
