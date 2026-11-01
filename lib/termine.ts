import { z } from "zod";

// Termine und Auslastung. Termine werden in Sorrida eingetragen; eine
// Übernahme aus der Praxissoftware gibt es noch nicht. Bestätigungen und
// Erinnerungen entstehen als Text zum Versenden (SMS, Messenger, Mail);
// Sorrida verschickt sie nicht selbst, solange kein Versanddienst angebunden ist.

export const TERMIN_STATUS = ["GEPLANT", "BESTAETIGT", "ERSCHIENEN", "ABGESAGT", "NICHT_ERSCHIENEN"] as const;
export type TerminStatus = (typeof TERMIN_STATUS)[number];

export const STATUS_LABEL: Record<TerminStatus, string> = {
  GEPLANT: "Geplant",
  BESTAETIGT: "Bestätigt",
  ERSCHIENEN: "Erschienen",
  ABGESAGT: "Abgesagt",
  NICHT_ERSCHIENEN: "Nicht erschienen",
};

export const STATUS_CLS: Record<TerminStatus, string> = {
  GEPLANT: "bg-slate-100 text-slate-700",
  BESTAETIGT: "bg-salbei-100 text-salbei-800",
  ERSCHIENEN: "bg-emerald-100 text-emerald-800",
  ABGESAGT: "bg-slate-100 text-slate-500 line-through",
  NICHT_ERSCHIENEN: "bg-red-100 text-red-800",
};

export const terminSchema = z.object({
  patientId: z.string().min(1).max(40),
  locationId: z.string().max(40).optional().nullable(),
  start: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Ungültiges Datum"),
  minutes: z.number().int().min(5).max(480).default(30),
  reason: z.string().trim().min(2).max(120),
});

export const terminActionSchema = z.object({
  status: z.enum(TERMIN_STATUS).optional(),
  /** "bestaetigung" | "erinnerung": Text wurde verschickt, Zeitpunkt merken. */
  gesendet: z.enum(["bestaetigung", "erinnerung"]).optional(),
});

export const standortSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(160).optional().nullable(),
  rooms: z.number().int().min(1).max(50),
  minutesPerDay: z.number().int().min(60).max(24 * 60),
});

const berlin = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", ...o });
export const terminZeit = (d: Date) => berlin(d, { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
export const uhrzeit = (d: Date) => berlin(d, { hour: "2-digit", minute: "2-digit" });

export function bestaetigungText(a: { firstName: string; practiceName: string; start: Date; ort: string | null; reason: string }): string {
  return `Hallo ${a.firstName}, Ihr Termin bei ${a.practiceName}${a.ort ? ` (${a.ort})` : ""} ist eingetragen: ${terminZeit(a.start)} Uhr, ${a.reason}. Falls Sie nicht kommen können, sagen Sie bitte rechtzeitig ab, dann kann jemand anderes nachrücken.`;
}

export function erinnerungText(a: { firstName: string; practiceName: string; start: Date; ort: string | null }): string {
  return `Hallo ${a.firstName}, kurze Erinnerung an Ihren Termin bei ${a.practiceName}${a.ort ? ` (${a.ort})` : ""} am ${terminZeit(a.start)} Uhr. Bitte bringen Sie Ihre Versichertenkarte mit. Absagen bitte telefonisch.`;
}

/** Termine, die belegt sind (abgesagte zählen nicht). */
export const belegt = (s: string) => s !== "ABGESAGT";

/**
 * Auslastung eines Tages: gebuchte Minuten durch Kapazität (Behandlungsplätze
 * mal Sprechzeit). Ohne Standorte wird ein Platz mit 8 Stunden angenommen
 * und das auch so gesagt.
 */
export function auslastung(
  termine: { minutes: number; status: string; locationId: string | null }[],
  standorte: { id: string; rooms: number; minutesPerDay: number }[],
  locationId?: string | null,
): { prozent: number; gebucht: number; kapazitaet: number; angenommen: boolean } {
  const relevante = standorte.filter((s) => !locationId || s.id === locationId);
  const angenommen = relevante.length === 0;
  const kapazitaet = angenommen ? 480 : relevante.reduce((a, s) => a + s.rooms * s.minutesPerDay, 0);
  const gebucht = termine
    .filter((t) => belegt(t.status) && (!locationId || t.locationId === locationId))
    .reduce((a, t) => a + t.minutes, 0);
  return { prozent: kapazitaet ? Math.round((gebucht / kapazitaet) * 100) : 0, gebucht, kapazitaet, angenommen };
}

/** Ausfallquote der letzten Wochen: nicht erschienen / (erschienen + nicht erschienen). */
export function ausfallquote(termine: { status: string }[]): number | null {
  const e = termine.filter((t) => t.status === "ERSCHIENEN").length;
  const n = termine.filter((t) => t.status === "NICHT_ERSCHIENEN").length;
  return e + n >= 5 ? Math.round((n / (e + n)) * 100) : null;
}

/** Tagesgrenzen in deutscher Zeit für einen Tag im Format JJJJ-MM-TT. */
export function tagesGrenzen(tag: string): { von: Date; bis: Date } {
  const [y, m, d] = tag.split("-").map(Number);
  // Mittag UTC liegt sicher im gewünschten Kalendertag; Offset Berlin bestimmen.
  const mittag = new Date(Date.UTC(y, m - 1, d, 12));
  const offsetH = Number(mittag.toLocaleString("en-US", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false })) - 12;
  const von = new Date(Date.UTC(y, m - 1, d, 0 - offsetH));
  return { von, bis: new Date(von.getTime() + 864e5) };
}

export const heuteTag = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
