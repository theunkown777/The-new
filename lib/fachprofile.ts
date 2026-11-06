// Fachprofil: Was jede Richtung anders braucht. Begriffe (Patient, Kunde,
// Klient), wer behandelt, ob die Patientenschaft auf ein Geschlecht
// beschränkt ist, wie die Region einer Leistung heißt, in welchem Stil
// Berichte geschrieben werden, typische Terminanlässe und Sitzungstypen mit
// ihren Leistungen. Alle Stellen in Sorrida lesen hier, damit kein Fach mehr
// zahnärztliche Begriffe oder Vorlagen sieht.
//
// Gebührenziffern stehen nur dort, wo sie eindeutig sind; „–“ heißt: Position
// ist fachlich richtig, die Ziffer prüft die Praxis in ihrer Gebührenordnung
// bzw. Vergütungsvereinbarung (wie im zahnärztlichen Katalog).

export type System = "EBM" | "GOAE" | "HEILMITTEL" | "PFLEGE" | "HEBAMME" | "APO" | "HILFSMITTEL" | "SELBST" | "SONSTIGES";

export interface FachLeistung {
  key: string;
  title: string;
  system: System;
  code: string;
  category: string;
  /** Region/Seite sinnvoll (Auge, Ohr, Körperregion …) */
  region?: boolean;
}

export interface Sitzungstyp {
  name: string;
  description: string;
  leistungen: FachLeistung[];
}

export interface FachProfil {
  person: { sg: string; pl: string };
  einrichtung: string;
  /** Wer die Leistung erbringt, im Fließtext („Ihre Ärztin oder Ihr Arzt“) */
  fachkraft: string;
  /** Patientenschaft nur ein Geschlecht (Gynäkologie, Hebammenhilfe) */
  nurGeschlecht?: "W" | "M";
  /** Anteil Frauen für Demo-Daten (realistisch, z. B. Urologie rund 30 %) */
  frauenAnteil: number;
  alter: [number, number, number];
  /** Bezeichnung des Regionsfelds in der Leistungserfassung; null = ausblenden */
  region: string | null;
  /** Stil für KI-Berichte */
  berichtStil: string;
  /** Typische Terminanlässe (Demo, Vorschläge in der Terminmaske) */
  termine: string[];
  sitzungstypen: Sitzungstyp[];
}

let n = 0;
const L = (fach: string, title: string, system: System, code: string, category: string, region = false): FachLeistung => ({
  key: `${fach}_${++n}`, title, system, code, category, region,
});

const arzt = (fach: string, f: Omit<FachProfil, "person" | "einrichtung" | "fachkraft"> & Partial<Pick<FachProfil, "person" | "einrichtung" | "fachkraft">>): FachProfil => ({
  person: { sg: "Patient", pl: "Patienten" },
  einrichtung: "Praxis",
  fachkraft: "Ihre Ärztin oder Ihr Arzt",
  ...f,
});

// Häufige ärztliche Grundpositionen
const beratung = (f: string) => L(f, "Beratung", "GOAE", "1", "Beratung");
const eingehendeBeratung = (f: string) => L(f, "Eingehende Beratung (mind. 10 Minuten)", "GOAE", "3", "Beratung");
const symptomUnters = (f: string) => L(f, "Symptombezogene Untersuchung", "GOAE", "5", "Untersuchung");
const grundpauschale = (f: string) => L(f, "Grundpauschale (fachärztliches Kapitel)", "EBM", "–", "Pauschale");
const blutentnahme = (f: string) => L(f, "Blutentnahme venös", "GOAE", "250", "Labor");
const ultraschall = (f: string, was: string) => L(f, `Ultraschall ${was}`, "GOAE", "410", "Bildgebung", true);

