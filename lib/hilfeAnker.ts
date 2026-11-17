// Anker für „Zeig mir wo“ (Frag Sorrida). Jeder Anker ist ein Attribut data-hilfe="…" an einem Bedienelement
// der App. Die Hilfe-Einträge (lib/hilfeWissen) verweisen auf diese Schlüssel; components/HilfeZeiger.tsx
// sucht das Element, scrollt dorthin und markiert es.
//
// lib/hilfeAnker.test.ts liest app/ und components/ von der Platte und prüft in beide Richtungen:
// Jeder Schlüssel hier steht als data-hilfe im Code, und jedes data-hilfe im Code steht hier.
// Reine Daten ohne Abhängigkeiten (außer den ebenso reinen Fragen des Praxismanagers), damit nichts davon die Website schwerer macht.

import { FRAGEN, PM_THEMEN, type ThemaId } from "@/lib/praxisManagerFragen";

export interface AnkerInfo {
  /** Seite, auf der das Element steht. Dynamische Teile wie [id] stehen in eckigen Klammern. */
  seite: string;
  /** So heißt das Element für Menschen, z. B. in „Hier: Knopf „Neuer Vorschlag““. */
  name: string;
  /** Steht in jeder Seite der App (Seitenleiste, Kopfzeile). */
  ueberall?: boolean;
  /** Steht am Handy im Menü: Der Zeiger öffnet es, wenn das Element sonst nicht sichtbar ist. */
  imMenue?: boolean;
}

