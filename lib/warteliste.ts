import { z } from "zod";
import { terminZeit } from "@/lib/termine";

// Warteliste: Wer früher kommen möchte, steht hier. Wird ein Termin abgesagt, schlägt Sorrida
// bis zu zwei passende Personen vor. Angeboten wird die Zeit erst, wenn jemand in der Praxis
// klickt und den Text selbst verschickt; Sorrida verschickt nichts von allein.

export const WARTE_ZEITEN = ["VORMITTAG", "NACHMITTAG"] as const;
export type WarteZeit = (typeof WARTE_ZEITEN)[number];
export const WARTE_ZEIT_LABEL: Record<WarteZeit, string> = { VORMITTAG: "vormittags", NACHMITTAG: "nachmittags" };

const TAG = /^\d{4}-\d{2}-\d{2}$/;
const echterTag = (v: string) => {
  if (!TAG.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};
const tagFeld = z.string().trim().refine(echterTag, "Bitte ein gültiges Datum wählen.").optional().nullable().or(z.literal(""));

export const wartelisteSchema = z
  .object({
    patientId: z.string().min(1).max(40),
    anlass: z.string().trim().min(2, "Bitte einen Anlass eintragen.").max(120),
    vonTag: tagFeld,
    bisTag: tagFeld,
    zeit: z.enum(WARTE_ZEITEN).optional().nullable().or(z.literal("")),
    notiz: z.string().trim().max(300).optional().nullable(),
  })
  .strict()
  .refine((d) => !d.vonTag || !d.bisTag || d.vonTag <= d.bisTag, "„Bis“ muss nach „Ab“ liegen.");

/** Kalendertag in Berlin ("JJJJ-MM-TT") und Stunde eines Zeitpunkts. */
export const tagBerlin = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const stundeBerlin = (d: Date) => Number(d.toLocaleTimeString("de-DE", { hour: "2-digit", hour12: false, timeZone: "Europe/Berlin" }).slice(0, 2));

/** Ein Tag ohne Uhrzeit wird als Mitternacht UTC gespeichert (wie das Geburtsdatum). */
export const tagAlsDatum = (tag: string | null | undefined): Date | null => (tag ? new Date(`${tag}T00:00:00Z`) : null);
export const datumAlsTag = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);

/** Vormittag endet um 12 Uhr Ortszeit. */
export const tageszeit = (start: Date): WarteZeit => (stundeBerlin(start) < 12 ? "VORMITTAG" : "NACHMITTAG");

export interface WarteEintrag {
  id: string;
  patientId: string;
  vonTag: Date | null;
  bisTag: Date | null;
  zeit: string | null;
  createdAt: Date;
  erledigtAt: Date | null;
}

/** Passt der Eintrag zu dieser frei gewordenen Zeit? */
export function passt(e: WarteEintrag, termin: { start: Date; patientId?: string | null }): boolean {
  if (e.erledigtAt) return false;
  // Wer gerade selbst abgesagt hat, bekommt dieselbe Zeit nicht wieder angeboten.
  if (termin.patientId && e.patientId === termin.patientId) return false;
  const tag = tagBerlin(termin.start);
  const von = datumAlsTag(e.vonTag), bis = datumAlsTag(e.bisTag);
  if (von && tag < von) return false;
  if (bis && tag > bis) return false;
  if (e.zeit && e.zeit !== tageszeit(termin.start)) return false;
  return true;
}

/**
 * Bis zu `max` passende Einträge für eine frei gewordene Zeit. Wer am längsten wartet, steht vorn;
 * je Patient höchstens ein Eintrag.
 */
export function passende<T extends WarteEintrag>(eintraege: T[], termin: { start: Date; patientId?: string | null }, max = 2): T[] {
  const gesehen = new Set<string>();
  const out: T[] = [];
  for (const e of [...eintraege].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1))) {
    if (!passt(e, termin) || gesehen.has(e.patientId)) continue;
    gesehen.add(e.patientId);
    out.push(e);
    if (out.length >= max) break;
  }
  return out;
}

/** Wunsch als kurzer Satz für die Liste, z. B. „ab 20.11. · vormittags“. */
export function wunschText(e: { vonTag: Date | null; bisTag: Date | null; zeit: string | null }): string {
  const kurz = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const teile: string[] = [];
  if (e.vonTag && e.bisTag) teile.push(`${kurz(e.vonTag)} bis ${kurz(e.bisTag)}`);
  else if (e.vonTag) teile.push(`ab ${kurz(e.vonTag)}`);
  else if (e.bisTag) teile.push(`bis ${kurz(e.bisTag)}`);
  if (e.zeit === "VORMITTAG" || e.zeit === "NACHMITTAG") teile.push(WARTE_ZEIT_LABEL[e.zeit]);
  return teile.length ? teile.join(" · ") : "jederzeit";
}

/**
 * Nachricht an eine Person von der Warteliste. Ohne Anlass und ohne Befund: nur die freie Zeit
 * und der persönliche Link. `onlineBuchbar`: Die Zeit lässt sich über den Link selbst buchen.
 */
export function angebotText(a: { firstName: string; practiceName: string; start: Date; ort?: string | null; url: string; onlineBuchbar: boolean }): string {
  const ort = a.ort ? ` (${a.ort})` : "";
  const weiter = a.onlineBuchbar
    ? `Wenn Sie die Zeit möchten, buchen Sie sie bitte hier: ${a.url} Wer zuerst bucht, bekommt den Termin.`
    : `Wenn Sie die Zeit möchten, melden Sie sich bitte kurz bei uns. Ihr persönlicher Link: ${a.url}`;
  return `Hallo ${a.firstName}, bei ${a.practiceName}${ort} ist ein Termin frei geworden: ${terminZeit(a.start)} Uhr. ${weiter} Bitte geben Sie den Link nicht weiter.`;
}
