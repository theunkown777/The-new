// Kleine Verlaufslinie neben einer Kennzahl (Inline-SVG, components/Verlauf.tsx). Reine Geometrie, prüfbar.

export interface VerlaufPfad {
  /** Pfadangabe für <path d>. */
  d: string;
  /** Der letzte Messpunkt (bekommt einen Punkt). */
  ende: { x: number; y: number };
  /** Zahl der gezeichneten Messpunkte. */
  punkte: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Pfad durch die Werte, von links (ältester) nach rechts (jüngster). Fehlende Werte (null) werden übersprungen,
 * die Linie verbindet die vorhandenen. Weniger als zwei Werte ergeben keine Linie (null).
 * Sind alle Werte gleich, läuft die Linie waagerecht in der Mitte.
 */
export function verlaufPfad(werte: (number | null | undefined)[], breite = 96, hoehe = 28, rand = 3): VerlaufPfad | null {
  const da = werte.map((w, i) => ({ w, i })).filter((p): p is { w: number; i: number } => typeof p.w === "number" && Number.isFinite(p.w));
  if (da.length < 2 || werte.length < 2) return null;
  const min = Math.min(...da.map((p) => p.w));
  const max = Math.max(...da.map((p) => p.w));
  const x = (i: number) => r1(rand + (i / (werte.length - 1)) * (breite - 2 * rand));
  const y = (w: number) => (max === min ? r1(hoehe / 2) : r1(hoehe - rand - ((w - min) / (max - min)) * (hoehe - 2 * rand)));
  const pkt = da.map((p) => ({ x: x(p.i), y: y(p.w) }));
  return { d: pkt.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "), ende: pkt[pkt.length - 1], punkte: pkt.length };
}

/** Beschreibung für Bildschirmleser: erster und letzter Wert, ohne Wertung. */
export function verlaufText(name: string, werte: (number | null | undefined)[], einheit = ""): string {
  const da = werte.filter((w): w is number => typeof w === "number" && Number.isFinite(w));
  if (da.length < 2) return `${name}: noch kein Verlauf`;
  const f = (n: number) => `${Math.round(n).toLocaleString("de-DE")}${einheit ? ` ${einheit}` : ""}`;
  return `Verlauf ${name} in ${werte.length} Abschnitten: am Anfang ${f(da[0])}, zuletzt ${f(da[da.length - 1])}`;
}
