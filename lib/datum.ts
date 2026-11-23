// Datum und Uhrzeit immer in Berliner Zeit. Der Server kann in UTC laufen (z. B. auf Vercel); ohne feste
// Zeitzone erscheint dort zwischen 0 und 2 Uhr Berliner Zeit der Vortag. Gilt für echte Zeitpunkte
// (createdAt, Fälligkeit, Ablauf eines Links). Reine Kalendertage um 00:00 UTC brauchen das nicht.

export const ZEITZONE = "Europe/Berlin";

type Zeitpunkt = Date | string | number;

/** Datum in Berliner Zeit, z. B. „23.11.2026“. `locale` für übersetzte Seiten. */
export function datumDE(d: Zeitpunkt, opts: Intl.DateTimeFormatOptions = {}, locale = "de-DE"): string {
  return new Date(d).toLocaleDateString(locale, { ...opts, timeZone: ZEITZONE });
}

/** Uhrzeit in Berliner Zeit, z. B. „14:05“. */
export function uhrzeitDE(d: Zeitpunkt, opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }, locale = "de-DE"): string {
  return new Date(d).toLocaleTimeString(locale, { ...opts, timeZone: ZEITZONE });
}
