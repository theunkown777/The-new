// Rundgang durch Sorrida: Stationen für die Website (Startseite) und für die App der Praxis.
// Reine Daten und Logik, damit sie prüfbar bleiben (lib/rundgang.test.ts). Die Oberfläche steckt in
// components/RundgangKarte.tsx (gemeinsame Karte), components/start/Rundgang.tsx (Website) und
// components/AppRundgang.tsx (App).
//
// Regeln für alle Texte: beschreiben, nicht werben. Keine Wirkungsversprechen, keine Wertungen wie „beste“ oder
// „optimal“, keine „Empfehlung“. Kasse zuerst. Kein Satz darf versprechen, dass Sorrida von selbst Nachrichten an
// Patienten schickt. Die räumlichen Modelle kommen nicht vor (docs/GESTALTUNG.md).

import { PILOT_KURZ, PILOT_ZIEL, PLANS, PRICE_SHORT, SETUP_EUR, VAT_NOTE, eur } from "@/lib/pricing";

/**
 * Eintrag im Sitzungsspeicher der Website. Er wird nur geschrieben, wenn jemand bei der Einladung „Nein danke“ wählt
 * oder den Rundgang beendet, und hat nur den Wert „zu“ (app/datenschutz, lib/browserSpeicher.test.ts).
 */
export const RUNDGANG_SCHLUESSEL = "sorrida-rundgang";
export const RUNDGANG_ZU = "zu";
/** Anker in der Adresse, der den Rundgang auf der Startseite startet: „/#rundgang“. */
export const RUNDGANG_ANKER = "rundgang";
export const RUNDGANG_HREF = `/#${RUNDGANG_ANKER}`;
/** Parameter in der App: „/dashboard?rundgang=1“. */
export const RUNDGANG_PARAM = "rundgang";
/**
 * Ereignisse im Browser für die Führung im Gastzugang (components/DemoFuehrung.tsx). So können Knöpfe an anderer
 * Stelle die Führung wieder einblenden oder einen Schritt abhaken, ohne selbst den Speicher des Browsers anzufassen.
 */
export const FUEHRUNG_WIEDER_EREIGNIS = "sorrida:fuehrung-wieder";
export const FUEHRUNG_SCHRITT_EREIGNIS = "sorrida:fuehrung-schritt";

export interface RundgangLink {
  href: string;
  name: string;
  /** Nur zeigen, wenn der Gastzugang (/demo) für Besucher offen ist (lib/vorschau.ts, gastzugangOffen). */
  nurMitGastzugang?: boolean;
}

export interface WebsiteStation {
  id: string;
  /** ids auf der Startseite. Zum ersten wird gescrollt, alle werden markiert. */
  anker: string[];
  titel: string;
  text: string[];
  /** Aufzählung unter dem Text. */
  punkte?: string[];
  links?: RundgangLink[];
  /**
   * Seite, an der die Karte am Desktop steht (ab 640 px Breite). Sie soll neben dem stehen, was die Station beschreibt,
   * nicht darauf. Ohne Angabe: links. Am Handy steht die Karte immer unten über die volle Breite.
   */
  seite?: "links" | "rechts";
}

