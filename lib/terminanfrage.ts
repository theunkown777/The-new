import crypto from "crypto";
import { z } from "zod";
import { signaturSecret } from "@/lib/geheimnis";
import { gleichSicher } from "@/lib/gleichSicher";
import { terminZeit } from "@/lib/termine";

// Terminbuchung für neue Patienten über die öffentliche Seite /t/<kennung>.
// Es entsteht zuerst nur eine Anfrage (Terminanfrage). Patient und Termin legt Sorrida erst an,
// wenn die Praxis bestätigt. Die gewünschte Zeit ist 24 Stunden reserviert. Die öffentliche
// Schnittstelle verrät nie, ob es jemanden schon als Patienten gibt: Der Abgleich mit dem
// Bestand geschieht erst in der Praxis.

export const RESERVIERUNG_STD = 24;
export const ANFRAGE_LOESCHEN_TAGE = 30;
/** Mindestzeit zwischen Seitenaufruf und Absenden (Schutz vor Automaten) */
export const MIN_SEKUNDEN = 4;
/** So lange gilt eine geöffnete Seite, danach bitte neu laden */
export const STEMPEL_MAX_STD = 6;
export const LIMIT_IP_STUNDE = 5;
export const LIMIT_PRAXIS_TAG = 40;
/**
 * Ab so vielen offenen Anfragen mit derselben Mobilnummer oder E-Mail sieht die Praxis einen Hinweis an der Anfrage.
 * Nach außen wird das nicht gemeldet: Die Buchungsseite verrät nie, ob es zu Kontaktdaten schon Anfragen gibt.
 */
export const MAX_OFFEN_JE_KONTAKT = 2;

export const ANFRAGE_STATUS = ["OFFEN", "BESTAETIGT", "ABGELEHNT"] as const;
export type AnfrageStatus = (typeof ANFRAGE_STATUS)[number];

// --- Kennung der Buchungsseite ---

/** Zufällige Kennung, 16 Zeichen (96 Bit), nicht erratbar. */
export const neueKennung = () => crypto.randomBytes(12).toString("base64url");
export const kennungGueltig = (k: string) => /^[A-Za-z0-9_-]{12,40}$/.test(k);

// --- Anlässe, die neue Patienten wählen können ---

export const STANDARD_ANLAESSE = ["Erster Termin", "Beratung", "Kontrolle oder Vorsorge", "Akute Beschwerden"];
export const anlaesseSchema = z.array(z.string().trim().min(2, "Ein Anlass ist zu kurz.").max(60, "Ein Anlass ist zu lang (höchstens 60 Zeichen).")).min(1, "Bitte mindestens einen Anlass eintragen.").max(12, "Bitte höchstens 12 Anlässe.");

export function anlaesseLesen(wert: unknown): string[] {
  const p = anlaesseSchema.safeParse(wert);
  if (!p.success) return STANDARD_ANLAESSE;
  const liste = Array.from(new Set(p.data.map((a) => a.replace(/\s+/g, " "))));
  return liste.length ? liste : STANDARD_ANLAESSE;
}

// --- Zeitstempel der Seite: belegt, wann das Formular geladen wurde ---

const sig = (s: string) => crypto.createHmac("sha256", signaturSecret()).update(`terminanfrage:${s}`).digest("base64url");

/** Signierter Stempel, den die Seite beim Laden bekommt und beim Absenden mitschickt. */
export function stempel(kennung: string, now = Date.now()): string {
  return `${now}.${sig(`${kennung}.${now}`)}`;
}

export type StempelErgebnis = "ok" | "zu-schnell" | "abgelaufen" | "ungueltig";

export function stempelPruefen(wert: string | null | undefined, kennung: string, now = Date.now()): StempelErgebnis {
  if (!wert) return "ungueltig";
  const [zeit, s, ...rest] = wert.split(".");
  if (rest.length || !/^\d{10,16}$/.test(zeit ?? "") || !s) return "ungueltig";
  const soll = sig(`${kennung}.${zeit}`);
  if (!gleichSicher(soll, s)) return "ungueltig";
  const alter = now - Number(zeit);
  if (alter < 0) return "ungueltig";
  if (alter < MIN_SEKUNDEN * 1000) return "zu-schnell";
  if (alter > STEMPEL_MAX_STD * 3600e3) return "abgelaufen";
  return "ok";
}

