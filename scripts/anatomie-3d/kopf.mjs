// Kopf für die Fahrt in den Mund: der Scan „Lee Perry-Smith“ (CC BY 3.0) wird auf den Schädel von
// BodyParts3D ausgerichtet (Nasenspitze und Mundspalte auf die Haut von BodyParts3D gelegt),
// die Lippen werden an der Mundspalte getrennt, und jede Ecke bekommt ein Gewicht, wie stark sie
// beim Öffnen des Mundes mit dem Unterkiefer mitgeht (im Rotkanal der Eckenfarbe).
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { schreibeGlb } from "./glb.mjs";
import { verbinde } from "./quelle.mjs";
import { rahmen } from "./netz.mjs";

function leseGlb(pfad) {
  const d = readFileSync(pfad);
  const L = d.readUInt32LE(12);
  const j = JSON.parse(d.subarray(20, 20 + L).toString("utf8"));
  const bin = d.subarray(20 + L + 8);
  const zugriff = (i) => {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type] * a.count;
    const off = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const T = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
    return new T(bin.buffer.slice(off, off + n * T.BYTES_PER_ELEMENT));
  };
  const p = j.meshes[0].primitives[0];
  return { pos: zugriff(p.attributes.POSITION), normal: zugriff(p.attributes.NORMAL), uv: zugriff(p.attributes.TEXCOORD_0), idx: new Uint32Array(zugriff(p.indices)) };
}