/** Bedienelemente auf den Seiten der App. */
export const SEITEN_ANKER = {
  // Heute
  einrichtung: { seite: "/dashboard", name: "Liste „Ihre Praxis einrichten“" },
  "heute-termine": { seite: "/dashboard", name: "Bereich „Termine heute“" },
  "eingang-liste": { seite: "/eingang", name: "Liste im Eingang" },
  "eingang-wege": { seite: "/eingang", name: "Hinweis „Was wo ankommt“" },
  "eingang-meldungen": { seite: "/eingang", name: "Meldungen des Browsers" },
  "morgen-mail": { seite: "/eingang", name: "Morgen-Mail" },
  "termin-eintragen": { seite: "/termine", name: "Knopf „Termin eintragen“" },
  "termine-auslastung": { seite: "/termine", name: "Auslastung" },
  warteliste: { seite: "/termine", name: "Warteliste" },
  terminanfragen: { seite: "/termine", name: "Online-Anfragen neuer Patienten" },
  "praxismanager-frage": { seite: "/praxismanager", name: "Feld für Ihre Frage an den Praxismanager" },
  "praxismanager-themen": { seite: "/praxismanager", name: "Themen des Praxismanagers" },
  "vorsorge-liste": { seite: "/vorsorge", name: "Liste „Vorsorge fällig“" },
  "empfang-uebergabe": { seite: "/empfang", name: "Übergabe an den Patienten" },
  "mein-bereich-schloss": { seite: "/mein-bereich", name: "Bereichs-Passwort" },
  // Patienten
  "patient-neu": { seite: "/patients", name: "Knopf „Neu anlegen“" },
  "patient-liste-einlesen": { seite: "/patients", name: "Knopf „Liste einlesen“" },
  "patient-suche": { seite: "/patients", name: "Suche in der Liste" },
  "patient-formular": { seite: "/patients/new", name: "Formular „Neu anlegen“" },
  "patient-import-datei": { seite: "/patients/import", name: "Schritt „Datei wählen“" },
  "patient-kontakt": { seite: "/patients/[id]", name: "Kontakt und Stammdaten" },
  "patient-einwilligung": { seite: "/patients/[id]", name: "Einwilligungen des Patienten" },
  "patient-akte": { seite: "/patients/[id]", name: "Akte" },
  "patient-behandler": { seite: "/patients/[id]", name: "Auswahl „Behandelt von“" },
  "patient-ueberblick": { seite: "/patients/[id]", name: "Überblick vor dem Termin" },
  "patient-datenschutz": { seite: "/patients/[id]", name: "Datenschutz: Export und Löschen" },
  "abschluss-start": { seite: "/abschluss/new", name: "Formular zum Abschließen" },
  // Vorschläge und Berichte
  "vorschlag-neu": { seite: "/proposals", name: "Knopf „Neuer Vorschlag“" },
  "vorschlag-schnell": { seite: "/proposals", name: "Knopf „Schnellvorschlag ohne Akte“" },
  "vorschlag-nachfassen": { seite: "/proposals", name: "Knopf „Nachfassen“" },
  "vorschlag-stichworte": { seite: "/proposals/new", name: "Feld „Stichworte aus dem Gespräch“" },
  "vorschlag-befund-diktat": { seite: "/proposals/new", name: "Karte „Befund diktieren“" },
  "vorschlag-gespraech": { seite: "/proposals/new", name: "Schalter „Patient schaut mit“" },
  "vorschlag-patientenlink": { seite: "/proposals/[id]", name: "Patienten-Link" },
  "nachfassen-liste": { seite: "/proposals/nachfassen", name: "Liste der offenen Vorschläge" },
  "bericht-neu": { seite: "/reports", name: "Knopf „Neuer Bericht“" },
  "bericht-freigeben": { seite: "/reports/[id]", name: "Knöpfe zum Speichern und Freigeben" },
  // Geld
  "zahlungen-filter": { seite: "/zahlungen", name: "Filter Offen, Überfällig, Gemeldet, Bezahlt" },
  "zahlungen-konto": { seite: "/zahlungen", name: "Bankverbindung" },
  "zahlungen-abzurechnen": { seite: "/zahlungen", name: "Bereich „Abzurechnen“" },
  "zahlungen-sepa": { seite: "/zahlungen", name: "SEPA-Lastschrift" },
  "zahlungen-online": { seite: "/zahlungen", name: "Online-Zahlung" },
  "zahlungen-datev": { seite: "/zahlungen", name: "DATEV-Export" },
  "zahlungen-bankabgleich": { seite: "/zahlungen", name: "Kontoauszug abgleichen" },
  gebuehrenrechner: { seite: "/abrechnung", name: "Gebührenrechner" },
  "analyse-wirkung-link": { seite: "/analyse", name: "Link zum Wirkungsbericht" },
  "wirkung-ausgangswerte": { seite: "/analyse/wirkung", name: "Ausgangswerte vor dem Start" },
  // Praxis
  "leistungsverzeichnis-suche": { seite: "/leistungsverzeichnis", name: "Suche im Leistungsverzeichnis" },
  "leistungsverzeichnis-eigene": { seite: "/leistungsverzeichnis", name: "Eigene Leistung anlegen" },
  "hilfe-frage": { seite: "/hilfe-praxis", name: "Feld für Ihre Frage" },
  "suche-oeffnen": { seite: "/dashboard", name: "Suche (Strg+K)", ueberall: true },
  abmelden: { seite: "/dashboard", name: "Knopf „Abmelden“", ueberall: true, imMenue: true },
  // Einstellungen
  "fachgebiet-wahl": { seite: "/settings/fachgebiet", name: "Auswahl „Fachgebiet der Praxis“" },
  "eigene-leistungen": { seite: "/settings/fachgebiet", name: "Eigene Leistungen" },
  "preisliste-einlesen": { seite: "/settings/fachgebiet/preisliste", name: "Preisliste einlesen" },
  "praxis-angaben": { seite: "/settings/praxis", name: "Angaben der Praxis" },
  "zwei-faktor": { seite: "/settings/security", name: "Zwei-Faktor-Anmeldung" },
  "diktat-schalter": { seite: "/settings/security", name: "Diktat" },
  "ki-hilfen-schalter": { seite: "/settings/security", name: "KI-Hilfen" },
  "ansicht-schalter": { seite: "/settings/security", name: "Dunkle Ansicht" },
  "team-einladen": { seite: "/settings/team", name: "Formular „Mitglied einladen“" },
  "team-liste": { seite: "/settings/team", name: "Konten mit Rolle und Freigabe" },
  "empfang-pin": { seite: "/settings/empfang", name: "Empfangs-PIN" },
  "connector-schluessel": { seite: "/settings/connector", name: "Schlüssel für den Praxis-PC" },
  "standort-hinzufuegen": { seite: "/settings/standorte", name: "Standort hinzufügen" },
  "online-termine": { seite: "/settings/termine", name: "Online-Termine für Patienten" },
  "kalender-uebertragen": { seite: "/settings/termine", name: "Kalender der Praxis übertragen" },
  "neupatienten-buchung": { seite: "/settings/termine", name: "Termine für neue Patienten" },
  "katalog-eigene": { seite: "/settings/catalog", name: "Eigene Leistung schnell anlegen" },
  "vorlage-neu": { seite: "/settings/templates", name: "Neue Vorlage" },
  bewertungslink: { seite: "/settings/rueckmeldung", name: "Link zu Ihrem Google-Profil" },
  "protokoll-liste": { seite: "/settings/protokoll", name: "Protokoll" },
  "zwei-faktor-alle": { seite: "/settings/protokoll", name: "Zwei-Faktor-Anmeldung für alle Konten" },
  punktwerte: { seite: "/settings/billing", name: "Punktwerte" },
  vorschlagspreise: { seite: "/settings/proposals", name: "Vorschlagspreise" },
} as const satisfies Record<string, AnkerInfo>;

export type SeitenAnker = keyof typeof SEITEN_ANKER;

/**
 * Menüpunkte (Seitenleiste, Menü am Handy, untere Leiste) tragen data-hilfe="menue:<href>".
 * Damit lässt sich jede Seite zeigen, auch ohne eigenen Anker.
 */
