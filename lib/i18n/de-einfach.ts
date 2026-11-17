import type { Ui } from "./types";

// Einfache Sprache für die deutsche Patientenansicht: kurze Sätze, einfache Wörter, ein Gedanke je Satz.
// Bewusst „Einfache Sprache“ und NICHT „Leichte Sprache“: Leichte Sprache ist ein festes Regelwerk mit Prüfung
// durch Prüfgruppen; das ist hier nicht geschehen. Ersetzt werden nur die Rahmentexte der Ansicht (Begrüßung,
// Erklärungen, Knöpfe, Kleingedrucktes). Die Namen der Leistungen und alle Beträge bleiben, wie sie sind.
// Schlüssel, die hier fehlen, kommen aus de.ts. Der Test (lib/einfacheSprache.test.ts) hält jeden Satz bei höchstens 15 Wörtern.

/** Beschriftung des Schalters (nur in der deutschen Ansicht sichtbar). */
export const EINFACH_SCHALTER = "Einfache Sprache";

export const uiEinfach: Partial<Ui> = {
  pageTitle: "Ihr Vorschlag für die Behandlung",
  hello: (name) => `Hallo ${name}. Das ist Ihr Vorschlag für die Behandlung.`,
  intro: (arzt, zahn) =>
    `Hier sehen Sie Ihre Möglichkeiten. Sie sehen auch die Kosten. Tippen Sie eine Möglichkeit an. Dann sehen Sie, was Sie selbst zahlen. Sie entscheiden erst im Gespräch mit ${arzt ?? (zahn ? "Ihrer Zahnärztin oder Ihrem Zahnarzt" : "Ihrer Praxis")}.`,
  kasseWenn: "Die Kasse zahlt:",
  fineMed: (until) =>
    `Die Kosten sind geschätzt. Sie sind nicht verbindlich. Gerechnet wird nach der Gebührenordnung für Ärzte (GOÄ). Leistungen zum Selbstzahlen sind freiwillig. Vorher unterschreiben Sie dafür eine Vereinbarung. Nehmen Sie sich Zeit. Dieser Link gilt bis ${until}.`,
  deadlineTitle: "Wichtig bei Zahnersatz:",
  deadline: (days) => `Ab 2027 zahlen die Krankenkassen weniger dazu. Bis 31.12.2026 muss die Kasse Ihren Plan bewilligen (noch ${days} Tage). Dann sparen Sie etwa`,
  yourShare: "Das zahlen Sie",
  nextTitle: "Wie geht es weiter?",
  thanks: "Danke. Ihre Praxis hat Ihre Antwort bekommen. Sie können Ihre Auswahl hier noch einmal senden.",
  noteLabel: "Haben Sie eine Frage oder einen Wunsch? (freiwillig)",
  notePlaceholder: "Zum Beispiel: Ich bin nachmittags gut erreichbar.",
  discuss: "Diese Auswahl mit der Praxis besprechen",
  callMeLead: "Möchten Sie lieber sprechen?",
  pick: "Bitte wählen Sie eine Möglichkeit.",
  open: (n) => (n === 1 ? "Sie müssen noch 1 Mal wählen" : `Sie müssen noch ${n} Mal wählen`),
  optional: "Das ist freiwillig. Tippen Sie es an, wenn Sie es möchten. Tippen Sie noch einmal, um es abzuwählen.",
  fineTherapie: (until) =>
    `Die Kosten sind geschätzt. Sie sind nicht verbindlich. Gerechnet wird nach der Preisliste Ihrer Praxis. Leistungen zum Selbstzahlen sind freiwillig. Vorher unterschreiben Sie dafür eine Vereinbarung. Bei Leistungen auf Rezept gilt die gesetzliche Zuzahlung. Dieser Link gilt bis ${until}.`,
  recTitle: "Ihre Auswahl und die Vormerkung Ihrer Praxis",
  recIntro: "Hier sehen Sie Ihre Auswahl. Sie sehen auch, was Ihre Praxis im Gespräch vorgemerkt hat. Sie entscheiden frei.",
  yourChoice: "Ihre Auswahl",
  why: "Dazu:",
  variants: "Drei Möglichkeiten im Vergleich",
  vLow: "Am wenigsten selbst zahlen",
  sendFailed: "Das Senden hat nicht geklappt. Bitte versuchen Sie es noch einmal. Oder rufen Sie die Praxis an.",
  fine: (gkv, until) =>
    `Die Kosten sind geschätzt. Sie sind nicht verbindlich. Verbindlich sind der Heil- und Kostenplan oder die Vereinbarung mit Ihrer Praxis.${gkv ? " Bei Zahnersatz zählt der Tag, an dem Ihre Krankenkasse den Plan bewilligt." : ""} Was Ihre Zusatzversicherung zahlt, ist geschätzt. Dieser Link gilt bis ${until}.`,
  barLabel: "Das zahlen Sie selbst für diese Auswahl",
  back: "Zurück zur Übersicht",
  pdfNote: "Zum Aufbewahren. Das PDF ist in üblicher deutscher Sprache geschrieben.",
  shareText: "Sie erzeugen einen zweiten Link. Der Link ist nur zum Lesen. Die andere Person kann nichts auswählen und nichts senden.",
  shareOnce: "Sie sehen den Link nur jetzt. Bitte teilen oder kopieren Sie ihn gleich.",
  shareLimit: "Es gehen höchstens 3 Lese-Links zur gleichen Zeit. Widerrufen Sie einen Link. Dann können Sie einen neuen erzeugen.",
  actionFailed: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
  readOnlyNote: "Sie dürfen diesen Vorschlag mitlesen. Entscheiden kann nur die Patientin oder der Patient selbst.",
  remindTitle: "Möchten Sie später entscheiden?",
  remindText: "Wählen Sie einen Zeitpunkt. Ihre Praxis sieht Ihren Wunsch an diesem Tag.",
  remindSet: (date) => `Sie möchten am ${date} erinnert werden. Ihre Praxis sieht den Wunsch an diesem Tag.`,
  prelim2027: "Die Beträge für 2027 stehen noch nicht fest.",
  stepInsurerGkv: "Das zahlt Ihre Kasse",
  stepInsurerPkv: "Das zahlt Ihre Versicherung voraussichtlich",
};
