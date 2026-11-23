// Zahnfleischrand je Zahn (Gebiss): In den Rohdaten verläuft der Rand wie mit dem Lineal gezogen. Hier bekommt jeder Zahn
// einen Bogen um den Zahnhals (am höchsten in der Zahnmitte) und zwischen zwei Zähnen eine Papille. Über den Wurzeln
// wölbt sich das Zahnfleisch leicht nach außen (Juga), über dem Eckzahn am stärksten.
// Das Zahnfleisch ist ein geschlossener Körper. Seine Ecken nahe am Rand werden nur in der Höhe verschoben, bis der Rand
// auf der neuen Linie liegt; nach oben (zur Wurzel hin) läuft die Verschiebung weich aus. Nichts reißt auf.
//
// Lage: Szene in mm (x links, y oben, z vorn). Der Winkel um den Zahnbogen wird um den Punkt z = 20 gemessen.

const ZC = 20;
const winkel = (x, z) => Math.atan2(x, z - ZC);
const glatt = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// je Zahnposition 1 (mittlerer Schneidezahn) bis 8 (Weisheitszahn); Werte nach Lehrbuch, in mm
// Kronenlänge im Mund: Schneide bzw. Höckerspitze bis Zahnfleischrand in der Zahnmitte
const KRONE = { o: [10.5, 9, 10.5, 8, 7.5, 7, 6.5, 6], u: [8.5, 9, 10.5, 8, 7.5, 7, 6.5, 6] };
// Höhe des Bogens: Zahnmitte bis Papillenspitze (vorn höher als hinten)
const BOGEN = { o: [3.6, 3.3, 3.1, 2.6, 2.3, 2.1, 1.9, 1.7], u: [2.9, 2.9, 3.1, 2.5, 2.3, 2.1, 1.9, 1.7] };
// Breite der festen Gingiva vom Rand in der Zahnmitte bis zur beweglichen Schleimhaut
const FEST = { o: [4.5, 4.2, 3.6, 3.4, 3.4, 4, 4, 4], u: [3.6, 3.6, 3, 2.6, 2.6, 4, 4, 4] };
// Wölbung über der Wurzel (nach außen, mm)
const JUGUM = [0.35, 0.3, 0.7, 0.35, 0.3, 0.3, 0.25, 0.2];

/**
 * Plan des Randes für einen Kiefer aus den Zähnen (Rohdaten).
 * @param {{k: string, netz: {pos: Float32Array}}[]} zaehne  Zähne dieses Kiefers (FDI-Kennung)
 * @param {boolean} oben  Oberkiefer
 */
export function saumPlan(zaehne, oben) {
  const vz = oben ? 1 : -1; // Richtung zur Wurzel
  const z = zaehne.map(({ k, netz }) => {
    const n = Number(k[1]) - 1, P = netz.pos;
    let spitze = oben ? Infinity : -Infinity;
    for (let i = 1; i < P.length; i += 3) spitze = oben ? Math.min(spitze, P[i]) : Math.max(spitze, P[i]);
    const L = KRONE[oben ? "o" : "u"][n], zenit = spitze + vz * L;
    // Krone: Breite im Bogen (Winkel), Lage im Bogen (Abstand zur Bogenmitte)
    const w = [];
    let rho = 0;
    for (let i = 0; i < P.length; i += 3) {
      if ((P[i + 1] - zenit) * vz > 0) continue;
      w.push(winkel(P[i], P[i + 2])); rho += Math.hypot(P[i], P[i + 2] - ZC);
    }
    w.sort((a, b) => a - b);
    const lo = w[Math.floor(w.length * 0.02)], hi = w[Math.floor(w.length * 0.98)];
    return { k, n, zenit, bogen: BOGEN[oben ? "o" : "u"][n], fest: FEST[oben ? "o" : "u"][n], jugum: JUGUM[n], lo, hi, mitte: (lo + hi) / 2, rho: rho / w.length };
  }).sort((a, b) => a.mitte - b.mitte);
  // Papillenspitze zwischen zwei Nachbarn: Mittel der beiden Bögen; außen am letzten Zahn halb so hoch
  const pap = [];
  for (let i = 0; i <= z.length; i++) {
    const a = z[i - 1], b = z[i];
    pap.push(a && b ? ((a.zenit - vz * a.bogen) + (b.zenit - vz * b.bogen)) / 2 : a ? a.zenit - vz * a.bogen * 0.5 : b.zenit - vz * b.bogen * 0.5);
  }
  /**
   * Zielhöhe des Randes außen bei Winkel t: je Zahn ein Bogen von Papille zu Papille; wo sich zwei Kronen im Bogen
   * überlappen (Engstand), gilt der tiefere Bogen. So ist der Rand überall stetig, die Papille liegt, wo sich die Bögen kreuzen.
   */
  const randAussen = (t) => {
    let r = null, jugum = 0, u0 = 1;
    z.forEach((q, i) => {
      if (t < q.lo || t > q.hi) return;
      const u = (2 * t - q.lo - q.hi) / (q.hi - q.lo), p = u < 0 ? pap[i] : pap[i + 1];
      const w = q.zenit + (p - q.zenit) * u * u;
      if (r === null || (w - r) * vz > 0) { r = w; u0 = u; }
      jugum = Math.max(jugum, q.jugum * (1 - u * u));
    });
    if (r === null) { let j = z.findIndex((q) => q.mitte > t); if (j < 0) j = z.length; r = pap[j]; }
    return { r, jugum, u: u0 };
  };
  /** Lage eines Punktes zum Rand: Zielhöhe des Randes, Zahnmittenlinie, Breite der festen Gingiva, u (−1…1), außen? */
  const lage = (x, y, zz, n = null) => {
    const t = winkel(x, zz);
    // Linie der Zahnmitten (ohne Bögen) und Lage im Bogen, zwischen den Zahnmitten weich übergeben
    let j = z.findIndex((q) => q.mitte > t);
    if (j < 0) j = z.length;
    const A = z[Math.max(0, j - 1)], B = z[Math.min(z.length - 1, j)], s = A === B ? 0 : glatt(A.mitte, B.mitte, t);
    const mitte = A.zenit + (B.zenit - A.zenit) * s, fest = A.fest + (B.fest - A.fest) * s, rho = A.rho + (B.rho - A.rho) * s;
    // außen: nach der Normalen (zeigt vom Bogen weg), sonst nach dem Abstand zur Bogenmitte
    const rl = Math.hypot(x, zz - ZC) || 1;
    const aussen = n ? (n[0] * x + n[2] * (zz - ZC)) / rl > -0.15 : rl > rho;
    const ra = randAussen(t);
    // innen und außen derselbe Rand: das Zahnfleisch ist am Rand dünn, verschieden verschobene Seiten würden sich durchdringen
    const rand = ra.r;
    return { rand, mitte, fest: oben && !aussen ? 40 : fest, u: ra.u, aussen, jugum: ra.jugum };
  };
  return { oben, vz, zaehne: z, lage };
}