/**
 * Schlüssel, unter dem ein verwendeter Stempel gemerkt wird (lib/rateLimit.ts): Jeder Stempel gilt für genau
 * eine gespeicherte Anfrage. Wer mehrere Anfragen stellt, muss die Seite jedes Mal neu laden und die Mindestzeit abwarten.
 */
export const stempelSchluessel = (wert: string) => `neuanfrage-stempel:${crypto.createHash("sha256").update(wert).digest("hex").slice(0, 32)}`;

// --- Eingaben des Anmeldenden ---

// Namen: Buchstaben aller Sprachen, Leerzeichen, Bindestrich, Apostroph, Punkt. Keine Ziffern, keine Adressen.
const NAME = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;
const name = (feld: string) =>
  z.string().trim().min(2, `Bitte Ihren ${feld} eintragen.`).max(60, `Der ${feld} ist zu lang.`).regex(NAME, `Der ${feld} enthält Zeichen, die nicht in einen Namen gehören.`);

const echterTag = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const ziffern = (s: string) => s.replace(/\D/g, "").length;

export const anfrageSchema = z
  .object({
    vorname: name("Vornamen"),
    nachname: name("Nachnamen"),
    geburtsdatum: z
      .string()
      .trim()
      .refine(echterTag, "Bitte Ihr Geburtsdatum vollständig eintragen.")
      .refine((v) => !echterTag(v) || (Number(v.slice(0, 4)) >= 1900 && new Date(`${v}T00:00:00Z`).getTime() <= Date.now()), "Das Geburtsdatum ist nicht möglich."),
    mobil: z
      .string()
      .trim()
      .max(30, "Die Mobilnummer ist zu lang.")
      .refine((v) => !v || (/^[+0-9 ()/-]+$/.test(v) && ziffern(v) >= 7 && ziffern(v) <= 15), "Die Mobilnummer ist nicht vollständig.")
      .optional()
      .default(""),
    email: z
      .string()
      .trim()
      .max(200, "Die E-Mail-Adresse ist zu lang.")
      .refine((v) => !v || z.string().email().safeParse(v).success, "Die E-Mail-Adresse ist nicht gültig.")
      .optional()
      .default(""),
    anlass: z.string().trim().min(2, "Bitte einen Anlass wählen.").max(60),
    start: z.string().max(40).refine((s) => !Number.isNaN(Date.parse(s)), "Bitte eine Zeit wählen."),
    datenschutz: z.literal(true, { error: "Bitte bestätigen Sie, dass Sie die Datenschutzhinweise gelesen haben." }),
    /** Verstecktes Feld: Menschen lassen es leer, Automaten füllen es aus. */
    website: z.string().max(300).optional().default(""),
    /** Zeitstempel der Seite (stempel) */
    stempel: z.string().max(200),
  })
  .strict()
  .refine((d) => !!d.mobil || !!d.email, { message: "Bitte eine Mobilnummer oder eine E-Mail-Adresse eintragen, damit die Praxis Sie erreicht.", path: ["mobil"] });

export type AnfrageEingabe = z.infer<typeof anfrageSchema>;

/** Ausgefülltes Lockfeld: Die Anfrage kommt von einem Automaten. */
export const lockfeldGefuellt = (d: { website?: string }) => !!d.website && d.website.trim().length > 0;

/** Geburtsdatum als Mitternacht UTC des Kalendertags (wie Patient.birthDate). */
export const geburtstag = (tag: string) => new Date(`${tag}T00:00:00Z`);

export const sauber = (s: string) => s.replace(/\s+/g, " ").trim();

// --- Reservierung ---

export const reserviertBis = (now = new Date()) => new Date(now.getTime() + RESERVIERUNG_STD * 3600e3);

/** Reserviert die Anfrage ihre Zeit noch? Nur offene Anfragen, deren Frist läuft. */
export const istReserviert = (a: { status: string; reserviertBis: Date }, now = new Date()) => a.status === "OFFEN" && a.reserviertBis.getTime() > now.getTime();

/** Reservierte Zeiten als belegte Termine für die Frei-Berechnung (lib/buchung.ts). */
export function reservierungen<T extends { start: Date; minutes: number; status: string; reserviertBis: Date }>(anfragen: T[], now = new Date()): { start: Date; minutes: number }[] {
  return anfragen.filter((a) => istReserviert(a, now)).map((a) => ({ start: a.start, minutes: a.minutes }));
}

