// Geburtsdatum-Prüfung im Patientenportal (Sicherheitsbericht S5).
//
// Der Portal-Link allein reicht zum Ansehen. Vor rechtlich oder finanziell
// bindenden Handlungen (Einverständnis unterschreiben, Lastschriftmandat
// erteilen) bestätigt der Patient zusätzlich sein Geburtsdatum. Diese Datei
// enthält nur reine Logik und Texte, ohne Node-Module und ohne Datenbank,
// damit auch Client-Komponenten sie nutzen können. Signatur der Bestätigung:
// lib/portalPruefungCookie.ts, Datenbank und Cookie: lib/portalPruefungServer.ts.

export const MAX_FEHLVERSUCHE = 5;
/** Erste Sperre; jede weitere Sperre in Folge dauert doppelt so lang. */
export const SPERRE_MINUTEN = 15;
export const SPERRE_MAX_MINUTEN = 24 * 60;
/** So lange gilt eine richtige Eingabe, ohne dass erneut gefragt wird. */
export const BESTAETIGUNG_MINUTEN = 30;

const TZ = "Europe/Berlin";

/** Kalendertag in deutscher Zeit als "JJJJ-MM-TT", unabhängig von der Zeitzone des Servers. */
export function berlinTag(d: Date): string {
  const teile = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const t = (art: string) => teile.find((p) => p.type === art)?.value ?? "";
  return `${t("year").padStart(4, "0")}-${t("month")}-${t("day")}`;
}

/**
 * Eingabe aus drei Feldern in "JJJJ-MM-TT" wandeln. null bei allem, was kein
 * echter Kalendertag ist (31.02., Jahr zweistellig, Zukunft, Buchstaben).
 */
