import { beforeAll, describe, expect, it } from "vitest";
import { ANATOMIE } from "./modelle/drei/anatomie";
import { orteFuer, type KurzArt } from "./kurzcheck";
import { GRENZEN, ortAusKennung, ortZiele, regionAusPunkt, type V3 } from "./kurzcheck3d";
import { leseGlb, normalen } from "../scripts/anatomie-3d/lesen.mjs";

const lm = (datei: "skelett" | "sehnen", name: string) => ANATOMIE[datei].teile.find((t) => t.name === name)!.mitte as V3;

describe("Antippen am Modell → Stelle (Landmarken aus anatomieInhalt.json)", () => {
  it("findet Knie, Rücken, Handgelenk und weitere Stellen an den Knochenmitten", () => {
    expect(regionAusPunkt(lm("skelett", "kniescheibe:R"), [0, 0, 1], "koerper")).toBe("knie:R");
    expect(regionAusPunkt(lm("skelett", "kniescheibe:L"), [0, 0, 1], "koerper")).toBe("knie:L");
    const bws = lm("skelett", "bws:M");
    expect(regionAusPunkt([bws[0], bws[1], bws[2] - 60], [0, 0, -1], "koerper")).toBe("ruecken_oben");
    // Gleiche Höhe, Normale nach vorn: Brust statt Rücken (vorn/hinten entscheidet die Normale)
    expect(regionAusPunkt([60, bws[1], 90], [0, 0, 1], "koerper")).toBe("brust:L");
    expect(regionAusPunkt(lm("skelett", "handwurzel:L"), [1, 0, 0], "koerper")).toBe("handgelenk:L");
    expect(regionAusPunkt(lm("skelett", "handwurzel:R"), [-1, 0, 0], "koerper")).toBe("handgelenk:R");
    const lws = lm("skelett", "lws:M");
    expect(regionAusPunkt([lws[0], lws[1], lws[2] - 60], [0, 0, -1], "koerper")).toBe("ruecken_unten");
    expect(regionAusPunkt([-50, GRENZEN.nabel + 40, 100], [0, 0, 1], "koerper")).toBe("bauch:ro");
    expect(regionAusPunkt([50, GRENZEN.nabel - 40, 100], [0, 0, 1], "koerper")).toBe("bauch:lu");
    expect(regionAusPunkt(lm("sehnen", "achillessehne:R"), [0, 0, -1], "koerper")).toBe("wade:R");
    expect(regionAusPunkt(lm("skelett", "zehen:L"), [0, 1, 0], "koerper")).toBe("fuss:L");
    expect(regionAusPunkt([0, 840, 0], [0, 1, 0], "koerper")).toBe("kopf");
  });
  it("findet Augen, Ohren, Nase und Mund am Kopf", () => {
    expect(regionAusPunkt([-33, 738, 75], [0, 0, 1], "auge")).toBe("auge:R");
    expect(regionAusPunkt([33, 738, 75], [0, 0, 1], "auge")).toBe("auge:L");
    expect(regionAusPunkt([-80, 724, -14], [-1, 0, 0], "hno")).toBe("ohr:R");
    expect(regionAusPunkt([80, 724, -14], [1, 0, 0], "hno")).toBe("ohr:L");
    const nase = ANATOMIE.kopf.nase as V3, mund = ANATOMIE.kopf.mund as V3;
    expect(regionAusPunkt(nase, [0, 0, 1], "hno")).toBe("nase");
    expect(regionAusPunkt(mund, [0, 0, 1], "hno")).toBe("gesicht:mund");
    // Schultern des Kopf-Scans gehören zu keiner Stelle
    expect(regionAusPunkt([-150, 500, 0], [-1, 0, 0], "auge")).toBeNull();
  });
  it("gibt nur Stellen zurück, die es für die Art gibt", () => {
    expect(regionAusPunkt([-33, 738, 75], [0, 0, 1], "zahn")).toBeNull();
    // Augenpraxis: Ohr, Nase, Mund und Hals ergeben keine Stelle; HNO-Praxis: das Auge nicht
    expect(regionAusPunkt([80, 724, -14], [1, 0, 0], "auge")).toBeNull();
    expect(regionAusPunkt(ANATOMIE.kopf.nase as V3, [0, 0, 1], "auge")).toBeNull();
    expect(regionAusPunkt(ANATOMIE.kopf.mund as V3, [0, 0, 1], "auge")).toBeNull();
    expect(regionAusPunkt([33, 738, 75], [0, 0, 1], "hno")).toBeNull();
    // Schläfe: in der Augenpraxis eigene Stelle, in der HNO-Praxis der Kopf
    expect(regionAusPunkt([-50, 773, 30], [-0.8, 0, 0.4], "auge")).toBe("gesicht:schlaefe:R");
    expect(regionAusPunkt([-50, 773, 30], [-0.8, 0, 0.4], "hno")).toBe("kopf");
    // Nacken gibt es am Kopf-Modell für keine der beiden Praxen; der Hals vorn gehört zur HNO-Praxis
    const hals = ortZiele("rachen", "hno")[0];
    expect(regionAusPunkt(hals.punkt, hals.normale, "hno")).toBe("rachen");
    expect(regionAusPunkt(hals.punkt, hals.normale, "auge")).toBeNull();
    const nacken: V3 = [0, (ANATOMIE.kopf.mund as V3)[1] - 62, -40];
    expect(regionAusPunkt(nacken, [0, 0, -1], "hno")).toBeNull();
    expect(regionAusPunkt(nacken, [0, 0, -1], "auge")).toBeNull();
    // Haut: kein Kiefergelenk (Körper schon)
    const kg = ANATOMIE.mund.gelenk!.R;
    const p: V3 = [kg[0] - 26, kg[1] - 2, kg[2] + 8];
    expect(regionAusPunkt(p, [-1, 0, 0.2], "koerper")).toBe("kiefergelenk:R");
    expect(regionAusPunkt(p, [-1, 0, 0.2], "haut")).not.toBe("kiefergelenk:R");
  });
  it("übersetzt Teile des Mundes in Stellen", () => {
    expect(ortAusKennung("36")).toBe("zahn:36");
    expect(ortAusKennung("18")).toBe("zahn:18");
    expect(ortAusKennung("mund:zahnfleisch")).toBe("mund:zahnfleisch");
    expect(ortAusKennung("mund:unterkiefer")).toBe("mund:kiefergelenk");
    expect(ortAusKennung("mund:zunge")).toBe("mund:zunge");
    expect(ortAusKennung("mund:zaepfchen")).toBe("mund:gaumen");
    expect(ortAusKennung("deko:Jochbein")).toBeNull();
    expect(ortAusKennung("99")).toBeNull();
  });
});

