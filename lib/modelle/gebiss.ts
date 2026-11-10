// Gebiss-Modell: alle 32 bleibenden Zähne in Bogenform (Aufsicht), ein Zahn im Querschnitt
// mit seinen Schichten und die typischen Instrumente der Zahnarztpraxis an ihrem Einsatzort.
// Schematische Darstellung zur Erklärung für Patienten; kein Befund, keine Diagnose.
//
// Zahnbezeichnung nach dem FDI-Schema: erste Ziffer = Quadrant (1 oben rechts, 2 oben links,
// 3 unten links, 4 unten rechts), zweite Ziffer = Zahn von der Mitte aus (1 bis 8).
// Wie beim Blick in den Mund liegt die rechte Seite des Patienten links im Bild.

import { block, ellipse, flaeche, strich, type Form, type P } from "./formen";

export const GEBISS_BREITE = 400;
export const GEBISS_HOEHE = 560;

export type Zahnart = "schneidezahn" | "eckzahn" | "praemolar" | "molar" | "weisheitszahn";

export interface Zahn {
  fdi: number;
  kiefer: "oben" | "unten";
  seite: "rechts" | "links";
  /** Position von der Mitte aus, 1 bis 8 */
  pos: number;
  art: Zahnart;
  name: string;
  form: Form;
  /** Kauflächenrelief (Fissuren, Schneidekante) */
  relief: Form[];
  mitte: P;
  /** Platz für die Zahnnummer außerhalb des Bogens */
  nummerBei: P;
  durchbruch: string;
  wurzeln: string;
  /** Milchzahn (FDI-Quadranten 5 bis 8) */
  milch?: boolean;
}

const ART: Record<number, Zahnart> = { 1: "schneidezahn", 2: "schneidezahn", 3: "eckzahn", 4: "praemolar", 5: "praemolar", 6: "molar", 7: "molar", 8: "weisheitszahn" };
const POS_NAME: Record<number, string> = {
  1: "mittlerer Schneidezahn", 2: "seitlicher Schneidezahn", 3: "Eckzahn", 4: "erster kleiner Backenzahn", 5: "zweiter kleiner Backenzahn",
  6: "erster großer Backenzahn", 7: "zweiter großer Backenzahn", 8: "Weisheitszahn",
};
// Breite (entlang des Bogens) und Tiefe (Wange zu Zunge) in Millimetern, gerundete Durchschnittswerte
const MASS: Record<"oben" | "unten", Record<number, [number, number]>> = {
  oben: { 1: [8.6, 7], 2: [6.6, 6.2], 3: [7.6, 8], 4: [7, 9], 5: [6.7, 9], 6: [10.2, 11.2], 7: [9.4, 11], 8: [8.6, 10] },
  unten: { 1: [5.4, 6], 2: [5.9, 6.3], 3: [6.9, 7.6], 4: [7, 7.8], 5: [7.2, 8.2], 6: [11, 10.2], 7: [10.4, 10], 8: [10, 9.4] },
};
const DURCHBRUCH: Record<"oben" | "unten", Record<number, string>> = {
  oben: { 1: "mit 7 bis 8 Jahren", 2: "mit 8 bis 9 Jahren", 3: "mit 11 bis 12 Jahren", 4: "mit 10 bis 11 Jahren", 5: "mit 10 bis 12 Jahren", 6: "mit 6 bis 7 Jahren", 7: "mit 12 bis 13 Jahren", 8: "meist zwischen 17 und 21 Jahren, manchmal gar nicht" },
  unten: { 1: "mit 6 bis 7 Jahren", 2: "mit 7 bis 8 Jahren", 3: "mit 9 bis 10 Jahren", 4: "mit 10 bis 12 Jahren", 5: "mit 11 bis 12 Jahren", 6: "mit 6 bis 7 Jahren", 7: "mit 11 bis 13 Jahren", 8: "meist zwischen 17 und 21 Jahren, manchmal gar nicht" },
};
const WURZELN: Record<"oben" | "unten", Record<number, string>> = {
  oben: { 1: "eine Wurzel", 2: "eine Wurzel", 3: "eine Wurzel, die längste im Gebiss", 4: "meist zwei Wurzeln", 5: "meist eine Wurzel", 6: "drei Wurzeln", 7: "drei Wurzeln", 8: "sehr unterschiedlich, oft verschmolzen" },
  unten: { 1: "eine Wurzel", 2: "eine Wurzel", 3: "eine Wurzel", 4: "eine Wurzel", 5: "eine Wurzel", 6: "zwei Wurzeln", 7: "zwei Wurzeln", 8: "sehr unterschiedlich, oft verschmolzen" },
};