export function eingabeTag(e: { tag: unknown; monat: unknown; jahr: unknown }, now = new Date()): string | null {
  const zahl = (v: unknown, stellen: RegExp) => {
    const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
    return stellen.test(s) ? Number(s) : null;
  };
  const tag = zahl(e.tag, /^\d{1,2}$/);
  const monat = zahl(e.monat, /^\d{1,2}$/);
  const jahr = zahl(e.jahr, /^\d{4}$/);
  if (tag === null || monat === null || jahr === null) return null;
  if (jahr < 1900 || monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  const probe = new Date(Date.UTC(jahr, monat - 1, tag));
  if (probe.getUTCFullYear() !== jahr || probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return null;
  const key = `${String(jahr).padStart(4, "0")}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
  return key > berlinTag(now) ? null : key;
}

/**
 * Stimmt die Eingabe mit dem hinterlegten Geburtsdatum überein? Verglichen wird
 * der Kalendertag in deutscher Zeit, so wie die Praxis das Datum sieht. Das
 * Ergebnis ist nur ja oder nein; es gibt keine Auskunft, wie nah die Eingabe war.
 */
export function geburtsdatumStimmt(hinterlegt: Date, eingabe: string | null): boolean {
  if (!eingabe) return false;
  const soll = berlinTag(hinterlegt);
  if (soll.length !== eingabe.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ eingabe.charCodeAt(i);
  return diff === 0;
}

/** Dauer der nächsten Sperre: 15 Minuten, dann 30, 60 … höchstens 24 Stunden. */
export function sperrMinuten(bisherigeSperren: number): number {
  const n = Math.max(0, Math.min(Math.floor(bisherigeSperren) || 0, 20));
  return Math.min(SPERRE_MAX_MINUTEN, SPERRE_MINUTEN * 2 ** n);
}

/** Restdauer einer laufenden Sperre in vollen Minuten, 0 = nicht gesperrt. */
export function restSperre(gesperrtBis: Date | null | undefined, now = Date.now()): number {
  if (!gesperrtBis) return 0;
  const ms = gesperrtBis.getTime() - now;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

export type FehlversuchFolge = { gesperrt: false; rest: number } | { gesperrt: true; bis: Date; minuten: number };

/**
 * Was nach einem falschen Datum gilt. `fehler` zählt diesen Versuch schon mit,
 * `sperren` sind die bisherigen Sperren in Folge für diesen Link.
 */
export function nachFehlversuch(fehler: number, sperren: number, now = Date.now()): FehlversuchFolge {
  if (fehler < MAX_FEHLVERSUCHE) return { gesperrt: false, rest: MAX_FEHLVERSUCHE - fehler };
  const minuten = sperrMinuten(sperren);
  return { gesperrt: true, bis: new Date(now + minuten * 60_000), minuten };
}

// ---------------------------------------------------------------------------
// Antworten der API (die Oberfläche übersetzt anhand von `code`)

export type PruefStatus = "noetig" | "bestaetigt" | "ohne";
export type PruefCode = "PRUEFUNG_NOETIG" | "FALSCH" | "GESPERRT" | "UNVOLLSTAENDIG" | "OHNE_GEBURTSDATUM" | "ZU_VIELE";
export const PRUEFUNG_NOETIG: PruefCode = "PRUEFUNG_NOETIG";

/** Vermerk für die Praxis (Vorschlag, PDF, Zahlungen). */
export function pruefVermerk(geprueftAt: Date | null | undefined): string {
  return geprueftAt
    ? `Geburtsdatum im Portal bestätigt am ${geprueftAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: TZ })}`
    : "Ohne Geburtsdatum-Prüfung";
}

// ---------------------------------------------------------------------------
// Texte. Bewusst als Partial<Record<string, …>> mit Rückfall auf Deutsch:
// Kommt im Portal eine neue Sprache dazu, fehlt hier höchstens die Übersetzung.

export type PruefText = {
  titel: string;
  grundUnterschrift: string;
  grundLastschrift: string;
  feld: string;
  tag: string;
  monat: string;
  jahr: string;
  platzhalter: [string, string, string];
  senden: string;
  laeuft: string;
  unvollstaendig: string;
  falsch: (rest: number) => string;
  gesperrt: (minuten: number) => string;
  abgelaufen: string;
  bestaetigt: string;
  ohneGeburtsdatum: string;
  zuViele: string;
  fehler: string;
  demo: (datum: string) => string;
};

const dauerDe = (min: number) => (min >= 120 ? `etwa ${Math.round(min / 60)} Stunden` : min === 1 ? "1 Minute" : `${min} Minuten`);
const dauerEn = (min: number) => (min >= 120 ? `about ${Math.round(min / 60)} hours` : min === 1 ? "1 minute" : `${min} minutes`);

const DE: PruefText = {
  titel: "Bitte bestätigen Sie Ihr Geburtsdatum",
  grundUnterschrift: "Bevor Sie unterschreiben, fragen wir zur Sicherheit Ihr Geburtsdatum ab. So kann niemand in Ihrem Namen unterschreiben, der nur Ihren Link kennt.",
  grundLastschrift: "Bevor Sie eine Lastschrift erteilen, fragen wir zur Sicherheit Ihr Geburtsdatum ab. So kann niemand in Ihrem Namen ein Mandat erteilen, der nur Ihren Link kennt.",
  feld: "Ihr Geburtsdatum",
  tag: "Tag",
  monat: "Monat",
  jahr: "Jahr",
  platzhalter: ["TT", "MM", "JJJJ"],
  senden: "Geburtsdatum bestätigen",
  laeuft: "Wird geprüft …",
  unvollstaendig: "Bitte geben Sie Tag, Monat und Jahr (vierstellig) Ihres Geburtsdatums ein.",
  falsch: (rest) => `Das Geburtsdatum stimmt nicht mit den Angaben Ihrer Praxis überein. Sie haben noch ${rest === 1 ? "1 Versuch" : `${rest} Versuche`}.`,
  gesperrt: (min) => `Zu viele Fehlversuche. Zu Ihrem Schutz ist die Bestätigung für ${dauerDe(min)} gesperrt. Bitte versuchen Sie es danach erneut oder wenden Sie sich an Ihre Praxis.`,
  abgelaufen: "Ihre Bestätigung ist abgelaufen. Bitte bestätigen Sie Ihr Geburtsdatum noch einmal.",
  bestaetigt: "Geburtsdatum bestätigt",
  ohneGeburtsdatum: "Lastschrift ist hier erst möglich, wenn Ihre Praxis Ihr Geburtsdatum hinterlegt hat. Bitte überweisen Sie den Betrag oder sprechen Sie Ihre Praxis an.",
  zuViele: "Zu viele Anfragen. Bitte später erneut versuchen.",
  fehler: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
  demo: (datum) => `Demo: Das Geburtsdatum dieses Beispielpatienten ist ${datum}.`,
};

const EN: PruefText = {
  titel: "Please confirm your date of birth",
  grundUnterschrift: "Before you sign, we ask for your date of birth as a safeguard. This way nobody who only has your link can sign in your name.",
  grundLastschrift: "Before you authorise a direct debit, we ask for your date of birth as a safeguard. This way nobody who only has your link can authorise a mandate in your name.",
  feld: "Your date of birth",
  tag: "Day",
  monat: "Month",
  jahr: "Year",
  platzhalter: ["DD", "MM", "YYYY"],
  senden: "Confirm date of birth",
  laeuft: "Checking …",
  unvollstaendig: "Please enter the day, month and year (four digits) of your date of birth.",
  falsch: (rest) => `The date of birth does not match your practice's records. You have ${rest === 1 ? "1 attempt" : `${rest} attempts`} left.`,
  gesperrt: (min) => `Too many failed attempts. For your protection, confirmation is locked for ${dauerEn(min)}. Please try again afterwards or contact your practice.`,
  abgelaufen: "Your confirmation has expired. Please confirm your date of birth again.",
  bestaetigt: "Date of birth confirmed",
  ohneGeburtsdatum: "Direct debit is only available here once your practice has your date of birth on file. Please pay by bank transfer or contact your practice.",
  zuViele: "Too many requests. Please try again later.",
  fehler: "That did not work. Please try again.",
  demo: (datum) => `Demo: this sample patient's date of birth is ${datum}.`,
};

export const PRUEF_TEXTE: Partial<Record<string, PruefText>> = { de: DE, en: EN };

/** Texte in der Sprache des Portals, sonst Deutsch. */
export function pruefText(lang: string | null | undefined): PruefText {
  return (lang && Object.prototype.hasOwnProperty.call(PRUEF_TEXTE, lang) ? PRUEF_TEXTE[lang] : undefined) ?? DE;
}

/** Fehlertext zu einer API-Antwort. */
export function pruefFehlerText(t: PruefText, d: { code?: string; rest?: number; minuten?: number } | null | undefined): string {
  switch (d?.code) {
    case "FALSCH": return t.falsch(Math.max(1, Number(d.rest) || 1));
    case "GESPERRT": return t.gesperrt(Math.max(1, Number(d.minuten) || SPERRE_MINUTEN));
    case "UNVOLLSTAENDIG": return t.unvollstaendig;
    case "OHNE_GEBURTSDATUM": return t.ohneGeburtsdatum;
    case "ZU_VIELE": return t.zuViele;
    case "PRUEFUNG_NOETIG": return t.abgelaufen;
    default: return t.fehler;
  }
}
