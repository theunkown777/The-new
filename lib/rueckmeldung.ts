import { z } from "zod";

// Eine Frage nach dem Termin („Wie zufrieden waren Sie mit Ihrem Besuch?“) im Patientenportal.
// Grundsätze:
//  - Die Antwort gehört zum Termin, erscheint aber nirgends mit Namen: kein Eintrag im Eingang, keine Markierung
//    am Patienten. Die Praxis sieht nur Durchschnitt, Verteilung und Texte mit Datum, und erst ab fünf Antworten.
//  - Der Hinweis auf die öffentliche Bewertung erscheint nach dem Absenden bei ALLEN, unabhängig von der Stufe.
//    Nach zufrieden/unzufrieden zu filtern oder eine Belohnung zu versprechen wäre unzulässig und geschieht nicht.

export const STUFEN = [1, 2, 3, 4, 5] as const;
export const RUECKMELDUNG_TAGE = 14;
export const AUSWERTUNG_TAGE = 90;
export const AUSWERTUNG_MINDESTENS = 5;
export const RUECKMELDUNG_TEXT_MAX = 300;

export const rueckmeldungSchema = z.object({
  appointmentId: z.string().min(1).max(60),
  stufe: z.number().int().min(1).max(5),
  text: z.string().trim().max(RUECKMELDUNG_TEXT_MAX).optional(),
});

/** Zeitfenster, in dem ein erschienener Termin die Frage auslöst: die letzten 14 Tage. */
export const fensterAb = (now = new Date()) => new Date(now.getTime() - RUECKMELDUNG_TAGE * 864e5);

/** Der jüngste erschienene Termin der letzten 14 Tage ohne Antwort; sonst null. */
export function offenerTermin<T extends { status: string; start: Date; rueckmeldung?: unknown | null }>(termine: T[], now = new Date()): T | null {
  const ab = fensterAb(now);
  return (
    termine
      .filter((t) => t.status === "ERSCHIENEN" && t.start <= now && t.start >= ab && !t.rueckmeldung)
      .sort((a, b) => b.start.getTime() - a.start.getTime())[0] ?? null
  );
}

const GOOGLE_HOSTS = ["google.com", "g.page", "maps.app.goo.gl"];
export const GOOGLE_PROFIL_HINWEIS = "Bitte den Link zu Ihrem Google-Profil eintragen: https://… auf google.com, g.page oder maps.app.goo.gl.";

/**
 * Prüft den Link zum Google-Profil der Praxis streng: nur https, nur google.com (samt Unterseiten wie
 * www.google.com oder maps.google.com), g.page und maps.app.goo.gl; keine Zugangsdaten, kein Port.
 * Leer ist erlaubt (kein Hinweis). Gibt die bereinigte Adresse zurück oder null, wenn sie nicht zulässig ist.
 */
export function googleProfilUrl(roh: unknown): { ok: true; url: string | null } | { ok: false } {
  if (roh == null) return { ok: true, url: null };
  if (typeof roh !== "string") return { ok: false };
  const text = roh.trim();
  if (!text) return { ok: true, url: null };
  if (text.length > 300 || /[\s<>"'`\\]/.test(text) || !/^https:\/\//i.test(text)) return { ok: false };
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { ok: false };
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || u.port) return { ok: false };
  if (!GOOGLE_HOSTS.some((h) => host === h || (h !== "maps.app.goo.gl" && host.endsWith(`.${h}`)))) return { ok: false };
  return { ok: true, url: u.toString() };
}

/** Der gespeicherte Link, noch einmal geprüft, bevor er einem Patienten gezeigt wird. */
export const gepruefterGoogleLink = (gespeichert: string | null | undefined): string | null => {
  const r = googleProfilUrl(gespeichert);
  return r.ok ? r.url : null;
};

export type RueckmeldungAuswertung =
  | { genug: false; anzahl: number; mindestens: number; tage: number }
  | { genug: true; anzahl: number; mindestens: number; tage: number; durchschnitt: number; verteilung: [number, number, number, number, number]; texte: { datum: string; text: string }[] };

/**
 * Auswertung für die Praxis: Antworten der letzten 90 Tage. Unter fünf Antworten gibt es nur die Anzahl, damit
 * niemand aus einzelnen Antworten auf einzelne Patienten schließt. Texte kommen mit Datum, ohne Namen und ohne Stufe.
 */
export function auswertung(antworten: { stufe: number; text: string | null; createdAt: Date }[], now = new Date()): RueckmeldungAuswertung {
  const ab = new Date(now.getTime() - AUSWERTUNG_TAGE * 864e5);
  const a = antworten.filter((x) => x.createdAt >= ab && x.createdAt <= now && x.stufe >= 1 && x.stufe <= 5);
  const basis = { anzahl: a.length, mindestens: AUSWERTUNG_MINDESTENS, tage: AUSWERTUNG_TAGE };
  if (a.length < AUSWERTUNG_MINDESTENS) return { genug: false, ...basis };
  const verteilung: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const x of a) verteilung[x.stufe - 1]++;
  return {
    genug: true,
    ...basis,
    durchschnitt: Math.round((a.reduce((s, x) => s + x.stufe, 0) / a.length) * 10) / 10,
    verteilung,
    texte: a
      .filter((x) => x.text?.trim())
      .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
      .map((x) => ({ datum: x.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }), text: x.text!.trim() })),
  };
}
