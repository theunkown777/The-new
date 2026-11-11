// „Immer nur das Nötigste“: Jede Fachrichtung sieht im Körpermodell zuerst nur ihr Organ
// (Lungenarzt die Lunge, Kardiologie das Herz …). Der ganze Körper bleibt über einen Schalter erreichbar.
import type { DateiId, Stufe } from "./drei/anatomie";

export type FokusId = "lunge" | "herz" | "verdauung" | "harnwege" | "becken" | "gehirn" | "auge" | "hno" | "mund" | "kopf" | "fuss";

export interface Fokus {
  id: FokusId;
  /** Überschrift, z. B. „Lunge und Atemwege“ */
  name: string;
  /** Dateien, die geladen werden */
  dateien: DateiId[];
  /** Nur diese Strukturen (Kennung ohne Seite) und benannten Teile; leer = alles aus den Dateien */
  strukturen?: string[];
  /** Nur Teile, deren Mitte in dieser Höhe liegt (mm, Szenenkoordinaten) */
  hoehe?: [number, number];
  /** Stufe, die beim Umschalten auf den ganzen Körper gezeigt wird */
  stufe: Stufe;
  /** Leichte Bewegung, wenn das Organ allein gezeigt wird */
  bewegung?: "atmen" | "schlagen";
  /** Ehrlicher Hinweis, was die freien Daten nicht enthalten */
  hinweis?: string;
}

export const FOKUS: Record<FokusId, Fokus> = {
  lunge: { id: "lunge", name: "Lunge und Atemwege", dateien: ["lunge"], stufe: "organe", bewegung: "atmen",
    hinweis: "Bronchien, Lungengefäße und Zwerchfell stammen aus echten Daten. Die Lungenhülle ist aus dem Verlauf dieser Bronchien und Gefäße berechnet, weil die freien Daten keine Lungenoberfläche enthalten." },
  herz: { id: "herz", name: "Herz und große Gefäße", dateien: ["herz"], stufe: "organe", bewegung: "schlagen" },
  verdauung: { id: "verdauung", name: "Verdauungsorgane", dateien: ["verdauung"], stufe: "organe" },
  harnwege: { id: "harnwege", name: "Nieren und Harnwege", dateien: ["harnwege"], stufe: "organe" },
  becken: { id: "becken", name: "Becken", dateien: ["skelett", "harnwege", "verdauung"], strukturen: ["becken", "kreuzbein", "lws", "harnblase", "harnleiter", "dickdarm", "niere", "deko:Beckenvenen", "deko:Beckenarterien"], hoehe: [-140, 120], stufe: "organe",
    hinweis: "Gebärmutter und Eierstöcke sind in den frei verfügbaren 3D-Daten nicht enthalten (Datensatz eines Mannes). Sie sind im Schema eingezeichnet." },
  gehirn: { id: "gehirn", name: "Gehirn und Nerven", dateien: ["gehirn", "nerven"], stufe: "nerven",
    hinweis: "Rückenmark und Nerven in Armen und Beinen fehlen in den freien 3D-Daten; sie sind im Schema eingezeichnet." },
  auge: { id: "auge", name: "Augen", dateien: ["auge"], stufe: "organe" },
  hno: { id: "hno", name: "Ohr, Nase und Kehlkopf", dateien: ["hno"], stufe: "organe",
    hinweis: "Mittel- und Innenohr sind in den freien 3D-Daten nicht enthalten. Sie sind im Modell „Ohr“ im Schnitt zu sehen." },
  mund: { id: "mund", name: "Mund, Kiefer und Zähne", dateien: ["mund"], stufe: "skelett", hinweis: "Zähne, Kiefer, Zunge und Gaumen stammen aus anatomischen Scandaten. Die Weisheitszähne sind als Kopie des Nachbarzahns ergänzt; der Kaumuskel fehlt in den freien Daten." },
  kopf: { id: "kopf", name: "Kopf und Kiefer", dateien: ["skelett", "muskeln"], hoehe: [520, 900], stufe: "skelett" },
  fuss: { id: "fuss", name: "Fuß und Unterschenkel", dateien: ["skelett", "muskeln", "sehnen"], hoehe: [-900, -480], stufe: "skelett" },
};

