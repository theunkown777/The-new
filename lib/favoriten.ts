// Vorschlag-Favoriten: häufige Kombinationen der Praxis („Check-up mit Labor“), mit einem Klick in einen
// neuen Vorschlag übernommen. Gespeichert wird nur die Auswahl, nichts über Patienten.
import { z } from "zod";

export const MAX_FAVORITEN = 12;

export const favoritSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(2, "Bitte einen Namen mit mindestens 2 Zeichen eingeben").max(60),
  fach: z.string().max(40),
  /** Zahnmedizin: Befunde je Zahn und allgemeine Befunde */
  teeth: z.record(z.string().max(4), z.string().max(40)).default({}),
  globals: z.array(z.string().max(40)).max(20).default([]),
  /** Übrige Fächer: gewählte Anlässe */
  anlaesse: z.array(z.string().max(80)).max(30).default([]),
  choices: z.record(z.string().max(120), z.string().max(80)).default({}),
});
export type Favorit = z.infer<typeof favoritSchema>;

/** Gespeicherte Favoriten lesen; Unlesbares wird weggelassen. */
export function favoritenLesen(roh: unknown): Favorit[] {
  if (!Array.isArray(roh)) return [];
  return roh.flatMap((x) => { const p = favoritSchema.safeParse(x); return p.success ? [p.data] : []; }).slice(0, MAX_FAVORITEN);
}

/** Favorit hinzufügen oder (bei gleichem Namen im selben Fach) ersetzen. */
export function favoritSetzen(liste: Favorit[], neu: Favorit): { ok: true; liste: Favorit[] } | { ok: false; fehler: string } {
  const ohne = liste.filter((f) => !(f.fach === neu.fach && f.name.toLowerCase() === neu.name.toLowerCase()) && f.id !== neu.id);
  if (ohne.length >= MAX_FAVORITEN) return { ok: false, fehler: `Es sind höchstens ${MAX_FAVORITEN} Favoriten möglich. Bitte zuerst einen löschen.` };
  if (!Object.keys(neu.teeth).length && !neu.globals.length && !neu.anlaesse.length) return { ok: false, fehler: "Der Vorschlag ist noch leer." };
  return { ok: true, liste: [...ohne, neu] };
}

export const favoritenFuerFach = (liste: Favorit[], fach: string) => liste.filter((f) => f.fach === fach).sort((a, b) => a.name.localeCompare(b.name, "de"));