export const ZAHNARTEN: Record<Zahnart, { name: string; aufgabe: string; typisch: string }> = {
  schneidezahn: { name: "Schneidezahn", aufgabe: "Schneidezähne beißen Nahrung ab, formen Laute beim Sprechen und prägen das Lächeln.", typisch: "Häufig sind abgebrochene Ecken nach Stürzen, Karies zwischen den Zähnen und Verfärbungen. Behandelt wird meist mit zahnfarbenen Füllungen, Veneers oder Kronen." },
  eckzahn: { name: "Eckzahn", aufgabe: "Eckzähne halten und zerreißen Nahrung. Bei Seitwärtsbewegungen führen sie den Unterkiefer und entlasten so die Backenzähne.", typisch: "Eckzähne sind sehr stabil und bleiben oft am längsten erhalten. Am Zahnhals können sie empfindlich werden, wenn das Zahnfleisch zurückgeht." },
  praemolar: { name: "Kleiner Backenzahn (Prämolar)", aufgabe: "Die kleinen Backenzähne zerkleinern die Nahrung und geben sie an die großen Backenzähne weiter.", typisch: "Karies entsteht oft in den Zahnzwischenräumen. Bei einer Zahnspange werden manchmal Prämolaren entfernt, um Platz zu schaffen." },
  molar: { name: "Großer Backenzahn (Molar)", aufgabe: "Die großen Backenzähne zermahlen die Nahrung. Sie tragen den größten Teil der Kaukraft.", typisch: "In den tiefen Rillen der Kaufläche (Fissuren) entsteht am häufigsten Karies. Typische Behandlungen sind Füllung, Fissurenversiegelung, Wurzelbehandlung und Krone." },
  weisheitszahn: { name: "Weisheitszahn", aufgabe: "Weisheitszähne sind die hintersten Backenzähne. Viele Menschen haben nicht genug Platz für sie.", typisch: "Sie brechen oft nur teilweise oder schief durch. Dann kann sich das Zahnfleisch entzünden oder der Nachbarzahn Schaden nehmen, und sie werden entfernt." },
};

// ---------------------------------------------------------------- Zahnbogen berechnen
type Bogen = { mx: number; my: number; rx: number; ry: number; richtung: 1 | -1 };
const BOGEN: Record<"oben" | "unten", Bogen> = {
  oben: { mx: 200, my: 252, rx: 126, ry: 190, richtung: -1 }, // Scheitel oben
  unten: { mx: 200, my: 318, rx: 112, ry: 176, richtung: 1 }, // Scheitel unten
};

/** Punkt auf dem Viertelbogen: t = 0 in der Mitte (Schneidezähne), t = 1 am Ende (Weisheitszahn). vz = -1 linke Bildhälfte. */
const bogenPunkt = (b: Bogen, t: number, vz: 1 | -1): P => {
  const w = (t * Math.PI) / 2;
  return [b.mx + vz * b.rx * Math.sin(w), b.my + b.richtung * b.ry * Math.cos(w)];
};

