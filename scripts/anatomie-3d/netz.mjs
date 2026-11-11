// Netz-Werkzeuge: gleiche Punkte verschmelzen, vereinfachen (meshoptimizer aus three.js), Rahmen.
import { MeshoptSimplifier } from "three/examples/jsm/libs/meshopt_simplifier.module.js";

await MeshoptSimplifier.ready;

/** Punkte mit gleicher Lage (auf 0,01 mm) zu einem verschmelzen und unbenutzte entfernen. */
export function verschweisse({ pos, idx }) {
  const karte = new Map(), neu = [], umb = new Uint32Array(pos.length / 3);
  for (let i = 0; i < pos.length / 3; i++) {
    const k = `${Math.round(pos[i * 3] * 100)},${Math.round(pos[i * 3 + 1] * 100)},${Math.round(pos[i * 3 + 2] * 100)}`;
    let j = karte.get(k);
    if (j === undefined) { j = neu.length / 3; karte.set(k, j); neu.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
    umb[i] = j;
  }
  const out = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = umb[idx[i]], b = umb[idx[i + 1]], c = umb[idx[i + 2]];
    if (a !== b && b !== c && a !== c) out.push(a, b, c);
  }
  return kompakt({ pos: new Float32Array(neu), idx: new Uint32Array(out) });
}

/** Nur benutzte Punkte behalten. */
export function kompakt({ pos, idx }) {
  const umb = new Int32Array(pos.length / 3).fill(-1), neu = [];
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    let j = umb[idx[i]];
    if (j < 0) { j = umb[idx[i]] = neu.length / 3; neu.push(pos[idx[i] * 3], pos[idx[i] * 3 + 1], pos[idx[i] * 3 + 2]); }
    out[i] = j;
  }
  return { pos: new Float32Array(neu), idx: out };
}

/** Auf etwa `dreiecke` Dreiecke vereinfachen; kleine abgetrennte Splitter fallen weg. */
export function vereinfache(n, dreiecke, fehler = 0.06) {
  const ziel = Math.max(3, Math.floor(Math.min(n.idx.length / 3, dreiecke)) * 3);
  if (ziel >= n.idx.length) return n;
  let [idx] = MeshoptSimplifier.simplify(n.idx, n.pos, 3, ziel, fehler, ["Prune"]);
  if (idx.length > ziel * 1.6) [idx] = MeshoptSimplifier.simplify(n.idx, n.pos, 3, ziel, fehler * 3, ["Prune", "Permissive"]);
  return kompakt({ pos: n.pos, idx });
}

export function rahmen(pos) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]); }
  return { min, max };
}

/** Glatte Normalen (nach Fläche gewichtet). */
export function normalen({ pos, idx }) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const p of [a, b, c]) { n[p] += x; n[p + 1] += y; n[p + 2] += z; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}
