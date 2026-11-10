// Kalenderdateien im iCalendar-Format (ICS, RFC 5545) lesen und schreiben.
//
// Lesen: Aus dem Kalender der Praxis (Google, Outlook, Apple, viele Praxisprogramme) werden nur
// die belegten Zeiten übernommen: Beginn und Ende. Titel, Orte, Namen und Notizen werden nicht
// gelesen und nicht gespeichert. Serientermine (RRULE) werden für den gefragten Zeitraum aufgelöst.
// Schreiben: Termine aus Sorrida als Kalender-Abo für die Praxis, ohne Patientennamen.

export interface Belegung {
  start: Date;
  ende: Date;
  uid: string | null;
  /** Ganztägig (Feiertag, Urlaub, Praxis geschlossen) */
  ganztag: boolean;
}

// Windows-Zeitzonennamen aus Outlook/Exchange auf IANA-Namen
const WINDOWS_ZONEN: Record<string, string> = {
  "W. Europe Standard Time": "Europe/Berlin", "Central Europe Standard Time": "Europe/Budapest", "Central European Standard Time": "Europe/Warsaw",
  "Romance Standard Time": "Europe/Paris", "GMT Standard Time": "Europe/London", "Greenwich Standard Time": "Atlantic/Reykjavik", "UTC": "UTC",
  "E. Europe Standard Time": "Europe/Chisinau", "FLE Standard Time": "Europe/Kiev", "GTB Standard Time": "Europe/Bucharest", "Turkey Standard Time": "Europe/Istanbul",
  "Russian Standard Time": "Europe/Moscow", "Eastern Standard Time": "America/New_York", "Central Standard Time": "America/Chicago", "Pacific Standard Time": "America/Los_Angeles",
};
const STANDARD_ZONE = "Europe/Berlin";

function zone(tzid: string | undefined): string {
  if (!tzid) return STANDARD_ZONE;
  const z = WINDOWS_ZONEN[tzid] ?? tzid.replace(/^\/?(freeassociation\.sourceforge\.net|mozilla\.org\/\d+_\d+)\//, "");
  try { new Intl.DateTimeFormat("en-US", { timeZone: z }); return z; } catch { return STANDARD_ZONE; }
}

/** Abstand der Zeitzone zu UTC in Minuten zum Zeitpunkt d. */
function versatzMin(d: Date, tz: string): number {
  const t = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d).map((p) => [p.type, Number(p.value)]));
  return Math.round((Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) - d.getTime()) / 60000);
}

/** Uhrzeit an einem Ort (Wanduhr) in einen Zeitpunkt umrechnen; berücksichtigt Sommer- und Winterzeit. */
export function ortszeit(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, tz = STANDARD_ZONE): Date {
  const roh = Date.UTC(y, mo - 1, d, h, mi, s);
  const erste = roh - versatzMin(new Date(roh), tz) * 60000;
  return new Date(roh - versatzMin(new Date(erste), tz) * 60000);
}

type Zeit = { datum: Date; ganztag: boolean; tz: string; lokal: [number, number, number, number, number, number]; utc: boolean };

function zeitLesen(wert: string, params: Record<string, string>): Zeit | null {
  const m = wert.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)];
  const ganztag = params.VALUE === "DATE" || m[4] === undefined;
  const tz = zone(params.TZID);
  const utc = !!m[7];
  const datum = utc ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : ortszeit(y, mo, d, h, mi, s, ganztag ? STANDARD_ZONE : tz);
  if (Number.isNaN(datum.getTime())) return null;
  return { datum, ganztag, tz: ganztag ? STANDARD_ZONE : utc ? "UTC" : tz, lokal: [y, mo, d, h, mi, s], utc };
}

function dauerLesen(wert: string): number | null {
  const m = wert.trim().match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const ms = ((Number(m[2] ?? 0) * 7 + Number(m[3] ?? 0)) * 86400 + Number(m[4] ?? 0) * 3600 + Number(m[5] ?? 0) * 60 + Number(m[6] ?? 0)) * 1000;
  return m[1] === "-" ? null : ms;
}

/** Zeilen entfalten (Fortsetzungszeilen beginnen mit Leerzeichen oder Tab) und in Name, Parameter, Wert zerlegen. */
function zeilen(text: string): { name: string; params: Record<string, string>; wert: string }[] {
  const entfaltet = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "");
  const out: { name: string; params: Record<string, string>; wert: string }[] = [];
  for (const z of entfaltet.split("\n")) {
    const i = z.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/); // erster Doppelpunkt außerhalb von Anführungszeichen
    if (i <= 0) continue;
    const [name, ...ps] = z.slice(0, i).split(";");
    const params: Record<string, string> = {};
    for (const p of ps) { const j = p.indexOf("="); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, ""); }
    out.push({ name: name.toUpperCase(), params, wert: z.slice(i + 1) });
  }
  return out;
}

