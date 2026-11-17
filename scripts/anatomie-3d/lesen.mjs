// Liest eine gepackte GLB-Datei (gltfpack: meshopt, quantisiert) wieder ein: je Teil Name, Zusatzdaten,
// Ecken in Szenenkoordinaten (mm), Dreiecke und weitere Attribute als Fließkomma. Für Prüfungen und
// für das Einbacken der Umgebungsverdeckung (ao.mjs). Ohne three.js-Szene, nur der Decoder.
import { readFileSync } from "node:fs";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const KOMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const GROESSE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function matrix(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation ?? [0, 0, 0], [sx, sy, sz] = n.scale ?? [1, 1, 1], [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0, (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0, (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0, tx, ty, tz, 1];
}
function mal(a, b) {
  const o = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return o;
}

/** GLB lesen: { json, teile: [{ name, extras, pos, idx, attribute }] } (pos in Szenenkoordinaten). */
export async function leseGlb(pfad) {
  await MeshoptDecoder.ready;
  const b = readFileSync(pfad);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jl).toString("utf8"));
  const binStart = 20 + jl + 8;
  const bin = b.subarray(binStart, binStart + b.readUInt32LE(20 + jl));
  const ansichten = new Map();
  const ansicht = (i) => {
    if (ansichten.has(i)) return ansichten.get(i);
    const v = json.bufferViews[i];
    const ext = v.extensions?.EXT_meshopt_compression;
    let daten;
    if (ext) {
      daten = new Uint8Array(ext.count * ext.byteStride);
      const quelle = new Uint8Array(bin.buffer, bin.byteOffset + (ext.byteOffset ?? 0), ext.byteLength);
      MeshoptDecoder.decodeGltfBuffer(daten, ext.count, ext.byteStride, quelle, ext.mode, ext.filter ?? "NONE");
    } else daten = new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0), v.byteLength);
    ansichten.set(i, daten);
    return daten;
  };
  const zugriff = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], roh = ansicht(a.bufferView);
    const K = KOMP[a.componentType], n = GROESSE[a.type], schritt = (v.byteStride ?? v.extensions?.EXT_meshopt_compression?.byteStride ?? n * K.BYTES_PER_ELEMENT) / K.BYTES_PER_ELEMENT;
    const kopie = new Uint8Array(roh.length); kopie.set(roh);
    const quelle = new K(kopie.buffer, a.byteOffset ?? 0, Math.floor((kopie.length - (a.byteOffset ?? 0)) / K.BYTES_PER_ELEMENT));
    const aus = new Float32Array(a.count * n);
    const teiler = !a.normalized ? 1 : K === Int8Array ? 127 : K === Uint8Array ? 255 : K === Int16Array ? 32767 : K === Uint16Array ? 65535 : 1;
    for (let e = 0; e < a.count; e++) for (let k = 0; k < n; k++) {
      const w = quelle[e * schritt + k] / teiler;
      aus[e * n + k] = a.normalized && (K === Int8Array || K === Int16Array) ? Math.max(-1, w) : w;
    }
    return { daten: aus, groesse: n, komp: a.componentType, normalized: !!a.normalized };
  };
  const teile = [];
  const gehe = (ni, eltern, benannt) => {
    const n = json.nodes[ni], m = mal(eltern, matrix(n));
    const traeger = n.extras && "g" in n.extras ? n : benannt;
    if (n.mesh !== undefined) {
      for (const p of json.meshes[n.mesh].primitives) {
        const pos = zugriff(p.attributes.POSITION).daten;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i], y = pos[i + 1], z = pos[i + 2];
          pos[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
          pos[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
          pos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
        }
        const idx = Uint32Array.from(zugriff(p.indices).daten);
        const attribute = {};
        for (const [name, ai] of Object.entries(p.attributes)) if (name !== "POSITION") attribute[name] = zugriff(ai);
        teile.push({ name: traeger?.name ?? "", extras: traeger?.extras ?? {}, pos, idx, attribute, material: p.material });
      }
    }
    for (const c of n.children ?? []) gehe(c, m, traeger);
  };
  const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const ni of json.scenes[json.scene ?? 0].nodes) gehe(ni, ident, null);
  return { json, teile, bin };
}

/** Glatte Eckennormalen (flächengewichtet), wie sie das Modell zur Laufzeit bildet (echt.ts). */
export function normalen(pos, idx) {
  const N = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const e of [a, b, c]) { N[e] += nx; N[e + 1] += ny; N[e + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}