const glatt = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function baueKopf(ordner, q, arbeit, ziel, gltfpack) {
  const k = leseGlb(join(ordner, "LeePerrySmith.glb"));
  const n = k.pos.length / 3;
  const P = (i) => [k.pos[i * 3], k.pos[i * 3 + 1], k.pos[i * 3 + 2]];

  // --- Merkpunkte im Scan (y oben, z vorn)
  let nase = 0;
  for (let i = 0; i < n; i++) { const p = P(i); if (Math.abs(p[0]) < 1 && p[1] > -2.5 && p[1] < 2.5 && p[2] > P(nase)[2]) nase = i; }
  const N = P(nase);
  // Mundspalte: tiefste Stelle des Profils zwischen Ober- und Unterlippe (Mittellinie)
  const profil = (pos, anzahl, xBreite, yVon, yBis, schritt, zMin) => {
    const aus = [];
    for (let y = yVon; y < yBis; y += schritt) {
      let best = -Infinity;
      for (let i = 0; i < anzahl; i++) { const x = pos[i * 3], yy = pos[i * 3 + 1], z = pos[i * 3 + 2]; if (Math.abs(x) < xBreite && yy >= y && yy < y + schritt && z > zMin) best = Math.max(best, z); }
      aus.push([y + schritt / 2, best]);
    }
    return aus;
  };
  // Der Scan hat eine echte Mundspalte: Unterseite der Oberlippe (Normale nach unten) und Oberseite der
  // Unterlippe (Normale nach oben) liegen aufeinander. Diese Berührungsflächen bestimmen die Spalte.
  const beruehrung = [];
  for (let i = 0; i < n; i++) {
    const p = P(i), ny = k.normal[i * 3 + 1];
    if (p[2] > 1.7 && Math.abs(p[0]) < 1.2 && p[1] < N[1] - 0.3 && p[1] > N[1] - 1.2 && Math.abs(ny) > 0.85) beruehrung.push([p[0], p[1], p[2], ny]);
  }
  const mitteB = beruehrung.filter((b) => Math.abs(b[0]) < 0.1);
  const mundK = { y: mitteB.reduce((a, b) => a + b[1], 0) / mitteB.length, z: Math.max(...mitteB.map((b) => b[2])) };
  // Vorderkante der Lippen (für die Tiefe)
  let lippeVorn = -Infinity;
  for (let i = 0; i < n; i++) { const p = P(i); if (Math.abs(p[0]) < 0.12 && Math.abs(p[1] - mundK.y) < 0.2) lippeVorn = Math.max(lippeVorn, p[2]); }
  const spalte = (pr) => {
    let best = null;
    for (let i = 1; i < pr.length - 1; i++) {
      const links = Math.max(...pr.slice(0, i).map((p) => p[1])), rechts = Math.max(...pr.slice(i + 1).map((p) => p[1]));
      const tiefe = Math.min(links, rechts) - pr[i][1];
      if (!best || tiefe > best.tiefe) best = { y: pr[i][0], z: pr[i][1], tiefe };
    }
    return best;
  };

  // --- dieselben Merkpunkte an der Haut von BodyParts3D (Szenenkoordinaten, mm)
  const haut = verbinde([...q.finde(["Skin"])].map((f) => q.netz(f)));
  const hn = haut.pos.length / 3;
  let hNase = null;
  for (let i = 0; i < hn; i++) { const x = haut.pos[i * 3], y = haut.pos[i * 3 + 1], z = haut.pos[i * 3 + 2]; if (Math.abs(x) < 15 && y > 600 && y < 800 && (!hNase || z > hNase[2])) hNase = [x, y, z]; }
  const hp = profil(haut.pos, hn, 5, hNase[1] - 70, hNase[1] - 12, 2, 40).filter((p) => p[1] > -Infinity);
  const mundB = spalte(hp);

  // --- Ausrichten: gleiche Strecke Nasenspitze – Mundspalte, Mundspalte auf Mundspalte
  // Breite über die Ohren: im Scan und an der Ohrmuschel von BodyParts3D
  let kx0 = Infinity, kx1 = -Infinity;
  for (let i = 0; i < n; i++) { const p = P(i); if (p[1] > N[1] - 0.6 && p[1] < N[1] + 0.3 && p[2] > -1.5 && p[2] < 0.5) { kx0 = Math.min(kx0, p[0]); kx1 = Math.max(kx1, p[0]); } }
  const ohr = verbinde([...q.finde(["External ear"])].map((f) => q.netz(f))).pos;
  let ox0 = Infinity, ox1 = -Infinity;
  for (let i = 0; i < ohr.length; i += 3) { ox0 = Math.min(ox0, ohr[i]); ox1 = Math.max(ox1, ohr[i]); }
  const sNase = (hNase[1] - mundB.y) / (N[1] - mundK.y), sBreite = (ox1 - ox0) / (kx1 - kx0);
  // Der Schädel muss ganz im Kopf liegen: nach der Breite skalieren, höchstens etwas kleiner
  const s = sBreite;
  // Die Haut von BodyParts3D liegt am Mund kaum vor den Zähnen (eigene Aufnahme); maßgeblich sind deshalb
  // die oberen Schneidezähne: Mundspalte knapp über ihrer Schneidekante, Lippen gut 1 cm davor.
  const zahn = verbinde([...q.finde(["Right upper central secondary incisor tooth", "Left upper central secondary incisor tooth"])].map((f) => q.netz(f))).pos;
  let kante = Infinity, front = -Infinity;
  for (let i = 0; i < zahn.length; i += 3) { kante = Math.min(kante, zahn[i + 1]); front = Math.max(front, zahn[i + 2]); }
  const mundZiel = [0, kante + 2.5, front + 13];
  const versatz = [0, mundZiel[1] - mundK.y * s, mundZiel[2] - lippeVorn * s];
  const pos = new Float32Array(k.pos.length);
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) pos[i * 3 + a] = k.pos[i * 3 + a] * s + versatz[a];

  // --- Verlauf der Spalte je Spalte (x) und Mundbreite aus den Berührungsflächen
  const halb = Math.max(...beruehrung.filter((b) => Math.abs(b[1] - mundK.y) < 0.25).map((b) => Math.abs(b[0])));
  const linie = [];
  for (let x = -halb; x <= halb + 1e-6; x += 0.05) {
    const hier = beruehrung.filter((b) => Math.abs(b[0] - x) < 0.06 && Math.abs(b[1] - mundK.y) < 0.25);
    linie.push([x, hier.length ? hier.reduce((a, b) => a + b[1], 0) / hier.length : mundK.y]);
  }
  const spalteBei = (x) => {
    const c = Math.max(-halb, Math.min(halb, x));
    for (let i = 0; i < linie.length - 1; i++) if (c >= linie[i][0] && c <= linie[i + 1][0]) { const t = (c - linie[i][0]) / (linie[i + 1][0] - linie[i][0]); return linie[i][1] * (1 - t) + linie[i + 1][1] * t; }
    return linie[linie.length - 1][1];
  };
  const vorn = (p) => p[2] > 1.2;
  // Die Texturen des Scans sind für flipY = true gemacht; glTF erwartet das Gegenteil
  for (let i = 1; i < k.uv.length; i += 2) k.uv[i] = 1 - k.uv[i];
  const neuPos = Array.from(pos), neuNorm = Array.from(k.normal), neuUv = Array.from(k.uv);
  const idx = Array.from(k.idx);
  const getrennt = beruehrung.length;
  const TOL = 0.03;

  // --- Gewichte: wie stark geht eine Ecke mit dem Unterkiefer mit?
  const kinn = mundK.y - 0.75;
  const gew = new Float32Array(neuPos.length / 3);
  for (let i = 0; i < gew.length; i++) {
    const o = P(i), ny = k.normal[i * 3 + 1];
    const ax = Math.abs(o[0]), dy = o[1] - spalteBei(o[0]);
    // Grenze: in der Mundspalte scharf, zu den Wangen hin weich und zum Ohr ansteigend
    const seitlich = Math.max(0, ax - halb);
    const grenze = seitlich * 0.55; // Linie vom Mundwinkel zum Kiefergelenk steigt an
    const band = 0.03 + seitlich * 0.9;
    let w;
    // In der Mundspalte: Oberlippe bleibt, Unterlippe geht mit; an der Berührung entscheidet die Normale
    if (ax < halb && vorn(o)) w = Math.abs(dy) < TOL && Math.abs(ny) > 0.5 ? (ny > 0 ? 1 : 0) : dy < 0 ? 1 : 0;
    else w = 1 - glatt(grenze - band, grenze + band, dy);
    // Hals bleibt stehen, hinter dem Kieferwinkel nichts mehr
    w *= 1 - glatt(kinn - 0.25, kinn - 1.0, o[1]) * glatt(1.2, 0.2, o[2]);
    w *= glatt(-0.9, 0.3, o[2]);
    gew[i] = Math.max(0, Math.min(1, w));
  }
  const pos2 = new Float32Array(neuPos);
  // Gewicht im Rotkanal der Eckenfarbe (gltfpack behält Farben, eigene Attribute nicht)
  const farbe = new Float32Array(gew.length * 4);
  for (let i = 0; i < gew.length; i++) { farbe[i * 4] = gew[i]; farbe[i * 4 + 3] = 1; }
  const teile = [{ name: "kopf", pos: pos2, idx: new Uint32Array(idx), normal: new Float32Array(neuNorm), uv: new Float32Array(neuUv), attribute: { COLOR_0: { daten: farbe, groesse: 4 } }, bild: 0, normalBild: 1, extras: { g: "haut", s: "gesicht", k: "mund:gesicht" } }];
  const bilder = [
    { daten: readFileSync(join(ordner, "Map-COL.jpg")), mime: "image/jpeg" },
    { daten: readFileSync(join(ordner, "Infinite-Level_02_Tangent_SmoothUV.jpg")), mime: "image/jpeg" },
  ];
  const roh = join(arbeit, "kopf.glb");
  schreibeGlb(roh, teile, bilder);
  execFileSync(gltfpack, ["-i", roh, "-o", join(ziel, "kopf.glb"), "-cc", "-kn", "-km", "-ke", "-kv", "-vp", "14"], { stdio: "inherit" });
  const r = rahmen(pos2);
  console.log(`Gewichte > 0,5: ${gew.filter((w) => w > 0.5).length} von ${gew.length}`);
  console.log(`Kopf: Maßstab ${s.toFixed(2)} mm je Einheit (Nase–Mund ${sNase.toFixed(1)}, Ohrenbreite ${sBreite.toFixed(1)}), Mundspalte Scan y=${mundK.y.toFixed(3)} Lippen vorn z=${lippeVorn.toFixed(2)}, Haut y=${mundB.y.toFixed(1)} z=${mundB.z.toFixed(1)}, Nase Haut ${hNase.map((v) => v.toFixed(1))}, ${getrennt} Ecken an den Lippen-Berührungsflächen, halbe Mundbreite ${halb.toFixed(2)}`);
  return {
    name: "Kopf", bytes: statSync(join(ziel, "kopf.glb")).size, dreiecke: idx.length / 3,
    rahmen: { min: r.min.map(Math.round), max: r.max.map(Math.round) },
    mund: mundZiel.map((v) => Math.round(v * 10) / 10), nase: hNase.map((v) => Math.round(v)),
    teile: [{ name: "mund:gesicht", g: "haut", mitte: mundZiel.map(Math.round) }],
  };
}