// --- Abgleich mit vorhandenen Patienten (nur in der Praxis, nie öffentlich) ---

/** Namen vergleichbar machen: klein, Umlaute ausgeschrieben, ohne Akzente, Leerzeichen und Bindestriche. */
export function namensSchluessel(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "");
}
const ersterVorname = (s: string) => namensSchluessel(s.trim().split(/[\s-]+/)[0] ?? "");
const tagVon = (d: Date) => d.toISOString().slice(0, 10);

export interface AbgleichPatient { id: string; firstName: string; lastName: string; birthDate: Date | null }

/**
 * Vorhandene Patienten, die zur Anfrage passen: gleiches Geburtsdatum und gleicher Nachname,
 * dazu gleicher Vorname oder gleicher erster Vorname („Anna“ und „Anna Maria“).
 * Genaue Treffer stehen vorn. Ohne Geburtsdatum in der Akte gibt es keinen Treffer.
 */
export function patientAbgleich<T extends AbgleichPatient>(anfrage: { firstName: string; lastName: string; birthDate: Date }, patienten: T[]): T[] {
  const tag = tagVon(anfrage.birthDate), nach = namensSchluessel(anfrage.lastName), vor = namensSchluessel(anfrage.firstName), erster = ersterVorname(anfrage.firstName);
  const genau: T[] = [], aehnlich: T[] = [];
  for (const p of patienten) {
    if (!p.birthDate || tagVon(p.birthDate) !== tag) continue;
    if (namensSchluessel(p.lastName) !== nach) continue;
    if (namensSchluessel(p.firstName) === vor) genau.push(p);
    else if (erster && ersterVorname(p.firstName) === erster) aehnlich.push(p);
  }
  return [...genau, ...aehnlich];
}

// --- Kontaktdaten aus dem öffentlichen Formular: nie still in eine vorhandene Akte ---

/**
 * Was die Anfrage an Kontaktdaten nennt, die in der Akte des vorhandenen Patienten noch fehlen.
 * Das Formular prüft nicht, wer es ausfüllt. Deshalb übernimmt Sorrida diese Angaben nur, wenn die Praxis
 * es beim Bestätigen ausdrücklich anklickt. Vorhandene Angaben werden nie überschrieben.
 */
export function neueKontaktdaten(anfrage: { phone: string | null; email: string | null }, patient: { phone: string | null; email: string | null }): { phone?: string; email?: string } {
  return {
    ...(anfrage.phone && !patient.phone ? { phone: anfrage.phone } : {}),
    ...(anfrage.email && !patient.email ? { email: anfrage.email } : {}),
  };
}

/** Wie viele ANDERE offene Anfragen derselben Praxis dieselbe Mobilnummer oder E-Mail-Adresse nennen (Hinweis für die Praxis). */
export function gleicherKontakt<T extends { id: string; phone: string | null; email: string | null }>(anfrage: T, offene: T[]): number {
  return offene.filter((o) => o.id !== anfrage.id && ((!!anfrage.phone && o.phone === anfrage.phone) || (!!anfrage.email && o.email === anfrage.email))).length;
}

// --- Texte für die Praxis (zum Kopieren; Sorrida verschickt nichts von allein) ---

export function zusageText(a: { firstName: string; practiceName: string; start: Date }): string {
  return `Hallo ${a.firstName}, Ihre Anfrage bei ${a.practiceName} ist bestätigt: ${terminZeit(a.start)} Uhr. Falls Sie nicht kommen können, sagen Sie bitte rechtzeitig ab.`;
}

export function absageText(a: { firstName: string; practiceName: string; start: Date }): string {
  return `Hallo ${a.firstName}, vielen Dank für Ihre Anfrage bei ${a.practiceName}. Die gewünschte Zeit (${terminZeit(a.start)} Uhr) können wir leider nicht anbieten. Bitte wählen Sie eine andere Zeit oder rufen Sie uns an.`;
}

// --- Einbettung in die Website der Praxis: lib/terminEinbettung.ts (ohne Server-Module, auch im Browser nutzbar) ---
export { einbettung } from "@/lib/terminEinbettung";
