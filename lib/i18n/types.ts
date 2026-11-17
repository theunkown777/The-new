// Aufbau einer Sprache der Patientenansicht. Jede Sprache ist ein in sich
// geschlossenes Objekt (eine Datei je Sprache in diesem Ordner):
// Oberfläche (ui), Wörterbuch der deutschen Regeltexte (content) und Muster
// für Texte mit Zahlen (patterns). Einstieg und Registrierung: lib/patientI18n.ts.

import type { PatternId } from "./patterns";

/** Texte der Oberfläche. Funktionen bekommen die Werte, die im Satz stehen müssen. */
export type Ui = {
  /** Titel im Browser-Tab. */
  pageTitle: string;
  hello: (name: string) => string;
  /**
   * `arzt` ist der deutsche Dativ aus lib/specialties.ts. Fehlt er, nennt der Satz die Zahnärztin nur bei `zahn`,
   * sonst neutral die Praxis (z. B. Fach „andere“). Fremdsprachen nennen bei bekanntem Fach „Ihre Praxis“.
   */
  intro: (arzt: string | undefined, zahn?: boolean) => string;
  kasseWenn: string;
  nutzen: string;
  /** Vor dem Link zur Quelle im Kasten „Zum Nutzen“ (z. B. „Quelle: IGeL-Monitor“). */
  quelle: string;
  /** Hinter der Quelle, vor dem Tag, an dem die Seite gelesen wurde („Quelle: IGeL-Monitor (abgerufen am 17.11.2026)“). */
  abgerufen: string;
  /** Vor dem Text, den die Praxis selbst zu einer eigenen Leistung eingetragen hat (statt „Zum Nutzen:“). */
  hinweisPraxis: string;
  fineMed: (until: string) => string;
  deadlineTitle: string;
  deadline: (days: number) => string;
  optionsFor: (t: string) => string;
  recommended: string;
  yourShare: string;
  total: string;
  insurerGkv: string;
  insurerPkv: string;
  supplementary: string;
  from2027: string;
  /** Wie from2027, solange die Tabelle 2027 noch nicht eingelesen ist (festzuschuss2027Amtlich() ist false). */
  from2027Prelim: string;
  /** Statt eines Betrags bei Kassenleistungen auf Verordnung ohne hinterlegten Preis. */
  coPayment: string;
  nextTitle: string;
  thanks: string;
  change: string;
  noteLabel: string;
  notePlaceholder: string;
  installmentsInterest: string;
  discuss: string;
  callMe: string;
  callMeLead: string;
  pick: string;
  open: (n: number) => string;
  missing: (titles: string) => string;
  optional: string;
  fineTherapie: (until: string) => string;
  seeRec: string;
  recTitle: string;
  recIntro: string;
  yourChoice: string;
  ourRec: string;
  notChosen: string;
  same: string;
  why: string;
  variants: string;
  vYours: string;
  vRec: string;
  vLow: string;
  takeRec: string;
  keepMine: string;
  close: string;
  sendFailed: string;
  fine: (gkv: boolean, until: string) => string;
  installmentsFine: (provider?: string) => string;
  barLabel: string;
  rate: (months: number, monthly: string) => string;
  ask: string;
  bar2027: string;
  /** Wie bar2027, solange die Beträge 2027 vorläufig sind. */
  bar2027Prelim: string;
  /** Satz im Hinweis zum Stichtag, solange die Beträge 2027 vorläufig sind. */
  prelim2027: string;
  /** Zurück ins Patientenportal (ohne Pfeil, den setzt die Ansicht je nach Schreibrichtung). */
  back: string;
  /** Beschriftung der Sprachwahl für Vorleseprogramme. */
  langLabel: string;
  /** Rechtlicher Hinweis in jeder Fremdsprache; auf Deutsch leer. */
  langNote: string;
  /** Hinweis, wenn einzelne Bezeichnungen der Leistungen nur auf Deutsch vorliegen; auf Deutsch leer. */
  contentNote: string;
  /** Hinweis vor dem Abschnitt „Zweitmeinung vergleichen“, den es nur auf Deutsch gibt; auf Deutsch leer. */
  germanOnlyNote: string;
  expiredTitle: string;
  expiredText: string;
  goneTitle: string;
  goneText: string;
  /** Knopf für die Kostenübersicht als PDF; pdfNote sagt, dass das PDF deutsch ist. */
  pdfSave: string;
  pdfNote: string;
  /** Lese-Link für eine Vertrauensperson (nur lesen). */
  shareTitle: string;
  shareText: string;
  shareCreate: string;
  shareSend: string;
  shareCopy: string;
  shareCopied: string;
  /** Der Link wird nur direkt nach dem Erzeugen gezeigt (gespeichert ist nur sein Hash). */
  shareOnce: string;
  shareFrom: (date: string) => string;
  shareRevoke: string;
  shareLimit: string;
  actionFailed: string;
  /** Überschrift und Hinweis der Lese-Ansicht für Vertrauenspersonen. */
  readOnlyTitle: string;
  readOnlyNote: string;
  /** „Erinnern Sie mich“: Die Praxis sieht den Wunsch an dem gewählten Tag; es geht keine Nachricht von selbst raus. */
  remindTitle: string;
  remindText: string;
  remind3: string;
  remind7: string;
  remind14: string;
  remindSet: (date: string) => string;
  remindDelete: string;
  readAloud: string;
  readStop: string;
  /** Drei Kacheln oben: geplant, Anteil von Kasse bzw. Versicherung, eigener Anteil. */
  stepPlanned: string;
  stepItems: (n: number) => string;
  stepInsurerGkv: string;
  stepInsurerPkv: string;
  stepSelf: string;
};

/** `t` übersetzt einen eingebetteten Regeltext (z. B. „Zahn 36“ in einem Hinweis). */
export type PatternFn = (m: RegExpMatchArray, t: (text: string) => string) => string;

export interface PatientLocale {
  /** Sprachkürzel wie in `?lang=` und im lang-Attribut. */
  code: string;
  /** Name der Sprache in eigener Schreibweise. */
  name: string;
  dir: "ltr" | "rtl";
  /** Locale für das Datum („gültig bis“). */
  dateLocale: string;
  euro: (n: number) => string;
  ui: Ui;
  /** Deutscher Regeltext → Übersetzung. */
  content: Record<string, string>;
  patterns: Record<PatternId, PatternFn>;
}
