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
        // Rotkanal frei (Kiefer-Gewicht gibt es nur beim Kopf-Scan), Grünkanal = Verdeckung zwischen 0 und 1
        for (let i = 0; i < c!.length; i += 4 * 97) { expect(c![i]).toBe(0); expect(c![i + 1]).toBeGreaterThanOrEqual(0); expect(c![i + 1]).toBeLessThanOrEqual(1); }
      }
    }
    // Kopf-Scan: Kiefer-Gewicht im Rotkanal, keine Verdeckung angemeldet
    expect(ANATOMIE.kopf.ao).toBeFalsy();
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
