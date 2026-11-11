// Berechnete Hülle um eine Punktwolke: Die freien BodyParts3D-Daten enthalten keine Lungenoberfläche,
// wohl aber die Bronchien und Lungengefäße bis in die Segmente. Die Lungenhülle wird deshalb als
// weiche Fläche um diese echten Bäume berechnet (Dichtefeld → Weichzeichnen → Marching Cubes).
import { MeshBasicMaterial } from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { verschweisse } from "./netz.mjs";

/**
 * punkte: Float32Array (x, y, z …) in mm. raster: Kantenlänge einer Zelle in mm. weich: Weichzeichner-Radius in mm.
 * schwelle: Anteil der höchsten Dichte, ab dem „innen“ gilt.
 */
export function huelle(punkte, { raster = 4, weich = 10, schwelle = 0.08, rand = 24 } = {}) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < punkte.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], punkte[i + k]); max[k] = Math.max(max[k], punkte[i + k]); }
  rand = Math.max(rand, weich * 3.2);
  const groesse = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) + 2 * rand;
  const n = Math.ceil(groesse / raster);
  const mitte = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
  const ursprung = mitte.map((m) => m - (n * raster) / 2);
  const mc = new MarchingCubes(n, new MeshBasicMaterial(), false, false, 400000);
  const feld = new Float32Array(n * n * n);
  for (let i = 0; i < punkte.length; i += 3) {
    const x = Math.floor((punkte[i] - ursprung[0]) / raster), y = Math.floor((punkte[i + 1] - ursprung[1]) / raster), z = Math.floor((punkte[i + 2] - ursprung[2]) / raster);
    if (x < 1 || y < 1 || z < 1 || x >= n - 1 || y >= n - 1 || z >= n - 1) continue;
    feld[x + y * n + z * n * n] += 1;
  }
  // Gauß-Weichzeichner, getrennt je Achse
  const s = weich / raster, r = Math.ceil(s * 2.5), kern = [];
  for (let i = -r; i <= r; i++) kern.push(Math.exp(-(i * i) / (2 * s * s)));
  const summe = kern.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kern.length; i++) kern[i] /= summe;
  const schritt = [1, n, n * n];
  let a = feld, b = new Float32Array(feld.length);
  for (let achse = 0; achse < 3; achse++) {
    const st = schritt[achse];
    b.fill(0);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = x + y * n + z * n * n, c = [x, y, z][achse];
      let v = 0;
      for (let k = -r; k <= r; k++) { const cc = c + k; if (cc >= 0 && cc < n) v += a[i + k * st] * kern[k + r]; }
      b[i] = v;
    }
    [a, b] = [b, a];
  }
  let hoch = 0;
  for (const v of a) hoch = Math.max(hoch, v);
  // Werte so skalieren, dass die Schwelle bei 1 liegt
  mc.isolation = 1;
  for (let i = 0; i < a.length; i++) mc.field[i] = a[i] / (hoch * schwelle);
  // Ränder leeren, damit die Fläche geschlossen bleibt
  mc.update();
  const roh = mc.positionArray.subarray(0, mc.count * 3);
  const pos = new Float32Array(roh.length);
  for (let i = 0; i < roh.length; i += 3) {
    // MarchingCubes legt das Feld in den Würfel −1 … 1
    pos[i] = ursprung[0] + ((roh[i] + 1) / 2) * n * raster;
    pos[i + 1] = ursprung[1] + ((roh[i + 1] + 1) / 2) * n * raster;
    pos[i + 2] = ursprung[2] + ((roh[i + 2] + 1) / 2) * n * raster;
  }
  const idx = new Uint32Array(pos.length / 3);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  return verschweisse({ pos, idx });
}
