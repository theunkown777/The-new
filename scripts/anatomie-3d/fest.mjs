// Aus mehreren sich überlappenden, teils hohlen Hüllen (z. B. Ober- und Gaumenbeine) einen festen, geschlossenen Körper machen:
// Raster mit Innen/Außen (Umlaufzahl entlang der drei Achsen, Mehrheit), oben abgeschnitten (zu den Seiten hin abfallend),
// eingeschlossene Höhlen gefüllt, Mulden und Löcher im Deckel geschlossen, leicht weichgezeichnet (am Schnitt stärker, damit die
// Kante rund ausläuft) und als Fläche herausgezogen (Surface Nets). Ergebnis: ein sauberes Netz ohne innere Wände und Splitter.

/**
 * @param {{pos: Float32Array, idx: Uint32Array}} netz  Dreiecke mit nach außen zeigenden Normalen
 * @param {{zelle?: number, oben?: number, weich?: number, schulter?: {x0: number, k: number}, deckel?: {tiefe: number, radius: number},
 *          rund?: {breite: number, durchgaenge: number}}} o  Rastergröße (mm), Schnitthöhe y (ohne: kein Schnitt), Durchgänge
 *        Weichzeichnen; schulter: seitlich ab |x| > x0 fällt der Schnitt ab (um k·(|x|−x0)² mm); sattel {y, innen, aussen}:
 *        in der Mitte bis |x| = innen liegt der Schnitt bei y, bis |x| = aussen steigt er weich auf „oben“; deckel: Mulden und Löcher in den
 *        obersten „tiefe“ mm schließen (Höhenbild, Radius in mm); rund: innerhalb „breite“ mm unter dem Schnitt stärker weichzeichnen
 * @param {{netz: {pos: Float32Array, idx: Uint32Array}, ab?: number, bis?: number, dehnen?: number}[]} dazu  weitere Körper, die
 *        zwischen den Höhen ab und bis mit zum Körper zählen, um „dehnen“ Zellen verdickt (die Zahnwurzeln: der Knochen umschließt
 *        sie dann, statt offene Fächer oder Wurzelspitzen zu zeigen)
 * @param {{netz: {pos: Float32Array, idx: Uint32Array}, abstand: number, innen?: number, rand?: number, unten?: boolean} | null} frei
 *        Hülle (Zahnfleisch), die der Körper nicht durchstoßen soll: Knochen knapp außerhalb davon (bis „abstand“ mm) und knapp
 *        unter ihrer Oberfläche (bis „innen“ mm) fällt weg, aber nur auf der Seite der Zähne von ihrem Rand am Knochen
 *        (Oberkiefer: unterhalb ihres oberen Randes; unten = true für den Unterkiefer: oberhalb ihres unteren Randes)
 */