export const RUNDGANG_WEBSITE: WebsiteStation[] = [
  {
    id: "patient",
    anker: ["auftakt"],
    titel: "So sieht es Ihr Patient",
    text: [
      "Sorrida zeigt Patienten zuerst, was die Kasse zahlt. Danach folgen die weiteren Leistungen Ihrer Praxis mit dem Betrag, den sie selbst zahlen.",
      "Das Handybild zeigt ein Beispiel aus einer Hautarztpraxis: Hautkrebs-Screening als Kassenleistung für 0 €, darunter Auflichtmikroskopie als Selbstzahlerleistung für 35 € mit dem Hinweis, wann die Kasse zahlt.",
      "Patienten öffnen ihren Link ohne App und ohne Konto. Sie lesen zu Hause in Ruhe und antworten mit einem Fingertipp. Den Vorschlag gibt es in sieben Sprachen.",
    ],
  },
  {
    id: "fach",
    anker: ["fach"],
    titel: "Für Ihr Fach",
    text: [
      "Sorrida ist für Arzt-, Zahnarzt- und Therapiepraxen gedacht, vom Hausarzt über die Zahnmedizin bis zur Logopädie.",
      "Wählen Sie hier Ihr Fach. Sie sehen dann die Anlässe, Leistungen und Regeln Ihres Fachs, zum Beispiel den Festzuschuss beim Zahnersatz oder die Zuzahlung bei Heilmitteln.",
    ],
    links: [{ href: "/leistungen", name: "Leistungen von A bis Z" }],
  },
  {
    id: "weg",
    anker: ["ansichten"],
    titel: "Ein Weg, zwei Seiten",
    text: [
      "Praxis und Patient sehen denselben Weg mit fünf Stationen: Gespräch, Vorschlag, Entscheidung, Vereinbart, Bezahlt.",
      "Die Praxis sieht in der Liste „Heute“, wer als Nächstes dran ist und was jetzt zu tun ist. Die Beispielliste auf der Seite zeigt erfundene Patienten mit ihrer Station und der nächsten Aufgabe.",
      "Der Patient sieht nur seinen eigenen Weg und seinen nächsten Schritt.",
    ],
  },
  {
    id: "ablauf",
    anker: ["ablauf"],
    titel: "Was nach dem Gespräch entsteht",
    text: ["Der Ablauf ist in jeder Praxis gleich:"],
    punkte: [
      `Sie öffnen Sorrida aus Ihrer Praxissoftware: Arztpraxen über GDT, Zahnarztpraxen über VDDS-media. Die Anbindung gibt es ab dem Paket „${PLANS[1].name}“. Ohne Anbindung wählen Sie die Person direkt in Sorrida.`,
      "Sie wählen Befund oder Anlass. Die Kassenleistung steht zuerst, daneben die Leistungen aus Ihrer Preisliste mit dem Eigenanteil.",
      "Der Patient bekommt seinen Link per QR-Code oder SMS und entscheidet zu Hause.",
      "Vereinbarungen, Anträge, Fristen und Termine stehen danach auf der To-do-Liste des Teams.",
    ],
    links: [{ href: "/vorschau", name: "Vorschau: Praxis, Patient und Ergebnis nebeneinander" }],
  },
  {
    id: "alltag",
    anker: ["fuer-patienten"],
    titel: "Für Patienten und den Praxisalltag",
    text: [
      "Für Patienten gibt es Termine ohne Telefon, eine digitale Anamnese vor dem Besuch und Nachrichten per WhatsApp nur mit Einwilligung. Alles, was Patienten schicken, steht für die Praxis in einem Eingang.",
      "Nachrichten an Patienten gehen nur raus, wenn jemand in der Praxis sie auslöst. Von selbst verschickt Sorrida nichts an Patienten.",
      "In der App der Praxis gibt es außerdem:",
    ],
    punkte: [
      "Termine mit Online-Buchung und Warteliste, dazu die Liste „Vorsorge fällig“",
      "Praxismanager mit den Aufgaben des Tages",
      "Zahlungen: Rechnung, GiroCode, Raten, Lastschrift, Bankabgleich und DATEV-Export",
      "Analyse mit Vergleich zum Zeitraum davor, ohne Wertung",
      "Empfang am Tablet im Wartezimmer",
      "Berichte aus der Akte, auf Wunsch per Diktat, und eine Abrechnungsprüfung: Sie zeigt, was in den letzten zwölf Monaten nicht abgerechnet oder fehlerhaft erfasst wurde.",
      `Patientenliste aus der bisherigen Software einlesen. Im Paket „${PLANS[2].name}“ mehrere Standorte mit Terminen und Auslastung je Standort.`,
      "Suche über alles mit Strg+K, Rollen und Zwei-Faktor-Anmeldung",
      "KI-Hilfen, je Praxis zuschaltbar und anfangs ausgeschaltet. Namen und Kontaktdaten gehen nie an den KI-Dienst.",
    ],
    links: [{ href: "/neu", name: "Neu in Sorrida" }],
  },
  {
    id: "grundsaetze",
    anker: ["grundsaetze"],
    titel: "Fünf Grundsätze",
    text: ["An diese Regeln hält sich jede Ansicht:"],
    punkte: [
      "Kasse zuerst: Jeder Betrag baut auf dem Kassenanteil auf.",
      "Nutzen nur mit Quelle: Wo eine Bewertung des IGeL-Monitors hinterlegt ist, steht sie wörtlich mit Quelle beim Angebot. Eine eigene Wertung gibt Sorrida nicht ab.",
      "Ein Weg statt Listen: Praxis und Patient sehen denselben Weg.",
      "Das Geld bleibt in der Praxis: Bei Zahlung per GiroCode geht der volle Betrag direkt aufs Praxiskonto.",
      "Ein Preis, keine Zähler.",
    ],
    links: [{ href: "/vertrauen", name: "So geht Sorrida mit Daten um" }],
  },
  {
    id: "entlastung",
    anker: ["entlastung", "zeit"],
    titel: "Was Praxen belastet",
    text: [
      "Hier steht zu jeder Belastung im Praxisalltag eine Quelle und daneben, was Sorrida davon übernimmt.",
      "Darunter folgt ein Zeitrechner. Er rechnet nur mit Ihren eigenen Annahmen: Gespräche pro Woche, Anteil der Rückfragen, Minuten je Rückfrage und Minuten fürs Schreiben. Gemessen ist dabei nichts.",
    ],
  },
  {
    id: "preise",
    anker: ["preise", "ausprobieren"],
    // Rechts: So bleiben Einzelpraxis und Praxis mit allen Preisen frei; die Karte steht über der Liste des MVZ.
    seite: "rechts",
    titel: "Preise und Ausprobieren",
    text: [
      `Drei Pakete mit festem Monatspreis: ${PRICE_SHORT}. Was im Paket steht, ist drin. Es gibt keine Zähler.`,
      `Das sind die geplanten Preise ab dem allgemeinen Start. Zurzeit nehmen wir nur Pilotpraxen auf. ${PILOT_KURZ}. Die Einrichtung kostet einmalig ${eur(SETUP_EUR)}, für Pilotpraxen ist sie kostenlos.`,
      VAT_NOTE,
      "Zum Ausprobieren und Weiterlesen:",
    ],
    links: [
      { href: "/vorschau", name: "Vorschau ohne Anmeldung" },
      { href: "/demo", name: "Demo-Praxis öffnen", nurMitGastzugang: true },
      { href: PILOT_ZIEL, name: "Pilotplatz anfragen" },
      { href: "/rechner", name: "Rechner für Zuzahlung und Eigenanteil" },
      { href: "/ratgeber", name: "Ratgeber für Praxisteams" },
    ],
  },
];

