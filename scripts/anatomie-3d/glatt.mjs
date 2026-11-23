// Geometrie-Werkzeuge für das Gebiss: Loop-Unterteilung (glatte Flächen), Abstand über ein Raster, Schnitt mit Deckel.
import { ShapeUtils, Vector2 } from "three";
import { kompakt } from "./netz.mjs";

const kantenSchluessel = (a, b) => (a < b ? a * 4194304 + b : b * 4194304 + a);

/** Eine Stufe Loop-Unterteilung (geschlossene oder offene Dreiecksnetze; Randecken bleiben stehen). */
export function loop({ pos, idx }) {
  const nv = pos.length / 3;
  const kanten = new Map(); // schluessel -> { a, b, gegen: [] , neu }
  const nachbarn = Array.from({ length: nv }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) for (let k = 0; k < 3; k++) {
    const a = idx[i + k], b = idx[i + (k + 1) % 3], c = idx[i + (k + 2) % 3];
    const s = kantenSchluessel(a, b);
    let e = kanten.get(s); if (!e) { e = { a, b, gegen: [] }; kanten.set(s, e); }
    e.gegen.push(c); nachbarn[a].add(b); nachbarn[b].add(a);
  }
  const rand = new Uint8Array(nv);
  for (const e of kanten.values()) if (e.gegen.length !== 2) { rand[e.a] = 1; rand[e.b] = 1; }
  const neu = new Float32Array((nv + kanten.size) * 3);
  for (let v = 0; v < nv; v++) {
    const n = nachbarn[v].size;
    if (rand[v] || n < 3) { for (let k = 0; k < 3; k++) neu[v * 3 + k] = pos[v * 3 + k]; continue; }
    const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    const s = [0, 0, 0]; for (const u of nachbarn[v]) for (let k = 0; k < 3; k++) s[k] += pos[u * 3 + k];
    for (let k = 0; k < 3; k++) neu[v * 3 + k] = (1 - n * beta) * pos[v * 3 + k] + beta * s[k];
  }
  let z = nv;
  for (const e of kanten.values()) {
    e.neu = z;
    for (let k = 0; k < 3; k++) {
      neu[z * 3 + k] = e.gegen.length === 2
        ? 0.375 * (pos[e.a * 3 + k] + pos[e.b * 3 + k]) + 0.125 * (pos[e.gegen[0] * 3 + k] + pos[e.gegen[1] * 3 + k])
        : 0.5 * (pos[e.a * 3 + k] + pos[e.b * 3 + k]);
    }
    z++;
  }
  const out = new Uint32Array(idx.length * 4);
  for (let i = 0, o = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    const ab = kanten.get(kantenSchluessel(a, b)).neu, bc = kanten.get(kantenSchluessel(b, c)).neu, ca = kanten.get(kantenSchluessel(c, a)).neu;
    out.set([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca], o); o += 12;
  }
  return { pos: neu, idx: out };
}

/** Glatte Eckennormalen (flächengewichtet). */
export function eckNormalen({ pos, idx }) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, w = ux * vy - uy * vx;
    for (const p of [a, b, c]) { n[p] += x; n[p + 1] += y; n[p + 2] += w; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}

