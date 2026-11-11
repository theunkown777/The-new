// Gemeinsame Bahn für den laufenden Punkt auf dem Lächelbogen: Zeitplan (an jeder Station halten,
// dazwischen weich fahren) und Schlüsselbilder als transform in Pixeln. Bewegt wird ein HTML-Element,
// damit der Browser die Animation auf der Grafikkarte abspielt und die Seite nicht neu zeichnen muss.

export type Kurve = (t: number) => [number, number];

/** Quadratischer Bogen mit Stützpunkten in beliebigen Einheiten. */
export const bogen = (p0: [number, number], p1: [number, number], p2: [number, number]): Kurve => (t) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
];

export interface Zeitplan {
  dauer: number;
  /** je Station: von/bis als Anteil 0..1 des Umlaufs */
  halte: { von: number; bis: number }[];
}

export function zeitplan(halt = 1100, fahrt = 900, pauseEnde = 900, stationen = 5): Zeitplan {
  const dauer = stationen * halt + (stationen - 1) * fahrt + pauseEnde;
  const halte: { von: number; bis: number }[] = [];
  let t = 0;
  for (let i = 0; i < stationen; i++) {
    const letzte = i === stationen - 1;
    halte.push({ von: t / dauer, bis: (t + halt + (letzte ? pauseEnde : 0)) / dauer });
    t += halt + (letzte ? pauseEnde : 0) + fahrt;
  }
  return { dauer, halte };
}

const einAus = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

/**
 * Schlüsselbilder für den Punkt. kurve liefert Koordinaten in Einheiten der Zeichnung (breite × hoehe),
 * w/h ist die tatsächliche Größe in Pixeln. Stationen liegen bei t = i / (n-1).
 */
export function laeuferBilder(kurve: Kurve, breite: number, hoehe: number, w: number, h: number, plan: Zeitplan): Keyframe[] {
  const n = plan.halte.length;
  const pos = (t: number) => {
    const [x, y] = kurve(t);
    return `translate(${((x / breite) * w).toFixed(1)}px, ${((y / hoehe) * h).toFixed(1)}px)`;
  };
  const bilder: Keyframe[] = [];
  plan.halte.forEach((s, i) => {
    bilder.push({ offset: s.von, transform: pos(i / (n - 1)) });
    bilder.push({ offset: s.bis, transform: pos(i / (n - 1)) });
    if (i < n - 1) {
      const ende = plan.halte[i + 1].von;
      for (let k = 1; k < 12; k++) bilder.push({ offset: s.bis + ((ende - s.bis) * k) / 12, transform: pos((i + einAus(k / 12)) / (n - 1)) });
    }
  });
  return bilder;
}
