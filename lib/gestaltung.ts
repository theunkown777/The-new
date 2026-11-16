// Gestaltung der App für die Praxis: Rechenhilfen für Kontraste und das Auslesen der Farbvariablen aus
// app/globals.css. Damit prüft lib/gestaltung.test.ts, dass Schrift auf den Flächen der App lesbar bleibt
// (mindestens 4,5:1), hell wie dunkel. Regeln für neue Seiten: docs/GESTALTUNG.md.

/** Farbe als [r, g, b] aus "#RRGGBB", "#RGB" oder "R G B" (Schreibweise der Farbvariablen). */
export function rgbAus(farbe: string): [number, number, number] {
  const f = farbe.trim();
  if (f.startsWith("#")) {
    const h = f.length === 4 ? [...f.slice(1)].map((c) => c + c).join("") : f.slice(1);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Keine Farbe: ${farbe}`);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const teile = f.split(/[\s,]+/).map(Number);
  if (teile.length !== 3 || teile.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) throw new Error(`Keine Farbe: ${farbe}`);
  return teile as [number, number, number];
}

/** Relative Leuchtdichte nach WCAG 2 (0 = Schwarz, 1 = Weiß). */
export function leuchtdichte(farbe: string): number {
  const [r, g, b] = rgbAus(farbe).map((w) => {
    const s = w / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben nach WCAG 2 (1 bis 21). */
export function kontrast(a: string, b: string): number {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}

/** Mindestkontrast für Text in der App (auch für Platzhalter und gesperrte Knöpfe). */
export const KONTRAST_TEXT = 4.5;

/**
 * Alle Variablen (--name: wert) aus den Regelblöcken mit genau diesem Selektor, in der Reihenfolge der Datei
 * (spätere Angaben überschreiben frühere). Der Selektor muss am Zeilenanfang stehen.
 */
export function variablenAus(css: string, selektor: string): Record<string, string> {
  const aus: Record<string, string> = {};
  const zeilen = css.split("\n");
  let drin = false;
  for (const zeile of zeilen) {
    if (!drin) {
      const kopf = zeile.trim();
      if (kopf.endsWith("{") && kopf.slice(0, -1).split(",").map((s) => s.trim()).includes(selektor)) drin = true;
      continue;
    }
    if (zeile.trim() === "}") {
      drin = false;
      continue;
    }
    for (const m of zeile.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) aus[m[1]] = m[2].trim();
  }
  return aus;
}

/** Verweise der Form var(--x) einmal auflösen (Flächen und Linien verweisen auf die Schriftfarbe). */
export function aufgeloest(vars: Record<string, string>): Record<string, string> {
  const aus: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    const m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
    aus[k] = m && vars[m[1]] !== undefined ? vars[m[1]] : v;
  }
  return aus;
}
