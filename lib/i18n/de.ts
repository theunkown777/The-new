import type { PatientLocale, Ui } from "./types";
import { gruppiert } from "./format";
import { PATTERN_IDS } from "./patterns";

// Deutsch ist die maßgebliche Fassung: Die Regeltexte bleiben, wie sie das
// Regelwerk erzeugt (leeres Wörterbuch, Muster geben den Text unverändert zurück).

const ui: Ui = {
  pageTitle: "Ihr Behandlungsvorschlag",
  hello: (name) => `Hallo ${name}, hier ist Ihr Behandlungsvorschlag`,
  intro: (arzt) =>
    `Sie können sich in Ruhe ansehen, welche Möglichkeiten es gibt und was sie für Sie kosten. Tippen Sie eine Option an, um Ihren Eigenanteil zu sehen. Entschieden wird erst im Gespräch mit ${arzt ?? "Ihrer Zahnärztin oder Ihrem Zahnarzt"}.`,
  kasseWenn: "Kasse zahlt:",
  nutzen: "Zum Nutzen:",
  fineMed: (until) =>
    `Unverbindliche Kostenschätzung nach der Gebührenordnung für Ärzte (GOÄ). Selbstzahlerleistungen (IGeL) sind freiwillig; vor der Leistung schließen wir eine schriftliche Vereinbarung mit Ihnen. Nehmen Sie sich Zeit für Ihre Entscheidung. Dieser Link ist gültig bis ${until}.`,
  deadlineTitle: "Wichtig für Zahnersatz:",
  deadline: (days) =>
    `Ab 2027 zahlen die Krankenkassen weniger zu. Wird der Heil- und Kostenplan noch bis 31.12.2026 bewilligt (in ${days} Tagen), sparen Sie bei Ihrer Auswahl etwa`,
  optionsFor: (t) => `Optionen für ${t}`,
  recommended: "Empfehlung",
  yourShare: "Ihr Anteil",
  total: "Gesamt",
  insurerGkv: "Kasse",
  insurerPkv: "Versicherung",
  supplementary: "Zusatzversicherung ca.",
  from2027: "bei Bewilligung ab 2027:",
  coPayment: "gesetzliche Zuzahlung",
  nextTitle: "Wie möchten Sie weitermachen?",
  thanks:
    "Danke, Ihre Praxis hat Ihre Rückmeldung erhalten und meldet sich bei Ihnen. Sie können Ihre Auswahl hier jederzeit erneut senden.",
  change: "Auswahl ändern",
  noteLabel: "Frage oder Wunschtermin (optional)",
  notePlaceholder: "z. B. Am besten erreichbar nachmittags.",
  installmentsInterest: "Ich interessiere mich für Ratenzahlung",
  discuss: "Diese Auswahl besprechen",
  callMe: "Bitte rufen Sie mich an",
  callMeLead: "Lieber persönlich sprechen?",
  pick: "Bitte wählen Sie eine Option.",
  open: (n) => (n === 1 ? "Noch 1 Auswahl offen" : `Noch ${n} Auswahlen offen`),
  missing: (titles) => `Bitte wählen Sie noch: ${titles}.`,
  optional: "Freiwillig. Antippen, wenn Sie das möchten; noch einmal antippen, um es wieder abzuwählen.",
  fineTherapie: (until) =>
    `Unverbindliche Kostenschätzung nach der Preisliste Ihrer Praxis. Selbstzahlerleistungen sind freiwillig; vor der Behandlung vereinbaren wir sie schriftlich mit Ihnen. Für Leistungen auf Verordnung gilt die gesetzliche Zuzahlung. Dieser Link ist gültig bis ${until}.`,
  seeRec: "Hier sehen Sie unsere Empfehlung",
  recTitle: "Unsere Empfehlung im Vergleich",
  recIntro: "Zur Kontrolle: Ihre Auswahl neben dem, was Ihre Praxis empfehlen würde. Entscheiden können Sie frei.",
  yourChoice: "Ihre Wahl",
  ourRec: "Empfehlung",
  notChosen: "noch nicht gewählt",
  same: "entspricht der Empfehlung",
  why: "Warum:",
  variants: "Drei Varianten im Überblick",
  vYours: "Ihre Auswahl",
  vRec: "Wie empfohlen",
  vLow: "Geringster Eigenanteil",
  takeRec: "Empfehlung übernehmen",
  keepMine: "Bei meiner Auswahl bleiben",
  close: "Schließen",
  sendFailed: "Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie die Praxis an.",
  fine: (gkv, until) =>
    `Unverbindliche Kostenschätzung. Verbindlich sind der Heil- und Kostenplan bzw. die Vereinbarung mit Ihrer Praxis.${gkv ? " Der Kassenanteil bei Zahnersatz richtet sich nach dem Datum der Bewilligung durch Ihre Krankenkasse." : ""} Erstattungen Ihrer Zusatzversicherung sind geschätzt. Dieser Link ist gültig bis ${until}.`,
  installmentsFine: (provider) =>
    ` Ratenzahlung zinsfrei${provider ? ` über ${provider}` : ""}, Beispielrate aufgerundet; Einzelheiten regelt die Vereinbarung mit Ihrer Praxis.`,
  barLabel: "Ihr Eigenanteil für diese Auswahl",
  rate: (months, monthly) => `oder ${months} × ${monthly} zinsfrei`,
  ask: "Ratenzahlung möglich, sprechen Sie uns an",
  bar2027: "ab 2027 bewilligt:",
  back: "Zurück zu Ihrem Behandlungsweg",
  langLabel: "Sprache",
  langNote: "",
  contentNote: "",
  germanOnlyNote: "",
  expiredTitle: "Dieser Link ist nicht mehr gültig",
  expiredText: "Aus Datenschutzgründen sind Patienten-Links nur begrenzt gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen Link.",
  goneTitle: "Dieser Vorschlag ist nicht verfügbar",
  goneText: "Bitte fragen Sie in Ihrer Praxis nach.",
};

export const de: PatientLocale = {
  code: "de",
  name: "Deutsch",
  dir: "ltr",
  dateLocale: "de-DE",
  euro: (n) => `${gruppiert(n, ".")} €`,
  ui,
  content: {},
  patterns: Object.fromEntries(PATTERN_IDS.map((id) => [id, (m: RegExpMatchArray) => m[0]])) as unknown as PatientLocale["patterns"],
};