function zahnForm(mitte: P, tangente: P, normal: P, breite: number, tiefe: number, art: Zahnart, pos: number): { form: Form; relief: Form[] } {
  const p = (x: number, y: number): P => [mitte[0] + tangente[0] * x + normal[0] * y, mitte[1] + tangente[1] * x + normal[1] * y];
  const b = breite / 2, t = tiefe / 2;
  if (art === "schneidezahn") {
    // außen (Lippe) breiter und flach gewölbt, innen (Zunge) schmaler
    return { form: flaeche([p(-b, t * 0.5), p(-b * 0.55, t), p(b * 0.55, t), p(b, t * 0.5), p(b * 0.8, -t * 0.7), p(0, -t), p(-b * 0.8, -t * 0.7)], 0.8), relief: [strich([p(-b * 0.6, t * 0.35), p(0, t * 0.5), p(b * 0.6, t * 0.35)], 1)] };
  }
  if (art === "eckzahn") {
    return { form: flaeche([p(-b, t * 0.2), p(-b * 0.5, t), p(b * 0.5, t), p(b, t * 0.2), p(b * 0.6, -t * 0.8), p(0, -t), p(-b * 0.6, -t * 0.8)], 0.8), relief: [ellipse(p(0, t * 0.15), 1.6, 1.6)] };
  }
  const eckig = art === "praemolar" ? 0.62 : 0.78;
  const form = flaeche([p(-b, -t * eckig), p(-b * eckig, -t), p(b * eckig, -t), p(b, -t * eckig), p(b, t * eckig), p(b * eckig, t), p(-b * eckig, t), p(-b, t * eckig)], 0.55);
  if (art === "praemolar") return { form, relief: [strich([p(-b * 0.5, 0), p(0, t * 0.1), p(b * 0.5, 0)], 1.1)] };
  // Molar: Längsfissur mit Querrillen; Weisheitszahn etwas unregelmäßiger
  const quer = pos === 8 ? 0.4 : 0.55;
  return { form, relief: [strich([p(-b * 0.6, 0), p(0, t * 0.08), p(b * 0.6, 0)], 1.2), strich([p(-b * 0.12, -t * quer), p(-b * 0.08, t * quer)], 1.1), strich([p(b * 0.3, -t * quer * 0.8), p(b * 0.26, t * quer * 0.8)], 1)] };
}

// Milchgebiss: 20 Zähne, je Quadrant zwei Schneidezähne, ein Eckzahn und zwei Milchbackenzähne
const MILCH_ART: Record<number, Zahnart> = { 1: "schneidezahn", 2: "schneidezahn", 3: "eckzahn", 4: "molar", 5: "molar" };
const MILCH_NAME: Record<number, string> = { 1: "mittlerer Milchschneidezahn", 2: "seitlicher Milchschneidezahn", 3: "Milcheckzahn", 4: "erster Milchbackenzahn", 5: "zweiter Milchbackenzahn" };
const MILCH_MASS: Record<"oben" | "unten", Record<number, [number, number]>> = {
  oben: { 1: [6.5, 5.4], 2: [5.2, 5], 3: [6.8, 6.6], 4: [7.2, 8.6], 5: [8.8, 9.6] },
  unten: { 1: [4.2, 4.4], 2: [4.6, 4.6], 3: [5.8, 5.8], 4: [7.8, 7.2], 5: [9.8, 8.8] },
};
const MILCH_DURCHBRUCH: Record<number, string> = { 1: "mit 6 bis 10 Monaten", 2: "mit 8 bis 14 Monaten", 3: "mit 16 bis 22 Monaten", 4: "mit 12 bis 18 Monaten", 5: "mit 24 bis 30 Monaten" };
const MILCH_WECHSEL: Record<number, string> = { 1: "fällt mit 6 bis 8 Jahren aus", 2: "fällt mit 7 bis 9 Jahren aus", 3: "fällt mit 9 bis 12 Jahren aus", 4: "fällt mit 9 bis 11 Jahren aus", 5: "fällt mit 10 bis 12 Jahren aus" };
const MILCH_BOGEN: Record<"oben" | "unten", Bogen> = {
  oben: { mx: 200, my: 250, rx: 104, ry: 150, richtung: -1 },
  unten: { mx: 200, my: 316, rx: 94, ry: 140, richtung: 1 },
};