export const MENUE_ZIELE = {
  "/dashboard": "Übersicht",
  "/eingang": "Eingang",
  "/mein-bereich": "Mein Bereich",
  "/termine": "Termine",
  "/praxismanager": "Praxismanager",
  "/vorsorge": "Vorsorge fällig",
  "/empfang": "Empfang",
  "/patients": "{P}",
  "/abschluss/new": "{A} abschließen",
  "/proposals": "Vorschläge",
  "/reports": "Berichte",
  "/zahlungen": "Zahlungen",
  "/abrechnung": "Abrechnung",
  "/abrechnungspruefung": "Abrechnungsprüfung",
  "/analyse": "Analyse",
  "/leistungsverzeichnis": "Leistungsverzeichnis",
  "/settings": "Einstellungen",
  "/hilfe-praxis": "Frag Sorrida",
} as const;
export type MenueZiel = keyof typeof MENUE_ZIELE;

/** Themen des Praxismanagers: dieselbe Liste wie in lib/praxisManager.ts (beide lesen lib/praxisManagerFragen.ts). */
export { PM_THEMEN };
export type PmThema = ThemaId;

/** Abschnitte der Startseite der Website (Attribut id="…"). */
export const WEBSITE_ANKER = {
  auftakt: { seite: "/", name: "Anfang der Startseite" },
  fach: { seite: "/", name: "Fachauswahl" },
  ansichten: { seite: "/", name: "Abschnitt „Praxis und Patient“" },
  grundsaetze: { seite: "/", name: "Grundsätze" },
  entlastung: { seite: "/", name: "Abschnitt „Entlastung“" },
  zeitrechner: { seite: "/", name: "Zeitrechner" },
  ablauf: { seite: "/", name: "Abschnitt „So läuft es“" },
  "fuer-patienten": { seite: "/", name: "Abschnitt „Was Ihre Patienten davon haben“" },
  preise: { seite: "/", name: "Preise" },
  faq: { seite: "/", name: "Häufige Fragen" },
  pilot: { seite: "/hilfe", name: "Pilotprogramm" },
} as const satisfies Record<string, AnkerInfo>;
export type WebsiteAnker = keyof typeof WEBSITE_ANKER;

export type HilfeAnker = SeitenAnker | `menue:${MenueZiel}` | `praxismanager:${PmThema}` | `praxismanager-knopf:${PmThema}` | `website:${WebsiteAnker}`;

export const menueAnker = (href: MenueZiel): HilfeAnker => `menue:${href}`;
export const istMenueAnker = (a: string): boolean => a.startsWith("menue:");

/** Beschreibung eines Ankers; null, wenn es ihn nicht gibt. */
export function ankerInfo(anker: string): AnkerInfo | null {
  // Object.hasOwn statt „in“: sonst gälten auch „toString“ oder „constructor“ als Anker.
  if (Object.hasOwn(SEITEN_ANKER, anker)) return SEITEN_ANKER[anker as SeitenAnker];
  const [art, rest] = [anker.slice(0, anker.indexOf(":")), anker.slice(anker.indexOf(":") + 1)];
  if (art === "menue" && Object.hasOwn(MENUE_ZIELE, rest)) return { seite: rest, name: `Menüpunkt „${MENUE_ZIELE[rest as MenueZiel]}“`, ueberall: true };
  if ((art === "praxismanager" || art === "praxismanager-knopf") && (PM_THEMEN as readonly string[]).includes(rest)) {
    const frage = FRAGEN[rest as PmThema];
    return { seite: "/praxismanager", name: art === "praxismanager" ? `Thema „${frage}“` : `Knopf zum Thema „${frage}“` };
  }
  if (art === "website" && Object.hasOwn(WEBSITE_ANKER, rest)) return WEBSITE_ANKER[rest as WebsiteAnker];
  return null;
}

/** CSS-Selektor für den Anker im Dokument. Website-Anker sind ids der Abschnitte. */
export function ankerSelektor(anker: string): string {
  if (anker.startsWith("website:")) return `#${anker.slice(8).replace(/[^a-z0-9-]/g, "")}`;
  return `[data-hilfe="${anker.replace(/["\\]/g, "")}"]`;
}

/** Menüpunkt, unter dem eine Seite liegt: der längste passende Menüpfad (z. B. /settings/team → /settings). */
export function menueFuer(href: string): MenueZiel | null {
  const pfad = href.split(/[?#]/)[0];
  let best: MenueZiel | null = null;
  for (const z of Object.keys(MENUE_ZIELE) as MenueZiel[]) {
    const basis = z.replace(/\/new$/, "");
    if ((pfad === z || pfad === basis || pfad.startsWith(`${basis}/`)) && (!best || z.length > best.length)) best = z;
  }
  return best;
}