// Gegenprobe an der echten Oberfläche: Jede Stelle der Liste, auf die Haut projiziert, ergibt wieder sich selbst.
function strahl(P: Float32Array, I: Uint32Array, o: V3, d: V3) {
  let best = Infinity, bi = -1;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
    if (Math.abs(det) < 1e-9) continue;
    const inv = 1 / det, s = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]];
    const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv; if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv; if (v < 0 || u + v > 1) continue;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
    if (t > 0 && t < best) { best = t; bi = i; }
  }
  return bi < 0 ? null : { t: best, i: bi };
}
const netze: Record<string, { P: Float32Array; I: Uint32Array; N: Float32Array }> = {};
beforeAll(async () => {
  for (const d of ["haut", "haut-leicht", "kopf"]) {
    const { teile } = await leseGlb(`public/anatomie-3d/${d}.glb`);
    netze[d] = { P: teile[0].pos, I: teile[0].idx, N: normalen(teile[0].pos, teile[0].idx) };
  }
});
describe("Gegenprobe an der Oberfläche von haut.glb und kopf.glb", () => {
  const pruefe = (art: KurzArt, datei: string) => {
    const { P, I, N } = netze[datei];
    const falsch: string[] = [];
    for (const o of orteFuer(art)) for (const z of ortZiele(o.id, art)) {
      const l = Math.hypot(...z.normale), d: V3 = [-z.normale[0] / l, -z.normale[1] / l, -z.normale[2] / l];
      const start: V3 = [z.punkt[0] - d[0] * 300, z.punkt[1] - d[1] * 300, z.punkt[2] - d[2] * 300];
      const h = strahl(P, I, start, d);
      if (!h) { falsch.push(`${o.id}: kein Treffer`); continue; }
      const p: V3 = [start[0] + d[0] * h.t, start[1] + d[1] * h.t, start[2] + d[2] * h.t];
      const n: V3 = [0, 1, 2].map((k) => N[I[h.i] * 3 + k] + N[I[h.i + 1] * 3 + k] + N[I[h.i + 2] * 3 + k]) as V3;
      const r = regionAusPunkt(p, n, art);
      const ok = r === o.id || (o.id.endsWith(":B") && r?.startsWith(o.id.slice(0, -1))) || (o.id === "bauch" && r?.startsWith("bauch:"));
      if (!ok) falsch.push(`${o.id} → ${r}`);
    }
    return falsch;
  };
  it("Körper (haut.glb und die leichte Fassung für Handys)", () => {
    expect(pruefe("koerper", "haut")).toEqual([]);
    expect(pruefe("koerper", "haut-leicht")).toEqual([]);
    expect(pruefe("haut", "haut")).toEqual([]);
  });
  it("Kopf für Augen- und HNO-Praxen (kopf.glb)", () => {
    expect(pruefe("auge", "kopf")).toEqual([]);
    expect(pruefe("hno", "kopf")).toEqual([]);
  });
  it("fast jede Stelle der Haut gehört zu einer Region", () => {
    const { P, N } = netze.haut;
    let ohne = 0;
    for (let i = 0; i < P.length; i += 3) if (!regionAusPunkt([P[i], P[i + 1], P[i + 2]], [N[i], N[i + 1], N[i + 2]], "koerper")) ohne++;
    expect(ohne / (P.length / 3)).toBeLessThan(0.01);
  });
});
