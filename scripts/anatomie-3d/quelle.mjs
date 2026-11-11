// Lesen der BodyParts3D-Daten: OBJ-Dateien (nur „v“- und „f“-Zeilen) und die Listen, welche
// Einzelteile (FJ-Dateien) zu einem Begriff gehören. Die Dateien werden nur als Text gelesen.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** BodyParts3D (mm, x = links, y = hinten, z = oben) → Szene (mm, x = links des Körpers, y = oben, z = vorn). */
export const inSzene = (x, y, z) => [x, z - 780, -y - 100];

export class Quelle {
  constructor(objOrdner, listen) {
    this.ordner = objOrdner;
    /** englischer Name (klein) → Set von FJ-Nummern */
    this.blatt = new Map();
    /** FJ → englischer Name */
    this.name = new Map();
    for (const datei of readdirSync(objOrdner)) {
      const m = /^(FJ\d+)\.obj$/.exec(datei);
      if (!m) continue;
      const kopf = readFileSync(join(objOrdner, datei), "utf8").slice(0, 1200);
      const n = /# English name : (.+)/.exec(kopf)?.[1]?.trim() ?? "";
      this.name.set(m[1], n);
      const k = n.toLowerCase();
      if (!this.blatt.has(k)) this.blatt.set(k, new Set());
      this.blatt.get(k).add(m[1]);
    }
    /** zusammengesetzter Begriff (klein) → Set von FJ */
    this.verbund = new Map();
    for (const l of listen) {
      for (const zeile of readFileSync(l, "utf8").split("\n")) {
        const f = zeile.split("\t");
        if (f.length !== 3 || f[0] === "concept id") continue;
        const k = f[1].toLowerCase(), fj = f[2].trim();
        if (!this.name.has(fj)) continue;
        if (!this.verbund.has(k)) this.verbund.set(k, new Set());
        this.verbund.get(k).add(fj);
      }
    }
    this.cache = new Map();
  }

  /** Muster: Text (genauer Name) oder RegExp (auf Einzel- und Verbundnamen). */
  finde(muster) {
    const aus = new Set();
    for (const m of muster) {
      if (typeof m === "string") {
        // Gibt es ein Einzelteil dieses Namens, nur dieses; sonst alle Teile des Verbunds
        const k = m.toLowerCase();
        for (const fj of this.blatt.get(k) ?? this.verbund.get(k) ?? []) aus.add(fj);
      } else if (m instanceof RegExp) {
        for (const [k, s] of this.blatt) if (m.test(k)) for (const fj of s) aus.add(fj);
      } else {
        // Teile eines Verbunds, deren Name passt
        for (const fj of this.verbund.get(m.v.toLowerCase()) ?? []) if (!m.nur || m.nur.test(this.name.get(fj))) aus.add(fj);
      }
    }
    return aus;
  }

  /** Netz einer FJ-Datei in Szenenkoordinaten. */
  netz(fj) {
    if (this.cache.has(fj)) return this.cache.get(fj);
    const text = readFileSync(join(this.ordner, `${fj}.obj`), "utf8");
    const pos = [], idx = [];
    for (const z of text.split("\n")) {
      if (z.startsWith("v ")) {
        const t = z.split(/\s+/);
        pos.push(...inSzene(+t[1], +t[2], +t[3]));
      } else if (z.startsWith("f ")) {
        const t = z.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
        for (let i = 1; i + 1 < t.length; i++) idx.push(t[0], t[i], t[i + 1]);
      }
    }
    const n = { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
    this.cache.set(fj, n);
    return n;
  }
}

/** Netze zusammenfügen; optional an der Körpermitte spiegeln (rechts → links). */
export function verbinde(netze, spiegeln = false) {
  let nv = 0, ni = 0;
  for (const n of netze) { nv += n.pos.length; ni += n.idx.length; }
  const pos = new Float32Array(nv), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const n of netze) {
    pos.set(n.pos, ov);
    const basis = ov / 3;
    for (let i = 0; i < n.idx.length; i += 3) {
      idx[oi + i] = n.idx[i] + basis;
      // Spiegeln dreht den Umlaufsinn der Dreiecke um
      idx[oi + i + 1] = n.idx[i + (spiegeln ? 2 : 1)] + basis;
      idx[oi + i + 2] = n.idx[i + (spiegeln ? 1 : 2)] + basis;
    }
    ov += n.pos.length; oi += n.idx.length;
  }
  if (spiegeln) for (let i = 0; i < pos.length; i += 3) pos[i] = -pos[i];
  return { pos, idx };
}
