// Backt die Umgebungsverdeckung (ambient occlusion) in die fertigen 3D-Dateien: je Ecke ein Wert 0…1 im
// Grünkanal der Eckenfarbe (COLOR_0). Falten, Achseln, Zwischenräume von Zähnen und Rippen werden so dunkler,
// ohne dass das Gerät dafür rechnet. Der Rotkanal bleibt 0 (Kiefer-Gewicht gibt es nur beim Kopf-Scan).
//
// Aufruf: node scripts/anatomie-3d/ao.mjs [--nur haut,skelett] [--strahlen 24] [--grenze 0.15] [--probe]
//   --grenze: höchstens so viel größer darf eine Datei werden (Anteil); sonst bleibt die alte Datei.
//   --probe:  nur messen, nichts ersetzen.
// Danach die leichten Fassungen neu bauen: node scripts/anatomie-3d/leicht.mjs
// Die Daten bleiben bearbeitete Fassungen von BodyParts3D (CC BY-SA 2.1 JP) und stehen unter CC BY-SA 4.0.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { leseGlb, normalen } from "./lesen.mjs";
import { schreibeGlb } from "./glb.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const NUR = arg("nur", null)?.split(",") ?? null;
const STRAHLEN = Number(arg("strahlen", 24));
const GRENZE = Number(arg("grenze", 0.15));
const PROBE = process.argv.includes("--probe");
const ORDNER = resolve("public/anatomie-3d");
const GLTFPACK = resolve("node_modules/.bin/gltfpack");
const INHALT_PFAD = resolve("lib/modelle/drei/anatomieInhalt.json");
/** Reichweite der Strahlen in mm: so weit zählt etwas als „verdeckend“ (Größe der Falten und Zwischenräume). */
const REICHWEITE = { haut: 70, skelett: 32, muskeln: 40, sehnen: 30, mund: 9, lunge: 25, herz: 18, verdauung: 25, harnwege: 20, gehirn: 14, auge: 6, hno: 12 };

// ------------------------------------------------------------------ Hüllkörper-Baum (BVH) für die Strahlen
function baum(P, I) {
  const n = I.length / 3, mitte = new Float32Array(n * 3), lo = new Float32Array(n * 3), hi = new Float32Array(n * 3);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const a = P[I[t * 3] * 3 + k], b = P[I[t * 3 + 1] * 3 + k], c = P[I[t * 3 + 2] * 3 + k];
    lo[t * 3 + k] = Math.min(a, b, c); hi[t * 3 + k] = Math.max(a, b, c); mitte[t * 3 + k] = (a + b + c) / 3;
  }
  const ordnung = new Uint32Array(n).map((_, i) => i);
  const knoten = []; // { lo, hi, links, rechts, start, anzahl }
  const bau = (start, ende) => {
    const k = { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity], links: -1, rechts: -1, start, anzahl: ende - start };
    for (let i = start; i < ende; i++) { const t = ordnung[i]; for (let a = 0; a < 3; a++) { k.lo[a] = Math.min(k.lo[a], lo[t * 3 + a]); k.hi[a] = Math.max(k.hi[a], hi[t * 3 + a]); } }
    const id = knoten.push(k) - 1;
    if (ende - start <= 6) return id;
    const ausdehnung = [0, 1, 2].map((a) => k.hi[a] - k.lo[a]), achse = ausdehnung.indexOf(Math.max(...ausdehnung));
    const teil = Array.from(ordnung.subarray(start, ende)).sort((x, y) => mitte[x * 3 + achse] - mitte[y * 3 + achse]);
    ordnung.set(teil, start);
    const m = (start + ende) >> 1;
    k.links = bau(start, m); k.rechts = bau(m, ende); k.anzahl = 0;
    return id;
  };
  bau(0, n);
  return { knoten, ordnung };
}
/** Erster Treffer eines Strahls innerhalb von maxT (oder Infinity). */
function treffe(P, I, B, o, d, maxT) {
  const inv = [1 / d[0], 1 / d[1], 1 / d[2]];
  let best = maxT;
  const stapel = [0];
  while (stapel.length) {
    const k = B.knoten[stapel.pop()];
    let t0 = 0, t1 = best;
    for (let a = 0; a < 3; a++) {
      let n = (k.lo[a] - o[a]) * inv[a], f = (k.hi[a] - o[a]) * inv[a];
      if (n > f) { const x = n; n = f; f = x; }
      t0 = Math.max(t0, n); t1 = Math.min(t1, f);
      if (t0 > t1) break;
    }
    if (t0 > t1) continue;
    if (k.anzahl) {
      for (let i = k.start; i < k.start + k.anzahl; i++) {
        const t = B.ordnung[i], a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
        const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
        const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const iv = 1 / det, sx = o[0] - P[a], sy = o[1] - P[a + 1], sz = o[2] - P[a + 2];
        const u = (sx * px + sy * py + sz * pz) * iv; if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (d[0] * qx + d[1] * qy + d[2] * qz) * iv; if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * iv;
        if (tt > 1e-3 && tt < best) best = tt;
      }
    } else stapel.push(k.links, k.rechts);
  }
  return best;
}