export function fest({ pos, idx }, { zelle = 0.5, oben = Infinity, weich = 2, schulter = null, sattel = null, deckel = null, rund = null }, dazu = [], frei = null) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
  // Wurzeln, die aus dem Knochen ragen, gehören mit ins Raster
  for (const d of dazu) for (let i = 0; i < d.netz.pos.length; i += 3) {
    const y = d.netz.pos[i + 1];
    if ((d.ab != null && y < d.ab) || (d.bis != null && y > d.bis)) continue;
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], d.netz.pos[i + k]); hi[k] = Math.max(hi[k], d.netz.pos[i + k]); }
  }
  hi[1] = Math.min(hi[1], oben);
  const rand = 4;
  const n = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / zelle) + 2 * rand + 1);
  const ursprung = lo.map((v) => v - rand * zelle);
  const [nx, ny, nz] = n, N = nx * ny * nz;
  const at = (i, j, k) => i + nx * (j + ny * k);
  const mitte = (k, i) => ursprung[k] + (i + 0.5) * zelle;
  // Schnitthöhe je Spalte x: oben, zu den Seiten hin abfallend (Schultern statt waagerechter Flügel), in der Mitte zur
  // Höhe „sattel.y“ gesenkt (weiche Mulde statt der eckigen Kerbe der Nasenöffnung)
  const schnittX = new Float32Array(nx), weichStufe = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < nx; i++) {
    const ax = Math.abs(mitte(0, i));
    schnittX[i] = oben - (schulter ? schulter.k * Math.max(0, ax - schulter.x0) ** 2 : 0);
    if (sattel) schnittX[i] -= (oben - sattel.y) * (1 - weichStufe(sattel.innen, sattel.aussen, ax));
  }

  // Innen/Außen: je Achse Strahlen durch die Zellmitten, Umlaufzahl aus den Vorzeichen der Durchstoßpunkte
  const zaehle = (pos, idx) => {
  const stimmen = new Uint8Array(N);
  for (const achse of [0, 1, 2]) {
    const [u, v] = [0, 1, 2].filter((k) => k !== achse);
    const reihen = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3;
      const au = pos[A + u], av = pos[A + v], bu = pos[B + u], bv = pos[B + v], cu = pos[C + u], cv = pos[C + v];
      const flaeche = (bu - au) * (cv - av) - (bv - av) * (cu - au);
      if (Math.abs(flaeche) < 1e-12) continue;
      // Vorzeichen der Normalen entlang der Achse (bei y ist die Reihenfolge x, z, y gegen den Uhrzeigersinn)
      const zeichen = (flaeche > 0 ? 1 : -1) * (achse === 1 ? -1 : 1);
      const iu0 = Math.max(0, Math.ceil((Math.min(au, bu, cu) - ursprung[u]) / zelle - 0.5)), iu1 = Math.min(n[u] - 1, Math.floor((Math.max(au, bu, cu) - ursprung[u]) / zelle - 0.5));
      const iv0 = Math.max(0, Math.ceil((Math.min(av, bv, cv) - ursprung[v]) / zelle - 0.5)), iv1 = Math.min(n[v] - 1, Math.floor((Math.max(av, bv, cv) - ursprung[v]) / zelle - 0.5));
      for (let iu = iu0; iu <= iu1; iu++) for (let iv = iv0; iv <= iv1; iv++) {
        // leicht versetzt, damit kein Strahl genau eine Kante oder Ecke trifft
        const pu = mitte(u, iu) + 1.3e-5, pv = mitte(v, iv) + 0.7e-5;
        const w0 = ((bu - pu) * (cv - pv) - (bv - pv) * (cu - pu)) / flaeche;
        const w1 = ((cu - pu) * (av - pv) - (cv - pv) * (au - pu)) / flaeche;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const x = w0 * pos[A + achse] + w1 * pos[B + achse] + w2 * pos[C + achse];
        const s = iu + n[u] * iv;
        let l = reihen.get(s); if (!l) reihen.set(s, (l = []));
        l.push(x, zeichen);
      }
    }
    // Sweep je Reihe: Eintritt (Normale gegen die Laufrichtung) zählt +1, Austritt −1
    for (const [s, l] of reihen) {
      const iu = s % n[u], iv = Math.floor(s / n[u]);
      const paare = []; for (let q = 0; q < l.length; q += 2) paare.push([l[q], l[q + 1]]);
      paare.sort((a, b) => a[0] - b[0]);
      let w = 0, p = 0;
      for (let ia = 0; ia < n[achse]; ia++) {
        const x = mitte(achse, ia);
        while (p < paare.length && paare[p][0] < x) { w += paare[p][1] > 0 ? -1 : 1; p++; }
        if (w > 0) {
          const ijk = [0, 0, 0]; ijk[achse] = ia; ijk[u] = iu; ijk[v] = iv;
          stimmen[at(ijk[0], ijk[1], ijk[2])]++;
        }
      }
    }
  }
  return stimmen;
  };
  const voll = new Uint8Array(N), stimmen = zaehle(pos, idx);
  for (let c = 0; c < N; c++) voll[c] = stimmen[c] >= 2 ? 1 : 0;
  const nb6 = [1, -1, nx, -nx, nx * ny, -nx * ny];
  for (const d of dazu) {
    const st = zaehle(d.netz.pos, d.netz.idx), teil = new Uint8Array(N);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
      const y = mitte(1, j);
      if ((d.ab != null && y < d.ab) || (d.bis != null && y > d.bis)) continue;
      for (let i = 0; i < nx; i++) { const c = at(i, j, k); if (st[c] >= 2) teil[c] = 1; }
    }
    for (let r = 0; r < (d.dehnen ?? 0); r++) { const b = teil.slice(); for (let c = 0; c < N; c++) if (teil[c]) for (const q of nb6) { const e = c + q; if (e >= 0 && e < N) b[e] = 1; } teil.set(b); }
    for (let c = 0; c < N; c++) if (teil[c]) voll[c] = 1;
  }
  // kleine Löcher und Spalten schließen (Dehnen, dann Schrumpfen, je 1 mm)
  const schritte = Math.round(1 / zelle);
  const dehne = (a, wert) => {
    for (let r = 0; r < schritte; r++) {
      const b = a.slice();
      for (let c = 0; c < N; c++) if (a[c] === wert) for (const d of nb6) { const q = c + d; if (q >= 0 && q < N) b[q] = wert; }
      a.set(b);
    }
  };
  dehne(voll, 1); dehne(voll, 0);
  // Knochen, der knapp außerhalb des Zahnfleischs liegt, entfernen (dann liegt er darunter und sticht nicht durch)
  let entfernt = 0;
  if (frei) {
    const st = zaehle(frei.netz.pos, frei.netz.idx), drin = new Uint8Array(N);
    for (let c = 0; c < N; c++) drin[c] = st[c] >= 2 ? 1 : 0;
    // Rand am Knochen je Säule (x, z): oben der höchste, beim Unterkiefer der tiefste Punkt der Hülle (vz = Richtung zum Knochen);
    // beim Ausbreiten nach außen nimmt jede Zelle den Rand ihrer Herkunft mit
    const vz = frei.unten ? -1 : 1;
    const spalte = new Float32Array(nx * nz).fill(-Infinity);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) for (let jj = 0; jj < ny; jj++) { const j = vz > 0 ? ny - 1 - jj : jj; if (drin[at(i, j, k)]) { spalte[i + nx * k] = mitte(1, j) * vz; break; } }
    const oberRand = new Float32Array(N).fill(-Infinity);
    for (let c = 0; c < N; c++) if (drin[c]) oberRand[c] = spalte[(c % nx) + nx * Math.floor(c / (nx * ny))];
    // Abstand nach außen in Schichten (6 Nachbarn)
    let rand = []; const abst = new Uint8Array(N).fill(255);
    for (let c = 0; c < N; c++) if (drin[c]) { abst[c] = 0; rand.push(c); }
    const schichten = Math.round(frei.abstand / zelle);
    for (let s = 1; s <= schichten; s++) {
      const neu = [];
      for (const c of rand) {
        const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
        for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const a = i + di, b = j + dj, d = k + dk;
          if (a < 0 || b < 0 || d < 0 || a >= nx || b >= ny || d >= nz) continue;
          const q = at(a, b, d);
          if (abst[q] === 255) { abst[q] = s; oberRand[q] = oberRand[c]; neu.push(q); }
        }
      }
      rand = neu;
    }
    // und nach innen: Knochen bleibt auch innen mindestens „innen“ mm unter der Oberfläche des Zahnfleischs
    const tief = new Uint8Array(N).fill(255); rand = [];
    for (let c = 0; c < N; c++) if (!drin[c]) { tief[c] = 0; }
    for (let c = 0; c < N; c++) if (drin[c]) {
      const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
      if ((i > 0 && !drin[c - 1]) || (i < nx - 1 && !drin[c + 1]) || (j > 0 && !drin[c - nx]) || (j < ny - 1 && !drin[c + nx]) || (k > 0 && !drin[c - nx * ny]) || (k < nz - 1 && !drin[c + nx * ny])) { tief[c] = 1; rand.push(c); }
    }
    for (let s = 2; s <= Math.round((frei.innen ?? 0) / zelle); s++) {
      const neu = [];
      for (const c of rand) for (const q of [c - 1, c + 1, c - nx, c + nx, c - nx * ny, c + nx * ny]) if (q >= 0 && q < N && drin[q] && tief[q] === 255) { tief[q] = s; neu.push(q); }
      rand = neu;
    }
    const innen = Math.round((frei.innen ?? 0) / zelle);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = at(i, j, k);
      if (!voll[c] || mitte(1, j) * vz >= oberRand[c] - (frei.rand ?? 1)) continue;
      const aussen = !drin[c] && abst[c] !== 255, unterHaut = drin[c] && tief[c] <= innen;
      if (aussen || unterHaut) { voll[c] = 0; entfernt++; }
    }
  }
  // oben abschneiden
  const unterSchnitt = (i, j) => mitte(1, j) <= schnittX[i];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (!unterSchnitt(i, j)) voll[at(i, j, k)] = 0;

  // Eingeschlossene Höhlen füllen: von den Seiten, von unten, vorn und hinten her fluten (nicht über die Schnittfläche)
  const draussen = new Uint8Array(N), stapel = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!(i === 0 || i === nx - 1 || j === 0 || k === 0 || k === nz - 1)) continue;
    const c = at(i, j, k);
    if (!voll[c] && unterSchnitt(i, j)) { draussen[c] = 1; stapel.push(c); }
  }
  while (stapel.length) {
    const c = stapel.pop(), i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const a = i + di, b = j + dj, d = k + dk;
      if (a < 0 || b < 0 || d < 0 || a >= nx || b >= ny || d >= nz || !unterSchnitt(a, b)) continue;
      const q = at(a, b, d);
      if (!voll[q] && !draussen[q]) { draussen[q] = 1; stapel.push(q); }
    }
  }
  let gefuellt = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (unterSchnitt(i, j)) { const c = at(i, j, k); if (!voll[c] && !draussen[c]) { voll[c] = 1; gefuellt++; } }

  // Deckel: Mulden (z. B. die Kerbe der Nasenöffnung vorn) und Löcher in den obersten „tiefe“ mm schließen.
  // Höhenbild der obersten Knochenzelle je Säule, im Grundriss geschlossen (erst ausbreiten, dann zurücknehmen; außerhalb
  // des Grundrisses zählt beim Zurücknehmen nicht), Löcher im Grundriss gehören dazu.
  if (deckel && oben < Infinity) {
    const unten = (i) => schnittX[i] - deckel.tiefe, H = new Float32Array(nx * nz).fill(-Infinity), grund = new Uint8Array(nx * nz);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) for (let j = ny - 1; j >= 0; j--) {
      const y = mitte(1, j);
      if (y < unten(i)) break;
      if (voll[at(i, j, k)]) { H[i + nx * k] = y; grund[i + nx * k] = 1; break; }
    }
    // Löcher im Grundriss: von außen fluten, was nicht erreicht wird, gehört dazu
    const aussen = new Uint8Array(nx * nz), st = [];
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) if ((i === 0 || k === 0 || i === nx - 1 || k === nz - 1) && !grund[i + nx * k]) { aussen[i + nx * k] = 1; st.push(i + nx * k); }
    while (st.length) { const c = st.pop(), i = c % nx, k = Math.floor(c / nx); for (const [a, b] of [[i + 1, k], [i - 1, k], [i, k + 1], [i, k - 1]]) { if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const q = a + nx * b; if (!grund[q] && !aussen[q]) { aussen[q] = 1; st.push(q); } } }
    for (let c = 0; c < nx * nz; c++) if (!aussen[c]) { grund[c] = 1; if (H[c] === -Infinity) H[c] = unten(c % nx); }
    const r = Math.round(deckel.radius / zelle), scheibe = [];
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) scheibe.push([a, b]);
    const H1 = new Float32Array(nx * nz).fill(-Infinity), H2 = new Float32Array(nx * nz).fill(-Infinity);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      if (!grund[i + nx * k]) continue;
      let m = -Infinity; for (const [a, b] of scheibe) { const p = i + a, q = k + b; if (p >= 0 && q >= 0 && p < nx && q < nz && grund[p + nx * q]) m = Math.max(m, H[p + nx * q]); }
      H1[i + nx * k] = m;
    }
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      if (!grund[i + nx * k]) continue;
      let m = Infinity; for (const [a, b] of scheibe) { const p = i + a, q = k + b; if (p >= 0 && q >= 0 && p < nx && q < nz && grund[p + nx * q]) m = Math.min(m, H1[p + nx * q]); }
      H2[i + nx * k] = m;
    }
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const c2 = i + nx * k;
      if (!grund[c2] || !(H2[c2] > H[c2])) continue;
      for (let j = 0; j < ny; j++) { const y = mitte(1, j); if (y > H[c2] && y <= H2[c2] && y >= unten(i) && unterSchnitt(i, j)) { const c = at(i, j, k); if (!voll[c]) { voll[c] = 1; gefuellt++; } } }
    }
  }

  // Weichzeichnen (3×3×3), damit die Fläche glatt wird
  let feld = Float32Array.from(voll);
  for (let r = 0; r < weich; r++) {
    for (const achse of [0, 1, 2]) {
      const neu = new Float32Array(N), schritt = [1, nx, nx * ny][achse];
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const c = at(i, j, k), pos3 = [i, j, k][achse];
        const a = pos3 > 0 ? feld[c - schritt] : 0, b = pos3 < n[achse] - 1 ? feld[c + schritt] : 0;
        neu[c] = 0.25 * a + 0.5 * feld[c] + 0.25 * b;
      }
      feld = neu;
    }
  }

  // Am Schnitt stärker weichzeichnen: die Kante läuft rund aus (Radius etwa 2 mm), tiefer bleibt alles, wie es ist
  if (rund && oben < Infinity) {
    const schnittMin = Math.min(...schnittX);
    let stark = Float32Array.from(feld);
    for (let r = 0; r < rund.durchgaenge; r++) {
      for (const achse of [0, 1, 2]) {
        const neu = new Float32Array(N), schritt = [1, nx, nx * ny][achse];
        for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
          if (mitte(1, j) < schnittMin - rund.breite - 6 * zelle) continue;
          for (let i = 0; i < nx; i++) {
            const c = at(i, j, k), pos3 = [i, j, k][achse];
            const a = pos3 > 0 ? stark[c - schritt] : 0, b = pos3 < n[achse] - 1 ? stark[c + schritt] : 0;
            neu[c] = 0.25 * a + 0.5 * stark[c] + 0.25 * b;
          }
        }
        stark = neu;
      }
    }
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const w = 1 - Math.min(1, Math.max(0, (schnittX[i] - mitte(1, j)) / rund.breite));
      if (w <= 0) continue;
      const c = at(i, j, k), s = w * w * (3 - 2 * w);
      feld[c] = feld[c] * (1 - s) + stark[c] * s;
    }
  }

  // Surface Nets: eine Ecke je Würfel mit Vorzeichenwechsel, vier Ecken je durchstoßene Rasterkante
  const iso = 0.5, ecke = new Int32Array(N).fill(-1), P = [];
  const wert = (i, j, k) => feld[at(i, j, k)];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let s = [0, 0, 0], z = 0, innen = 0;
    const w = [];
    for (let q = 0; q < 8; q++) { const v = wert(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1)); w.push(v); if (v > iso) innen++; }
    if (innen === 0 || innen === 8) continue;
    for (let q = 0; q < 8; q++) for (const bit of [1, 2, 4]) {
      if (q & bit) continue;
      const r = q | bit, a = w[q], b = w[r];
      if ((a > iso) === (b > iso)) continue;
      const t = (iso - a) / (b - a);
      const pa = [i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1)], pb = [i + (r & 1), j + ((r >> 1) & 1), k + ((r >> 2) & 1)];
      for (let d = 0; d < 3; d++) s[d] += pa[d] + (pb[d] - pa[d]) * t;
      z++;
    }
    ecke[at(i, j, k)] = P.length / 3;
    for (let d = 0; d < 3; d++) P.push(ursprung[d] + (s[d] / z + 0.5) * zelle);
  }
  const I = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = wert(i, j, k) > iso;
    for (const achse of [0, 1, 2]) {
      const d = [0, 0, 0]; d[achse] = 1;
      const b = wert(i + d[0], j + d[1], k + d[2]) > iso;
      if (a === b) continue;
      // die vier Würfel um die Kante (i,j,k)–(i,j,k)+d
      const [u, v] = [0, 1, 2].filter((x) => x !== achse);
      const wuerfel = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([du, dv]) => { const p = [i, j, k]; p[u] -= du; p[v] -= dv; return ecke[at(p[0], p[1], p[2])]; });
      if (wuerfel.some((x) => x < 0)) continue;
      // Ausrichtung: Normale zeigt von innen nach außen (a innen → Normale entlang +achse)
      const vor = a ? 1 : -1;
      const [q0, q1, q2, q3] = wuerfel;
      const tri = [[q0, q1, q2], [q0, q2, q3]];
      for (const [x, y, w] of tri) {
        const e1 = [0, 1, 2].map((c) => P[y * 3 + c] - P[x * 3 + c]), e2 = [0, 1, 2].map((c) => P[w * 3 + c] - P[x * 3 + c]);
        const nAchse = e1[(achse + 1) % 3] * e2[(achse + 2) % 3] - e1[(achse + 2) % 3] * e2[(achse + 1) % 3];
        I.push(...(nAchse * vor >= 0 ? [x, y, w] : [x, w, y]));
      }
    }
  }
  return { pos: new Float32Array(P), idx: new Uint32Array(I), raster: n, gefuellt, entfernt };
}