/** Stationen der Website; Links zum Gastzugang nur, wenn er für Besucher offen ist. */
export function rundgangWebsite(gastzugang: boolean): WebsiteStation[] {
  return RUNDGANG_WEBSITE.map((s) => (s.links ? { ...s, links: s.links.filter((l) => gastzugang || !l.nurMitGastzugang) } : s));
}

// ---- App der Praxis ----

export type AppRecht = "zahlungen" | "analyse";

export interface AppStation {
  id: string;
  /** Seite unter app/(app). */
  pfad: string;
  titel: string;
  text: string[];
  /** Nur für Konten mit diesem Recht (lib/rollen.ts, menueRechte). */
  recht?: AppRecht;
  /** Ohne Recht auf die Einstellungen der Praxis: andere Fassung (wie im Menü „Mein Konto“). */
  ohneEinstellungen?: { titel: string; text: string[] };
}

// Platzhalter: {personen} (Patienten, Klienten …), {abschluss} (Behandlung, Versorgung …).
export const RUNDGANG_APP: AppStation[] = [
  {
    id: "uebersicht",
    pfad: "/dashboard",
    titel: "Übersicht",
    text: [
      "Hier beginnt der Tag. Oben stehen die Termine von heute, daneben Auslastung, Aufgaben und Ausfallquote.",
      "Darunter sehen Sie, wie viele {personen} an welcher Station ihres Wegs stehen. Neue Rückmeldungen meldet ein Hinweis zum Eingang.",
      "Im Menü stehen außerdem: Mein Bereich mit nur Ihren eigenen {personen} und Zahlen, der Praxismanager mit Antworten aus Ihren Daten nach festen Regeln und der Empfang für das Tablet im Wartezimmer.",
    ],
  },
  {
    id: "eingang",
    pfad: "/eingang",
    titel: "Eingang",
    text: [
      "Was {personen} von sich aus schicken, steht hier gesammelt: gemeldete Zahlungen, abgeschickte Anamnesebögen, Antworten auf Vorschläge und gebuchte Termine.",
      "Jeder Eintrag sagt, was jetzt zu tun ist. Von selbst geht keine Nachricht an {personen} raus.",
    ],
  },
  {
    id: "patienten",
    pfad: "/patients",
    titel: "{personen} und Wege",
    text: [
      "Die Liste aller {personen}. Jede Zeile zeigt den Weg mit fünf Stationen: Gespräch, Vorschlag, Entscheidung, Vereinbart, Bezahlt.",
      "In der Akte stehen Vorschläge, Rechnungen, Anamnese, Termine und Einwilligungen. Dort legen Sie auch Berichte an, auf Wunsch per Diktat.",
      "Neue {personen} legen Sie hier an. Eine Liste aus Ihrer bisherigen Software liest die Praxisleitung hier ein.",
    ],
  },
  {
    id: "abschluss",
    pfad: "/abschluss/new",
    titel: "{abschluss} abschließen",
    text: [
      "Nach dem Gespräch wählen Sie hier die Person und erfassen in einem Schritt, was besprochen wurde.",
      "Daraus entstehen der Vorschlag mit der Kassenleistung zuerst, das Schreiben für die Person und die To-dos für das Team. Für den Rundgang müssen Sie nichts ausfüllen.",
    ],
  },
  {
    id: "vorschlaege",
    pfad: "/proposals",
    titel: "Vorschläge",
    text: [
      "Alle Vorschläge mit ihrem Stand. Ein Vorschlag zeigt zuerst die Kassenleistung und dann die weiteren Leistungen mit dem Eigenanteil.",
      "Den persönlichen Link erzeugen Sie im Vorschlag. Er geht per QR-Code, SMS oder E-Mail raus, wenn Sie das auslösen.",
      "Im Menü finden Sie außerdem die Abrechnung mit den Abrechnungsarten Ihres Fachs und die Abrechnungsprüfung. Sie zeigt, was in den letzten zwölf Monaten nicht abgerechnet oder fehlerhaft erfasst wurde.",
    ],
  },
  {
    id: "termine",
    pfad: "/termine",
    titel: "Termine",
    text: [
      "Der Tagesplan der Praxis. Hier tragen Sie Termine ein, sehen Anfragen aus der Online-Buchung und führen die Warteliste.",
      "Bei der Online-Buchung sehen {personen} nur Zeiten, die frei sind. Wer zur Vorsorge fällig ist, steht im Menü unter „Vorsorge fällig“.",
    ],
  },
  {
    id: "zahlungen",
    pfad: "/zahlungen",
    titel: "Zahlungen",
    recht: "zahlungen",
    text: [
      "Rechnungen, offene Beträge und Raten an einem Ort. Bei Zahlung per GiroCode geht der Betrag direkt aufs Praxiskonto.",
      "Den Kontoauszug gleichen Sie hier mit den Rechnungen ab. Für die Steuerberatung gibt es den DATEV-Export.",
    ],
  },
  {
    id: "analyse",
    pfad: "/analyse",
    titel: "Analyse",
    recht: "analyse",
    text: [
      "Zahlen aus Ihren Vorschlägen und Rechnungen über die Zeit. Vergleiche nennen nur Zahl und Richtung, ohne Wertung.",
      "Sichtbar ist die Analyse nur für Konten mit Freigabe.",
    ],
  },
  {
    id: "einstellungen",
    pfad: "/settings",
    titel: "Einstellungen",
    text: [
      "Fachgebiet und Preise, Angaben der Praxis, Team und Rollen, Online-Termine und die Anbindung an die Praxissoftware.",
      "Das Leistungsverzeichnis im Menü zeigt die amtlichen Leistungen Ihres Fachs. Was Ihre Praxis anbietet, übernehmen Sie von dort in Ihren Katalog.",
      "Unter Sicherheit richten Sie die Zwei-Faktor-Anmeldung ein und schalten die KI-Hilfen ein oder aus. Sie sind anfangs aus.",
    ],
    ohneEinstellungen: {
      titel: "Mein Konto",
      text: [
        "Ihr eigenes Konto: Unter Sicherheit richten Sie die Zwei-Faktor-Anmeldung ein. Dazu gibt es das Leistungslexikon zum Nachschlagen.",
        "Im Leistungsverzeichnis im Menü schlagen Sie die amtlichen Leistungen Ihres Fachs nach.",
        "Die Einstellungen der Praxis verwaltet die Praxisleitung.",
      ],
    },
  },
  {
    id: "frag",
    pfad: "/hilfe-praxis",
    titel: "Frag Sorrida",
    text: [
      "Fragen zur Bedienung stellen Sie hier in eigenen Worten. Die Antworten kommen aus einer festen Sammlung von Hilfetexten. „Zeig mir wo“ führt zur passenden Stelle und markiert sie. Dieselbe Hilfe erreichen Sie auf jeder Seite über den Knopf „Frag Sorrida“ unten rechts.",
      "Mit Strg+K (am Mac ⌘K) suchen Sie überall nach {personen}, Vorschlägen, Rechnungen und Seiten. Die Taste ? zeigt alle Tastenkürzel. Diesen Rundgang starten Sie auf dieser Seite jederzeit neu.",
    ],
  },
];

