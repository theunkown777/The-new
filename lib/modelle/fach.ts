// Welches Modell passt zu welcher Fachrichtung? Jede Praxis sieht zuerst das Modell ihres Fachs
// (z. B. Augenarzt das Auge, Kardiologie den Körper mit Organen), weitere passende Modelle daneben.
// „Immer nur das Nötigste“: Im Körpermodell sieht ein Fach zuerst nur sein Organ (fokus).

import type { Ebene } from "./koerper";
import type { SchnittId } from "./schnitt";
import type { FokusId } from "./fokus";

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
  /** Im Körpermodell zuerst nur dieses Organ bzw. diesen Bereich zeigen */
  fokus?: FokusId;
}

const BEWEGUNG: Ebene[] = ["knochen", "muskeln", "sehnen"];
const ORGANE: Ebene[] = ["knochen", "organe"];

export const FACH_MODELLE: Record<string, FachModelle> = {
  zahn: { modelle: ["gebiss", "koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"], fokus: "kopf" },
  hausarzt: { modelle: ["koerper", "haut", "ohr", "auge"], ebenen: ORGANE },
  kinder: { modelle: ["koerper", "ohr", "haut", "gebiss"], ebenen: ORGANE },
  augen: { modelle: ["auge", "koerper"], ebenen: ORGANE, fokus: "auge" },
  optik: { modelle: ["auge"], ebenen: ORGANE, fokus: "auge" },
  haut: { modelle: ["haut", "koerper"], ebenen: ["knochen", "organe"] },
  aesthetik: { modelle: ["haut", "koerper"], ebenen: ["knochen", "muskeln"] },
  hno: { modelle: ["ohr", "koerper"], ebenen: ORGANE, fokus: "hno" },
  hoerakustik: { modelle: ["ohr"], ebenen: ORGANE, fokus: "hno" },
  logo: { modelle: ["ohr", "koerper"], ebenen: ["knochen", "organe", "nerven"], fokus: "hno" },
  gyn: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "W", fokus: "becken" },
  hebamme: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "W", fokus: "becken" },
  uro: { modelle: ["koerper"], ebenen: ORGANE, geschlecht: "M", fokus: "harnwege" },
  kardio: { modelle: ["koerper"], ebenen: ORGANE, fokus: "herz" },
  gastro: { modelle: ["koerper"], ebenen: ORGANE, fokus: "verdauung" },
  pneumo: { modelle: ["koerper"], ebenen: ORGANE, fokus: "lunge" },
  endo: { modelle: ["koerper"], ebenen: ORGANE },
  radiologie: { modelle: ["koerper"], ebenen: ORGANE },
  neuro: { modelle: ["koerper"], ebenen: ["knochen", "nerven"], fokus: "gehirn" },
  psych: { modelle: ["koerper"], ebenen: ["knochen", "organe", "nerven"], fokus: "gehirn" },
  ortho: { modelle: ["koerper"], ebenen: BEWEGUNG },
  chirurgie: { modelle: ["koerper", "haut"], ebenen: BEWEGUNG },
  physio: { modelle: ["koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"] },
  ergo: { modelle: ["koerper"], ebenen: ["knochen", "muskeln", "sehnen", "nerven"] },
  podo: { modelle: ["koerper", "haut"], ebenen: BEWEGUNG, fokus: "fuss" },
  sanitaetshaus: { modelle: ["koerper"], ebenen: BEWEGUNG },
  pflege: { modelle: ["koerper", "haut"], ebenen: ORGANE },
  apotheke: { modelle: ["koerper", "haut"], ebenen: ORGANE },
  heilpraktiker: { modelle: ["koerper", "haut"], ebenen: ["knochen", "organe", "muskeln"] },
  klinik: { modelle: ["koerper", "haut", "auge", "ohr"], ebenen: ORGANE },
};
const STANDARD: FachModelle = { modelle: ["koerper", "haut", "auge", "ohr"], ebenen: ORGANE };

export const modelleFuerFach = (fach: string | null | undefined): FachModelle => FACH_MODELLE[fach || "zahn"] ?? STANDARD;
export const hauptModell = (fach: string | null | undefined): ModellId => modelleFuerFach(fach).modelle[0];
/** Organ bzw. Bereich, den das Körpermodell dieses Fachs zuerst allein zeigt (null = ganzer Körper). */
export const fokusFuerFach = (fach: string | null | undefined): FokusId | null => modelleFuerFach(fach).fokus ?? null;

/** Was die Fachseite der Website über das Modell sagt. */
export const MODELL_WERBUNG: Record<ModellId, { titel: string; text: string }> = {
  gebiss: { titel: "Das Gebiss als Modell", text: "Die Kamera fährt vom Gesicht durch die Lippen in den Mund: Ober- und Unterkiefer, echte Zähne, Zunge und Gaumen. Dazu das Milchgebiss, der Aufbau eines Zahns und die Instrumente der Praxis. Sie markieren den Zahn für den Patientenlink." },
  koerper: { titel: "Der Körper als Modell", text: "Ein Körper aus echten anatomischen Daten: erst die Haut, dann Muskeln, Organe, Skelett und Nerven, Ebene für Ebene. Ihr Fach sieht zuerst nur sein Organ. Sie zeigen, wo das Problem sitzt, und markieren die Stelle für den Patientenlink." },
  auge: { titel: "Das Auge als Modell", text: "Hornhaut, Linse, Netzhaut, Makula und Sehnerv im Schnitt. Sie zeigen, wo Grauer Star, Glaukom oder Makuladegeneration entstehen, und markieren die Stelle für den Patientenlink." },
  ohr: { titel: "Das Ohr als Modell", text: "Gehörgang, Trommelfell, Gehörknöchelchen, Hörschnecke und Gleichgewichtsorgan im Schnitt. Sie zeigen, wo Hörminderung, Schwindel oder Mittelohrentzündung entstehen." },
  haut: { titel: "Die Haut als Modell", text: "Oberhaut, Lederhaut und Unterhaut mit Haarwurzel, Drüsen, Gefäßen und Pigmentzellen. Sie zeigen, wo Akne, Ekzeme oder Hautkrebs entstehen." },
};
