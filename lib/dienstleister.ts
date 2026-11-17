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
      "E-Mails an Praxis-Beschäftigte (Einladung, Passwort, Morgen-Mail ohne Patientendaten) und, wenn die Praxis es auslöst, an Patienten (Terminbestätigung, Terminerinnerung, Zahlungserinnerung: E-Mail-Adresse, Vorname, Praxisname, Termin, Rechnungsnummer, Betrag, persönlicher Link). Dazu an den Betreiber von Sorrida: eine tägliche Kurzmeldung über neue Fehler mit Anzahl und Ort, ohne Meldungstext",
    ort: "USA",
  },
  {
    dienst: "Anthropic (KI-Dienst, Unternehmen in den USA)",
    zweck:
      "Formulierung von Berichtsentwürfen und Kurzfassungen, wenn die Praxis sie anfordert. Nur wenn die Praxisleitung die KI-Hilfen einschaltet (Standard: aus) und jemand den KI-Knopf drückt: Stichworte einem Anlass zuordnen, eine Preisliste ablesen, Fragen zur Bedienung beantworten, eigene Leistungen übersetzen",
    daten:
      "Erfasste Leistungen, Diktat und Akteneinträge. Der Name der Patientin oder des Patienten, Geburtsdatum, Versichertennummer, E-Mail-Adressen und Telefonnummern werden vorher durch Platzhalter ersetzt. Im freien Text erkennt Sorrida nur Namen, die es kennt. Freier Text kann deshalb Angaben enthalten, die auf eine Person schließen lassen. Bei den KI-Hilfen zusätzlich: die eingegebenen Stichworte aus dem Gespräch (ebenso bereinigt; sie können Gesundheitsangaben enthalten), bei „Frag Sorrida“ Frage, Seitentitel und Hilfetexte (die Frage zur Bedienung, bis zu drei Fragen davor ohne Antworten, der Titel der geöffneten Seite ohne Kennungen und die Hilfetexte von Sorrida; Namen eigener Patienten und Namen nach „Frau“ oder „Herr“ werden vorher ersetzt) sowie Name und Hinweis einer eigenen Leistung. Eine hochgeladene Preisliste (Foto oder PDF) geht unverändert an den KI-Dienst, mit allem, was darauf steht.",
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
