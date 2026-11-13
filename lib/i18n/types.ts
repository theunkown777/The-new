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
  /** `arzt` ist der deutsche Dativ aus lib/specialties.ts; fehlt er, ist es die Zahnarztpraxis. */
  intro: (arzt: string | undefined) => string;
  kasseWenn: string;
  nutzen: string;
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
