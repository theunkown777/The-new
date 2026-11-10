// Welches Modell passt zu welcher Fachrichtung? Jede Praxis sieht zuerst das Modell ihres Fachs
// (z. B. Augenarzt das Auge, Kardiologie den Körper mit Organen), weitere passende Modelle daneben.

import type { Ebene } from "./koerper";
import type { SchnittId } from "./schnitt";

export type ModellId = "gebiss" | "koerper" | SchnittId;
export const MODELL_IDS: ModellId[] = ["gebiss", "koerper", "auge", "ohr", "haut"];
export const MODELL_NAMEN: Record<ModellId, string> = { gebiss: "Gebiss", koerper: "Körper", auge: "Auge", ohr: "Ohr", haut: "Haut" };

export interface FachModelle {
  /** Modelle der Praxis; das erste ist das Hauptmodell */
  modelle: ModellId[];
  /** Ebenen, die im Körpermodell zu Beginn eingeblendet sind */
  ebenen: Ebene[];
  /** Vorauswahl im Körpermodell, wenn das Fach nur ein Geschlecht behandelt */
  geschlecht?: "W" | "M";
}

const BEWEGUNG: Ebene[] = ["knochen", "muskeln", "sehnen"];
const ORGANE: Ebene[] = ["knochen", "organe"];

export const FACH_MODELLE: Record<string, FachModelle> = {
  zahn: { modelle: ["gebiss", "koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"] },
  hausarzt: { modelle: ["koerper", "haut", "ohr", "auge"], ebenen: ORGANE },
  kinder: { modelle: ["koerper", "ohr", "haut", "gebiss"], ebenen: ORGANE },
  augen: { modelle: ["auge", "koerper"], ebenen: ORGANE },
  optik: { modelle: ["auge"], ebenen: ORGANE },
  haut: { modelle: ["haut", "koerper"], ebenen: ["knochen", "organe"] },
  aesthetik: { modelle: ["haut", "koerper"], ebenen: ["knochen", "muskeln"] },
  hno: { modelle: ["ohr", "koerper"], ebenen: ORGANE },
  hoerakustik: { modelle: ["ohr"], ebenen: ORGANE },
  logo: { modelle: ["ohr", "koerper"], ebenen: ["knochen", "organe", "nerven"] },
  gyn: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "W" },
  hebamme: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "W" },
  uro: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "M" },
  kardio: { modelle: ["koerper"], ebenen: ORGANE },
  gastro: { modelle: ["koerper"], ebenen: ORGANE },
  pneumo: { modelle: ["koerper"], ebenen: ORGANE },
  endo: { modelle: ["koerper"], ebenen: ORGANE },
  radiologie: { modelle: ["koerper"], ebenen: ORGANE },
  neuro: { modelle: ["koerper"], ebenen: ["knochen", "nerven"] },
  psych: { modelle: ["koerper"], ebenen: ["knochen", "organe", "nerven"] },
  ortho: { modelle: ["koerper"], ebenen: BEWEGUNG },
  chirurgie: { modelle: ["koerper", "haut"], ebenen: BEWEGUNG },
  physio: { modelle: ["koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"] },
  ergo: { modelle: ["koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"] },
  podo: { modelle: ["koerper", "haut"], ebenen: BEWEGUNG },
  sanitaetshaus: { modelle: ["koerper"], ebenen: BEWEGUNG },
  pflege: { modelle: ["koerper", "haut"], ebenen: ORGANE },
  apotheke: { modelle: ["koerper", "haut"], ebenen: ORGANE },
  heilpraktiker: { modelle: ["koerper", "haut"], ebenen: ["knochen", "organe", "muskeln"] },
  klinik: { modelle: ["koerper", "haut", "auge", "ohr"], ebenen: ORGANE },
};
const STANDARD: FachModelle = { modelle: ["koerper", "haut", "auge", "ohr"], ebenen: ORGANE };

export const modelleFuerFach = (fach: string | null | undefined): FachModelle => FACH_MODELLE[fach || "zahn"] ?? STANDARD;
export const hauptModell = (fach: string | null | undefined): ModellId => modelleFuerFach(fach).modelle[0];

/** Was die Fachseite der Website über das Modell sagt. */
export const MODELL_WERBUNG: Record<ModellId, { titel: string; text: string }> = {
  gebiss: { titel: "Das Gebiss als Modell", text: "Alle Zähne, das Milchgebiss, der Aufbau eines Zahns und die Instrumente der Praxis. Sie zeigen am Bildschirm, was gemacht wird, und markieren den Zahn für den Patientenlink." },
  koerper: { titel: "Der Körper als Modell", text: "Organe, Knochen, Muskeln, Sehnen und Nerven zum Hineinzoomen, passend zu Ihrem Fach voreingestellt. Sie zeigen, wo das Problem sitzt, und markieren die Stelle für den Patientenlink." },
  auge: { titel: "Das Auge als Modell", text: "Hornhaut, Linse, Netzhaut, Makula und Sehnerv im Schnitt. Sie zeigen, wo Grauer Star, Glaukom oder Makuladegeneration entstehen, und markieren die Stelle für den Patientenlink." },
  ohr: { titel: "Das Ohr als Modell", text: "Gehörgang, Trommelfell, Gehörknöchelchen, Hörschnecke und Gleichgewichtsorgan im Schnitt. Sie zeigen, wo Hörminderung, Schwindel oder Mittelohrentzündung entstehen." },
  haut: { titel: "Die Haut als Modell", text: "Oberhaut, Lederhaut und Unterhaut mit Haarwurzel, Drüsen, Gefäßen und Pigmentzellen. Sie zeigen, wo Akne, Ekzeme oder Hautkrebs entstehen." },
};