// Feste, gleichmäßig verteilte Richtungen in der Halbkugel (kosinusgewichtet, Fibonacci-Spirale)
function richtungen(n) {
  const aus = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt((i + 0.5) / n), phi = i * 2.399963229728653;
    aus.push([r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(Math.max(0, 1 - r * r))]);
  }
  return aus;
}
const HALB = richtungen(STRAHLEN);

/** Verdeckung je Ecke (1 = frei, 0 = ganz verdeckt) für alle Teile einer Datei gemeinsam. */
function verdeckung(teile, reichweite) {
  // alle Teile in ein Netz, damit sich Teile gegenseitig verdecken (Rippen die Wirbelsäule, Zähne einander)
  const zahl = teile.reduce((s, t) => s + t.pos.length / 3, 0), dreiecke = teile.reduce((s, t) => s + t.idx.length, 0);
  const P = new Float32Array(zahl * 3), I = new Uint32Array(dreiecke), N = new Float32Array(zahl * 3);
  let ve = 0, vi = 0;
  for (const t of teile) {
    P.set(t.pos, ve * 3); N.set(normalen(t.pos, t.idx), ve * 3);
    for (let i = 0; i < t.idx.length; i++) I[vi + i] = t.idx[i] + ve;
    ve += t.pos.length / 3; vi += t.idx.length;
  }
  const B = baum(P, I);
  const ao = new Float32Array(zahl);
  let zufall = 12345;
  const rnd = () => { zufall = (zufall * 1103515245 + 12345) & 0x7fffffff; return zufall / 0x7fffffff; };
  for (let v = 0; v < zahl; v++) {
    const n = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]];
    // Basis um die Normale, zufällig gedreht (gegen Streifenmuster)
    const hilf = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let tx = [n[1] * hilf[2] - n[2] * hilf[1], n[2] * hilf[0] - n[0] * hilf[2], n[0] * hilf[1] - n[1] * hilf[0]];
    const l = Math.hypot(...tx); tx = tx.map((x) => x / l);
    const ty = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]];
    const w = rnd() * Math.PI * 2, c = Math.cos(w), s = Math.sin(w);
    const o = [P[v * 3] + n[0] * 0.15, P[v * 3 + 1] + n[1] * 0.15, P[v * 3 + 2] + n[2] * 0.15];
    let verdeckt = 0;
    for (const [hx, hy, hz] of HALB) {
      const a = hx * c - hy * s, b = hx * s + hy * c;
      const d = [tx[0] * a + ty[0] * b + n[0] * hz, tx[1] * a + ty[1] * b + n[1] * hz, tx[2] * a + ty[2] * b + n[2] * hz];
      const t = treffe(P, I, B, o, d, reichweite);
      if (t < reichweite) verdeckt += 1 - (t / reichweite) * 0.6;
    }
    ao[v] = 1 - verdeckt / HALB.length;
  }
  // Zweimal mit den Nachbarn glätten (wenige Strahlen rauschen)
  for (let runde = 0; runde < 2; runde++) {
    const summe = new Float32Array(zahl), anzahl = new Float32Array(zahl);
    for (let i = 0; i < I.length; i += 3) for (const a of [I[i], I[i + 1], I[i + 2]]) for (const b of [I[i], I[i + 1], I[i + 2]]) { summe[a] += ao[b]; anzahl[a]++; }
    for (let v = 0; v < zahl; v++) ao[v] = anzahl[v] ? summe[v] / anzahl[v] : ao[v];
  }
  // zurück auf die Teile verteilen
  const aus = []; let start = 0;
  for (const t of teile) { const k = t.pos.length / 3; aus.push(ao.subarray(start, start + k)); start += k; }
  return aus;
}

