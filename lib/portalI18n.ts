import type { PatientLang } from "@/lib/patientI18n";

// Texte des Patientenportals. Rechnungstitel und Dokumente bleiben in der
// Sprache der Praxis; übersetzt wird die Oberfläche.
const DE = {
  hello: (n: string) => `Hallo ${n}`,
  summary: (inv: number, docs: number) => {
    const a = inv === 0 ? "keine offenen Rechnungen" : inv === 1 ? "1 offene Rechnung" : `${inv} offene Rechnungen`;
    const b = docs === 0 ? "" : docs === 1 ? " und 1 Dokument zum Ansehen" : ` und ${docs} Dokumente zum Ansehen`;
    return `Sie haben ${a}${b}.`;
  },
  openTotal: "Offener Betrag",
  nextDue: (d: string) => `Nächste Fälligkeit: ${d}`,
  allPaid: "Alles erledigt. Vielen Dank!",
  invoices: "Offene Rechnungen",
  pay: "Jetzt bezahlen",
  hide: "Schließen",
  howTo: "Am Handy: Daten in Ihre Banking-App kopieren. Am Computer: Code mit der Banking-App scannen (GiroCode).",
  recipient: "Empfänger",
  iban: "IBAN",
  amount: "Betrag",
  reference: "Verwendungszweck",
  copy: "Kopieren",
  copied: "Kopiert",
  reported: "Ich habe überwiesen",
  reportedDone: "Danke! Die Praxis prüft den Zahlungseingang.",
  reportedLabel: "Zahlung gemeldet",
  installments: "Ratenzahlung anfragen",
  installmentsDone: "Ihre Anfrage ist bei der Praxis. Sie meldet sich bei Ihnen.",
  noBank: "Die Praxis hat noch keine Bankverbindung hinterlegt. Bitte zahlen Sie wie mit der Praxis besprochen.",
  documents: "Dokumente",
  proposalDoc: (d: string) => `Behandlungsvorschlag vom ${d}`,
  eigen: "Ihr Eigenanteil",
  show: "Ansehen",
  paid: "Bezahlt",
  history: "Erledigt",
  anamnesis: "Drei Minuten vor Ihrem Termin, damit in der Praxis nichts mehr auszufüllen ist.",
  anamnesisTitle: "Gesundheitsfragebogen",
  fillIn: "Ausfüllen",
  choose: "Ansehen und wählen",
  accepted: "angenommen",
  answered: "Rückmeldung gesendet",
  waiting: "wartet auf Ihre Rückmeldung",
  valid: (d: string) => `Dieser Link ist bis ${d} gültig und nur für Sie bestimmt.`,
  privacy: "Ohne App und ohne Konto. Die Zahlung geht direkt an Ihre Praxis.",
  failed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
  invoiceNo: "Rechnung",
};

const EN: typeof DE = {
  hello: (n) => `Hello ${n}`,
  summary: (inv, docs) => {
    const a = inv === 0 ? "no open invoices" : inv === 1 ? "1 open invoice" : `${inv} open invoices`;
    const b = docs === 0 ? "" : docs === 1 ? " and 1 document to review" : ` and ${docs} documents to review`;
    return `You have ${a}${b}.`;
  },
  openTotal: "Amount due",
  nextDue: (d) => `Next due date: ${d}`,
  allPaid: "All settled. Thank you!",
  invoices: "Open invoices",
  pay: "Pay now",
  hide: "Close",
  howTo: "On your phone: copy the details into your banking app. On a computer: scan the code with your banking app (GiroCode).",
  recipient: "Recipient",
  iban: "IBAN",
  amount: "Amount",
  reference: "Reference",
  copy: "Copy",
  copied: "Copied",
  reported: "I have paid",
  reportedDone: "Thank you! The practice will check the payment.",
  reportedLabel: "Payment reported",
  installments: "Ask about instalments",
  installmentsDone: "Your request has been sent. The practice will get back to you.",
  noBank: "The practice has not added bank details yet. Please pay as agreed with the practice.",
  documents: "Documents",
  proposalDoc: (d) => `Treatment proposal from ${d}`,
  eigen: "Your share",
  show: "View",
  paid: "Paid",
  history: "Settled",
  anamnesis: "Three minutes before your appointment, so there is nothing left to fill in at the practice.",
  anamnesisTitle: "Health questionnaire",
  fillIn: "Fill in",
  choose: "View and choose",
  accepted: "accepted",
  answered: "response sent",
  waiting: "awaiting your response",
  valid: (d) => `This link is valid until ${d} and meant only for you.`,
  privacy: "No app, no account. Payment goes directly to your practice.",
  failed: "That did not work. Please try again.",
  invoiceNo: "Invoice",
};

export const PORTAL_UI: Record<PatientLang, typeof DE> = { de: DE, en: EN };
export type PortalUi = typeof DE;

/** Status-Text für den Patienten. */
export function portalStatus(key: string, days: number, lang: PatientLang): string {
  if (lang === "en") {
    if (key === "gemeldet") return "Payment reported";
    if (key === "bezahlt") return "Paid";
    if (key === "ueberfaellig") return `Overdue by ${-days} ${-days === 1 ? "day" : "days"}`;
    if (key === "heute") return "Due today";
    return `Due in ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (key === "gemeldet") return "Zahlung gemeldet";
  if (key === "bezahlt") return "Bezahlt";
  if (key === "ueberfaellig") return `Überfällig seit ${-days} ${-days === 1 ? "Tag" : "Tagen"}`;
  if (key === "heute") return "Heute fällig";
  return `Fällig in ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}