function bogenZaehne(kiefer: "oben" | "unten", milch = false): Zahn[] {
  const b = (milch ? MILCH_BOGEN : BOGEN)[kiefer];
  const masse = (milch ? MILCH_MASS : MASS)[kiefer];
  const anzahl = milch ? 5 : 8;
  // Bogenlänge numerisch, damit die Zähne lückenlos nebeneinander stehen
  const N = 400;
  const laengen = [0];
  for (let i = 1; i <= N; i++) {
    const a = bogenPunkt(b, (i - 1) / N, -1), c = bogenPunkt(b, i / N, -1);
    laengen.push(laengen[i - 1] + Math.hypot(c[0] - a[0], c[1] - a[1]));
  }
  const gesamt = laengen[N] * 0.985;
  const summe = Object.values(masse).reduce((s, [w]) => s + w, 0);
  const k = gesamt / summe; // Bildpunkte je Millimeter
  const tBei = (strecke: number) => {
    let i = laengen.findIndex((l) => l >= strecke);
    if (i < 1) i = strecke <= 0 ? 1 : N;
    return (i - 1 + (strecke - laengen[i - 1]) / (laengen[i] - laengen[i - 1] || 1)) / N;
  };
  const zaehne: Zahn[] = [];
  for (const vz of [-1, 1] as const) {
    let weg = 0;
    for (let pos = 1; pos <= anzahl; pos++) {
      const [mmB, mmT] = masse[pos];
      const breite = mmB * k, tiefe = mmT * k * 0.92;
      const t = tBei(weg + breite / 2);
      weg += breite;
      const mitte = bogenPunkt(b, t, vz);
      const davor = bogenPunkt(b, Math.max(0, t - 0.004), vz), danach = bogenPunkt(b, Math.min(1, t + 0.004), vz);
      const l = Math.hypot(danach[0] - davor[0], danach[1] - davor[1]) || 1;
      const tangente: P = [(danach[0] - davor[0]) / l, (danach[1] - davor[1]) / l];
      // Normale zeigt nach außen (weg von der Bogenmitte)
      let normal: P = [-tangente[1], tangente[0]];
      const nachAussen: P = [mitte[0] - b.mx, mitte[1] - (b.my + b.richtung * b.ry * 0.35)];
      if (normal[0] * nachAussen[0] + normal[1] * nachAussen[1] < 0) normal = [-normal[0], -normal[1]];
      const art = milch ? MILCH_ART[pos] : ART[pos];
      const { form, relief } = zahnForm(mitte, tangente, normal, breite * 0.93, tiefe, art, pos);
      const seite = vz === -1 ? "rechts" : "links";
      const quadrant = (kiefer === "oben" ? (seite === "rechts" ? 1 : 2) : seite === "links" ? 3 : 4) + (milch ? 4 : 0);
      zaehne.push({
        fdi: quadrant * 10 + pos, kiefer, seite, pos, art,
        name: `${kiefer === "oben" ? "Oberer" : "Unterer"} ${seite === "rechts" ? "rechter" : "linker"} ${milch ? MILCH_NAME[pos] : POS_NAME[pos]}`,
        form, relief, mitte,
        nummerBei: [mitte[0] + normal[0] * (tiefe / 2 + 11), mitte[1] + normal[1] * (tiefe / 2 + 11)],
        durchbruch: milch ? `${MILCH_DURCHBRUCH[pos]}, ${MILCH_WECHSEL[pos]}` : DURCHBRUCH[kiefer][pos],
        wurzeln: milch ? (pos <= 3 ? "eine Wurzel, die sich vor dem Zahnwechsel auflöst" : kiefer === "oben" ? "drei gespreizte Wurzeln; dazwischen wächst der bleibende Zahn" : "zwei gespreizte Wurzeln; dazwischen wächst der bleibende Zahn") : WURZELN[kiefer][pos],
        milch: milch || undefined,
      });
    }
  }
  return zaehne;
}