export interface AppKontext {
  rechte: { zahlungen: boolean; analyse: boolean; einstellungen: boolean };
  /** „Patienten“, „Klienten“ … (lib/fachprofile.ts) */
  personPl: string;
  /** „Behandlung“, „Versorgung“ … (lib/fachprofile.ts, abschlussWort) */
  abschluss: string;
}

export interface AppStationFertig {
  id: string;
  pfad: string;
  titel: string;
  text: string[];
}

const einsetzen = (t: string, k: AppKontext) => t.replaceAll("{personen}", k.personPl).replaceAll("{abschluss}", k.abschluss);

/** Stationen für dieses Konto: nach Rechten gefiltert, Platzhalter ersetzt. */
export function appStationen(k: AppKontext): AppStationFertig[] {
  return RUNDGANG_APP.filter((s) => !s.recht || k.rechte[s.recht]).map((s) => {
    const fassung = !k.rechte.einstellungen && s.ohneEinstellungen ? s.ohneEinstellungen : s;
    return { id: s.id, pfad: s.pfad, titel: einsetzen(fassung.titel, k), text: fassung.text.map((t) => einsetzen(t, k)) };
  });
}

/** Adresse einer Station in der App (n zählt ab 1). */
export const appStationHref = (stationen: AppStationFertig[], n: number) => `${stationen[n - 1]?.pfad ?? "/dashboard"}?${RUNDGANG_PARAM}=${n}`;
/** Start des Rundgangs in der App. */
export const APP_RUNDGANG_START = `/dashboard?${RUNDGANG_PARAM}=1`;

/** „?rundgang=3“ lesen: ganze Zahl zwischen 1 und der Zahl der Stationen, sonst null. */
export function rundgangNummer(wert: string | null | undefined, anzahl: number): number | null {
  if (!wert || !/^\d{1,2}$/.test(wert)) return null;
  const n = Number(wert);
  return n >= 1 && n <= anzahl ? n : null;
}

/** Hinweis auf dem Dashboard: nur echte Praxen, deren Konto (die Praxis, nicht die Person) jünger als 30 Tage ist. */
export const RUNDGANG_HINWEIS_TAGE = 30;
export function rundgangHinweisZeigen(praxisSeit: Date | null | undefined, demo: boolean, jetzt: Date = new Date()): boolean {
  if (demo || !praxisSeit) return false;
  return jetzt.getTime() - praxisSeit.getTime() < RUNDGANG_HINWEIS_TAGE * 86_400_000;
}
