// Zeichenhilfen für die Anatomie-Modelle: Aus wenigen Stützpunkten entstehen SVG-Pfade
// für Knochen (Schaft mit Gelenkenden), Muskeln (Spindel), Flächen (geglättetes Vieleck)
// und Bänder (Strich). Reine Funktionen ohne Abhängigkeiten, damit dieselben Formen auf
// dem Server (Website) und im Browser (Zoom, Auswahl) entstehen.

export type P = [number, number];
/** d: SVG-Pfad. strich: Breite, wenn die Form eine Linie ist (Sehne, Rippe) statt einer Fläche. */
export type Form = { d: string; strich?: number };

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
const zwischen = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function achse(a: P, b: P) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const u: P = [dx / l, dy / l];
  const n: P = [-u[1], u[0]];
  return { u, n, l };
}

/** Geglätteter Pfad durch die Punkte (Catmull-Rom als kubische Bézierkurven). */
export function glatt(p: P[], geschlossen = true, spannung = 0.5): string {
  const n = p.length;
  if (n < 2) return "";
  const at = (i: number) => (geschlossen ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pt(p[0])}`;
  const ende = geschlossen ? n : n - 1;
  for (let i = 0; i < ende; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * spannung) / 3, p1[1] + ((p2[1] - p0[1]) * spannung) / 3];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * spannung) / 3, p2[1] - ((p3[1] - p1[1]) * spannung) / 3];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return geschlossen ? d + "Z" : d;
}

/** Fläche aus Stützpunkten (Becken, Schulterblatt, flächige Muskeln). */
export const flaeche = (p: P[], spannung = 0.5): Form => ({ d: glatt(p, true, spannung) });

/** Röhrenknochen von a nach b: Schaftbreite w, Gelenkenden wa und wb. */
export function knochen(a: P, b: P, w: number, wa = w * 1.7, wb = w * 1.7): Form {
  const { u, n, l } = achse(a, b);
  const s1 = add(a, u, l * 0.2), s2 = add(a, u, l * 0.8);
  return flaeche([
    add(a, n, wa / 2), add(s1, n, w / 2), add(s2, n, w / 2), add(b, n, wb / 2),
    add(b, u, wb * 0.28),
    add(b, n, -wb / 2), add(s2, n, -w / 2), add(s1, n, -w / 2), add(a, n, -wa / 2),
    add(a, u, -wa * 0.28),
  ], 0.75);
}

/** Muskelbauch von a (Ursprung) nach b (Ansatz): größte Breite w, bauch = Lage des Bauchs (0..1). */
export function spindel(a: P, b: P, w: number, bauch = 0.45): Form {
  const { u, n, l } = achse(a, b);
  const m = add(a, u, l * bauch);
  const q1 = add(a, u, l * Math.max(0.08, bauch - 0.3)), q2 = add(a, u, l * Math.min(0.92, bauch + 0.33));
  return flaeche([
    a, add(q1, n, w * 0.36), add(m, n, w / 2), add(q2, n, w * 0.34),
    b, add(q2, n, -w * 0.34), add(m, n, -w / 2), add(q1, n, -w * 0.36),
  ], 0.8);
}

/** Ellipse um c, optional gedreht (Grad). */
export function ellipse(c: P, rx: number, ry: number, grad = 0): Form {
  const w = (grad * Math.PI) / 180;
  const ax: P = [Math.cos(w) * rx, Math.sin(w) * rx];
  const p1 = add(c, ax), p2 = add(c, ax, -1);
  return { d: `M${pt(p1)}A${r1(rx)} ${r1(ry)} ${r1(grad)} 1 0 ${pt(p2)}A${r1(rx)} ${r1(ry)} ${r1(grad)} 1 0 ${pt(p1)}Z` };
}

/** Linie durch die Punkte (Sehne, Band, Rippe), gezeichnet als Strich der Breite w. */
export const strich = (p: P[], w: number): Form => ({ d: glatt(p, false, 0.6), strich: w });

/** Band gleichbleibender Breite entlang der Punkte als Fläche (z. B. Schneidermuskel). */
export function band(p: P[], w: number): Form {
  const links: P[] = [], rechts: P[] = [];
  for (let i = 0; i < p.length; i++) {
    const { n } = achse(p[Math.max(0, i - 1)], p[Math.min(p.length - 1, i + 1)]);
    const k = i === 0 || i === p.length - 1 ? 0.55 : 1;
    links.push(add(p[i], n, (w / 2) * k));
    rechts.push(add(p[i], n, (-w / 2) * k));
  }
  return flaeche([...links, ...rechts.reverse()], 0.7);
}

/** Rechteck um c (Wirbelkörper); runde Ecken kommen über die Strichverbindung beim Zeichnen. */
export function block(c: P, b: number, h: number): Form {
  const x = c[0] - b / 2, y = c[1] - h / 2;
  return { d: `M${pt([x, y])}L${pt([x + b, y])}L${pt([x + b, y + h])}L${pt([x, y + h])}Z` };
}

/** Punktfolge gleichmäßig zwischen a und b (z. B. Wirbel einer Säule). */
export const reihe = (a: P, b: P, anzahl: number): P[] => Array.from({ length: anzahl }, (_, i) => zwischen(a, b, anzahl === 1 ? 0 : i / (anzahl - 1)));

/** Umgebendes Rechteck aller Zahlenpaare eines Pfads (grob, über die Stützpunkte); für Zoom und Beschriftung. */
export function rahmen(formen: Form[]): { x: number; y: number; b: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of formen) {
    const pad = (f.strich ?? 0) / 2;
    // Bogenbefehle (A rx ry rot f1 f2 x y) überspringen: nur die Endpunkte zählen
    const ohneBogen = f.d.replace(/A-?[\d.]+\s-?[\d.]+\s-?[\d.]+\s[01]\s[01]\s/g, "L");
    const zahlen = ohneBogen.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < zahlen.length; i += 2) {
      x0 = Math.min(x0, zahlen[i] - pad); x1 = Math.max(x1, zahlen[i] + pad);
      y0 = Math.min(y0, zahlen[i + 1] - pad); y1 = Math.max(y1, zahlen[i + 1] + pad);
    }
  }
  if (!isFinite(x0)) return { x: 0, y: 0, b: 0, h: 0 };
  return { x: x0, y: y0, b: x1 - x0, h: y1 - y0 };
}
