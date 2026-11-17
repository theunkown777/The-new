// Texte der Seite „So geht Sorrida mit Daten um“ (app/vertrauen/page.tsx).
// Hier stehen nur Tatsachen, die im Code oder im AVV-Muster und in der Datenschutzerklärung belegt sind;
// je Punkt nennt `beleg` die Stelle. Keine Zusagen, keine Siegel. lib/vertrauen.test.ts prüft die Wortwahl.
// Ändert sich die belegte Stelle, muss der Satz hier mit geändert werden.

import { MAX_FEHLVERSUCHE, SPERRE_MINUTEN } from "@/lib/portalPruefung";
import { SITZUNG_MAX_SEKUNDEN } from "@/lib/sitzung";

export interface Punkt { titel: string; text: string; beleg: string }

export const VERTRAUEN_STAND = "17.11.2026";

/** Wo die Daten liegen. */
export const ORT: Punkt[] = [
  {
    titel: "Speicherort",
    text: "Die Daten der Praxen liegen in einer Datenbank in einem Rechenzentrum in der Europäischen Union, derzeit in Frankfurt am Main. Auch die Anwendung läuft in der Region Frankfurt am Main.",
    beleg: "app/avv/page.tsx § 7, vercel.json, lib/hostingRegion.ts",
  },
  {
    titel: "Unternehmen der Dienstleister",
    text: "Die Anbieter von Hosting und Datenbank sind Unternehmen aus den USA. Die Grundlage für diese Übermittlung steht je Dienst im unterschriebenen Vertrag zur Auftragsverarbeitung.",
    beleg: "lib/dienstleister.ts, app/avv/page.tsx Anlage 2",
  },
  {
    titel: "Verarbeitung außerhalb der EU",
    text: "Der Versand von E-Mails und der KI-Dienst laufen über Anbieter, die in den USA verarbeiten. Welche Daten dorthin gehen, steht unten bei den Dienstleistern.",
    beleg: "lib/dienstleister.ts",
  },
];

/** Was an den KI-Dienst geht und was Sorrida vorher durch Platzhalter ersetzt. */
export const KI_GEHT: string[] = [
  "Erfasste Leistungen, Diktat und Akteneinträge, wenn die Praxis einen Entwurf anfordert.",
  "Nur wenn die Praxisleitung die KI-Hilfen einschaltet und jemand den KI-Knopf drückt: Stichworte aus dem Gespräch, die Preisliste der Praxis, bei „Frag Sorrida“ Frage, Seitentitel und Hilfetexte, Name und Hinweis einer eigenen Leistung. Der Schalter steht am Anfang auf aus.",
];
/**
 * Was Sorrida vor dem Versand durch Platzhalter ersetzt (lib/anthropic.ts, lib/kiHilfen.ts). Kein „nie“:
 * Im freien Text erkennt Sorrida nur Namen, die es kennt, und ein Foto oder PDF lässt sich nicht bereinigen.
 */
export const KI_ERSETZT: string[] = [
  "Name der Patientin oder des Patienten",
  "Geburtsdatum",
  "Versichertennummer",
  "E-Mail-Adressen und Telefonnummern",
];
export const KI_HINWEISE: string[] = [
  "Im freien Text erkennt Sorrida nur den Namen der Patientin oder des Patienten. Andere Namen bleiben stehen.",
  "Freier Text kann auch sonst Angaben enthalten, die auf eine Person schließen lassen. Deshalb gehört in ein Diktat nur, was für den Text nötig ist.",
  "Eine hochgeladene Preisliste (Foto oder PDF) geht unverändert an den KI-Dienst, mit allem, was darauf steht. Laden Sie nur die Preisliste hoch, ohne Briefkopf mit Personennamen und ohne Patientendaten.",
  "Was die KI liefert, ist als Entwurf gekennzeichnet. Ein Mensch aus der Praxis prüft den Text, bevor er verwendet wird.",
  "Die Software verschickt keine Nachricht an Patienten von selbst. Jede Nachricht löst ein Mensch aus der Praxis aus.",
];