export const FACHPROFILE: Record<string, FachProfil> = {
  zahn: arzt("zahn", {
    fachkraft: "Ihre Zahnärztin oder Ihr Zahnarzt",
    frauenAnteil: 0.52, alter: [3, 95, 45], region: "Zahn/Region",
    berichtStil: "zahnmedizinischer Fachstil mit Zahnangaben nach FDI-Schema",
    termine: ["Kontrolle", "Füllung", "Professionelle Zahnreinigung", "Schmerzbehandlung", "Beratung Zahnersatz", "Wurzelbehandlung", "Implantatberatung"],
    sitzungstypen: [], // zahnärztliche Vorlagen stehen im Seed (BEMA/GOZ-Katalog)
  }),
  hausarzt: arzt("hausarzt", {
    frauenAnteil: 0.53, alter: [16, 95, 52], region: "Körperregion",
    berichtStil: "allgemeinmedizinischer Stil, Arztbrief mit Anamnese, Befund, Diagnose (ICD-10), Therapie",
    termine: ["Akutsprechstunde", "Check-up", "Impfung", "Blutabnahme", "Befundbesprechung", "Chronikerkontrolle (DMP)", "Hausbesuch"],
    sitzungstypen: [
      { name: "Akutsprechstunde", description: "Infekt, Schmerzen oder neue Beschwerden", leistungen: [L("hausarzt", "Versichertenpauschale", "EBM", "03000", "Pauschale"), symptomUnters("hausarzt"), beratung("hausarzt"), L("hausarzt", "Arbeitsunfähigkeitsbescheinigung (eAU)", "SONSTIGES", "–", "Bescheinigung")] },
      { name: "Gesundheitsuntersuchung (Check-up)", description: "Ab 35 alle drei Jahre, einmalig 18–34", leistungen: [L("hausarzt", "Gesundheitsuntersuchung", "EBM", "01732", "Vorsorge"), blutentnahme("hausarzt"), L("hausarzt", "Hautkrebs-Screening zusammen mit Check-up", "EBM", "01746", "Vorsorge"), eingehendeBeratung("hausarzt")] },
      { name: "Chronikerkontrolle / DMP", description: "Diabetes, KHK, Asthma, COPD, Hypertonie", leistungen: [L("hausarzt", "Chronikerpauschale", "EBM", "03220", "Pauschale"), L("hausarzt", "DMP-Dokumentation", "SONSTIGES", "–", "Dokumentation"), blutentnahme("hausarzt"), L("hausarzt", "Ruhe-EKG", "GOAE", "651", "Diagnostik")] },
      { name: "Impfsprechstunde", description: "Impfungen nach STIKO, Reiseimpfungen", leistungen: [L("hausarzt", "Schutzimpfung", "GOAE", "375", "Impfung"), L("hausarzt", "Impfberatung", "GOAE", "1", "Beratung"), L("hausarzt", "Impfpass-Eintrag", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Hausbesuch", description: "Besuch bei immobilen Patienten", leistungen: [L("hausarzt", "Hausbesuch", "EBM", "–", "Besuch"), L("hausarzt", "Wegegeld", "EBM", "–", "Besuch"), symptomUnters("hausarzt")] },
    ],
  }),
  augen: arzt("augen", {
    frauenAnteil: 0.56, alter: [3, 95, 58], region: "Auge (rechts / links / beidseits)",
    berichtStil: "augenärztlicher Stil mit Visus, Tensio und Befund je Auge (RA/LA)",
    termine: ["Kontrolle", "Glaukomvorsorge", "Sehtest", "Netzhautuntersuchung", "Kontaktlinsenanpassung", "OP-Vorbesprechung Katarakt"],
    sitzungstypen: [
      { name: "Augenärztliche Untersuchung", description: "Sehschärfe, vorderer Augenabschnitt, Augenhintergrund", leistungen: [grundpauschale("augen"), L("augen", "Visusbestimmung / Refraktion", "SONSTIGES", "–", "Diagnostik", true), L("augen", "Spaltlampenmikroskopie", "GOAE", "1240", "Diagnostik", true), L("augen", "Binokulare Untersuchung des Augenhintergrunds", "GOAE", "1242", "Diagnostik", true)] },
      { name: "Glaukom-Früherkennung", description: "Augendruck und Sehnerv ohne Verdacht (IGeL)", leistungen: [L("augen", "Augeninnendruckmessung (Tonometrie)", "GOAE", "–", "Diagnostik", true), L("augen", "Sehnervbeurteilung", "GOAE", "–", "Diagnostik", true), L("augen", "OCT der Papille", "GOAE", "–", "Bildgebung", true), beratung("augen")] },
      { name: "Kontaktlinsenanpassung", description: "Messung, Anpassung, Kontrolle", leistungen: [L("augen", "Hornhautvermessung", "GOAE", "–", "Diagnostik", true), L("augen", "Kontaktlinsenanpassung", "GOAE", "–", "Anpassung", true), beratung("augen")] },
    ],
  }),
  haut: arzt("haut", {
    frauenAnteil: 0.58, alter: [2, 95, 46], region: "Lokalisation",
    berichtStil: "dermatologischer Stil mit Lokalisation, Morphologie und Diagnose",
    termine: ["Hautkrebs-Screening", "Muttermal-Kontrolle", "Akne", "Ekzem / Neurodermitis", "Psoriasis", "Kleiner Eingriff", "Ästhetik-Beratung"],
    sitzungstypen: [
      { name: "Hautkrebs-Screening", description: "Ab 35 alle zwei Jahre Kassenleistung", leistungen: [L("haut", "Früherkennungsuntersuchung auf Hautkrebs", "EBM", "01745", "Vorsorge"), L("haut", "Auflichtmikroskopie (Dermatoskopie)", "GOAE", "–", "Diagnostik", true), beratung("haut")] },
      { name: "Dermatologische Sprechstunde", description: "Ekzem, Psoriasis, Akne, Infekte", leistungen: [grundpauschale("haut"), L("haut", "Untersuchung des gesamten Hautorgans", "GOAE", "7", "Untersuchung"), L("haut", "Abstrich / Pilzkultur", "SONSTIGES", "–", "Labor", true), beratung("haut")] },
      { name: "Kleiner operativer Eingriff", description: "Exzision mit Histologie", leistungen: [L("haut", "Lokalanästhesie", "GOAE", "–", "Eingriff", true), L("haut", "Exzision einer Hautveränderung", "GOAE", "–", "Eingriff", true), L("haut", "Histologische Untersuchung (Einsendung)", "SONSTIGES", "–", "Labor"), L("haut", "Wundversorgung / Naht", "GOAE", "–", "Eingriff", true)] },
    ],
  }),
  gyn: arzt("gyn", {
    nurGeschlecht: "W", frauenAnteil: 1, alter: [14, 90, 42], region: null,
    person: { sg: "Patientin", pl: "Patientinnen" },
    fachkraft: "Ihre Frauenärztin oder Ihr Frauenarzt",
    berichtStil: "gynäkologischer Stil mit Zyklusanamnese, Befund und Empfehlung",
    termine: ["Krebsfrüherkennung", "Schwangerschaftsvorsorge", "Verhütungsberatung", "Spirale einsetzen", "Wechseljahre", "Ultraschall", "Befundbesprechung"],
    sitzungstypen: [
      { name: "Krebsfrüherkennung", description: "Nach Richtlinie, ab 20 jährlich, ab 35 Ko-Test alle drei Jahre", leistungen: [L("gyn", "Krebsfrüherkennungsuntersuchung der Frau", "EBM", "01730", "Vorsorge"), L("gyn", "Zytologischer Abstrich / HPV-Test", "EBM", "–", "Vorsorge"), L("gyn", "Tastuntersuchung der Brust (ab 30)", "EBM", "–", "Vorsorge"), L("gyn", "Vaginaler Ultraschall (auf Wunsch, IGeL)", "GOAE", "–", "Bildgebung")] },
      { name: "Schwangerschaftsvorsorge", description: "Nach Mutterschafts-Richtlinien", leistungen: [L("gyn", "Mutterschaftsvorsorge (Betreuungspauschale)", "EBM", "–", "Vorsorge"), L("gyn", "Ultraschall nach Mutterschafts-Richtlinien", "EBM", "–", "Bildgebung"), blutentnahme("gyn"), L("gyn", "Mutterpass-Eintrag", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Verhütungsberatung", description: "Pille, Spirale, Implantat", leistungen: [eingehendeBeratung("gyn"), L("gyn", "Einlage eines Intrauterinpessars", "GOAE", "–", "Eingriff"), L("gyn", "Lagekontrolle per Ultraschall", "GOAE", "–", "Bildgebung"), L("gyn", "Rezept (Kasse bis 22. Geburtstag)", "SONSTIGES", "–", "Verordnung")] },
    ],
  }),
  uro: arzt("uro", {
    frauenAnteil: 0.32, alter: [16, 95, 60], region: "Seite / Organ",
    berichtStil: "urologischer Stil mit Miktionsanamnese, Urinbefund, Sonographie und Empfehlung",
    termine: ["Krebsfrüherkennung (Mann)", "Harnwegsinfekt", "Inkontinenz-Sprechstunde", "Nierenstein", "PSA-Kontrolle", "Ultraschall Nieren/Blase", "Befundbesprechung"],
    sitzungstypen: [
      { name: "Krebsfrüherkennung Mann", description: "Ab 45 jährlich, nur Männer", leistungen: [L("uro", "Krebsfrüherkennungsuntersuchung beim Mann", "EBM", "01731", "Vorsorge"), L("uro", "Tastuntersuchung der Prostata", "EBM", "–", "Vorsorge"), L("uro", "PSA-Test (IGeL ohne Verdacht)", "GOAE", "–", "Labor"), eingehendeBeratung("uro")] },
      { name: "Harnwegsinfekt / Blasenbeschwerden", description: "Frauen und Männer", leistungen: [grundpauschale("uro"), L("uro", "Urinstatus und Urinkultur", "SONSTIGES", "–", "Labor"), ultraschall("uro", "von Nieren und Blase"), L("uro", "Restharnbestimmung", "GOAE", "–", "Diagnostik")] },
      { name: "Inkontinenz-Sprechstunde", description: "Belastungs- und Dranginkontinenz, Frauen und Männer", leistungen: [L("uro", "Miktionstagebuch auswerten", "SONSTIGES", "–", "Diagnostik"), ultraschall("uro", "Blase / Beckenboden"), L("uro", "Verordnung Beckenbodentraining (Heilmittel)", "SONSTIGES", "–", "Verordnung"), eingehendeBeratung("uro")] },
      { name: "Nierenstein", description: "Kolik, Kontrolle, Nachsorge", leistungen: [ultraschall("uro", "der Nieren"), L("uro", "Steinanalyse (Einsendung)", "SONSTIGES", "–", "Labor"), beratung("uro")] },
    ],
  }),
  ortho: arzt("ortho", {
    frauenAnteil: 0.55, alter: [6, 95, 52], region: "Körperregion / Seite",
    berichtStil: "orthopädisch-unfallchirurgischer Stil mit Lokalisation, Seitenangabe, Funktionsbefund und Bildgebung",
    termine: ["Rückenschmerz", "Gelenkschmerz", "Sportverletzung", "Arbeitsunfall (BG)", "Kontrolle nach OP", "Osteoporose-Abklärung", "Einlagenversorgung"],
    sitzungstypen: [
      { name: "Orthopädische Untersuchung", description: "Rücken, Gelenke, Bewegungsapparat", leistungen: [grundpauschale("ortho"), L("ortho", "Untersuchung der Stütz- und Bewegungsorgane", "GOAE", "7", "Untersuchung", true), L("ortho", "Röntgen (Region)", "GOAE", "–", "Bildgebung", true), L("ortho", "Verordnung Physiotherapie", "SONSTIGES", "–", "Verordnung")] },
      { name: "Arbeits- oder Wegeunfall (D-Arzt)", description: "Abrechnung mit der Berufsgenossenschaft", leistungen: [L("ortho", "Durchgangsarztbericht", "SONSTIGES", "–", "BG", true), L("ortho", "Untersuchung und Erstversorgung", "SONSTIGES", "–", "BG", true), L("ortho", "Röntgen (Region)", "SONSTIGES", "–", "Bildgebung", true)] },
      { name: "Injektion / Gelenkbehandlung", description: "Infiltration, Hyaluron (IGeL), Stoßwelle (IGeL)", leistungen: [L("ortho", "Gelenkinjektion", "GOAE", "–", "Therapie", true), L("ortho", "Hyaluronsäure-Injektion (IGeL)", "GOAE", "–", "Therapie", true), L("ortho", "Stoßwellentherapie (IGeL)", "GOAE", "–", "Therapie", true)] },
    ],
  }),
  hno: arzt("hno", {
    frauenAnteil: 0.5, alter: [1, 95, 45], region: "Seite (rechts / links / beidseits)",
    berichtStil: "HNO-ärztlicher Stil mit Seitenangabe, Spiegelbefund, Audiometrie",
    termine: ["Hörtest", "Ohrenschmerzen", "Nasennebenhöhlen", "Allergie / Hyposensibilisierung", "Schnarchen", "Tinnitus", "Hörgeräte-Verordnung"],
    sitzungstypen: [
      { name: "HNO-Untersuchung", description: "Ohr, Nase, Rachen, Kehlkopf", leistungen: [grundpauschale("hno"), L("hno", "Vollständige HNO-Untersuchung", "GOAE", "6", "Untersuchung"), L("hno", "Ohrmikroskopie", "GOAE", "–", "Diagnostik", true), L("hno", "Nasenendoskopie", "GOAE", "–", "Diagnostik", true)] },
      { name: "Hördiagnostik", description: "Audiometrie, ggf. Hörgeräte-Verordnung", leistungen: [L("hno", "Tonschwellenaudiometrie", "GOAE", "–", "Diagnostik", true), L("hno", "Sprachaudiometrie", "GOAE", "–", "Diagnostik", true), L("hno", "Tympanometrie", "GOAE", "–", "Diagnostik", true), L("hno", "Verordnung Hörgeräte", "SONSTIGES", "–", "Verordnung", true)] },
      { name: "Allergie und Hyposensibilisierung", description: "Prick-Test, spezifische Immuntherapie", leistungen: [L("hno", "Prick-Test", "GOAE", "–", "Diagnostik"), L("hno", "Hyposensibilisierungs-Injektion", "GOAE", "–", "Therapie"), beratung("hno")] },
    ],
  }),
  kinder: arzt("kinder", {
    frauenAnteil: 0.49, alter: [0, 17, 7], region: "Körperregion",
    berichtStil: "pädiatrischer Stil mit Entwicklungsstand, Perzentilen und Impfstatus; Ansprache der Eltern",
    termine: ["U-Untersuchung", "Impfung", "Infekt", "J1", "Entwicklungskontrolle", "Akutsprechstunde"],
    sitzungstypen: [
      { name: "U-Untersuchung", description: "Kinder-Richtlinie U1–U9 und U7a", leistungen: [L("kinder", "U-Untersuchung (je nach Alter U1–U9, U7a)", "EBM", "–", "Vorsorge"), L("kinder", "Gewicht, Länge, Kopfumfang, Perzentilen", "SONSTIGES", "–", "Diagnostik"), L("kinder", "Seh- und Hörprüfung altersgerecht", "SONSTIGES", "–", "Diagnostik"), L("kinder", "Eintrag Gelbes Heft", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Impftermin", description: "Impfungen nach STIKO", leistungen: [L("kinder", "Schutzimpfung", "EBM", "–", "Impfung"), L("kinder", "Impfaufklärung der Eltern", "SONSTIGES", "–", "Beratung"), L("kinder", "Impfpass-Eintrag", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Jugendgesundheitsuntersuchung J1", description: "12 bis 14 Jahre", leistungen: [L("kinder", "Jugendgesundheitsuntersuchung J1", "EBM", "01720", "Vorsorge"), L("kinder", "Impfstatus prüfen (z. B. HPV)", "SONSTIGES", "–", "Impfung"), eingehendeBeratung("kinder")] },
    ],
  }),
  kardio: arzt("kardio", {
    frauenAnteil: 0.45, alter: [18, 95, 64], region: null,
    berichtStil: "kardiologischer Arztbrief mit EKG, Echokardiographie, Belastungsuntersuchung, Medikation",
    termine: ["Echokardiographie", "Belastungs-EKG", "Langzeit-EKG", "Herzschrittmacher-Kontrolle", "Kontrolle Vorhofflimmern", "Blutdruck-Einstellung", "Befundbesprechung"],
    sitzungstypen: [
      { name: "Kardiologische Untersuchung", description: "Erstvorstellung oder Kontrolle", leistungen: [grundpauschale("kardio"), L("kardio", "Ruhe-EKG", "GOAE", "651", "Diagnostik"), L("kardio", "Echokardiographie", "GOAE", "–", "Bildgebung"), eingehendeBeratung("kardio")] },
      { name: "Belastungsuntersuchung", description: "Ergometrie", leistungen: [L("kardio", "Belastungs-EKG", "GOAE", "652", "Diagnostik"), L("kardio", "Blutdruck unter Belastung", "SONSTIGES", "–", "Diagnostik"), beratung("kardio")] },
      { name: "Rhythmus und Geräte", description: "Langzeit-EKG, Schrittmacher-/ICD-Kontrolle", leistungen: [L("kardio", "Langzeit-EKG (Anlage und Auswertung)", "GOAE", "–", "Diagnostik"), L("kardio", "Schrittmacher-/ICD-Abfrage", "GOAE", "–", "Diagnostik"), L("kardio", "Langzeit-Blutdruckmessung", "GOAE", "–", "Diagnostik")] },
    ],
  }),
  radiologie: arzt("radiologie", {
    frauenAnteil: 0.55, alter: [5, 95, 55], region: "Untersuchungsregion",
    berichtStil: "radiologischer Befundbericht mit Fragestellung, Technik, Befund und Beurteilung",
    termine: ["MRT", "CT", "Röntgen", "Mammographie-Screening", "Knochendichtemessung", "Ultraschall"],
    sitzungstypen: [
      { name: "MRT", description: "Auf Überweisung oder Wunsch", leistungen: [L("radiologie", "MRT (Region)", "EBM", "–", "Bildgebung", true), L("radiologie", "Kontrastmittelgabe", "SONSTIGES", "–", "Bildgebung"), L("radiologie", "Befundung und Bericht", "SONSTIGES", "–", "Befund")] },
      { name: "CT oder Röntgen", description: "Auf Überweisung", leistungen: [L("radiologie", "CT (Region)", "EBM", "–", "Bildgebung", true), L("radiologie", "Röntgen (Region)", "EBM", "–", "Bildgebung", true), L("radiologie", "Befundung und Bericht", "SONSTIGES", "–", "Befund")] },
      { name: "Knochendichtemessung", description: "DXA, Kasse bei Fraktur ohne Trauma bzw. Verdacht, sonst IGeL", leistungen: [L("radiologie", "Osteodensitometrie (DXA)", "GOAE", "–", "Bildgebung"), beratung("radiologie")] },
    ],
  }),
  neuro: arzt("neuro", {
    frauenAnteil: 0.55, alter: [16, 95, 55], region: null,
    berichtStil: "neurologischer Stil mit neurologischem Status und Elektrophysiologie",
    termine: ["Kopfschmerz / Migräne", "Gedächtnissprechstunde", "Epilepsie-Kontrolle", "NLG / EMG", "Parkinson-Kontrolle", "MS-Kontrolle"],
    sitzungstypen: [
      { name: "Neurologische Untersuchung", description: "Erstvorstellung oder Kontrolle", leistungen: [grundpauschale("neuro"), L("neuro", "Neurologischer Status", "SONSTIGES", "–", "Untersuchung"), eingehendeBeratung("neuro")] },
      { name: "Elektrophysiologie", description: "NLG, EMG, EEG", leistungen: [L("neuro", "Nervenleitgeschwindigkeit (NLG)", "GOAE", "–", "Diagnostik", true), L("neuro", "Elektromyographie (EMG)", "GOAE", "–", "Diagnostik", true), L("neuro", "EEG", "GOAE", "–", "Diagnostik")] },
      { name: "Gedächtnissprechstunde", description: "Testung und Beratung", leistungen: [L("neuro", "Kognitive Testung", "SONSTIGES", "–", "Diagnostik"), eingehendeBeratung("neuro"), L("neuro", "Angehörigenberatung", "SONSTIGES", "–", "Beratung")] },
    ],
  }),
  psych: arzt("psych", {
    frauenAnteil: 0.62, alter: [16, 90, 40], region: null,
    berichtStil: "psychiatrisch-psychotherapeutischer Stil mit psychopathologischem Befund; zurückhaltend, ohne unnötige Details",
    termine: ["Psychotherapeutische Sprechstunde", "Probatorische Sitzung", "Therapiesitzung", "Akutbehandlung", "Medikamenten-Kontrolle"],
    sitzungstypen: [
      { name: "Psychotherapeutische Sprechstunde", description: "Erstkontakt nach Psychotherapie-Richtlinie", leistungen: [L("psych", "Psychotherapeutische Sprechstunde", "EBM", "–", "Psychotherapie"), L("psych", "Psychopathologischer Befund", "SONSTIGES", "–", "Diagnostik")] },
      { name: "Therapiesitzung", description: "Richtlinienpsychotherapie (genehmigt)", leistungen: [L("psych", "Einzeltherapie (50 Minuten)", "EBM", "–", "Psychotherapie"), L("psych", "Verlaufsdokumentation", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Psychiatrische Kontrolle", description: "Medikation und Verlauf", leistungen: [grundpauschale("psych"), L("psych", "Psychiatrisches Gespräch", "EBM", "–", "Gespräch"), blutentnahme("psych")] },
    ],
  }),
  gastro: arzt("gastro", {
    frauenAnteil: 0.52, alter: [18, 95, 56], region: null,
    berichtStil: "gastroenterologischer Stil mit Endoskopiebefund und Histologie",
    termine: ["Darmkrebsvorsorge", "Magenspiegelung", "Ultraschall Bauch", "Atemtest", "Befundbesprechung"],
    sitzungstypen: [
      { name: "Vorsorge-Koloskopie", description: "Ab 50 (Männer) bzw. 55 (Frauen) Kassenleistung", leistungen: [L("gastro", "Früherkennungs-Koloskopie", "EBM", "–", "Vorsorge"), L("gastro", "Polypabtragung", "EBM", "–", "Eingriff"), L("gastro", "Sedierung", "SONSTIGES", "–", "Eingriff"), L("gastro", "Histologie (Einsendung)", "SONSTIGES", "–", "Labor")] },
      { name: "Gastroskopie", description: "Magenspiegelung", leistungen: [L("gastro", "Ösophagogastroduodenoskopie", "EBM", "–", "Endoskopie"), L("gastro", "Helicobacter-Test", "SONSTIGES", "–", "Labor"), L("gastro", "Sedierung", "SONSTIGES", "–", "Eingriff")] },
      { name: "Gastroenterologische Sprechstunde", description: "Bauchbeschwerden, Leber", leistungen: [grundpauschale("gastro"), L("gastro", "Untersuchung der Bauchorgane", "GOAE", "7", "Untersuchung"), ultraschall("gastro", "des Abdomens"), L("gastro", "H2-Atemtest", "GOAE", "–", "Diagnostik")] },
    ],
  }),
  pneumo: arzt("pneumo", {
    frauenAnteil: 0.48, alter: [16, 95, 58], region: null,
    berichtStil: "pneumologischer Stil mit Lungenfunktion, Bodyplethysmographie und Therapieplan",
    termine: ["Lungenfunktion", "Asthma-Kontrolle (DMP)", "COPD-Kontrolle (DMP)", "Schlafapnoe-Diagnostik", "Rauchstopp-Beratung", "Allergietest"],
    sitzungstypen: [
      { name: "Lungenfunktionsprüfung", description: "Spirometrie, Bodyplethysmographie", leistungen: [grundpauschale("pneumo"), L("pneumo", "Spirometrie", "GOAE", "–", "Diagnostik"), L("pneumo", "Bodyplethysmographie", "GOAE", "–", "Diagnostik"), L("pneumo", "Bronchospasmolysetest", "GOAE", "–", "Diagnostik")] },
      { name: "DMP Asthma / COPD", description: "Strukturierte Kontrolle", leistungen: [L("pneumo", "DMP-Dokumentation", "SONSTIGES", "–", "Dokumentation"), L("pneumo", "Inhalationsschulung", "SONSTIGES", "–", "Schulung"), L("pneumo", "Spirometrie", "GOAE", "–", "Diagnostik")] },
      { name: "Schlafapnoe-Diagnostik", description: "Polygraphie", leistungen: [L("pneumo", "Ambulante Polygraphie", "EBM", "–", "Diagnostik"), beratung("pneumo")] },
    ],
  }),
  endo: arzt("endo", {
    frauenAnteil: 0.6, alter: [16, 95, 54], region: null,
    berichtStil: "endokrinologisch-diabetologischer Stil mit Laborwerten (HbA1c, TSH) und Therapieanpassung",
    termine: ["Diabetes-Kontrolle (DMP)", "Schilddrüsen-Sprechstunde", "Insulin-Einstellung", "Glukosesensor-Auswertung", "Diabetes-Schulung", "Fußkontrolle"],
    sitzungstypen: [
      { name: "Diabetes-Kontrolle (DMP)", description: "Typ 1 und Typ 2", leistungen: [L("endo", "DMP-Dokumentation Diabetes", "SONSTIGES", "–", "Dokumentation"), blutentnahme("endo"), L("endo", "Fußinspektion", "SONSTIGES", "–", "Untersuchung"), L("endo", "Auswertung Glukosesensor", "SONSTIGES", "–", "Diagnostik")] },
      { name: "Schilddrüsen-Sprechstunde", description: "Ultraschall und Labor", leistungen: [grundpauschale("endo"), ultraschall("endo", "der Schilddrüse"), blutentnahme("endo"), beratung("endo")] },
      { name: "Diabetes-Schulung", description: "Strukturiertes Schulungsprogramm", leistungen: [L("endo", "Schulungseinheit (Gruppe)", "EBM", "–", "Schulung"), L("endo", "Ernährungsberatung", "SONSTIGES", "–", "Beratung")] },
    ],
  }),
  chirurgie: arzt("chirurgie", {
    frauenAnteil: 0.52, alter: [6, 95, 50], region: "Körperregion / Seite",
    berichtStil: "chirurgischer Stil mit OP-Indikation, Verlauf und Wundbefund",
    termine: ["Sprechstunde", "Ambulante OP", "Wundkontrolle", "Fäden ziehen", "Venensprechstunde", "Proktologie"],
    sitzungstypen: [
      { name: "Ambulante Operation", description: "Mit OP-Bericht", leistungen: [L("chirurgie", "Ambulanter Eingriff", "EBM", "–", "Operation", true), L("chirurgie", "Lokalanästhesie", "SONSTIGES", "–", "Operation", true), L("chirurgie", "OP-Bericht", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Wundkontrolle", description: "Verbandwechsel, Fäden ziehen", leistungen: [L("chirurgie", "Verbandwechsel", "GOAE", "–", "Wunde", true), L("chirurgie", "Fadenentfernung", "GOAE", "–", "Wunde", true)] },
      { name: "Venensprechstunde", description: "Duplex, Krampfadern, Verödung (IGeL bei Besenreisern)", leistungen: [L("chirurgie", "Duplexsonographie der Beinvenen", "GOAE", "–", "Bildgebung", true), L("chirurgie", "Sklerotherapie (Besenreiser, IGeL)", "GOAE", "–", "Therapie", true), L("chirurgie", "Kompressionsverordnung", "SONSTIGES", "–", "Verordnung")] },
    ],
  }),
  aesthetik: arzt("aesthetik", {
    frauenAnteil: 0.82, alter: [18, 80, 44], region: "Behandlungsareal",
    berichtStil: "sachlicher Stil mit Behandlungsareal, Präparat, Menge und Aufklärung; keine Werbesprache",
    termine: ["Erstberatung", "Faltenbehandlung", "Filler", "Lidkorrektur-Beratung", "Nachkontrolle"],
    sitzungstypen: [
      { name: "Ästhetische Erstberatung", description: "Wunsch, Erwartungen, Aufklärung, Bedenkzeit", leistungen: [eingehendeBeratung("aesthetik"), L("aesthetik", "Fotodokumentation", "SONSTIGES", "–", "Dokumentation", true), L("aesthetik", "Kostenvoranschlag nach GOÄ", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Faltenbehandlung", description: "Botulinum oder Hyaluron, Selbstzahler", leistungen: [L("aesthetik", "Injektionsbehandlung (analog nach GOÄ)", "GOAE", "–", "Behandlung", true), L("aesthetik", "Präparat (Menge, Charge)", "SONSTIGES", "–", "Material", true), L("aesthetik", "Nachkontrolle", "GOAE", "–", "Kontrolle")] },
    ],
  }),
  physio: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Praxis", fachkraft: "Ihre Physiotherapeutin oder Ihr Physiotherapeut",
    frauenAnteil: 0.58, alter: [3, 95, 52], region: "Körperregion",
    berichtStil: "physiotherapeutischer Therapiebericht an die verordnende Ärztin: Befund, Ziele, Maßnahmen, Verlauf",
    termine: ["Krankengymnastik", "Manuelle Therapie", "Lymphdrainage", "KG am Gerät", "Befundaufnahme", "Hausbesuch", "Präventionskurs"],
    sitzungstypen: [
      { name: "Krankengymnastik", description: "Heilmittel auf Verordnung", leistungen: [L("physio", "Krankengymnastik (KG)", "HEILMITTEL", "–", "Heilmittel", true), L("physio", "Wärmetherapie (ergänzend)", "HEILMITTEL", "–", "Heilmittel", true), L("physio", "Zuzahlung erhoben (10 % + 10 € je Verordnung)", "SONSTIGES", "–", "Zuzahlung")] },
      { name: "Manuelle Therapie", description: "Qualifikation MT nötig", leistungen: [L("physio", "Manuelle Therapie (MT)", "HEILMITTEL", "–", "Heilmittel", true), L("physio", "Befund und Verlauf dokumentiert", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Manuelle Lymphdrainage", description: "MLD 30, 45 oder 60 Minuten", leistungen: [L("physio", "Manuelle Lymphdrainage (MLD)", "HEILMITTEL", "–", "Heilmittel", true), L("physio", "Kompressionsbandagierung", "HEILMITTEL", "–", "Heilmittel", true)] },
      { name: "Privat / Selbstzahler", description: "Osteopathie, Training, Prävention", leistungen: [L("physio", "Osteopathische Behandlung", "SELBST", "–", "Selbstzahler", true), L("physio", "Gerätegestütztes Training", "SELBST", "–", "Selbstzahler"), L("physio", "Präventionskurs nach § 20 SGB V (Kasse bezuschusst)", "SELBST", "–", "Prävention")] },
    ],
  },
  ergo: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Praxis", fachkraft: "Ihre Ergotherapeutin oder Ihr Ergotherapeut",
    frauenAnteil: 0.45, alter: [3, 95, 35], region: null,
    berichtStil: "ergotherapeutischer Therapiebericht: Befund, Alltagsziele, Maßnahmen, Verlauf",
    termine: ["Motorisch-funktionelle Behandlung", "Sensomotorische Behandlung", "Hirnleistungstraining", "Psychisch-funktionelle Behandlung", "Hausbesuch", "Befundaufnahme"],
    sitzungstypen: [
      { name: "Ergotherapie-Einheit", description: "Heilmittel auf Verordnung", leistungen: [L("ergo", "Motorisch-funktionelle Behandlung", "HEILMITTEL", "–", "Heilmittel"), L("ergo", "Sensomotorisch-perzeptive Behandlung", "HEILMITTEL", "–", "Heilmittel"), L("ergo", "Hirnleistungstraining", "HEILMITTEL", "–", "Heilmittel"), L("ergo", "Psychisch-funktionelle Behandlung", "HEILMITTEL", "–", "Heilmittel")] },
      { name: "Ergotherapeutische Diagnostik", description: "Funktionsanalyse, Therapieplanung", leistungen: [L("ergo", "Ergotherapeutische Funktionsanalyse", "HEILMITTEL", "–", "Diagnostik"), L("ergo", "Therapiebericht", "SONSTIGES", "–", "Dokumentation")] },
    ],
  },
  logo: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Praxis", fachkraft: "Ihre Logopädin oder Ihr Logopäde",
    frauenAnteil: 0.45, alter: [2, 95, 25], region: null,
    berichtStil: "logopädischer Therapiebericht: Störungsbild, Befund, Ziele, Verlauf",
    termine: ["Sprachtherapie Kind", "Stimmtherapie", "Schlucktherapie", "Aphasie-Therapie", "Stottertherapie", "Befundaufnahme"],
    sitzungstypen: [
      { name: "Sprach-, Sprech- oder Stimmtherapie", description: "Heilmittel auf Verordnung (30, 45 oder 60 Minuten)", leistungen: [L("logo", "Einzelbehandlung Sprech- und Sprachtherapie", "HEILMITTEL", "–", "Heilmittel"), L("logo", "Stimmtherapie", "HEILMITTEL", "–", "Heilmittel"), L("logo", "Elternberatung", "SONSTIGES", "–", "Beratung")] },
      { name: "Schlucktherapie", description: "Dysphagie, oft nach Schlaganfall", leistungen: [L("logo", "Schlucktherapie (Einzel)", "HEILMITTEL", "–", "Heilmittel"), L("logo", "Schluckbefund", "SONSTIGES", "–", "Diagnostik")] },
    ],
  },
  podo: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Praxis", fachkraft: "Ihre Podologin oder Ihr Podologe",
    frauenAnteil: 0.55, alter: [30, 95, 68], region: "Fuß (rechts / links)",
    berichtStil: "podologischer Behandlungsbericht mit Befund je Fuß",
    termine: ["Podologische Komplexbehandlung", "Nagelkorrekturspange", "Hornhautbehandlung", "Fußpflege (privat)", "Hausbesuch"],
    sitzungstypen: [
      { name: "Podologische Komplexbehandlung", description: "Heilmittel auf Verordnung (z. B. diabetisches Fußsyndrom)", leistungen: [L("podo", "Podologische Komplexbehandlung (beide Füße)", "HEILMITTEL", "–", "Heilmittel", true), L("podo", "Hornhautabtragung", "HEILMITTEL", "–", "Heilmittel", true), L("podo", "Nagelbearbeitung", "HEILMITTEL", "–", "Heilmittel", true)] },
      { name: "Nagelkorrekturspange", description: "Eingewachsener Nagel, Heilmittel bei Verordnung", leistungen: [L("podo", "Anlage der Nagelkorrekturspange", "HEILMITTEL", "–", "Heilmittel", true), L("podo", "Kontrolle / Regulierung", "HEILMITTEL", "–", "Heilmittel", true)] },
      { name: "Kosmetische Fußpflege", description: "Privat", leistungen: [L("podo", "Fußpflege", "SELBST", "–", "Selbstzahler", true), L("podo", "Lackieren / Pflege", "SELBST", "–", "Selbstzahler", true)] },
    ],
  },
  hebamme: {
    person: { sg: "Frau", pl: "Frauen" }, einrichtung: "Hebammenpraxis", fachkraft: "Ihre Hebamme",
    nurGeschlecht: "W", frauenAnteil: 1, alter: [17, 45, 31], region: null,
    berichtStil: "Dokumentation der Hebammenhilfe: Befinden von Mutter und Kind, Gewicht, Stillen, Rückbildung",
    termine: ["Vorgespräch", "Schwangerenvorsorge", "Geburtsvorbereitungskurs", "Wochenbettbesuch", "Stillberatung", "Rückbildungskurs"],
    sitzungstypen: [
      { name: "Wochenbettbesuch", description: "Bis 12 Wochen nach der Geburt, danach auf ärztliche Anordnung", leistungen: [L("hebamme", "Wochenbettbetreuung (Hausbesuch)", "HEBAMME", "–", "Wochenbett"), L("hebamme", "Wegegeld", "HEBAMME", "–", "Wochenbett"), L("hebamme", "Kontrolle Kind (Gewicht, Nabel, Ikterus)", "SONSTIGES", "–", "Dokumentation"), L("hebamme", "Stillberatung", "HEBAMME", "–", "Stillzeit")] },
      { name: "Schwangerenvorsorge", description: "Durch die Hebamme", leistungen: [L("hebamme", "Vorsorgeuntersuchung", "HEBAMME", "–", "Schwangerschaft"), L("hebamme", "Hilfe bei Beschwerden", "HEBAMME", "–", "Schwangerschaft"), L("hebamme", "Mutterpass-Eintrag", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Kurs", description: "Geburtsvorbereitung oder Rückbildung (Kasse), Babymassage (privat)", leistungen: [L("hebamme", "Geburtsvorbereitung (Gruppe)", "HEBAMME", "–", "Kurs"), L("hebamme", "Rückbildungsgymnastik (Gruppe)", "HEBAMME", "–", "Kurs"), L("hebamme", "Babymassage-Kurs", "SELBST", "–", "Kurs")] },
    ],
  },
  pflege: {
    person: { sg: "Klient", pl: "Klienten" }, einrichtung: "Pflegedienst", fachkraft: "Ihr Pflegedienst",
    frauenAnteil: 0.63, alter: [50, 102, 81], region: null,
    berichtStil: "Pflegedokumentation nach Strukturmodell (SIS): Situation, Maßnahmen, Evaluation",
    termine: ["Grundpflege", "Behandlungspflege", "Beratungseinsatz § 37.3", "Hauswirtschaft", "Betreuung", "Erstgespräch"],
    sitzungstypen: [
      { name: "Pflegeeinsatz (SGB XI)", description: "Leistungskomplexe nach Vertrag mit der Pflegekasse", leistungen: [L("pflege", "Körperpflege (Leistungskomplex)", "PFLEGE", "–", "Grundpflege"), L("pflege", "Hilfe bei Nahrungsaufnahme", "PFLEGE", "–", "Grundpflege"), L("pflege", "Mobilisation", "PFLEGE", "–", "Grundpflege"), L("pflege", "Hauswirtschaftliche Versorgung", "PFLEGE", "–", "Hauswirtschaft")] },
      { name: "Behandlungspflege (SGB V)", description: "Auf ärztliche Verordnung", leistungen: [L("pflege", "Medikamentengabe", "PFLEGE", "–", "Behandlungspflege"), L("pflege", "Injektion (z. B. Insulin)", "PFLEGE", "–", "Behandlungspflege"), L("pflege", "Verbandwechsel", "PFLEGE", "–", "Behandlungspflege"), L("pflege", "Kompressionsstrümpfe an- und ausziehen", "PFLEGE", "–", "Behandlungspflege")] },
      { name: "Beratungseinsatz nach § 37.3 SGB XI", description: "Für Pflegegeldbezieher, halb- bzw. vierteljährlich", leistungen: [L("pflege", "Beratungsbesuch", "PFLEGE", "–", "Beratung"), L("pflege", "Nachweis an die Pflegekasse", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Entlastung und Betreuung", description: "Entlastungsbetrag 131 € im Monat", leistungen: [L("pflege", "Betreuung / Alltagsbegleitung", "PFLEGE", "–", "Entlastung"), L("pflege", "Haushaltshilfe", "PFLEGE", "–", "Entlastung")] },
    ],
  },
  apotheke: {
    person: { sg: "Kunde", pl: "Kunden" }, einrichtung: "Apotheke", fachkraft: "Ihre Apothekerin oder Ihr Apotheker",
    frauenAnteil: 0.56, alter: [0, 99, 52], region: null,
    berichtStil: "pharmazeutische Dokumentation: Medikationsanalyse, arzneimittelbezogene Probleme, Empfehlungen an Arzt und Kunde",
    termine: ["Medikationsberatung", "Blutdruck-Risikoerfassung", "Inhalationsschulung", "Grippeimpfung", "Kompressionsstrümpfe anmessen", "Gesundheitscheck", "Blisterausgabe"],
    sitzungstypen: [
      { name: "Erweiterte Medikationsberatung bei Polymedikation", description: "pDL, ab 5 dauerhaft verordneten Wirkstoffen", leistungen: [L("apotheke", "Datenerfassung (Brown-Bag)", "APO", "–", "pDL"), L("apotheke", "Medikationsanalyse", "APO", "–", "pDL"), L("apotheke", "Abschlussgespräch mit Medikationsplan", "APO", "–", "pDL"), L("apotheke", "Information an die Hausarztpraxis", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Standardisierte Risikoerfassung hoher Blutdruck", description: "pDL für Kunden mit Blutdruckmedikation", leistungen: [L("apotheke", "Blutdruckmessung nach Standard", "APO", "–", "pDL"), L("apotheke", "Bewertung und Empfehlung", "APO", "–", "pDL")] },
      { name: "Erweiterte Einweisung Inhalativa", description: "pDL bei neuem Inhalator oder Wechsel", leistungen: [L("apotheke", "Inhalationsschulung mit Übung", "APO", "–", "pDL"), L("apotheke", "Kontrolle der Inhalationstechnik", "APO", "–", "pDL")] },
      { name: "Pharmazeutische Betreuung (Organtransplantation / orale Tumortherapie)", description: "pDL", leistungen: [L("apotheke", "Medikationsanalyse", "APO", "–", "pDL"), L("apotheke", "Betreuungsgespräch und Folgegespräch", "APO", "–", "pDL")] },
      { name: "Impfung in der Apotheke", description: "Grippe- und COVID-19-Schutzimpfung für Erwachsene", leistungen: [L("apotheke", "Impfanamnese und Aufklärung", "APO", "–", "Impfung"), L("apotheke", "Schutzimpfung", "APO", "–", "Impfung"), L("apotheke", "Impfdokumentation", "SONSTIGES", "–", "Dokumentation")] },
      { name: "Hilfsmittel und Pflegehilfsmittel", description: "Kompression, Messgeräte, Pflegehilfsmittel (Pflegekasse 42 €/Monat)", leistungen: [L("apotheke", "Anmessen Kompressionsstrümpfe", "HILFSMITTEL", "–", "Hilfsmittel"), L("apotheke", "Pflegehilfsmittel zum Verbrauch", "HILFSMITTEL", "–", "Pflegehilfsmittel"), L("apotheke", "Einweisung Messgerät", "APO", "–", "Hilfsmittel")] },
      { name: "Gesundheitscheck (Selbstzahler)", description: "Blutzucker, Cholesterin, HbA1c", leistungen: [L("apotheke", "Kapillarblutmessung", "SELBST", "–", "Check"), L("apotheke", "Auswertung und Beratung", "SELBST", "–", "Check")] },
    ],
  },
  hoerakustik: {
    person: { sg: "Kunde", pl: "Kunden" }, einrichtung: "Fachgeschäft", fachkraft: "Ihre Hörakustikerin oder Ihr Hörakustiker",
    frauenAnteil: 0.45, alter: [5, 99, 72], region: "Ohr (rechts / links / beidseits)",
    berichtStil: "Versorgungsdokumentation mit Hörverlust je Ohr, Anpassschritten und Vergleich Kassen- zu Wunschgerät",
    termine: ["Hörtest", "Hörgeräteanpassung", "Probetragen", "Nachkontrolle", "Reinigung / Service", "Gehörschutz nach Maß"],
    sitzungstypen: [
      { name: "Hörgeräteanpassung", description: "Auf HNO-Verordnung; aufzahlungsfreies Gerät muss angeboten werden", leistungen: [L("hoerakustik", "Ton- und Sprachaudiometrie", "HILFSMITTEL", "–", "Messung", true), L("hoerakustik", "Vergleichende Anpassung (Kasse und Wunschgerät)", "HILFSMITTEL", "–", "Anpassung", true), L("hoerakustik", "Mehrkostenerklärung", "SONSTIGES", "–", "Dokumentation"), L("hoerakustik", "Otoplastik", "HILFSMITTEL", "–", "Anpassung", true)] },
      { name: "Service und Nachsorge", description: "Reinigung, Feinanpassung", leistungen: [L("hoerakustik", "Feinanpassung", "HILFSMITTEL", "–", "Service", true), L("hoerakustik", "Reinigung und Funktionsprüfung", "HILFSMITTEL", "–", "Service", true)] },
      { name: "Gehörschutz nach Maß", description: "Selbstzahler", leistungen: [L("hoerakustik", "Ohrabformung", "SELBST", "–", "Gehörschutz", true), L("hoerakustik", "Gehörschutz-Otoplastik", "SELBST", "–", "Gehörschutz", true)] },
    ],
  },
  optik: {
    person: { sg: "Kunde", pl: "Kunden" }, einrichtung: "Fachgeschäft", fachkraft: "Ihre Augenoptikerin oder Ihr Augenoptiker",
    frauenAnteil: 0.55, alter: [3, 95, 50], region: "Auge (rechts / links)",
    berichtStil: "Refraktionsprotokoll mit Werten je Auge und Versorgungsempfehlung",
    termine: ["Sehtest", "Brillenberatung", "Kontaktlinsenanpassung", "Brillenabholung", "Führerschein-Sehtest", "Reparatur"],
    sitzungstypen: [
      { name: "Augenprüfung und Brillenberatung", description: "Refraktion, Fassung, Gläser", leistungen: [L("optik", "Subjektive Refraktion", "SELBST", "–", "Messung", true), L("optik", "Zentriermessung", "SELBST", "–", "Messung", true), L("optik", "Brillengläser (Kassenanteil bei Kindern bzw. ab 6 / 4 dpt)", "HILFSMITTEL", "–", "Versorgung", true), L("optik", "Fassung (immer Selbstzahler)", "SELBST", "–", "Versorgung")] },
      { name: "Kontaktlinsenanpassung", description: "Selbstzahler, Kasse nur bei medizinischer Notwendigkeit", leistungen: [L("optik", "Hornhautvermessung", "SELBST", "–", "Messung", true), L("optik", "Anpassung und Probetragen", "SELBST", "–", "Anpassung", true), L("optik", "Handhabungsschulung", "SELBST", "–", "Anpassung")] },
      { name: "Sehtest Führerschein", description: "Feste Gebühr nach Gebührenordnung", leistungen: [L("optik", "Sehtest nach Fahrerlaubnis-Verordnung", "SELBST", "–", "Sehtest"), L("optik", "Sehtestbescheinigung", "SONSTIGES", "–", "Dokumentation")] },
    ],
  },
  sanitaetshaus: {
    person: { sg: "Kunde", pl: "Kunden" }, einrichtung: "Sanitätshaus", fachkraft: "Ihr Sanitätshaus",
    frauenAnteil: 0.58, alter: [2, 99, 62], region: "Körperregion / Seite",
    berichtStil: "Versorgungsdokumentation mit Maßen, Produkt, Hilfsmittelnummer und Einweisung",
    termine: ["Einlagenversorgung", "Kompression anmessen", "Bandage / Orthese", "Rollator / Rollstuhl", "Brustprothetik", "Stoma- und Inkontinenzversorgung", "Hausbesuch"],
    sitzungstypen: [
      { name: "Einlagenversorgung", description: "Fußabdruck/Scan, Fertigung, Anprobe", leistungen: [L("sanitaetshaus", "Fußdruckmessung / Scan", "HILFSMITTEL", "–", "Messung", true), L("sanitaetshaus", "Orthopädische Einlagen", "HILFSMITTEL", "–", "Versorgung", true), L("sanitaetshaus", "Zuzahlung (10 %, 5–10 €)", "SONSTIGES", "–", "Zuzahlung")] },
      { name: "Kompressionsversorgung", description: "Rundstrick oder Flachstrick nach Maß", leistungen: [L("sanitaetshaus", "Anmessen", "HILFSMITTEL", "–", "Messung", true), L("sanitaetshaus", "Kompressionsstrümpfe", "HILFSMITTEL", "–", "Versorgung", true), L("sanitaetshaus", "An- und Ausziehhilfe", "HILFSMITTEL", "–", "Versorgung")] },
      { name: "Mobilität und Pflegehilfsmittel", description: "Rollator, Rollstuhl, Pflegebett", leistungen: [L("sanitaetshaus", "Bedarfsermittlung", "HILFSMITTEL", "–", "Beratung"), L("sanitaetshaus", "Auslieferung und Einweisung", "HILFSMITTEL", "–", "Versorgung"), L("sanitaetshaus", "Mehrkostenerklärung bei Wunschausführung", "SONSTIGES", "–", "Dokumentation")] },
    ],
  },
  heilpraktiker: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Praxis", fachkraft: "Ihre Heilpraktikerin oder Ihr Heilpraktiker",
    frauenAnteil: 0.68, alter: [3, 90, 45], region: "Körperregion",
    berichtStil: "sachliche Behandlungsdokumentation ohne Heilversprechen",
    termine: ["Erstanamnese", "Behandlung", "Akupunktur", "Osteopathie", "Folgetermin"],
    sitzungstypen: [
      { name: "Erstanamnese", description: "Ausführliches Gespräch, Selbstzahler bzw. Zusatzversicherung", leistungen: [L("heilpraktiker", "Anamnese und Untersuchung", "SELBST", "–", "Diagnostik"), L("heilpraktiker", "Behandlungsplan mit Kostenhinweis", "SELBST", "–", "Beratung")] },
      { name: "Behandlung", description: "Nach Gebührenverzeichnis für Heilpraktiker (GebüH) als Orientierung", leistungen: [L("heilpraktiker", "Akupunktur", "SELBST", "–", "Behandlung", true), L("heilpraktiker", "Manuelle / osteopathische Behandlung", "SELBST", "–", "Behandlung", true), L("heilpraktiker", "Injektion / Infusion", "SELBST", "–", "Behandlung")] },
    ],
  },
  klinik: {
    person: { sg: "Patient", pl: "Patienten" }, einrichtung: "Klinik", fachkraft: "Ihre Klinik",
    frauenAnteil: 0.52, alter: [0, 99, 60], region: null,
    berichtStil: "Entlassbrief mit Diagnosen, Verlauf, Medikation und Empfehlung an die weiterbehandelnde Praxis",
    termine: ["Aufnahme", "Prästationäre Untersuchung", "Entlassgespräch", "Wahlleistungsberatung", "Nachstationäre Kontrolle"],
    sitzungstypen: [
      { name: "Stationäre Aufnahme", description: "Mit Wahlleistungsvereinbarung", leistungen: [L("klinik", "Aufnahmeuntersuchung", "SONSTIGES", "–", "Aufnahme"), L("klinik", "Wahlleistung Ein- oder Zweibettzimmer", "SELBST", "–", "Wahlleistung"), L("klinik", "Wahlleistung Chefarztbehandlung (GOÄ)", "GOAE", "–", "Wahlleistung"), L("klinik", "Begleitperson", "SELBST", "–", "Wahlleistung")] },
      { name: "Entlassung", description: "Entlassmanagement nach Rahmenvertrag", leistungen: [L("klinik", "Entlassbrief", "SONSTIGES", "–", "Dokumentation"), L("klinik", "Entlassrezept / Verordnungen", "SONSTIGES", "–", "Entlassmanagement"), L("klinik", "Überleitung Pflege / Reha", "SONSTIGES", "–", "Entlassmanagement")] },
    ],
  },
};

const STANDARD = FACHPROFILE.hausarzt;

export function fachprofil(fach: string | null | undefined): FachProfil {
  return FACHPROFILE[fach ?? ""] ?? STANDARD;
}

/** Wie der Abschluss eines Kontakts heißt: Behandlung, Beratung, Versorgung, Einsatz, Besuch. */
export function abschlussWort(fach: string | null | undefined): string {
  const f = fach || "zahn";
  if (f === "apotheke") return "Beratung";
  if (["optik", "hoerakustik", "sanitaetshaus"].includes(f)) return "Versorgung";
  if (f === "pflege") return "Einsatz";
  if (f === "hebamme") return "Besuch";
  return "Behandlung";
}

/** Passt ein Angebot/Befund mit Geschlechts- oder Altersbezug zu diesem Patienten? Unbekanntes Geschlecht schließt nichts aus. */
export function passtZuPerson(
  bedingung: { geschlecht?: "W" | "M"; abAlter?: number; bisAlter?: number },
  person: { geschlecht?: string | null; alter?: number | null },
): boolean {
  if (bedingung.geschlecht && person.geschlecht && person.geschlecht !== "D" && person.geschlecht !== bedingung.geschlecht) return false;
  if (bedingung.abAlter != null && person.alter != null && person.alter < bedingung.abAlter) return false;
  if (bedingung.bisAlter != null && person.alter != null && person.alter > bedingung.bisAlter) return false;
  return true;
}

/** Welche Abrechnungssysteme ein Fach im eigenen Katalog anlegen kann. */
export function systemGruppe(fach: string | null | undefined): string {
  const f = fach || "zahn";
  if (f === "zahn") return "zahn";
  if (["physio", "ergo", "logo", "podo"].includes(f)) return "therapie";
  if (f === "apotheke") return "apotheke";
  if (["hoerakustik", "optik", "sanitaetshaus"].includes(f)) return "versorgung";
  if (f === "pflege") return "pflege";
  if (f === "hebamme") return "hebamme";
  if (f === "heilpraktiker") return "selbst";
  return "arzt";
}

const NUR_MANN = /(\(Mann\)|Prostata|PSA)/;
const NUR_FRAU = /(Schwanger|Verhütung|Spirale|Wechseljahre|Brust|Mammographie|Wochenbett|Stillberatung|Rückbildung|Geburt)/;
const KIND = /(U-Untersuchung|J1|Entwicklung)/;

/** Terminanlässe, die zu Geschlecht und Alter passen (keine Prostata-Termine für Frauen usw.). */
export function termineFuer(fach: string | null | undefined, person: { geschlecht?: string | null; alter?: number | null }): string[] {
  const p = fachprofil(fach);
  return p.termine.filter((t) => {
    if (person.geschlecht === "W" && NUR_MANN.test(t)) return false;
    if (person.geschlecht === "M" && NUR_FRAU.test(t)) return false;
    if (person.alter != null && person.alter >= 18 && KIND.test(t)) return false;
    return true;
  });
}
