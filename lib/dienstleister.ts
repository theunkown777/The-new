// Dienstleister (Unterauftragsverarbeiter) von Sorrida: eine Liste für das AVV-Muster (app/avv/page.tsx, Anlage 2)
// und die Seite „So geht Sorrida mit Daten um“ (app/vertrauen/page.tsx). Beschreibt, wohin Daten tatsächlich gehen
// (lib/email.ts, lib/anthropic.ts, lib/whatsapp.ts, lib/rateLimit.ts, lib/onlineZahlung.ts).
// Bei einem neuen oder geänderten Dienst hier pflegen; beide Seiten ziehen nach.

export interface Dienstleister { dienst: string; zweck: string; daten: string; ort: string }

export const DIENSTE: Dienstleister[] = [
  {
    dienst: "Vercel (Vercel Inc., USA)",
    zweck: "Hosting der Anwendung",
    daten: "Alle Inhalte im Durchlauf; Server-Protokolle mit IP-Adresse, Zeit, aufgerufener Adresse und Browser",
    ort: "Region Frankfurt am Main (fra1); Unternehmen in den USA",
  },
  {
    dienst: "Neon (Datenbankdienst, Unternehmen in den USA)",
    zweck: "Speicherung der Daten (PostgreSQL), Datensicherung",
    daten: "Alle Daten nach § 2",
    ort: "Frankfurt am Main; Unternehmen in den USA",
  },
  {
    dienst: "Upstash (Upstash, Inc., USA)",
    zweck: "Zähler zum Schutz vor Missbrauch, nur falls angebunden",
    daten: "Zähler mit IP-Adresse, auch von Patienten, die ihren Link oder das Portal öffnen; Zähler je Konto und Praxis. Keine Inhalte. Dauer höchstens 24 Stunden.",
    ort: "Region laut Einstellung im Upstash-Konto; Unternehmen in den USA",
  },
  {
    dienst: "Resend (E-Mail-Dienst, Unternehmen in den USA)",
    zweck: "Versand von E-Mails",
    daten:
      "E-Mails an Praxis-Beschäftigte (Einladung, Passwort, Morgen-Mail ohne Patientendaten) und, wenn die Praxis es auslöst, an Patienten (Terminbestätigung, Terminerinnerung, Zahlungserinnerung: E-Mail-Adresse, Vorname, Praxisname, Termin, ggf. Anlass, Rechnungsnummer, Betrag, persönlicher Link)",
    ort: "USA",
  },
  {
    dienst: "Anthropic (KI-Dienst, Unternehmen in den USA)",
    zweck: "Formulierung von Berichtsentwürfen und Kurzfassungen, wenn die Praxis sie anfordert",
    daten:
      "Erfasste Leistungen, Diktat und Akteneinträge. Namen, Geburtsdatum, Versichertennummer, E-Mail-Adressen und Telefonnummern werden vorher durch Platzhalter ersetzt. Freier Text kann trotzdem Angaben enthalten, die auf eine Person schließen lassen.",
    ort: "USA",
  },
  {
    dienst: "Stripe (nur wenn die Praxis Online-Zahlung einschaltet)",
    zweck: "Online-Zahlung im Patientenportal über das eigene Stripe-Konto der Praxis. Die Praxis schließt dafür selbst einen Vertrag mit Stripe.",
    daten: "Rechnungsnummer, Betrag, Praxisname und die Adresse, unter der der Patient ins Portal zurückkehrt. Karten- und Bankdaten gibt der Patient direkt bei Stripe ein; Sorrida erhält sie nicht.",
    ort: "laut Vertrag der Praxis mit Stripe",
  },
  {
    dienst: "WhatsApp Business Platform von Meta (nur wenn eingerichtet)",
    zweck: "Nachrichten an Patienten, die in WhatsApp eingewilligt haben",
    daten: "Mobilnummer, Vorname, Praxisname, Nachricht oder persönlicher Link. Keine Befunde, keine Beträge.",
    ort: "EU und USA",
  },
];
