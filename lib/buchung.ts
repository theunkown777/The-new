import { z } from "zod";
import { ortszeit } from "@/lib/ics";

// Online-Terminbuchung: Patienten sehen nur Zeiten, die wirklich frei sind. Frei ist ein
// Zeitfenster, wenn es in der Sprechzeit liegt, kein bundesweiter Feiertag ist und weniger
// Termine (aus Sorrida und aus dem übertragenen Praxiskalender) darin liegen, als die Praxis
// Behandlungsplätze hat. Ganztägige Einträge im Praxiskalender (Urlaub, Fortbildung) sperren
// den ganzen Tag.

const UHR = /^([01]\d|2[0-3]):[0-5]\d$/;
const fenster = z.tuple([z.string().regex(UHR), z.string().regex(UHR)]).refine(([a, b]) => a < b, "Ende muss nach dem Beginn liegen");
/** Sprechzeiten je Wochentag: 1 = Montag … 7 = Sonntag; je Tag bis zu vier Zeitfenster. */
export const sprechzeitenSchema = z.record(z.enum(["1", "2", "3", "4", "5", "6", "7"]), z.array(fenster).max(4));
export type Sprechzeiten = z.infer<typeof sprechzeitenSchema>;

export const STANDARD_SPRECHZEITEN: Sprechzeiten = {
  "1": [["08:00", "12:00"], ["14:00", "17:00"]],
  "2": [["08:00", "12:00"], ["14:00", "17:00"]],
  "3": [["08:00", "12:00"]],
  "4": [["08:00", "12:00"], ["14:00", "18:00"]],
  "5": [["08:00", "12:00"]],
};
export const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export const buchungSchema = z.object({
  buchungAktiv: z.boolean(),
  sprechzeiten: sprechzeitenSchema,
  buchungMinuten: z.number().int().min(5).max(120),
  buchungVorlaufStd: z.number().int().min(0).max(14 * 24),
  buchungTageVoraus: z.number().int().min(1).max(90),
});

export const sprechzeitenLesen = (wert: unknown): Sprechzeiten => {
  const p = sprechzeitenSchema.safeParse(wert);
  return p.success && Object.values(p.data).some((t) => t?.length) ? p.data : STANDARD_SPRECHZEITEN;
};

/** Bundesweite gesetzliche Feiertage (regionale Feiertage trägt die Praxis im Kalender ein). */
export function feiertage(jahr: number): Map<string, string> {
  // Ostersonntag nach Gauß
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  const ostern = Date.UTC(jahr, monat - 1, tag);
  const rel = (n: number) => new Date(ostern + n * 864e5).toISOString().slice(0, 10);
  return new Map([
    [`${jahr}-01-01`, "Neujahr"], [rel(-2), "Karfreitag"], [rel(1), "Ostermontag"], [`${jahr}-05-01`, "Tag der Arbeit"], [rel(39), "Christi Himmelfahrt"],
    [rel(50), "Pfingstmontag"], [`${jahr}-10-03`, "Tag der Deutschen Einheit"], [`${jahr}-12-25`, "1. Weihnachtstag"], [`${jahr}-12-26`, "2. Weihnachtstag"],
  ]);
}

const tagBerlin = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

export interface FreierTag { tag: string; zeiten: string[] }

export interface FreieZeitenEingabe {
  sprechzeiten: Sprechzeiten;
  minuten: number;
  vorlaufStd: number;
  tageVoraus: number;
  /** Behandlungsplätze, die gleichzeitig belegt sein können */
  plaetze: number;
  /** Termine aus Sorrida (ohne abgesagte) */
  termine: { start: Date; minutes: number }[];
  /** Belegte Zeiten aus dem übertragenen Praxiskalender */
  belegungen: { start: Date; ende: Date; ganztag?: boolean }[];
  jetzt?: Date;
}

/** Freie Zeitfenster je Tag als ISO-Zeitpunkte (UTC), aufsteigend. */
export function freieZeiten(e: FreieZeitenEingabe): FreierTag[] {
  const jetzt = e.jetzt ?? new Date();
  const fruehestens = jetzt.getTime() + e.vorlaufStd * 3600e3;
  const plaetze = Math.max(1, e.plaetze);
  const dauer = e.minuten * 60000;
  const belegt = [
    ...e.termine.map((t) => ({ von: t.start.getTime(), bis: t.start.getTime() + t.minutes * 60000, alles: false })),
    // Ganztägig oder 20 Stunden und länger: Praxis geschlossen, unabhängig von der Zahl der Plätze
    ...e.belegungen.map((b) => ({ von: b.start.getTime(), bis: b.ende.getTime(), alles: !!b.ganztag || b.ende.getTime() - b.start.getTime() >= 20 * 3600e3 })),
  ].sort((a, b) => a.von - b.von);
  const out: FreierTag[] = [];
  const heute = tagBerlin(jetzt);
  const [y, m, d] = heute.split("-").map(Number);
  for (let i = 0; i <= e.tageVoraus; i++) {
    const datum = new Date(Date.UTC(y, m - 1, d + i, 12));
    const tag = datum.toISOString().slice(0, 10);
    if (feiertage(datum.getUTCFullYear()).has(tag)) continue;
    const wochentag = String(((datum.getUTCDay() + 6) % 7) + 1) as keyof Sprechzeiten;
    const zeiten: string[] = [];
    for (const [von, bis] of e.sprechzeiten[wochentag] ?? []) {
      const [vh, vm] = von.split(":").map(Number), [bh, bm] = bis.split(":").map(Number);
      const start = ortszeit(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate(), vh, vm).getTime();
      const ende = ortszeit(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate(), bh, bm).getTime();
      for (let t = start; t + dauer <= ende; t += dauer) {
        if (t < fruehestens) continue;
        let gleichzeitig = 0, gesperrt = false;
        for (const b of belegt) {
          if (b.von >= t + dauer) break;
          if (b.bis <= t) continue;
          if (b.alles) { gesperrt = true; break; }
          gleichzeitig++;
        }
        if (!gesperrt && gleichzeitig < plaetze) zeiten.push(new Date(t).toISOString());
      }
    }
    if (zeiten.length) out.push({ tag, zeiten });
  }
  return out;
}

/** Ist genau dieses Zeitfenster (noch) frei? Wird beim Buchen erneut geprüft. */
export const istFrei = (e: FreieZeitenEingabe, startIso: string) => freieZeiten(e).some((t) => t.zeiten.includes(new Date(startIso).toISOString()));

export const buchenSchema = z.object({
  start: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Ungültiger Zeitpunkt"),
  anlass: z.string().trim().max(80).optional().default(""),
});

export const tagName = (tag: string) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const uhr = (iso: string | Date) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