export const ZAEHNE: Zahn[] = [...bogenZaehne("oben"), ...bogenZaehne("unten")].sort((a, b) => a.fdi - b.fdi);
export const MILCHZAEHNE: Zahn[] = [...bogenZaehne("oben", true), ...bogenZaehne("unten", true)].sort((a, b) => a.fdi - b.fdi);
export const MILCHZAHN_HINWEIS = "Milchzähne halten den Platz für die bleibenden Zähne frei und sind wichtig für Kauen und Sprechen. Ihr Schmelz ist dünner; Karies schreitet deshalb schneller voran und sollte auch am Milchzahn behandelt werden.";
export const zahnNach = (fdi: number | string) => [...ZAEHNE, ...MILCHZAEHNE].find((z) => z.fdi === Number(fdi)) ?? null;
export const zahnKennung = (fdi: number) => String(fdi);
export const zahnTitel = (kennung: string) => {
  const z = zahnNach(kennung);
  return z ? `Zahn ${z.fdi} (${z.name})` : kennung;
};

// ---------------------------------------------------------------- Zahn im Querschnitt
// Zeichenfläche 320 breit, y von -130 (Platz für Instrumente) bis 400.
export const SCHNITT = { x: 0, y: -130, b: 320, h: 530 };

export interface Schicht {
  id: string;
  name: string;
  farbe: string;
  rand: string;
  formen: Form[];
  was: string;
  wennKrank: string;
}

const ZAHNKOERPER: P[] = [[108, 170], [102, 132], [108, 96], [126, 80], [160, 96], [194, 80], [212, 96], [218, 132], [212, 170], [214, 230], [208, 300], [200, 338], [190, 300], [178, 236], [160, 212], [142, 236], [130, 300], [120, 338], [112, 300], [106, 230]];

export const SCHICHTEN: Schicht[] = [
  { id: "kieferknochen", name: "Kieferknochen", farbe: "#EAD9B8", rand: "#A8905F",
    formen: [flaeche([[20, 232], [84, 210], [106, 200], [214, 200], [236, 210], [300, 232], [300, 392], [20, 392]], 0.3)],
    was: "Der Kieferknochen umschließt die Zahnwurzeln. Jede Wurzel sitzt in einem eigenen Knochenfach.",
    wennKrank: "Bei einer Parodontitis baut sich der Knochen um den Zahn ab. Der Zahn verliert Halt und kann sich lockern." },
  { id: "zahnfleisch", name: "Zahnfleisch", farbe: "#EFA3A0", rand: "#B5605E",
    formen: [flaeche([[20, 212], [70, 196], [97, 170], [106, 176], [108, 204], [86, 222], [20, 244]], 0.5), flaeche([[300, 212], [250, 196], [223, 170], [214, 176], [212, 204], [234, 222], [300, 244]], 0.5)],
    was: "Das Zahnfleisch liegt wie eine Manschette um den Zahnhals und dichtet den Kieferknochen gegen die Mundhöhle ab.",
    wennKrank: "Durch Beläge entzündet es sich: Es ist gerötet, geschwollen und blutet beim Putzen (Gingivitis). Das ist umkehrbar, wenn die Beläge entfernt werden." },
  { id: "wurzelhaut", name: "Wurzelhaut", farbe: "#F3C6B4", rand: "#C98670",
    formen: [strich([...ZAHNKOERPER.slice(8), [108, 170]], 6)],
    was: "Die Wurzelhaut besteht aus feinen Fasern, die den Zahn federnd im Knochen aufhängen. Sie meldet dem Gehirn, wie fest man zubeißt.",
    wennKrank: "Ist sie entzündet, fühlt sich der Zahn zu hoch an und schmerzt beim Aufbeißen." },
  { id: "schmelz", name: "Zahnschmelz", farbe: "#FDFBF4", rand: "#B9AE92",
    formen: [flaeche([[99, 174], [86, 132], [94, 84], [120, 59], [160, 80], [200, 59], [226, 84], [234, 132], [221, 174], [160, 150]], 0.6)],
    was: "Der Zahnschmelz überzieht die Zahnkrone. Er ist die härteste Substanz des Körpers und enthält keine Nerven.",
    wennKrank: "Säuren aus Bakterien und aus Getränken lösen ihn auf: Karies beginnt hier, zunächst ohne Schmerzen. Schmelz wächst nicht nach, kann aber durch Fluorid gehärtet werden." },
  { id: "dentin", name: "Zahnbein (Dentin)", farbe: "#F1DFA9", rand: "#B89F58",
    formen: [flaeche(ZAHNKOERPER, 0.6)],
    was: "Das Zahnbein bildet den Hauptteil des Zahns. Es ist weicher als Schmelz und von feinen Kanälchen durchzogen, die zum Zahnnerv führen.",
    wennKrank: "Erreicht Karies das Zahnbein, schreitet sie schneller voran. Liegt Zahnbein frei, reagiert der Zahn empfindlich auf Kaltes, Heißes und Süßes." },
  { id: "pulpa", name: "Zahnmark (Zahnnerv)", farbe: "#E0787B", rand: "#A14347",
    formen: [flaeche([[136, 128], [160, 120], [184, 128], [187, 158], [176, 172], [160, 168], [144, 172], [133, 158]], 0.7)],
    was: "Im Inneren des Zahns liegt das Zahnmark mit Nerven und Blutgefäßen. Es versorgt den Zahn und lässt ihn Reize spüren.",
    wennKrank: "Dringen Bakterien bis hierher vor, entzündet sich das Zahnmark. Das führt zu starken, oft pochenden Schmerzen. Dann hilft meist nur eine Wurzelbehandlung." },
  { id: "wurzelkanal", name: "Wurzelkanäle", farbe: "#E0787B", rand: "#A14347",
    formen: [strich([[146, 166], [130, 250], [121, 330]], 5.5), strich([[174, 166], [190, 250], [199, 330]], 5.5)],
    was: "Durch die Wurzelkanäle ziehen Nerven und Blutgefäße von der Wurzelspitze in das Zahnmark.",
    wennKrank: "Bei einer Wurzelbehandlung werden die Kanäle gereinigt, desinfiziert und dicht gefüllt. So kann der Zahn oft noch viele Jahre erhalten bleiben." },
];

