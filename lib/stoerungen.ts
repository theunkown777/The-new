// Störungen im Betrieb von Sorrida, von Hand gepflegt. Die öffentliche Seite /status zeigt diese Liste.
//
// So trägt man eine Störung ein (siehe auch docs/BETRIEB.md):
//   { datum: "2026-12-03", beginn: "09:40", dauerMinuten: 35, was: "Anmeldung nicht möglich", ursache: "Datenbank nicht erreichbar", behoben: true }
// Regeln: Datum als JJJJ-MM-TT, Uhrzeit in deutscher Zeit, Dauer in Minuten (0, solange sie noch läuft, dann behoben: false).
// In „was“ und „ursache“ stehen nie Namen von Praxen oder Personen und keine Patientendaten.
// Neue Einträge oben anfügen. Eine Störung wird nicht gelöscht, auch wenn sie unangenehm ist.

export interface Stoerung {
  /** Tag der Störung, JJJJ-MM-TT */
  datum: string;
  /** Beginn in deutscher Zeit, HH:MM (optional) */
  beginn?: string;
  /** Dauer in Minuten; 0, solange die Störung läuft */
  dauerMinuten: number;
  /** Was nicht ging, in einem Satz, für Praxen verständlich */
  was: string;
  /** Ursache, sobald sie bekannt ist */
  ursache?: string;
  behoben: boolean;
}

/** Seit diesem Tag werden Störungen aufgezeichnet. */
export const AUFZEICHNUNG_SEIT = "2026-11-15";

export const STOERUNGEN: Stoerung[] = [];

/** "2026-11-15" → "15.11.2026" */
export function datumDe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Dauer in Worten: 35 → "35 Minuten", 90 → "1 Stunde 30 Minuten", 0 → "läuft noch". */
export function dauerText(minuten: number): string {
  if (!Number.isFinite(minuten) || minuten <= 0) return "läuft noch";
  const m = Math.round(minuten);
  const h = Math.floor(m / 60), rest = m % 60;
  const stunden = h ? `${h} ${h === 1 ? "Stunde" : "Stunden"}` : "";
  const min = rest ? `${rest} ${rest === 1 ? "Minute" : "Minuten"}` : "";
  return [stunden, min].filter(Boolean).join(" ");
}

/** Neueste zuerst; Einträge mit falschem Datum oder ohne Text fallen heraus (damit die Seite nie bricht). */
export function stoerungenSortiert(liste: Stoerung[] = STOERUNGEN): Stoerung[] {
  return liste
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.datum) && s.was.trim().length > 0)
    .slice()
    .sort((a, b) => `${b.datum} ${b.beginn ?? ""}`.localeCompare(`${a.datum} ${a.beginn ?? ""}`));
}

/** Satz für die Seite, wenn nichts eingetragen ist. */
export function keineStoerungSatz(seit: string = AUFZEICHNUNG_SEIT): string {
  return `Seit dem Start der Aufzeichnung am ${datumDe(seit)} ist keine Störung eingetragen.`;
}
