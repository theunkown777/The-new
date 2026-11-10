// SVG-Pfade der Modelle in Punktfolgen zerlegen (für die räumliche Darstellung).
// Unterstützt die Befehle, die lib/modelle/formen.ts erzeugt: M, L, H, V, C, A, Z (absolut).
import type { P } from "../formen";

export interface Teilpfad { punkte: P[]; geschlossen: boolean }

function bogen(a: P, rx: number, ry: number, grad: number, gross: number, richtung: number, b: P, schritt: number): P[] {
  // Endpunkt- in Mittelpunktform (SVG-Anhang F.6)
  const phi = (grad * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi);
  const dx = (a[0] - b[0]) / 2, dy = (a[1] - b[1]) / 2;
  const x1 = c * dx + s * dy, y1 = -s * dx + c * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (rx < 1e-6 || ry < 1e-6) return [b];
  const l = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
  const z = Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1), n = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (gross === richtung ? -1 : 1) * Math.sqrt(n ? z / n : 0);
  const cx1 = (k * rx * y1) / ry, cy1 = (-k * ry * x1) / rx;
  const cx = c * cx1 - s * cy1 + (a[0] + b[0]) / 2, cy = s * cx1 + c * cy1 + (a[1] + b[1]) / 2;
  const w = (ux: number, uy: number) => Math.atan2(uy, ux);
  const t1 = w((x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = w((-x1 - cx1) / rx, (-y1 - cy1) / ry) - t1;
  if (richtung && dt < 0) dt += 2 * Math.PI;
  if (!richtung && dt > 0) dt -= 2 * Math.PI;
  const teile = Math.max(4, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / schritt));
  const out: P[] = [];
  for (let i = 1; i <= teile; i++) {
    const t = t1 + (dt * i) / teile;
    out.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
  }
  return out;
}

/** Pfad in Punktfolgen zerlegen; Kurven werden etwa alle `schritt` Einheiten abgetastet. */
export function pfadPunkte(d: string, schritt = 3): Teilpfad[] {
  const marken = d.match(/[MLHVCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const out: Teilpfad[] = [];
  let akt: Teilpfad | null = null, pos: P = [0, 0], i = 0, befehl = "";
  const zahl = () => Number(marken[i++]);
  while (i < marken.length) {
    if (/[A-Za-z]/.test(marken[i])) befehl = marken[i++].toUpperCase();
    if (befehl === "Z") { if (akt) akt.geschlossen = true; continue; }
    if (befehl === "M") { pos = [zahl(), zahl()]; akt = { punkte: [pos], geschlossen: false }; out.push(akt); befehl = "L"; continue; }
    if (!akt) { akt = { punkte: [pos], geschlossen: false }; out.push(akt); }
    if (befehl === "L") pos = [zahl(), zahl()];
    else if (befehl === "H") pos = [zahl(), pos[1]];
    else if (befehl === "V") pos = [pos[0], zahl()];
    else if (befehl === "C") {
      const a = pos, b: P = [zahl(), zahl()], c: P = [zahl(), zahl()], e: P = [zahl(), zahl()];
      const laenge = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]) + Math.hypot(e[0] - c[0], e[1] - c[1]);
      const teile = Math.max(2, Math.min(40, Math.ceil(laenge / schritt)));
      for (let k = 1; k < teile; k++) {
        const t = k / teile, u = 1 - t;
        akt.punkte.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1]]);
      }
      pos = e;
    } else if (befehl === "A") {
      const rx = zahl(), ry = zahl(), grad = zahl(), gross = zahl(), richtung = zahl(), e: P = [zahl(), zahl()];
      const p = bogen(pos, rx, ry, grad, gross, richtung, e, schritt);
      akt.punkte.push(...p.slice(0, -1));
      pos = e;
    } else { i++; continue; }
    akt.punkte.push(pos);
  }
  // Schlusspunkt, der dem Anfang gleicht, entfernen
  for (const t of out) {
    const a = t.punkte[0], z = t.punkte[t.punkte.length - 1];
    if (t.punkte.length > 2 && Math.hypot(a[0] - z[0], a[1] - z[1]) < 0.05) { t.punkte.pop(); t.geschlossen = true; }
  }
  return out.filter((t) => t.punkte.length >= 2);
}

export function imVieleck(p: P, v: P[]): boolean {
  let drin = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const a = v[i], b = v[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin;
  }
  return drin;
}