// ---------------------------------------------------------------- Instrumente
export type Material = "metall" | "griff" | "glas" | "licht" | "gummi" | "schlauch" | "marke";
export interface Instrument {
  id: string;
  name: string;
  /** Formen mit der Arbeitsspitze im Ursprung; das Instrument zeigt nach oben. */
  formen: (Form & { material: Material })[];
  /** Einsatzort im Querschnitt und Drehung in Grad */
  ziel: P;
  winkel: number;
  /** Zugehörige Schicht, die hervorgehoben wird */
  schicht?: string;
  wofuer: string;
  gefuehl: string;
}

const m = (f: Form, material: Material) => ({ ...f, material });
const griff = (von: P, bis: P, w = 7.5) => m(strich([von, bis], w), "griff");

export const INSTRUMENTE: Instrument[] = [
  { id: "spiegel", name: "Mundspiegel", ziel: [262, 104], winkel: 28,
    formen: [m(ellipse([0, 0], 14, 14), "metall"), m(ellipse([0, 0], 11, 11), "glas"), m(strich([[9, -10], [13, -36]], 3), "metall"), griff([13, -36], [13, -160])],
    wofuer: "Mit dem Mundspiegel sieht die Zahnärztin oder der Zahnarzt auch Stellen, die sonst verborgen sind. Er hält außerdem Wange und Zunge sanft zur Seite und lenkt Licht auf den Zahn.",
    gefuehl: "Sie spüren nur leichten Druck an Wange oder Zunge. Es tut nicht weh." },
  { id: "sonde", name: "Zahnärztliche Sonde", ziel: [160, 81], winkel: -24, schicht: "schmelz",
    formen: [m(strich([[0, 0], [6, -9], [3, -24], [5, -44]], 1.9), "metall"), griff([5, -44], [5, -165])],
    wofuer: "Mit der feinen Spitze tastet die Praxis die Zahnoberfläche ab. So lassen sich raue Stellen, Ränder von Füllungen und Zahnstein finden.",
    gefuehl: "Sie spüren ein leichtes Kratzen oder Tasten. An einer kariösen Stelle kann es kurz empfindlich sein." },
  { id: "parodontalsonde", name: "Parodontalsonde", ziel: [102, 190], winkel: -8, schicht: "zahnfleisch",
    formen: [m(strich([[0, 0], [0, -42]], 2.6), "metall"), m(strich([[0, -7], [0, -11]], 2.8), "marke"), m(strich([[0, -19], [0, -23]], 2.8), "marke"), m(strich([[0, -42], [8, -58]], 2.6), "metall"), griff([8, -58], [8, -175])],
    wofuer: "Die Sonde hat eine stumpfe Spitze mit Millimeter-Markierung. Damit wird gemessen, wie tief die Zahnfleischtasche zwischen Zahn und Zahnfleisch ist.",
    gefuehl: "Bei gesundem Zahnfleisch spüren Sie nur leichten Druck. Ist das Zahnfleisch entzündet, kann es etwas ziepen und bluten." },
  { id: "spritze", name: "Betäubungsspritze", ziel: [246, 238], winkel: 62, schicht: "zahnfleisch",
    formen: [m(strich([[0, 0], [0, -44]], 1.5), "metall"), m(strich([[0, -44], [0, -118]], 13), "glas"), m(strich([[-12, -118], [12, -118]], 4), "metall"), m(strich([[0, -118], [0, -150]], 4), "metall"), m(ellipse([0, -158], 8, 8), "metall")],
    wofuer: "Die örtliche Betäubung schaltet das Schmerzempfinden am Zahn für ein bis drei Stunden aus. Das Mittel wird langsam neben dem Zahn in das Zahnfleisch gegeben.",
    gefuehl: "Sie spüren einen kurzen Einstich und etwas Druck. Danach werden Zahn, Lippe oder Zunge taub; das Gefühl kehrt von selbst zurück." },
  { id: "bohrer", name: "Bohrer (Winkelstück oder Turbine)", ziel: [140, 71], winkel: -14, schicht: "dentin",
    formen: [m(strich([[0, 0], [0, -11]], 3.4), "marke"), m(block([0, -20], 24, 18), "griff"), m(strich([[10, -21], [60, -40], [150, -74]], 15), "griff")],
    wofuer: "Der kleine, wassergekühlte Bohrer entfernt kariöses Gewebe und formt den Zahn für eine Füllung oder Krone. Nur die erkrankte Substanz wird abgetragen.",
    gefuehl: "Sie hören ein Summen oder Pfeifen und spüren Vibration und Wasser. Mit Betäubung tut es nicht weh. Geben Sie ein Handzeichen, wenn Sie eine Pause brauchen." },
  { id: "sauger", name: "Sauger", ziel: [254, 176], winkel: 20,
    formen: [m(strich([[0, 0], [4, -22], [18, -52], [26, -165]], 10), "schlauch")],
    wofuer: "Der Sauger nimmt Wasser, Speichel und Bohrstaub auf. So bleibt der Zahn trocken und gut sichtbar, und Sie müssen weniger schlucken.",
    gefuehl: "Sie hören ein Schlürfen und spüren einen leichten Sog an Wange oder Zunge." },
  { id: "fuellung", name: "Füllungsinstrument", ziel: [168, 79], winkel: 18, schicht: "schmelz",
    formen: [m(flaeche([[0, 0], [3.4, -6], [2.2, -17], [-2.2, -17], [-3.4, -6]], 0.6), "metall"), m(strich([[0, -17], [5, -42]], 2.3), "metall"), griff([5, -42], [5, -165])],
    wofuer: "Mit dem kleinen Spatel wird das zahnfarbene Füllungsmaterial in den Zahn gebracht und passend geformt.",
    gefuehl: "Sie spüren leichten Druck auf dem Zahn. Zum Schluss beißen Sie auf ein Farbpapier, damit die Höhe der Füllung stimmt." },
  { id: "lampe", name: "Polymerisationslampe", ziel: [160, 56], winkel: 0, schicht: "schmelz",
    formen: [m(flaeche([[-17, 0], [17, 0], [8, -24], [-8, -24]], 0.2), "licht"), m(strich([[0, -24], [0, -36]], 17), "griff"), m(strich([[0, -36], [34, -62], [128, -94]], 17), "griff")],
    wofuer: "Das blaue Licht härtet die Kunststofffüllung in wenigen Sekunden aus. Danach ist der Zahn sofort belastbar.",
    gefuehl: "Sie spüren nichts, höchstens etwas Wärme. Ein Piepton zeigt an, wann die Lampe fertig ist." },
  { id: "ultraschall", name: "Ultraschallgerät (Zahnsteinentferner)", ziel: [96, 168], winkel: -46, schicht: "zahnfleisch",
    formen: [m(strich([[0, 0], [6, -8], [4, -24], [10, -40]], 2.3), "metall"), m(strich([[10, -40], [40, -155]], 14), "griff"), m(ellipse([-6, 5], 1.8, 2.6), "licht"), m(ellipse([-11, -3], 1.6, 2.3), "licht")],
    wofuer: "Die Spitze schwingt sehr schnell und löst Zahnstein und harte Beläge vom Zahn, auch knapp unter dem Zahnfleischrand. Wasser kühlt und spült.",
    gefuehl: "Sie hören ein hohes Summen und spüren Vibration und Wasser. An freiliegenden Zahnhälsen kann es kurz ziehen." },
  { id: "kuerette", name: "Handinstrument (Kürette)", ziel: [221, 190], winkel: 12, schicht: "wurzelhaut",
    formen: [m(strich([[0, 0], [-5, -6], [-2, -19], [2, -42]], 2.3), "metall"), griff([2, -42], [10, -165])],
    wofuer: "Mit der gebogenen Klinge werden Beläge in der Zahnfleischtasche von der Wurzeloberfläche entfernt, zum Beispiel bei einer Parodontitis-Behandlung.",
    gefuehl: "Sie spüren ein Schaben am Zahn. Bei tiefen Taschen wird vorher betäubt." },
  { id: "polierer", name: "Polierkelch", ziel: [89, 120], winkel: -78, schicht: "schmelz",
    formen: [m(flaeche([[-7, 0], [7, 0], [5, -9], [-5, -9]], 0.3), "gummi"), m(block([0, -17], 20, 16), "griff"), m(strich([[8, -19], [60, -40], [150, -74]], 15), "griff")],
    wofuer: "Ein weicher Gummikelch mit Polierpaste glättet die Zahnoberfläche nach der Zahnreinigung. Auf glatten Zähnen haften neue Beläge schlechter.",
    gefuehl: "Es kitzelt und brummt leicht. Viele empfinden es als angenehm." },
  { id: "feile", name: "Wurzelkanalfeile", ziel: [0, 0], winkel: 0, schicht: "wurzelkanal",
    formen: [m(strich([[121, 326], [130, 250], [145, 170], [151, 96], [152, 60]], 2), "metall"), m(strich([[152, 60], [152, 42]], 9), "gummi")],
    wofuer: "Die sehr dünne, biegsame Feile reinigt und erweitert den Wurzelkanal bei einer Wurzelbehandlung. Die Länge wird vorher genau gemessen.",
    gefuehl: "Der Zahn ist betäubt, Sie spüren höchstens leichten Druck. Die Behandlung dauert etwas länger, weil sorgfältig gearbeitet wird." },
  { id: "zange", name: "Zahnzange", ziel: [0, 0], winkel: 0, schicht: "wurzelhaut",
    formen: [m(strich([[104, 166], [84, 120], [92, 60], [140, 10], [156, -10]], 7), "metall"), m(strich([[216, 166], [236, 120], [228, 60], [180, 10], [164, -10]], 7), "metall"), m(ellipse([160, -12], 7, 7), "metall"), griff([156, -10], [176, -112], 10), griff([164, -10], [144, -112], 10)],
    wofuer: "Kann ein Zahn nicht erhalten werden, wird er mit der Zange gefasst und mit ruhigen Drehbewegungen aus seinem Knochenfach gelöst.",
    gefuehl: "Durch die Betäubung spüren Sie keinen Schmerz, aber deutlichen Druck. Das ist normal und kein Zeichen, dass die Betäubung nicht wirkt." },
];

export const instrumentNach = (id: string) => INSTRUMENTE.find((i) => i.id === id) ?? null;