/**
 * Zahnfleisch an den Plan anpassen (verändert netz.pos). Gibt die Zahl der verschobenen Ecken zurück.
 * Der heutige Rand wird je Streifen im Bogen gemessen (über die Nachbarn gemittelt); jede Ecke wandert um den Unterschied
 * zum Ziel, voll am Rand und bis „band“ mm darüber auslaufend.
 */
export function saumFormen(netz, plan, band = 8) {
  const P = netz.pos, nv = P.length / 3, { vz } = plan, STREIFEN = 0.006; // etwa 0,3 mm im Bogen
  const lagen = new Array(nv);
  const rand = new Map();
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], l = plan.lage(x, y, z);
    lagen[v] = l;
    const s = Math.round(winkel(x, z) / STREIFEN);
    const r = rand.get(s);
    if (r === undefined || (y - r) * vz < 0) rand.set(s, y);
  }
  // heutiger Rand je Streifen, über die Nachbarn gemittelt (die Ecken liegen nicht dicht genug für einen glatten Wert)
  const heute = (t) => {
    let s = 0, n = 0;
    for (let d = -15; d <= 15; d++) { const r = rand.get(Math.round(t / STREIFEN) + d); if (r !== undefined) { s += r; n++; } }
    return n ? s / n : null;
  };
  let bewegt = 0;
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], l = lagen[v];
    const r0 = heute(winkel(x, z));
    if (r0 === null) continue;
    const d = (y - r0) * vz; // Abstand vom heutigen Rand zur Wurzel hin
    if (d > band) continue;
    // Verschiebung höchstens 0,6 × band, damit keine Ecke an einer anderen vorbeiwandert
    const delta = Math.max(-0.6 * band, Math.min(0.6 * band, l.rand - r0));
    const w = 1 - glatt(0, band, Math.max(0, d));
    P[v * 3 + 1] = y + delta * w;
    // Juga: außen über der Wurzel leicht nach außen
    if (l.aussen && l.jugum > 0) {
      const b = glatt(1, 3, d) * (1 - glatt(6, 11, d)), rx = x, rz = z - ZC, rl = Math.hypot(rx, rz) || 1;
      P[v * 3] += (rx / rl) * l.jugum * b; P[v * 3 + 2] += (rz / rl) * l.jugum * b;
    }
    bewegt++;
  }
  return bewegt;
}

/**
 * Eckenfarbe des Zahnfleischs: Rot = Nähe zum Rand (freie Gingiva, 1 am Rand), Blau = feste Gingiva (über 0,5) oder
 * bewegliche Schleimhaut (unter 0,5); die Grenze liegt bei 0,5 und folgt der Linie der Zahnmitten, nicht den Bögen.
 */
export function saumFarbe(x, y, z, plan, n = null) {
  const l = plan.lage(x, y, z, n);
  const amRand = (y - l.rand) * plan.vz, ueberMitte = (y - l.mitte) * plan.vz;
  return { rot: 1 - glatt(0, 1.2, Math.max(0, amRand)), blau: Math.min(1, Math.max(0, 0.5 + (l.fest - ueberMitte) / 8)) };
}
