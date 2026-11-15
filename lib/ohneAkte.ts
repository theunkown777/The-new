// Schnellvorschlag ohne Akte: Die Praxis legt nur ein Kürzel an (kein Name, kein Geburtsdatum).
// Im Datensatz steht das Kürzel als Nachname und dieser feste Text als Vorname, damit Listen
// „K-1511-3, ohne Akte“ zeigen. In Texten an den Patienten wird der Vorname weggelassen.
import { z } from "zod";

export const OHNE_AKTE = "ohne Akte";

export const istOhneAkte = (p: { firstName: string; ohneAkte?: boolean | null }) => !!p.ohneAkte || p.firstName === OHNE_AKTE;

/** Vorname für Texte an den Patienten: leer, wenn es keine Akte gibt. */
export const vornameFuerText = (firstName: string | null | undefined) => (firstName && firstName !== OHNE_AKTE ? firstName : "");

/** „Hallo Anna“ bzw. nur „Hallo“, wenn kein Name bekannt ist. */
export const anrede = (gruss: string, firstName: string | null | undefined) => {
  const v = vornameFuerText(firstName);
  return v ? `${gruss} ${v}` : gruss;
};

/** Name für das Schreiben: leer ohne Akte. */
export const nameFuerSchreiben = (p: { firstName: string; lastName: string; ohneAkte?: boolean | null }) => (istOhneAkte(p) ? "" : `${p.firstName} ${p.lastName}`);

/** Kürzel: 2 bis 24 Zeichen, Buchstaben, Ziffern, Punkt, Bindestrich, Leerzeichen. Kein Name gedacht. */
export const kuerzelSchema = z
  .string()
  .trim()
  .min(2, "Bitte ein Kürzel mit mindestens 2 Zeichen eingeben")
  .max(24, "Das Kürzel darf höchstens 24 Zeichen haben")
  .regex(/^[A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9 .\-]*$/, "Im Kürzel sind nur Buchstaben, Ziffern, Punkt und Bindestrich erlaubt");

/** Vorschlag für das nächste Kürzel des Tages, z. B. „K-1511-3“. */
export function kuerzelVorschlag(heute: Date, schonHeute: number): string {
  const [tag, monat] = heute.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" }).split(".");
  return `K-${tag}${monat}-${schonHeute + 1}`;
}