/** Passt ein Teil (Kennung oder „deko:Name“, Mitte in mm) zum Fokus? */
export function imFokus(f: Fokus, name: string | null, mitteY: number | null): boolean {
  if (f.hoehe && mitteY !== null && (mitteY < f.hoehe[0] || mitteY > f.hoehe[1])) return false;
  if (!f.strukturen) return true;
  if (!name) return false;
  return f.strukturen.includes(name) || f.strukturen.includes(name.split(":")[0]);
}

// ------------------------------------------------------------------ Erklärpunkte am ganzen Menschen
/** Themen der großen Erklärungsansicht (components/modelle/erklaerung/ErklaerAnsicht.tsx) */
export type Thema = "auge" | "ohr" | "lunge" | "herz" | "muskeln" | "mund" | "haut" | "skelett" | "verdauung" | "niere" | "gehirn";

export interface Erklaerpunkt {
  thema: Thema;
  name: string;
  /** Lage auf der Haut (mm, Szenenkoordinaten) und Richtung, in die der Punkt schaut */
  pos: [number, number, number];
  normal: [number, number, number];
  /** Wie nah die Kamera heranfährt (Radius des Ausschnitts in mm) und von welcher Seite (0 = von vorn) */
  radius: number;
  theta?: number;
  /** Was nach dem Heranfahren allein gezeigt wird: ein Organ (Fokus) oder eine Ebene */
  fokus?: FokusId;
  stufe?: Stufe;
}

export const ERKLAERPUNKTE: Erklaerpunkt[] = [
  { thema: "gehirn", name: "Gehirn", pos: [0, 815, 74], normal: [0, 0.5, 0.85], radius: 130, fokus: "gehirn" },
  { thema: "auge", name: "Auge", pos: [-33, 738, 69], normal: [0, 0, 1], radius: 80, fokus: "auge" },
  { thema: "ohr", name: "Ohr", pos: [-69, 712, -5], normal: [-1, 0, 0], radius: 120, theta: -Math.PI / 2, fokus: "hno" },
  { thema: "mund", name: "Mund und Zähne", pos: [0, 668, 88], normal: [0, 0, 1], radius: 95, fokus: "mund" },
  { thema: "lunge", name: "Lunge", pos: [-75, 470, 108], normal: [0, 0, 1], radius: 240, fokus: "lunge" },
  { thema: "herz", name: "Herz", pos: [30, 405, 124], normal: [0, 0, 1], radius: 170, fokus: "herz" },
  { thema: "verdauung", name: "Magen und Darm", pos: [25, 200, 107], normal: [0, 0, 1], radius: 330, fokus: "verdauung" },
  { thema: "niere", name: "Niere", pos: [80, 255, 96], normal: [0.3, 0, 0.95], radius: 260, fokus: "harnwege" },
  { thema: "muskeln", name: "Muskeln", pos: [-90, -150, 73], normal: [0, 0, 1], radius: 520, stufe: "muskeln" },
  { thema: "skelett", name: "Knochen", pos: [85, -420, 32], normal: [0, 0, 1], radius: 520, stufe: "skelett" },
  { thema: "haut", name: "Haut", pos: [-240, 150, 24], normal: [-0.4, 0, 0.9], radius: 170, stufe: "haut" },
];

/** Welche Erklärpunkte ein Fach sieht: nur seine eigenen; ohne Fach (Website, Allgemeinmedizin) alle. */
const FACH_THEMEN: Record<string, Thema[]> = {
  pneumo: ["lunge"], kardio: ["herz"], gastro: ["verdauung"], uro: ["niere"], neuro: ["gehirn"], psych: ["gehirn"],
  augen: ["auge"], hno: ["ohr"], logo: ["ohr", "mund"], zahn: ["mund"], haut: ["haut"], aesthetik: ["haut", "muskeln"],
  ortho: ["skelett", "muskeln"], chirurgie: ["skelett", "muskeln", "haut"], physio: ["muskeln", "skelett"], ergo: ["muskeln", "skelett"], podo: ["skelett", "muskeln"],
  gyn: ["niere"], hebamme: ["niere"],
};
export const erklaerpunkteFuerFach = (fach?: string | null): Erklaerpunkt[] => {
  const t = fach ? FACH_THEMEN[fach] : undefined;
  return t ? ERKLAERPUNKTE.filter((p) => t.includes(p.thema)) : ERKLAERPUNKTE;
};