/** Schutzmaßnahmen, die im Code stehen. */
export const SCHUTZ: Punkt[] = [
  {
    titel: "Zwei-Faktor-Anmeldung",
    text: "Konten der Praxisleitung müssen die Zwei-Faktor-Anmeldung mit einer Authenticator-App einrichten. Vorher lässt sich mit dem Konto nicht arbeiten. Die Praxisleitung kann die Pflicht auf das ganze Team ausdehnen.",
    beleg: "lib/zweiFaktorPflicht.ts, proxy.ts",
  },
  {
    titel: "Trennung der Praxen",
    text: "Jede Abfrage ist auf die eigene Praxis begrenzt. Eine automatische Prüfung ruft jede Schnittstelle mit den Kennungen einer fremden Praxis auf und schlägt fehl, wenn dabei Daten sichtbar oder änderbar wären. Neue Schnittstellen müssen in diese Prüfung aufgenommen werden.",
    beleg: "lib/mandantentrennung.test.ts, lib/mandantentrennung.matrix.ts",
  },
  {
    titel: "Protokoll",
    text: "Anmeldungen, Freigaben, Exporte und Löschungen werden mit Zeit und Person festgehalten. Die Praxisleitung kann das Protokoll einsehen.",
    beleg: "lib/audit.ts, app/avv/page.tsx Anlage 1",
  },
  {
    titel: "Begrenzungen",
    text: "Anmeldung, Registrierung, Patienten-Links und Formulare nehmen je Absender nur eine begrenzte Zahl von Versuchen an.",
    beleg: "lib/rateLimit.ts",
  },
  {
    titel: "Inhaltsrichtlinie",
    text: "Die Seiten laden Skripte, Schriften und Bilder nur von Sorrida selbst. Eine Inhaltsrichtlinie im Browser setzt das durch. Es gibt keine Werbe- oder Analyse-Dienste.",
    beleg: "next.config.js",
  },
  {
    titel: "Geburtsdatum im Patientenportal",
    text: `Vor Unterschrift und Lastschrift fragt das Patientenportal das Geburtsdatum ab. Nach ${MAX_FEHLVERSUCHE} falschen Eingaben ist die Bestätigung für ${SPERRE_MINUTEN} Minuten gesperrt, bei weiteren Fehlversuchen länger.`,
    beleg: "lib/portalPruefung.ts",
  },
  {
    titel: "Passwörter und Links",
    text: `Passwörter werden nur als Hash gespeichert, ebenso die Schlüssel der Patienten-Links. Die Übertragung läuft über HTTPS. Sitzungen enden nach höchstens ${SITZUNG_MAX_SEKUNDEN / 3600} Stunden.`,
    beleg: "app/avv/page.tsx Anlage 1, lib/sitzung.ts",
  },
  {
    titel: "Fehlerberichte ohne Patientendaten",
    text: "Tritt ein Fehler auf, speichert Sorrida den Ort und eine gekürzte Meldung. Namen, Adressen, Nummern und Texte in Anführungszeichen werden vorher entfernt. Die Einträge liegen in der Datenbank von Sorrida. Über neue Fehler geht einmal am Tag eine E-Mail an den Betreiber, mit Anzahl und Ort und ohne Meldungstext.",
    beleg: "lib/fehlerlog.ts, lib/fehlerSpeicher.ts",
  },
];

/** Was es noch nicht gibt. Ehrlich und ohne Beschönigung. */
export const NOCH_NICHT: Punkt[] = [
  { titel: "Kein Zertifikat", text: "Sorrida hat kein Zertifikat einer Prüfstelle, zum Beispiel nach ISO 27001 oder C5.", beleg: "Stand des Betriebs" },
  { titel: "Kein unabhängiger Sicherheitstest", text: "Bisher hat keine unabhängige Stelle die Anwendung auf Schwachstellen geprüft.", beleg: "Stand des Betriebs" },
  { titel: "Wiederherstellung noch nicht geübt", text: "Der Datenbank-Anbieter sichert die Daten. Das Zurückspielen einer Sicherung wurde noch nicht als Übung durchgeführt.", beleg: "docs/BETRIEB.md" },
  { titel: "Betrieb durch eine Einzelperson", text: "Sorrida wird von einer Person betrieben. Es gibt keine Bereitschaft rund um die Uhr und keine Vertretung.", beleg: "Stand des Betriebs" },
];

/** Alle Sätze der Seite, für die Prüfung der Wortwahl. */
export function alleTexte(): string[] {
  return [...ORT, ...SCHUTZ, ...NOCH_NICHT].flatMap((p) => [p.titel, p.text]).concat(KI_GEHT, KI_ERSETZT, KI_HINWEISE);
}