const TAGE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MAX_WIEDERHOLUNGEN = 1500;

/** Starttermine einer Serie im Fenster [von, bis]. Unterstützt DAILY, WEEKLY (BYDAY), MONTHLY (gleicher Tag), YEARLY mit INTERVAL, COUNT, UNTIL. */
function serie(start: Zeit, regel: string, von: Date, bis: Date): Date[] {
  const r = Object.fromEntries(regel.split(";").map((t) => t.split("=").map((x) => x.trim().toUpperCase())).filter((t) => t.length === 2)) as Record<string, string>;
  const freq = r.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return [start.datum];
  const intervall = Math.max(1, Number(r.INTERVAL ?? 1) || 1);
  const anzahl = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? zeitLesen(r.UNTIL, {})?.datum ?? null : null;
  const grenze = until && until < bis ? new Date(until.getTime() + (r.UNTIL.length === 8 ? 86399999 : 0)) : bis;
  const [y, mo, d, h, mi, s] = start.lokal;
  const tz = start.utc ? "UTC" : start.tz;
  // Wanduhrzeit bleibt über die Zeitumstellung gleich
  const am = (jahr: number, monat: number, tag: number) => ortszeit(jahr, monat, tag, h, mi, s, tz);
  const basis = new Date(Date.UTC(y, mo - 1, d));
  const out: Date[] = [];
  let gezaehlt = 0;
  const nimm = (dt: Date) => {
    if (dt < start.datum) return true;
    gezaehlt++;
    if (gezaehlt > anzahl || dt > grenze) return false;
    if (dt >= von) out.push(dt);
    return true;
  };
  if (freq === "WEEKLY") {
    const wochentage = (r.BYDAY ? r.BYDAY.split(",").map((t) => TAGE.indexOf(t.replace(/^[+-]?\d+/, ""))).filter((n) => n >= 0) : [basis.getUTCDay()]).sort((a, b) => a - b);
    const wkst = Math.max(0, TAGE.indexOf(r.WKST ?? "MO"));
    const wochenAnfang = new Date(basis.getTime() - ((basis.getUTCDay() - wkst + 7) % 7) * 864e5);
    for (let w = 0; w < MAX_WIEDERHOLUNGEN; w += intervall) {
      const tage = wochentage.map((wt) => new Date(wochenAnfang.getTime() + (w * 7 + ((wt - wkst + 7) % 7)) * 864e5)).sort((a, b) => a.getTime() - b.getTime());
      for (const t of tage) if (!nimm(am(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()))) return out;
      if (tage[0] && am(tage[0].getUTCFullYear(), tage[0].getUTCMonth() + 1, tage[0].getUTCDate()) > grenze) break;
    }
    return out;
  }
  for (let i = 0; i < MAX_WIEDERHOLUNGEN; i++) {
    const n = i * intervall;
    let dt: Date;
    if (freq === "DAILY") { const t = new Date(basis.getTime() + n * 864e5); dt = am(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
    else if (freq === "MONTHLY") { const t = new Date(Date.UTC(y, mo - 1 + n, 1)); if (new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate() < d) continue; dt = am(t.getUTCFullYear(), t.getUTCMonth() + 1, d); }
    else { if (mo === 2 && d === 29 && new Date(Date.UTC(y + n, 2, 0)).getUTCDate() < 29) continue; dt = am(y + n, mo, d); }
    if (!nimm(dt)) break;
  }
  return out;
}

/**
 * Belegte Zeiten aus einer ICS-Datei im Fenster [von, bis]. Abgesagte Termine und Termine,
 * die als „frei“ markiert sind (TRANSP:TRANSPARENT), zählen nicht.
 */
export function belegungenAusIcs(text: string, von: Date, bis: Date): Belegung[] {
  const out: Belegung[] = [];
  type Roh = { start?: Zeit; ende?: Zeit; dauer?: number | null; rrule?: string; exdate: number[]; status?: string; transp?: string; uid?: string; recurrenceId?: Zeit | null };
  let e: Roh | null = null;
  const fertige: Roh[] = [];
  let tiefe = 0;
  for (const z of zeilen(text)) {
    if (z.name === "BEGIN" && z.wert.trim().toUpperCase() === "VEVENT") { e = { exdate: [] }; tiefe = 0; continue; }
    if (!e) continue;
    if (z.name === "BEGIN") { tiefe++; continue; } // z. B. VALARM im Termin
    if (z.name === "END" && z.wert.trim().toUpperCase() !== "VEVENT") { tiefe = Math.max(0, tiefe - 1); continue; }
    if (z.name === "END") { fertige.push(e); e = null; continue; }
    if (tiefe > 0) continue;
    if (z.name === "DTSTART") e.start = zeitLesen(z.wert, z.params) ?? undefined;
    else if (z.name === "DTEND") e.ende = zeitLesen(z.wert, z.params) ?? undefined;
    else if (z.name === "DURATION") e.dauer = dauerLesen(z.wert);
    else if (z.name === "RRULE") e.rrule = z.wert.trim();
    else if (z.name === "EXDATE") for (const w of z.wert.split(",")) { const t = zeitLesen(w, z.params); if (t) e.exdate.push(t.datum.getTime()); }
    else if (z.name === "STATUS") e.status = z.wert.trim().toUpperCase();
    else if (z.name === "TRANSP") e.transp = z.wert.trim().toUpperCase();
    else if (z.name === "UID") e.uid = z.wert.trim().slice(0, 200);
    else if (z.name === "RECURRENCE-ID") e.recurrenceId = zeitLesen(z.wert, z.params);
  }
  // Einzelne geänderte oder abgesagte Vorkommen einer Serie ersetzen das Original an diesem Tag
  const ausnahmen = new Map<string, Set<number>>();
  for (const f of fertige) if (f.uid && f.recurrenceId) { if (!ausnahmen.has(f.uid)) ausnahmen.set(f.uid, new Set()); ausnahmen.get(f.uid)!.add(f.recurrenceId.datum.getTime()); }

  for (const f of fertige) {
    if (!f.start || f.status === "CANCELLED" || f.transp === "TRANSPARENT") continue;
    const ganztag = f.start.ganztag;
    const dauer = f.ende ? f.ende.datum.getTime() - f.start.datum.getTime() : f.dauer ?? (ganztag ? 864e5 : 0);
    if (dauer <= 0 || dauer > 400 * 864e5) continue;
    const starts = f.rrule && !f.recurrenceId ? serie(f.start, f.rrule, new Date(von.getTime() - dauer), bis) : [f.start.datum];
    const weg = f.uid && !f.recurrenceId ? ausnahmen.get(f.uid) : undefined;
    for (const s of starts) {
      if (f.exdate.includes(s.getTime()) || weg?.has(s.getTime())) continue;
      const ende = new Date(s.getTime() + dauer);
      if (ende <= von || s >= bis) continue;
      out.push({ start: s, ende, uid: f.uid ?? null, ganztag });
      if (out.length >= 5000) return out;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const z2 = (n: number) => String(n).padStart(2, "0");
const utcStempel = (d: Date) => `${d.getUTCFullYear()}${z2(d.getUTCMonth() + 1)}${z2(d.getUTCDate())}T${z2(d.getUTCHours())}${z2(d.getUTCMinutes())}${z2(d.getUTCSeconds())}Z`;
const maskieren = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Zeilen über 75 Zeichen umbrechen (Fortsetzung mit Leerzeichen). */
const falten = (z: string) => z.length <= 74 ? z : (z.match(/.{1,73}/g) ?? [z]).join("\r\n ");

/** Kalender-Abo aus Terminen. Bewusst ohne Patientennamen: Kalenderdienste lesen den Link auf ihren Servern. */
export function icsSchreiben(name: string, termine: { id: string; start: Date; minutes: number; titel: string; ort?: string | null; abgesagt?: boolean; geaendert?: Date }[], jetzt = new Date()): string {
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sorrida//Termine//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", falten(`X-WR-CALNAME:${maskieren(name)}`), "X-WR-TIMEZONE:Europe/Berlin"];
  for (const t of termine) {
    out.push("BEGIN:VEVENT", `UID:${t.id}@sorrida`, `DTSTAMP:${utcStempel(t.geaendert ?? jetzt)}`, `DTSTART:${utcStempel(t.start)}`, `DTEND:${utcStempel(new Date(t.start.getTime() + t.minutes * 60000))}`,
      falten(`SUMMARY:${maskieren(t.titel)}`), ...(t.ort ? [falten(`LOCATION:${maskieren(t.ort)}`)] : []), `STATUS:${t.abgesagt ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT");
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n") + "\r\n";
}