/** Raster über die Dreiecke eines Netzes für Abstandsfragen. */
export function raster({ pos, idx }, zelle = 4) {
  const karte = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let t = 0; t < idx.length / 3; t++) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) { const v = pos[idx[t * 3 + k] * 3 + d]; lo[d] = Math.min(lo[d], v); hi[d] = Math.max(hi[d], v); }
    for (let x = Math.floor(lo[0] / zelle); x <= Math.floor(hi[0] / zelle); x++)
      for (let y = Math.floor(lo[1] / zelle); y <= Math.floor(hi[1] / zelle); y++)
        for (let z = Math.floor(lo[2] / zelle); z <= Math.floor(hi[2] / zelle); z++) {
          const k = key(x, y, z); let l = karte.get(k); if (!l) karte.set(k, (l = [])); l.push(t);
        }
  }
  return {
    /** kleinster Abstand bis max (sonst Infinity) und Vorzeichen (+ außen) über die Normale des nächsten Dreiecks */
    abstand(px, py, pz, max) {
      const r = Math.ceil(max / zelle), cx = Math.floor(px / zelle), cy = Math.floor(py / zelle), cz = Math.floor(pz / zelle);
      let best = Infinity, sgn = 1; const gesehen = new Set();
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
        const l = karte.get(key(x, y, z)); if (!l) continue;
        for (const t of l) {
          if (gesehen.has(t)) continue; gesehen.add(t);
          const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
          const q = naechsterPunkt(px, py, pz, pos, a, b, c);
          const dx = px - q[0], dy = py - q[1], dz = pz - q[2], d = Math.hypot(dx, dy, dz);
          if (d < best) {
            best = d;
            const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
            sgn = dx * (uy * vz - uz * vy) + dy * (uz * vx - ux * vz) + dz * (ux * vy - uy * vx) >= 0 ? 1 : -1;
          }
        }
      }
      return best <= max ? best * sgn : Infinity;
    },
  };
}
function naechsterPunkt(px, py, pz, P, ia, ib, ic) {
  const a = [P[ia], P[ia + 1], P[ia + 2]], b = [P[ib], P[ib + 1], P[ib + 2]], c = [P[ic], P[ic + 1], P[ic + 2]], p = [px, py, pz];
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return a;
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/** Schnitt bei y = hoehe: alles darüber fällt weg, die Schnittfläche wird mit einem Deckel geschlossen. */
export function schneideMitDeckel({ pos, idx }, hoehe, mitDeckel = true) {
  const P = Array.from(pos), out = [], kantenPunkt = new Map(), stuecke = [];
  const ueber = (v) => P[v * 3 + 1] > hoehe;
  const schnitt = (a, b) => {
    const s = kantenSchluessel(a, b); let j = kantenPunkt.get(s);
    if (j === undefined) {
      const t = (hoehe - P[a * 3 + 1]) / (P[b * 3 + 1] - P[a * 3 + 1]);
      j = P.length / 3; P.push(P[a * 3] + (P[b * 3] - P[a * 3]) * t, hoehe, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t);
      kantenPunkt.set(s, j);
    }
    return j;
  };
  for (let i = 0; i < idx.length; i += 3) {
    const v = [idx[i], idx[i + 1], idx[i + 2]], o = v.map(ueber), n = o.filter(Boolean).length;
    if (n === 0) { out.push(...v); continue; }
    if (n === 3) continue;
    // drehen, so dass v[0] die Einzelecke ist
    let r = 0; for (let k = 0; k < 3; k++) if ((n === 1 && o[k]) || (n === 2 && !o[k])) r = k;
    const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3];
    const ab = schnitt(a, b), ac = schnitt(a, c);
    if (n === 1) { out.push(ab, b, c, ab, c, ac); stuecke.push([ac, ab]); } // a liegt oben
    else { out.push(a, ab, ac); stuecke.push([ab, ac]); } // nur a liegt unten
  }
  // Stücke zu Ringen verketten
  const weiter = new Map(); for (const [p, q] of stuecke) weiter.set(p, q);
  const ringe = [], besucht = new Set();
  for (const [start] of stuecke) {
    if (besucht.has(start)) continue;
    const ring = []; let p = start;
    while (p !== undefined && !besucht.has(p)) { besucht.add(p); ring.push(p); p = weiter.get(p); }
    if (ring.length >= 3) ringe.push(ring);
  }
  const pt = (j) => new Vector2(P[j * 3], P[j * 3 + 2]);
  const flaeche = (r) => ShapeUtils.area(r.map(pt));
  const innen = (punkt, r) => { let c = false; const q = r.map(pt); for (let i = 0, j = q.length - 1; i < q.length; j = i++) { if ((q[i].y > punkt.y) !== (q[j].y > punkt.y) && punkt.x < ((q[j].x - q[i].x) * (punkt.y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) c = !c; } return c; };
  // Deckel: jeder Ring, der in keinem anderen liegt, wird ganz gefüllt (Höhlen darunter bleiben verdeckt)
  const deckelStart = P.length / 3, deckel = [];
  let gefuellt = 0;
  for (const r of mitDeckel ? ringe : []) {
    if (ringe.some((s) => s !== r && Math.abs(flaeche(s)) > Math.abs(flaeche(r)) && innen(pt(r[0]), s))) continue;
    gefuellt++;
    const kontur = r.map(pt), basis = P.length / 3;
    for (const j of r) P.push(P[j * 3], hoehe, P[j * 3 + 2]);
    const tri = ShapeUtils.triangulateShape(kontur, []);
    // Normale nach oben (+y): y-Anteil des Kreuzprodukts (b-a)x(c-a) = (bz-az)(cx-ax) - (bx-ax)(cz-az) > 0
    for (const [a, b, c] of tri) {
      const A = kontur[a], B = kontur[b], C = kontur[c];
      const ny = (B.y - A.y) * (C.x - A.x) - (B.x - A.x) * (C.y - A.y);
      deckel.push(...(ny >= 0 ? [basis + a, basis + b, basis + c] : [basis + a, basis + c, basis + b]));
    }
  }
  return { pos: new Float32Array(P), idx: new Uint32Array([...out, ...deckel]), ringe: ringe.length, gefuellt, deckelDreiecke: deckel.length / 3, deckelStart };
}

/** Nur schneiden, ohne Deckel: oben (alles über hoehe weg) oder unten (alles unter hoehe weg). */
export function schneide(n, hoehe, seite = "oben") {
  if (seite === "oben") { const r = schneideMitDeckel(n, hoehe, false); return kompakt({ pos: r.pos, idx: r.idx }); }
  const spiegel = (p) => { const q = new Float32Array(p); for (let i = 1; i < q.length; i += 3) q[i] = -q[i]; return q; };
  const r = schneideMitDeckel({ pos: spiegel(n.pos), idx: n.idx }, -hoehe, false);
  return kompakt({ pos: spiegel(r.pos), idx: r.idx });
}
