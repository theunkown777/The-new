// Schreibt eine einfache GLB-Datei (glTF 2.0, binär): ein Knoten je Teil mit Namen und „extras“.
// Komprimiert wird danach mit gltfpack (meshopt), siehe bauen.mjs.
import { writeFileSync } from "node:fs";

/**
 * teile: { name, pos: Float32Array, idx: Uint32Array, normal?: Float32Array, uv?: Float32Array,
 *          attribute?: Record<string, { daten: Float32Array, groesse: 1|2|3|4 }>, extras?: object, bild?: number, normalBild?: number }
 * bilder: { daten: Buffer, mime: string }[]
 */
export function schreibeGlb(pfad, teile, bilder = []) {
  const json = { asset: { version: "2.0", generator: "Sorrida anatomie-3d" }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [], materials: [] };
  const stuecke = [];
  let laenge = 0;
  const ansicht = (daten, ziel) => {
    const b = Buffer.from(daten.buffer, daten.byteOffset, daten.byteLength);
    const pad = (4 - (laenge % 4)) % 4;
    if (pad) { stuecke.push(Buffer.alloc(pad)); laenge += pad; }
    json.bufferViews.push({ buffer: 0, byteOffset: laenge, byteLength: b.length, ...(ziel ? { target: ziel } : {}) });
    stuecke.push(b); laenge += b.length;
    return json.bufferViews.length - 1;
  };
  const zugriff = (daten, typ, anzahl, komp, minmax) => {
    const a = { bufferView: ansicht(daten, komp === 5126 ? 34962 : 34963), componentType: komp, count: anzahl, type: typ };
    if (minmax) Object.assign(a, minmax);
    json.accessors.push(a);
    return json.accessors.length - 1;
  };
  if (bilder.length) {
    json.images = bilder.map((b) => ({ bufferView: ansicht(new Uint8Array(b.daten)), mimeType: b.mime }));
    json.textures = bilder.map((_, i) => ({ source: i, sampler: 0 }));
    json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  }
  for (const t of teile) {
    const n = t.pos.length / 3;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < t.pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], t.pos[i + k]); max[k] = Math.max(max[k], t.pos[i + k]); }
    const attribute = { POSITION: zugriff(t.pos, "VEC3", n, 5126, { min, max }) };
    if (t.normal) attribute.NORMAL = zugriff(t.normal, "VEC3", n, 5126);
    if (t.uv) attribute.TEXCOORD_0 = zugriff(t.uv, "VEC2", n, 5126);
    for (const [name, a] of Object.entries(t.attribute ?? {})) attribute[name] = zugriff(a.daten, ["", "SCALAR", "VEC2", "VEC3", "VEC4"][a.groesse], n, 5126);
    const idx = n < 65536 ? new Uint16Array(t.idx) : t.idx;
    const indices = zugriff(idx, "SCALAR", t.idx.length, n < 65536 ? 5123 : 5125);
    const mat = { name: t.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } };
    if (t.bild !== undefined) mat.pbrMetallicRoughness.baseColorTexture = { index: t.bild };
    if (t.normalBild !== undefined) mat.normalTexture = { index: t.normalBild };
    json.materials.push(mat);
    json.meshes.push({ name: t.name, primitives: [{ attributes: attribute, indices, material: json.materials.length - 1 }] });
    json.nodes.push({ name: t.name, mesh: json.meshes.length - 1, ...(t.extras ? { extras: t.extras } : {}) });
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }
  const bin = Buffer.concat(stuecke);
  const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  json.buffers.push({ byteLength: binPad.length });
  let j = Buffer.from(JSON.stringify(json), "utf8");
  j = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)]);
  const kopf = Buffer.alloc(12);
  kopf.writeUInt32LE(0x46546c67, 0); kopf.writeUInt32LE(2, 4); kopf.writeUInt32LE(12 + 8 + j.length + 8 + binPad.length, 8);
  const jk = Buffer.alloc(8); jk.writeUInt32LE(j.length, 0); jk.writeUInt32LE(0x4e4f534a, 4);
  const bk = Buffer.alloc(8); bk.writeUInt32LE(binPad.length, 0); bk.writeUInt32LE(0x004e4942, 4);
  writeFileSync(pfad, Buffer.concat([kopf, jk, j, bk, binPad]));
}
