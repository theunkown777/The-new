// Aus einem flachen Umriss wird ein runder Körper: Die Fläche wird „aufgeblasen“ wie ein Kissen.
// Die Höhe folgt aus einer Membran-Gleichung (Poisson): schmale Stellen werden dünn, breite dick,
// ein Streifen bekommt genau einen Halbkreis als Querschnitt. So wirken Knochen, Muskeln und
// Organe von jeder Seite plastisch, ohne dass für jede Struktur ein eigenes 3D-Modell nötig ist.
import Delaunator from "delaunator";
import type { P } from "../formen";
import { imVieleck } from "./pfad";

export interface Netz { ort: Float32Array; index: Uint32Array }

/** Kontur so abtasten, dass kein Abstand größer als `abstand` ist, und fast doppelte Punkte entfernen. */
export function konturAbtasten(kontur: P[], abstand: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < kontur.length; i++) {
    const a = kontur[i], b = kontur[(i + 1) % kontur.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    const teile = Math.max(1, Math.ceil(l / abstand));
    for (let k = 0; k < teile; k++) out.push([a[0] + ((b[0] - a[0]) * k) / teile, a[1] + ((b[1] - a[1]) * k) / teile]);
  }
  return out.filter((p, i) => { const q = out[(i + out.length - 1) % out.length]; return out.length < 4 || Math.hypot(p[0] - q[0], p[1] - q[1]) > abstand * 0.2; });
}

function abstandZurKontur(p: P, k: P[]): number {
  let m = Infinity;
  for (let i = 0; i < k.length; i++) {
    const a = k[i], b = k[(i + 1) % k.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return m;
}

/**
 * Umriss (x nach rechts, y nach unten wie im Bild) aufblasen. Ergebnis in Bildkoordinaten mit z:
 * +z zeigt zum Betrachter. `vorn` und `hinten` strecken die beiden Hälften (1 = rund),
 * `maxDicke` begrenzt die Höhe weich (für flache Muskeln und Organe).
 */
export function aufblasen(konturRoh: P[], o: { vorn?: number; hinten?: number; maxDicke?: number; feinheit?: number } = {}): Netz {
  const xs = konturRoh.map((p) => p[0]), ys = konturRoh.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), b = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const zelle = Math.max(0.6, Math.max(b, h) / (o.feinheit ?? 26), Math.min(b, h) / 14);
  const kontur = konturAbtasten(konturRoh, zelle);
  if (kontur.length < 3) return { ort: new Float32Array(0), index: new Uint32Array(0) };
  const nx = Math.max(2, Math.ceil(b / zelle) + 1), ny = Math.max(2, Math.ceil(h / zelle) + 1);
  const gx = (i: number) => x0 + (b - (nx - 1) * zelle) / 2 + i * zelle, gy = (j: number) => y0 + (h - (ny - 1) * zelle) / 2 + j * zelle;
  const innen = new Uint8Array(nx * ny), u = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) innen[j * nx + i] = imVieleck([gx(i), gy(j)], kontur) ? 1 : 0;
  // Membran-Gleichung mit Überrelaxation lösen (Rand = 0)
  const w = 1.8, z2 = zelle * zelle;
  for (let runde = 0; runde < 90; runde++)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!innen[k]) continue;
      const s = (i > 0 ? u[k - 1] : 0) + (i < nx - 1 ? u[k + 1] : 0) + (j > 0 ? u[k - nx] : 0) + (j < ny - 1 ? u[k + nx] : 0);
      u[k] += w * ((s + z2) / 4 - u[k]);
    }
  const punkte: P[] = [...kontur], hoehe: number[] = kontur.map(() => 0);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!innen[k]) continue;
    const p: P = [gx(i), gy(j)];
    if (abstandZurKontur(p, kontur) < zelle * 0.45) continue;
    let hk = Math.sqrt(Math.max(0, 2 * u[k]));
    if (o.maxDicke) hk = o.maxDicke * Math.tanh(hk / o.maxDicke);
    punkte.push(p); hoehe.push(hk);
  }
  const d = Delaunator.from(punkte);
  const n = punkte.length, nk = kontur.length, vorn = o.vorn ?? 1, hinten = o.hinten ?? 1;
  // Vorderseite: alle Punkte; Rückseite: innere Punkte noch einmal, die Kontur wird geteilt (geschlossener Körper)
  const ort = new Float32Array((n + (n - nk)) * 3);
  for (let i = 0; i < n; i++) { ort[i * 3] = punkte[i][0]; ort[i * 3 + 1] = punkte[i][1]; ort[i * 3 + 2] = hoehe[i] * vorn; }
  for (let i = nk; i < n; i++) { const q = (n + i - nk) * 3; ort[q] = punkte[i][0]; ort[q + 1] = punkte[i][1]; ort[q + 2] = -hoehe[i] * hinten; }
  const rueck = (i: number) => (i < nk ? i : n + i - nk);
  const index: number[] = [];
  for (let t = 0; t < d.triangles.length; t += 3) {
    const a = d.triangles[t], bb = d.triangles[t + 1], c = d.triangles[t + 2];
    if (a < nk && bb < nk && c < nk) {
      // Dreieck nur aus Randpunkten: liegt flach auf z = 0, nur behalten, wenn es innen liegt
    }
    const m: P = [(punkte[a][0] + punkte[bb][0] + punkte[c][0]) / 3, (punkte[a][1] + punkte[bb][1] + punkte[c][1]) / 3];
    if (!imVieleck(m, kontur)) continue;
    // Im Bild (y nach unten) soll die Vorderseite zum Betrachter (+z) zeigen
    const kreuz = (punkte[bb][0] - punkte[a][0]) * (punkte[c][1] - punkte[a][1]) - (punkte[bb][1] - punkte[a][1]) * (punkte[c][0] - punkte[a][0]);
    const [p, q, r] = kreuz < 0 ? [a, bb, c] : [a, c, bb];
    index.push(p, q, r, rueck(p), rueck(r), rueck(q));
  }
  return { ort, index: new Uint32Array(index) };
}