const inhalt = JSON.parse(readFileSync(INHALT_PFAD, "utf8"));
const arbeit = mkdtempSync(join(tmpdir(), "anatomie-ao-"));
const bericht = [];
for (const [datei, reichweite] of Object.entries(REICHWEITE)) {
  if (NUR && !NUR.includes(datei)) continue;
  const pfad = join(ORDNER, `${datei}.glb`);
  const vorher = statSync(pfad).size;
  const { teile } = await leseGlb(pfad);
  if (teile.some((t) => t.attribute.COLOR_0)) { bericht.push(`${datei}: hat schon Eckenfarben, übersprungen`); continue; }
  const start = performance.now();
  const ao = verdeckung(teile, reichweite);
  const roh = teile.map((t, i) => {
    const farbe = new Float32Array((t.pos.length / 3) * 4);
    for (let v = 0; v < t.pos.length / 3; v++) { farbe[v * 4 + 1] = ao[i][v]; farbe[v * 4 + 3] = 1; }
    return { name: t.name, pos: t.pos, idx: t.idx, extras: t.extras, attribute: { COLOR_0: { daten: farbe, groesse: 4 } } };
  });
  const rohPfad = join(arbeit, `${datei}.glb`), neuPfad = join(arbeit, `${datei}-ao.glb`);
  schreibeGlb(rohPfad, roh);
  // Verdeckung braucht keine feinen Stufen: erst 6 Bit, wenn es zu groß wird 5 oder 4 Bit (64, 32, 16 Stufen; geglättet)
  let nachher = 0, plus = 0, bits = 0;
  for (bits of [6, 5, 4]) {
    execFileSync(GLTFPACK, ["-i", rohPfad, "-o", neuPfad, "-cc", "-kn", "-km", "-ke", "-kv", "-vp", "14", "-vc", String(bits)], { stdio: "pipe" });
    nachher = statSync(neuPfad).size; plus = nachher / vorher - 1;
    if (plus <= GRENZE) break;
  }
  const mittel = ao.reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0) / ao.reduce((s, a) => s + a.length, 0);
  const zeile = `${datei}: ${(vorher / 1024).toFixed(0)} KB → ${(nachher / 1024).toFixed(0)} KB (${plus >= 0 ? "+" : ""}${(plus * 100).toFixed(1)} %), ${bits} Bit, mittlere Verdeckung ${(1 - mittel).toFixed(2)}, ${((performance.now() - start) / 1000).toFixed(0)} s`;
  if (plus > GRENZE) { bericht.push(`${zeile}: zu groß, bleibt ohne`); continue; }
  bericht.push(zeile);
  if (PROBE) continue;
  copyFileSync(neuPfad, pfad);
  inhalt[datei] = { ...inhalt[datei], bytes: nachher, ao: true };
}
if (!PROBE) writeFileSync(INHALT_PFAD, JSON.stringify(inhalt, null, 1) + "\n");
console.log(bericht.join("\n"));
