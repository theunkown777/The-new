import { ZUSATZ_ANLAESSE } from "@/lib/fachangebote";
import { NUTZEN_FRAGEN, igelMonitor, type NutzenQuellen } from "@/lib/nutzenQuelle";
// Fachgebiete für Arztpraxen. Sorrida begann als Zahnarzt-Werkzeug; in
// anderen Fächern heißt das Gegenstück zur Mehrkostenvereinbarung
// "Individuelle Gesundheitsleistung" (IGeL): vom Patienten selbst bezahlt,
// nach GOÄ berechnet, nur mit schriftlicher Vereinbarung vor der Leistung
// (§ 18 Abs. 8 BMV-Ä).
//
// Grundsätze wie beim Zahnarzt, hier noch strenger:
// - Die Kassenleistung steht immer zuerst, mit dem Hinweis, wann die Kasse zahlt.
// - Der Kasten „Zum Nutzen“ (Feld `nutzen`) beschreibt, er bewertet nicht. Eine Aussage zu Nutzen, Studienlage
//   oder Rechtslage steht dort nur mit Quelle (Feld `nutzenQuelle`, lib/nutzenQuelle.ts) und gibt wieder, was die
//   Quelle sagt, z. B. „Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „…“ mit „tendenziell negativ“.“
//   Ohne Quelle steht dort nur ein neutraler Satz („Fragen Sie in der Praxis, …“) oder eine reine
//   Abrechnungstatsache („keine Kassenleistung“), keine eigene Aussage zu Nutzen, Wirkung oder Therapie.
//   Geprüft in lib/haltbarkeit.test.ts.
// - Sorrida empfiehlt keine IGeL von sich aus. Vorgemerkt ist nur, was die Ärztin oder der Arzt anklickt.
// - Preise sind Beispielwerte im üblichen GOÄ-Rahmen und in den Einstellungen anpassbar.

export type MedOptionType = "kasse" | "igel";

export interface MedOption {
  id: string;
  name: string;
  type: MedOptionType;
  /** Beispielpreis in Euro für Selbstzahler (bei Kassenleistung der Wert für Privatversicherte). */
  price: number;
  benefits: string[];
  /** Wann die Kasse die Leistung doch übernimmt. */
  kasseWenn?: string;
  /** Ab diesem Alter Kassenleistung (z. B. Hautkrebs-Screening ab 35). */
  kasseAbAlter?: number;
  /** Kasten „Zum Nutzen“: mit Quelle das, was die Quelle sagt; ohne Quelle nur neutral (siehe Kopf der Datei). */
  nutzen?: string;
  /** Quelle der Aussage in `nutzen`; Pflicht, sobald dort eine Aussage zu Nutzen, Studienlage oder Recht steht. */
  nutzenQuelle?: NutzenQuellen;
  /**
   * Gesetzliche Zuzahlung für Erwachsene: true/"heilmittel" = 10 % der Kosten + 10 € (ab 2027: 15 €) je Verordnung;
   * "hilfsmittel" = 10 %, mindestens 5 €, höchstens 10 €, ab 2027 mindestens 7,50 €, höchstens 15 € (auch Arzneimittel je Packung).
   */
  zuzahlung?: boolean | "heilmittel" | "hilfsmittel";
  /** Kassenanteil (Festbetrag), wenn der Patient ein höherwertiges Produkt wählt und nur die Differenz zahlt. */
  kasseAnteil?: number;
  /**
   * Zusatz zur Kassenleistung desselben Anlasses: wird zusätzlich angeboten und ersetzt die Kassenleistung nicht
   * (z. B. Auflichtmikroskopie zum Hautkrebs-Screening). Ohne Angabe ist die Leistung eine Alternative.
   */
  zusatz?: boolean;
  /** Keine Erstattung durch die Versicherung vorbelegen (z. B. rezeptfreie Präparate, Messungen in der Apotheke). */
  ohneErstattung?: boolean;
  /** Wer zahlt, wenn es nicht die Krankenkasse ist: "bg" = Berufsgenossenschaft (Arbeits- und Wegeunfall). */
  kostentraeger?: "bg";
}

export interface Anlass {
  id: string;
  label: string;
  /** Ort/Kategorie wie "Vorsorge" (entspricht "Zahn 36" beim Zahnarzt). */
  bereich: string;
  options: MedOption[];
  notes?: string[];
  /** Nur auf ausdrücklichen Wunsch des Patienten (z. B. Ästhetik). */
  nurAufWunsch?: boolean;
  /** Nur für ein Geschlecht (z. B. Prostata nur Männer, Verhütung nur Frauen). */
  geschlecht?: "W" | "M";
  /** Altersgrenzen, z. B. Kassenleistung erst ab 35 oder Kinderangebot bis 17. */
  abAlter?: number;
  bisAlter?: number;
}

export interface Specialty {
  id: string;
  name: string;
  /** "Ihrer Augenärztin oder Ihrem Augenarzt" */
  arztDativ: string;
  /** Kurzbezeichnung für Website und Auswahl. */
  kurz: string;
  /** Ärztliches Fach oder Gesundheitsberuf (Therapie): bestimmt Regeln und Wortwahl. */
  beruf?: "arzt" | "therapie";
  /** Gruppe auf der Startseite: Versorger wie Hörakustik, Optik, Pflege, Kliniken. */
  gruppe?: "versorgung";
  /** Kurzer Text für die Kachel auf der Startseite. */
  teaser?: string;
  marketing: { headline: string; problem: string; beispiel: string };
  anlaesse: Anlass[];
}

export const DENTAL_ID = "zahn";

/** Tag, an dem die Quellen im Kasten „Zum Nutzen“ gelesen wurden (Abruf, nicht Datum der Bewertung). */
const NUTZEN_STAND = "17.11.2026";
/**
 * Bewertungen des IGeL-Monitors (Medizinischer Dienst Bund), Titel und Stufe wie auf der jeweiligen Seite. Wo die Seite
 * die Bewertung auf eine Gruppe beschränkt, steht diese als letzte Angabe (`geltung`) und wörtlich im Satz.
 * Welche Bewertungen des IGeL-Monitors zu welchem Angebot gehören und welche bewusst nicht: lib/igelMonitor.test.ts.
 */
const G_NICHT_SCHWANGER = "für nicht-schwangere Erwachsene ohne Beschwerden";
const IGEL = {
  vitaminD: igelMonitor("Früherkennungsuntersuchung auf Vitamin-D-Mangel", "frueherkennungsuntersuchung-auf-vitamin-d-mangel", NUTZEN_STAND, "unklar", "für Erwachsene ohne Anzeichen eines Mangels"),
  schilddrueseBlut: igelMonitor("Blutuntersuchung zur Früherkennung von Schilddrüsenfunktionsstörungen", "blutuntersuchung-zur-frueherkennung-von-schilddruesenfunktionsstoerungen", NUTZEN_STAND, "tendenziell negativ", G_NICHT_SCHWANGER),
  schilddrueseUltraschall: igelMonitor("Ultraschall zur Früherkennung von Veränderungen der Schilddrüse", "ultraschall-zur-frueherkennung-von-veraenderungen-der-schilddruese", NUTZEN_STAND, "tendenziell negativ", G_NICHT_SCHWANGER),
  amdOct: igelMonitor("OCT zur Früherkennung einer feuchten, altersbedingten Makuladegeneration (nAMD)", "oct-zur-frueherkennung-einer-feuchten-altersbedingten-makuladegeneration-namd", NUTZEN_STAND, "tendenziell negativ"),
  eierstoecke: igelMonitor("Ultraschall der Eierstöcke zur Krebsfrüherkennung", "ultraschall-der-eierstoecke-zur-krebsfrueherkennung", NUTZEN_STAND, "negativ"),
  gebaermutter: igelMonitor("Ultraschall zur Früherkennung von Gebärmutterkörperkrebs", "ultraschall-zur-frueherkennung-von-gebaermutterkoerperkrebs", NUTZEN_STAND, "tendenziell negativ"),
  brust: igelMonitor("Ultraschall der Brust zur Krebsfrüherkennung", "ultraschall-der-brust-zur-krebsfrueherkennung", NUTZEN_STAND, "unklar", "für erwachsene Frauen ohne erhöhtes Brustkrebs-Risiko"),
  psa: igelMonitor("PSA-Test zur Früherkennung von Prostatakrebs", "psa-test-zur-frueherkennung-von-prostatakrebs", NUTZEN_STAND, "tendenziell negativ"),
  nieren: igelMonitor("Ultraschall der Nieren zur Früherkennung von Nierenkrebs", "ultraschall-der-nieren-zur-frueherkennung-von-nierenkrebs", NUTZEN_STAND, "tendenziell negativ", "für Erwachsene ohne Beschwerden und ohne beruflich oder familiär erhöhtes Risiko"),
  blase: igelMonitor("Ultraschall der Blase zur Früherkennung von Harnblasenkrebs", "ultraschall-der-blase-zur-frueherkennung-von-harnblasenkrebs", NUTZEN_STAND, "tendenziell negativ", "für Erwachsene ohne Beschwerden und ohne beruflich oder genetisch erhöhtes Risiko"),
  ekg: igelMonitor("EKG zur Früherkennung einer koronaren Herzerkrankung", "ekg-zur-frueherkennung-einer-koronaren-herzerkrankung", NUTZEN_STAND, "tendenziell negativ", "für Menschen ohne Beschwerden"),
  halsschlagadern: igelMonitor("Ultraschall der Halsschlagadern zur Schlaganfallvorsorge", "ultraschall-der-halsschlagadern-zur-schlaganfallvorsorge", NUTZEN_STAND, "tendenziell negativ", "für Menschen ohne Beschwerden"),
  demenz: igelMonitor("Hirnleistungs-Check zur Früherkennung einer Demenz", "hirnleistungs-check-zur-frueherkennung-einer-demenz", NUTZEN_STAND, "tendenziell negativ", "für Menschen unter 70 Jahren ohne Anzeichen einer Demenz"),
  spirometrie: igelMonitor("Spirometrie zur Überprüfung der Lungenfunktion", "spirometrie-zur-ueberpruefung-der-lungenfunktion", NUTZEN_STAND, "tendenziell negativ", "für Menschen ohne Atembeschwerden"),
  akupunkturSchwangerschaft: igelMonitor("Akupunktur in der Schwangerschaft", "akupunktur-in-der-schwangerschaft", NUTZEN_STAND, "unklar"),
  toxoplasmose: igelMonitor("Toxoplasmose-Test bei Schwangeren", "toxoplasmose-test-bei-schwangeren", NUTZEN_STAND, "unklar"),
  akupunkturMigraene: igelMonitor("Akupunktur zur Vorbeugung von Migräneanfällen", "akupunktur-zur-vorbeugung-von-migraeneanfaellen", NUTZEN_STAND, "tendenziell positiv"),
  akupunkturSpannungskopfschmerz: igelMonitor("Akupunktur zur Vorbeugung von Spannungskopfschmerzen", "akupunktur-zur-vorbeugung-von-spannungskopfschmerzen", NUTZEN_STAND, "unklar"),
  osteopathie: igelMonitor("Osteopathie bei unspezifischen Kreuzschmerzen", "osteopathie-bei-unspezifischen-kreuzschmerzen", NUTZEN_STAND, "unklar"),
  stosswelleTennisarm: igelMonitor("Stoßwellentherapie beim Tennisarm", "stosswellentherapie-beim-tennisarm", NUTZEN_STAND, "unklar"),
  stosswelleKalkschulter: igelMonitor("Stoßwellentherapie der Kalkschulter", "stosswellentherapie-der-kalkschulter", NUTZEN_STAND, "unklar"),
};
const NUTZEN_HALSSCHLAGADERN = "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Ultraschall der Halsschlagadern zur Schlaganfallvorsorge“ für Menschen ohne Beschwerden mit „tendenziell negativ“.";
const NUTZEN_BRUST = "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Ultraschall der Brust zur Krebsfrüherkennung“ für erwachsene Frauen ohne erhöhtes Brustkrebs-Risiko mit „unklar“.";

export const ALLE_SPECIALTIES: Specialty[] = [
  {
    id: "hausarzt",
    name: "Allgemeinmedizin und hausärztliche Innere Medizin",
    kurz: "Hausarztpraxis",
    arztDativ: "Ihrer Hausärztin oder Ihrem Hausarzt",
    marketing: {
      headline: "Check-up, Reisemedizin, Sportuntersuchung: klar getrennt, was die Kasse zahlt",
      problem: "Patienten fragen nach Zusatzleistungen und wissen nicht, was ihre Kasse übernimmt. Am Empfang kostet die Erklärung jedes Mal Zeit.",
      beispiel: "Check-up ab 35 als Kassenleistung, Reiseimpfungen mit Hinweis auf Erstattung der Kasse.",
    },
    anlaesse: [
      {
        id: "checkup",
        label: "Gesundheits-Check-up",
        bereich: "Vorsorge",
        options: [
          { id: "checkup35", name: "Gesundheits-Check-up", type: "kasse", price: 70, kasseAbAlter: 18, benefits: ["Kassenleistung: von 18 bis 34 einmal, ab 35 alle drei Jahre", "Blutdruck, Blutzucker, Cholesterin, Urin"] },
          { id: "labor_plus", zusatz: true, name: "Erweitertes Labor ohne Beschwerden (Vitamin D und Schilddrüsenwerte)", type: "igel", price: 45, benefits: ["auf Wunsch, ohne Anlass"], kasseWenn: "Bei Beschwerden oder begründetem Verdacht Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Früherkennungsuntersuchung auf Vitamin-D-Mangel“ für Erwachsene ohne Anzeichen eines Mangels mit „unklar“ und die IGeL „Blutuntersuchung zur Früherkennung von Schilddrüsenfunktionsstörungen“ für nicht-schwangere Erwachsene ohne Beschwerden mit „tendenziell negativ“.", nutzenQuelle: [IGEL.vitaminD, IGEL.schilddrueseBlut] },
          { id: "us_abdomen", zusatz: true, name: "Ultraschall der Bauchorgane ohne Beschwerden", type: "igel", price: 50, benefits: ["ohne Strahlung"], kasseWenn: "Bei Beschwerden Kassenleistung.", nutzen: NUTZEN_FRAGEN },
        ],
      },
      {
        id: "reise",
        label: "Reisevorbereitung mit Impfschutz",
        bereich: "Reisemedizin",
        options: [
          { id: "reiseberatung", name: "Reisemedizinische Beratung", type: "igel", price: 30, benefits: ["Impfplan und Malariaschutz für Ihr Reiseziel"], kasseWenn: "Manche Krankenkassen erstatten Reiseimpfungen als Satzungsleistung. Bitte vorher bei der Kasse fragen." },
          { id: "reiseimpfung", name: "Reiseimpfungen nach Plan (je Impfung, zzgl. Impfstoff)", type: "igel", price: 15, benefits: ["Impfschutz passend zum Reiseziel"], kasseWenn: "Manche Krankenkassen erstatten Reiseimpfungen als Satzungsleistung. Bitte vorher bei der Kasse fragen." },
        ],
      },
      {
        id: "sport",
        label: "Sportmedizinische Untersuchung",
        bereich: "Sport",
        options: [
          { id: "sportcheck", name: "Sportmedizinische Untersuchung mit Belastungs-EKG", type: "igel", price: 120, benefits: ["vor Wettkampf, Marathon oder Neubeginn"], kasseWenn: "Bei Herzbeschwerden Kassenleistung." },
        ],
      },
    ],
  },
  {
    id: "augen",
    name: "Augenheilkunde",
    kurz: "Augenarztpraxis",
    arztDativ: "Ihrer Augenärztin oder Ihrem Augenarzt",
    marketing: {
      headline: "Glaukom-Vorsorge und OCT schriftlich erklärt, mit Preis und klarer Grenze zur Kassenleistung",
      problem: "Zur Glaukom-Früherkennung haben Patienten Fragen. Sie braucht eine klare Aufklärung, damit sich niemand überrumpelt fühlt.",
      beispiel: "Untersuchung bei Verdacht als Kassenleistung, Vorsorge ohne Verdacht als Selbstzahlerleistung mit Preis.",
    },
    anlaesse: [
      {
        id: "glaukom",
        label: "Glaukom (Grüner Star): Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "glaukom_kasse", name: "Augendruck und Sehnerv bei Verdacht oder Risiko", type: "kasse", price: 40, benefits: ["Kassenleistung bei Verdacht, Risikofaktoren oder Beschwerden"] },
          { id: "glaukom_igel", name: "Glaukom-Vorsorge ohne Verdacht (Augendruck und Sehnerv)", type: "igel", price: 40, benefits: ["Messung des Augendrucks", "Beurteilung des Sehnervs"] },
          { id: "glaukom_oct", zusatz: true, name: "Zusätzlich OCT des Sehnervs", type: "igel", price: 60, benefits: ["Schichtaufnahme des Sehnervs", "Bilder lassen sich später vergleichen"] },
        ],
      },
      {
        id: "netzhaut",
        label: "Netzhaut und Makula",
        bereich: "Netzhaut",
        options: [
          { id: "oct_kasse", name: "OCT zur Behandlung bei feuchter AMD oder diabetischem Makulaödem", type: "kasse", price: 80, benefits: ["Kassenleistung zur Steuerung der Behandlung"] },
          { id: "oct_igel", name: "OCT der Netzhaut zur Früherkennung einer feuchten AMD", type: "igel", price: 80, benefits: ["Schichtaufnahme der Netzhaut"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „OCT zur Früherkennung einer feuchten, altersbedingten Makuladegeneration (nAMD)“ mit „tendenziell negativ“.", nutzenQuelle: IGEL.amdOct },
        ],
      },
      {
        id: "fuehrerschein",
        label: "Sehtest oder Gutachten für den Führerschein",
        bereich: "Bescheinigung",
        options: [{ id: "sehtest_fs", name: "Sehtest mit Bescheinigung für die Fahrerlaubnis", type: "igel", price: 35, benefits: ["Bescheinigung für die Führerscheinstelle"] }],
      },
    ],
  },
  {
    id: "haut",
    name: "Dermatologie",
    kurz: "Hautarztpraxis",
    arztDativ: "Ihrer Hautärztin oder Ihrem Hautarzt",
    marketing: {
      headline: "Hautkrebs-Screening ab 35 auf Kasse, alles andere transparent mit Preis",
      problem: "Unter 35, Auflichtmikroskopie, Videodermatoskopie: Patienten verstehen nicht, warum dieselbe Untersuchung mal kostet und mal nicht.",
      beispiel: "Screening nach Alter automatisch als Kasse oder Selbstzahler, Auflicht und Video mit Preis.",
    },
    anlaesse: [
      {
        id: "hautkrebs",
        label: "Hautkrebs-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "hks", name: "Hautkrebs-Screening", type: "kasse", price: 40, kasseAbAlter: 35, benefits: ["Kassenleistung ab 35 alle zwei Jahre", "Untersuchung der gesamten Haut"] },
          { id: "auflicht", zusatz: true, name: "Auflichtmikroskopie auffälliger Muttermale", type: "igel", price: 35, benefits: ["vergrößerte Ansicht der Pigmentmale"], kasseWenn: "Bei verdächtigen Malen Kassenleistung." },
          { id: "video", zusatz: true, name: "Digitale Videodermatoskopie mit Verlaufskontrolle", type: "igel", price: 90, benefits: ["Bilder werden gespeichert und beim nächsten Termin verglichen"], kasseWenn: "Bei vielen auffälligen Malen fragen manche Kassen nach Einzelfallprüfung." },
        ],
        notes: ["Verdächtige Hautstellen werden immer zulasten der Kasse abgeklärt."],
      },
      {
        id: "aesthetik",
        label: "Patient wünscht ästhetische Behandlung",
        bereich: "Ästhetik",
        nurAufWunsch: true,
        options: [
          { id: "peeling", name: "Chemisches Peeling", type: "igel", price: 120, benefits: ["Peeling der oberen Hautschicht"] },
          { id: "laser_gefaesse", name: "Laserbehandlung kleiner Gefäße", type: "igel", price: 150, benefits: ["für Besenreiser und Äderchen im Gesicht"] },
        ],
      },
    ],
  },
  {
    id: "gyn",
    name: "Frauenheilkunde und Geburtshilfe",
    kurz: "Frauenarztpraxis",
    arztDativ: "Ihrer Frauenärztin oder Ihrem Frauenarzt",
    marketing: {
      headline: "Vorsorge, Ultraschall, Schwangerschaft: ohne Druck, Aussagen zum Nutzen nur mit Quelle",
      problem: "Zum vaginalen Ultraschall als Früherkennung haben Patientinnen Fragen. Er braucht eine klare Aufklärung.",
      beispiel: "Krebsfrüherkennung auf Kasse, Ultraschall ohne Beschwerden mit Preis und der Bewertung des IGeL-Monitors.",
    },
    anlaesse: [
      {
        id: "krebsvorsorge",
        geschlecht: "W",
        label: "Krebsfrüherkennung Gebärmutter und Eierstöcke",
        bereich: "Vorsorge",
        options: [
          { id: "kfu_gyn", name: "Krebsfrüherkennung mit Abstrich", type: "kasse", price: 40, benefits: ["Kassenleistung ab 20; ab 35 alle drei Jahre mit HPV-Test"] },
          { id: "us_vaginal", zusatz: true, name: "Ultraschall von Gebärmutter und Eierstöcken ohne Beschwerden", type: "igel", price: 50, benefits: ["ohne Strahlung"], kasseWenn: "Bei Beschwerden oder auffälligem Befund Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Ultraschall der Eierstöcke zur Krebsfrüherkennung“ mit „negativ“ und die IGeL „Ultraschall zur Früherkennung von Gebärmutterkörperkrebs“ mit „tendenziell negativ“.", nutzenQuelle: [IGEL.eierstoecke, IGEL.gebaermutter] },
          { id: "hpv_u35", zusatz: true, name: "HPV-Test vor dem 35. Lebensjahr", type: "igel", price: 45, benefits: ["Nachweis krebsauslösender Viren"], kasseWenn: "Ab 35 Teil der Kassenleistung, bei auffälligem Abstrich auch vorher.", nutzen: NUTZEN_FRAGEN },
        ],
      },
      {
        id: "brust",
        geschlecht: "W",
        label: "Brust-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "brust_tast", name: "Tastuntersuchung der Brust", type: "kasse", price: 20, kasseAbAlter: 30, benefits: ["Kassenleistung ab 30 jährlich"] },
          { id: "brust_us", zusatz: true, name: "Ultraschall der Brust ohne Befund", type: "igel", price: 50, benefits: ["ohne Strahlung"], kasseWenn: "Bei Tastbefund oder Verdacht Kassenleistung.", nutzen: NUTZEN_BRUST, nutzenQuelle: IGEL.brust },
        ],
      },
      {
        id: "schwangerschaft",
        geschlecht: "W", abAlter: 14, bisAlter: 50,
        label: "Schwangerschaft: Zusatzuntersuchungen",
        bereich: "Schwangerschaft",
        options: [
          { id: "mutterschaft", name: "Vorsorge nach Mutterschafts-Richtlinien", type: "kasse", price: 0, benefits: ["Kassenleistung, inklusive drei Ultraschall-Untersuchungen"] },
          { id: "toxo", zusatz: true, name: "Toxoplasmose-Test", type: "igel", price: 25, benefits: ["Bestimmung von Antikörpern im Blut"], kasseWenn: "Bei Verdacht auf eine Infektion Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Toxoplasmose-Test bei Schwangeren“ mit „unklar“.", nutzenQuelle: IGEL.toxoplasmose },
          // Kein Ultraschall „auf Wunsch“ ohne medizinischen Zweck: § 10 NiSV verbietet, bei der Anwendung von
          // Ultraschall zu nichtmedizinischen Zwecken (§ 2 Abs. 2 Nr. 1 NiSV) einen Fötus zu exponieren;
          // Ordnungswidrigkeit nach § 12 Nr. 10 NiSV. Das frühere Angebot „Zusätzlicher Ultraschall (auch 3D)
          // auf Wunsch“ ist deshalb entfernt.
        ],
      },
    ],
  },
  {
    id: "uro",
    name: "Urologie",
    kurz: "Urologische Praxis",
    arztDativ: "Ihrer Urologin oder Ihrem Urologen",
    marketing: {
      headline: "PSA-Test schriftlich erklärt",
      problem: "Zum PSA-Test haben Patienten Fragen. Die Antwort braucht Zeit, die im Termin fehlt.",
      beispiel: "Tastuntersuchung ab 45 auf Kasse, PSA-Test mit Preis und der Bewertung des IGeL-Monitors.",
    },
    anlaesse: [
      {
        id: "prostata",
        geschlecht: "M",
        label: "Prostatakrebs-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "prostata_tast", name: "Tastuntersuchung der Prostata", type: "kasse", price: 20, kasseAbAlter: 45, benefits: ["Kassenleistung ab 45 jährlich"] },
          { id: "psa", zusatz: true, name: "PSA-Test zur Früherkennung", type: "igel", price: 30, benefits: ["Bluttest auf das prostataspezifische Antigen"], kasseWenn: "Bei Beschwerden, Verdacht oder zur Verlaufskontrolle Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „PSA-Test zur Früherkennung von Prostatakrebs“ mit „tendenziell negativ“.", nutzenQuelle: IGEL.psa },
          { id: "us_uro", zusatz: true, name: "Ultraschall von Nieren und Blase ohne Beschwerden", type: "igel", price: 45, benefits: ["ohne Strahlung"], kasseWenn: "Bei Beschwerden Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Ultraschall der Nieren zur Früherkennung von Nierenkrebs“ für Erwachsene ohne Beschwerden und ohne beruflich oder familiär erhöhtes Risiko und die IGeL „Ultraschall der Blase zur Früherkennung von Harnblasenkrebs“ für Erwachsene ohne Beschwerden und ohne beruflich oder genetisch erhöhtes Risiko jeweils mit „tendenziell negativ“.", nutzenQuelle: [IGEL.nieren, IGEL.blase] },
        ],
      },
    ],
  },
  {
    id: "ortho",
    name: "Orthopädie und Unfallchirurgie",
    kurz: "Orthopädische Praxis",
    arztDativ: "Ihrer Orthopädin oder Ihrem Orthopäden",
    marketing: {
      headline: "Stoßwelle, Hyaluron, Knochendichte: zuerst sagen, wann die Kasse zahlt",
      problem: "Stoßwelle und Akupunktur sind mal Kasse, mal Selbstzahler, je nach Diagnose. Patienten fragen, ob die Kasse zahlt.",
      beispiel: "Stoßwelle bei Fersensporn als Kassenleistung kenntlich, Hyaluron mit Preis.",
    },
    anlaesse: [
      {
        id: "gelenkschmerz",
        label: "Chronische Gelenk- oder Sehnenschmerzen",
        bereich: "Schmerztherapie",
        options: [
          { id: "ortho_kasse", name: "Behandlung nach Leitlinie (z. B. Physiotherapie, Medikamente)", type: "kasse", price: 0, benefits: [] },
          { id: "eswt", zusatz: true, name: "Stoßwellentherapie (je Sitzung)", type: "igel", price: 80, benefits: ["ohne Operation, meist 3–5 Sitzungen"], kasseWenn: "Bei Fersenschmerz (Plantarfasziitis) nach erfolgloser Vorbehandlung Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Stoßwellentherapie beim Tennisarm“ und die IGeL „Stoßwellentherapie der Kalkschulter“ jeweils mit „unklar“.", nutzenQuelle: [IGEL.stosswelleTennisarm, IGEL.stosswelleKalkschulter] },
          { id: "hyaluron", zusatz: true, name: "Hyaluronsäure-Injektion ins Knie (je Spritze)", type: "igel", price: 90, benefits: ["Spritze in das Kniegelenk"], nutzen: NUTZEN_FRAGEN },
          { id: "akupunktur", zusatz: true, name: "Akupunktur", type: "igel", price: 40, benefits: ["Ergänzung zur Schmerztherapie"], kasseWenn: "Bei chronischen Rücken- oder Knieschmerzen Kassenleistung." },
        ],
      },
      {
        id: "osteoporose",
        label: "Osteoporose-Abklärung",
        bereich: "Knochen",
        options: [
          { id: "dxa_kasse", name: "Knochendichtemessung (DXA) bei Verdacht", type: "kasse", price: 50, benefits: ["Kassenleistung nach Knochenbruch ohne Unfall oder bei begründetem Verdacht"] },
          // Keine DXA „zur Vorsorge“: Röntgen bei Menschen ohne Krankheitszeichen und ohne konkreten Verdacht ist
          // Früherkennung (§ 5 Abs. 16 StrlSchG) und nach § 84 Abs. 1 StrlSchG nur zulässig, wenn eine Rechtsverordnung
          // sie vorsieht. Verordnungen nach § 84 Abs. 2 gibt es nur für Brustkrebs (Mammographie) und Lungenkrebs
          // (Niedrigdosis-CT), nicht für die Osteoporose (gesetze-im-internet.de, Stand 17.11.2026; die BfS-Bewertung
          // nach § 84 Abs. 3, BAnz AT 27.04.2026 B2, ist keine Zulassung). Siehe auch radiologie/knochen.
        ],
      },
    ],
  },
  {
    id: "hno",
    name: "Hals-Nasen-Ohrenheilkunde",
    kurz: "HNO-Praxis",
    arztDativ: "Ihrer HNO-Ärztin oder Ihrem HNO-Arzt",
    marketing: {
      headline: "Hörtest und Schnarchdiagnostik: Kasse bei Beschwerden, sonst klar mit Preis",
      problem: "Ob ein Hörtest oder eine Schlafuntersuchung Kassenleistung ist, hängt am Anlass. Das zu erklären kostet Zeit.",
      beispiel: "Schlafapnoe-Verdacht auf Kasse, Schnarchdiagnostik ohne Verdacht mit Preis.",
    },
    anlaesse: [
      {
        id: "hoeren",
        label: "Hörtest",
        bereich: "Hören",
        options: [
          { id: "audio_kasse", name: "Hörtest bei Beschwerden", type: "kasse", price: 30, benefits: ["Kassenleistung bei Hörminderung, Ohrgeräuschen oder Schwindel"] },
          { id: "audio_igel", name: "Hörtest zur Vorsorge ohne Beschwerden", type: "igel", price: 30, benefits: ["Ausgangswert für spätere Vergleiche"] },
        ],
      },
      {
        id: "schnarchen",
        label: "Schnarchen",
        bereich: "Schlaf",
        options: [
          { id: "polygraphie", name: "Schlafuntersuchung bei Verdacht auf Schlafapnoe", type: "kasse", price: 150, benefits: ["Kassenleistung bei Atemaussetzern, Tagesmüdigkeit"] },
          { id: "schnarch_igel", name: "Schnarch-Diagnostik ohne Verdacht auf Schlafapnoe", type: "igel", price: 120, benefits: ["Ursachensuche, Beratung zu Schienen und Maßnahmen"] },
        ],
      },
    ],
  },
  {
    id: "kinder",
    name: "Kinder- und Jugendmedizin",
    kurz: "Kinderarztpraxis",
    arztDativ: "Ihrer Kinderärztin oder Ihrem Kinderarzt",
    marketing: {
      headline: "U10, U11, J2: Eltern sehen sofort, ob ihre Kasse zahlt",
      problem: "Ob U10, U11 und J2 bezahlt werden, hängt von der Kasse ab. Eltern fragen jedes Mal neu.",
      beispiel: "U-Untersuchungen auf Kasse, Zusatzuntersuchungen mit Hinweis auf Selektivverträge.",
    },
    anlaesse: [
      {
        id: "vorsorge_kind",
        bisAlter: 17,
        label: "Vorsorgeuntersuchungen",
        bereich: "Vorsorge",
        options: [
          { id: "u_kasse", name: "U1 bis U9 und J1", type: "kasse", price: 0, benefits: [] },
          { id: "u_extra", zusatz: true, name: "U10, U11 oder J2", type: "igel", price: 50, benefits: ["Entwicklung, Schule, Pubertät"], kasseWenn: "Manche Krankenkassen zahlen sie über Verträge mit den Kinderärzten. Bitte vorher bei der Kasse fragen." },
        ],
      },
      {
        id: "sport_kind",
        label: "Sport oder Reise",
        bereich: "Bescheinigung",
        options: [
          { id: "sporttaugl", name: "Sporttauglichkeits-Bescheinigung", type: "igel", price: 30, benefits: ["für Verein oder Wettkampf"] },
          { id: "reiseimpf_kind", name: "Reiseimpfungen (je Impfung, zzgl. Impfstoff)", type: "igel", price: 15, benefits: ["Schutz für das Reiseland"], kasseWenn: "Manche Krankenkassen erstatten Reiseimpfungen als Satzungsleistung. Bitte vorher bei der Kasse fragen." },
        ],
      },
    ],
  },
  {
    id: "kardio",
    name: "Kardiologie",
    kurz: "Kardiologische Praxis",
    arztDativ: "Ihrer Kardiologin oder Ihrem Kardiologen",
    marketing: {
      headline: "Vorsorge ohne Beschwerden? Erst die Bewertung mit Quelle, dann der Preis",
      problem: "Gesunde fragen nach Herz-Checks. Ob die Kasse zahlt, hängt an Beschwerden und Risikofaktoren.",
      beispiel: "Abklärung bei Beschwerden auf Kasse, Belastungs-EKG ohne Beschwerden mit Preis und der Bewertung des IGeL-Monitors.",
    },
    anlaesse: [
      {
        id: "herzcheck",
        label: "Herz-Check ohne Beschwerden",
        bereich: "Vorsorge",
        options: [
          { id: "kardio_kasse", name: "Abklärung bei Beschwerden oder Risikofaktoren", type: "kasse", price: 0, benefits: [] },
          { id: "ergometrie", name: "Belastungs-EKG ohne Beschwerden", type: "igel", price: 70, benefits: ["zeigt die Belastbarkeit des Herzens"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „EKG zur Früherkennung einer koronaren Herzerkrankung“ für Menschen ohne Beschwerden mit „tendenziell negativ“.", nutzenQuelle: IGEL.ekg },
          { id: "carotis", name: "Ultraschall der Halsschlagadern ohne Beschwerden", type: "igel", price: 60, benefits: ["sucht nach Ablagerungen"], nutzen: NUTZEN_HALSSCHLAGADERN, nutzenQuelle: IGEL.halsschlagadern },
        ],
      },
    ],
  },
  {
    id: "radiologie",
    name: "Radiologie",
    kurz: "Radiologische Praxis",
    teaser: "MRT ohne Indikation, Mammographie, Knochendichte",
    arztDativ: "Ihrer Radiologin oder Ihrem Radiologen",
    marketing: {
      headline: "MRT auf Wunsch? Erst sagen, was die Kasse zahlt",
      problem: "Selbstzahler-MRTs und Vorsorgeuntersuchungen werden am Telefon angefragt. Die Erklärung, was die Kasse zahlt und was nicht, kostet Zeit am Empfang.",
      beispiel: "Untersuchung mit Überweisung auf Kasse, Wunsch-MRT mit Preis.",
    },
    anlaesse: [
      {
        // Nur MRT: CT ist Röntgen und braucht die rechtfertigende Indikation durch eine fachkundige Ärztin oder einen
        // fachkundigen Arzt (§ 83 Abs. 3 StrlSchG); ohne Krankheitszeichen und Verdacht ist es Früherkennung (§ 84 Abs. 1).
        id: "mrt_wunsch",
        label: "MRT auf eigenen Wunsch",
        bereich: "Schnittbild",
        options: [
          { id: "mrt_kasse", name: "MRT mit Überweisung bei medizinischer Indikation", type: "kasse", price: 450, benefits: ["Kassenleistung mit Überweisung"] },
          { id: "mrt_igel", name: "MRT ohne Indikation (je Körperregion)", type: "igel", price: 450, benefits: ["ohne Strahlung"], nutzen: NUTZEN_FRAGEN },
          { id: "ganzkoerper_mrt", name: "Ganzkörper-MRT zur Vorsorge", type: "igel", price: 950, benefits: ["Übersicht über viele Organe"], nutzen: NUTZEN_FRAGEN },
        ],
      },
      {
        id: "mamma",
        geschlecht: "W",
        label: "Brustkrebs-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "mammo_screening", name: "Mammographie-Screening", type: "kasse", price: 90, kasseAbAlter: 50, benefits: ["Kassenleistung ab 50 alle zwei Jahre, mit Einladung"] },
          { id: "mamma_us", zusatz: true, name: "Ultraschall der Brust ergänzend", type: "igel", price: 60, benefits: ["ohne Strahlung"], kasseWenn: "Bei Tastbefund oder Verdacht Kassenleistung.", nutzen: NUTZEN_BRUST, nutzenQuelle: IGEL.brust },
        ],
      },
      {
        id: "knochen",
        label: "Knochendichte",
        bereich: "Knochen",
        options: [
          { id: "dxa_rad_kasse", name: "Knochendichtemessung (DXA) bei Verdacht", type: "kasse", price: 50, benefits: ["Kassenleistung nach Bruch ohne Unfall oder bei begründetem Verdacht"] },
          // Keine DXA „zur Vorsorge“ (Früherkennung mit Röntgenstrahlung, § 84 Abs. 1 StrlSchG; siehe ortho/osteoporose).
        ],
      },
    ],
  },
  {
    id: "neuro",
    name: "Neurologie",
    kurz: "Neurologische Praxis",
    teaser: "Gedächtnis-Check, Kopfschmerz, Gefäß-Ultraschall",
    arztDativ: "Ihrer Neurologin oder Ihrem Neurologen",
    marketing: {
      headline: "Gedächtnis-Check und Gefäß-Ultraschall: offen sagen, wann es Kassenleistung ist",
      problem: "Besorgte Angehörige fragen nach Demenz-Tests, Gesunde nach Gefäß-Checks. Beides braucht Zeit für die Erklärung.",
      beispiel: "Abklärung bei Beschwerden auf Kasse, Check ohne Beschwerden mit Preis und der Bewertung des IGeL-Monitors.",
    },
    anlaesse: [
      {
        id: "gedaechtnis",
        label: "Gedächtnis und Konzentration",
        bereich: "Diagnostik",
        options: [
          { id: "demenz_kasse", name: "Abklärung bei Beschwerden oder Verdacht", type: "kasse", price: 0, benefits: [] },
          { id: "demenz_check", name: "Gedächtnis-Check ohne Beschwerden", type: "igel", price: 80, benefits: ["Tests zu Gedächtnis und Aufmerksamkeit"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Hirnleistungs-Check zur Früherkennung einer Demenz“ für Menschen unter 70 Jahren ohne Anzeichen einer Demenz mit „tendenziell negativ“.", nutzenQuelle: IGEL.demenz },
        ],
      },
      {
        id: "gefaesse",
        label: "Gefäß-Ultraschall ohne Beschwerden",
        bereich: "Vorsorge",
        options: [
          { id: "neuro_kasse", name: "Ultraschall bei Beschwerden oder Risikofaktoren", type: "kasse", price: 0, benefits: [] },
          { id: "neuro_carotis", name: "Ultraschall der Halsschlagadern ohne Beschwerden", type: "igel", price: 60, benefits: ["sucht nach Ablagerungen"], nutzen: NUTZEN_HALSSCHLAGADERN, nutzenQuelle: IGEL.halsschlagadern },
        ],
      },
      {
        id: "kopfschmerz",
        label: "Chronischer Kopfschmerz",
        bereich: "Schmerz",
        options: [
          { id: "kopf_kasse", name: "Diagnostik und Behandlung nach Leitlinie", type: "kasse", price: 0, benefits: [] },
          { id: "kopf_akupunktur", zusatz: true, name: "Akupunktur bei Kopfschmerz", type: "igel", price: 40, benefits: ["Ergänzung zur Behandlung"], kasseWenn: "Akupunktur ist nur bei chronischen Rücken- oder Knieschmerzen Kassenleistung.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Akupunktur zur Vorbeugung von Migräneanfällen“ mit „tendenziell positiv“ und die IGeL „Akupunktur zur Vorbeugung von Spannungskopfschmerzen“ mit „unklar“.", nutzenQuelle: [IGEL.akupunkturMigraene, IGEL.akupunkturSpannungskopfschmerz] },
        ],
      },
    ],
  },
  {
    id: "psych",
    name: "Psychiatrie und Psychotherapie",
    kurz: "Psychotherapeutische Praxis",
    teaser: "Kassenplatz, Kostenerstattung, Selbstzahler-Sitzungen",
    arztDativ: "Ihrer Therapeutin oder Ihrem Therapeuten",
    marketing: {
      headline: "Kassenplatz, Kostenerstattung oder Selbstzahler: Patienten verstehen ihre Wege",
      problem: "Lange Wartezeiten führen zu vielen Anfragen. Die Erklärung von Sprechstunde, Kostenerstattung und Selbstzahler-Sitzungen wiederholt sich jeden Tag.",
      beispiel: "Richtlinienpsychotherapie auf Kasse, Kostenerstattung als Weg erklärt, Selbstzahler-Sitzung mit Preis.",
    },
    anlaesse: [
      {
        id: "therapieplatz",
        label: "Psychotherapie",
        bereich: "Behandlung",
        options: [
          { id: "richtlinie", name: "Richtlinienpsychotherapie nach Sprechstunde", type: "kasse", price: 0, benefits: ["Kassenleistung, nach Sprechstunde und Antrag"] },
          { id: "selbstzahler_sitzung", name: "Selbstzahler-Sitzung (je 50 Minuten)", type: "igel", price: 110, benefits: ["auf eigene Rechnung, ohne Kassenplatz"], kasseWenn: "Bei langer Wartezeit kann die Kasse die Kosten einer Privatpraxis erstatten (Kostenerstattung nach § 13 Abs. 3 SGB V). Vorher bei der Kasse beantragen." },
        ],
      },
      {
        id: "coaching",
        label: "Beratung ohne Krankheitswert",
        bereich: "Beratung",
        nurAufWunsch: true,
        options: [{ id: "coaching_sitzung", name: "Beratung, z. B. Stressbewältigung (je Sitzung)", type: "igel", price: 90, benefits: ["für Belastungen ohne Krankheitswert"], nutzen: "Keine Krankenbehandlung und keine Kassenleistung." }],
      },
    ],
  },
  {
    id: "gastro",
    name: "Gastroenterologie",
    kurz: "Gastroenterologische Praxis",
    teaser: "Darmkrebs-Vorsorge, Atemtests, Ultraschall",
    arztDativ: "Ihrer Gastroenterologin oder Ihrem Gastroenterologen",
    marketing: {
      headline: "Darmkrebs-Vorsorge: ab 50 auf Kasse, davor mit Preis",
      problem: "Jüngere Patienten wollen eine Darmspiegelung, ältere wissen nicht, dass sie Anspruch haben. Beides kostet Erklärzeit.",
      beispiel: "Vorsorge ab 50 als Kassenleistung, Darmspiegelung vor 50 mit Hinweis, wann die Kasse trotzdem zahlt.",
    },
    anlaesse: [
      {
        id: "darm",
        label: "Darmkrebs-Vorsorge",
        bereich: "Vorsorge",
        options: [
          { id: "koloskopie", name: "Vorsorge-Darmspiegelung", type: "kasse", price: 300, kasseAbAlter: 50, benefits: ["Kassenleistung ab 50 Jahren"] },
          { id: "ifobt", name: "Stuhltest auf verstecktes Blut", type: "igel", price: 30, benefits: ["Test zu Hause"], kasseWenn: "Ab 50 im Rahmen der Vorsorge Kassenleistung.", nutzen: NUTZEN_FRAGEN },
        ],
        notes: ["Bei Beschwerden oder familiärer Belastung ist die Darmspiegelung auch vor 50 Kassenleistung."],
      },
      {
        id: "unvertraeglich",
        label: "Nahrungsmittel-Unverträglichkeit",
        bereich: "Diagnostik",
        options: [
          { id: "atemtest_kasse", name: "Atemtest bei Beschwerden", type: "kasse", price: 45, benefits: [] },
          { id: "atemtest_igel", name: "Atemtest ohne Beschwerden", type: "igel", price: 45, benefits: ["Laktose oder Fruktose"], nutzen: NUTZEN_FRAGEN },
        ],
      },
    ],
  },
  {
    id: "pneumo",
    name: "Pneumologie",
    kurz: "Lungenfachpraxis",
    teaser: "Lungenfunktion, Rauchstopp, Schlafapnoe",
    arztDativ: "Ihrer Lungenfachärztin oder Ihrem Lungenfacharzt",
    marketing: {
      headline: "Lungen-Check und Rauchstopp: zeigen, was die Kasse übernimmt",
      problem: "Raucher fragen nach Checks, Schnarcher nach Schlaftests. Die Antwort hängt am Anlass und an der Kasse.",
      beispiel: "Lungenfunktion bei Beschwerden auf Kasse, Rauchstopp-Kurs mit Hinweis auf Zuschüsse der Kassen.",
    },
    anlaesse: [
      {
        id: "lunge",
        label: "Lungen-Check",
        bereich: "Diagnostik",
        options: [
          { id: "lufu_kasse", name: "Lungenfunktion bei Beschwerden", type: "kasse", price: 40, benefits: ["Kassenleistung bei Husten, Atemnot"] },
          { id: "lufu_igel", name: "Lungenfunktion ohne Beschwerden (z. B. Raucher-Check)", type: "igel", price: 40, benefits: ["Ausgangswert für spätere Vergleiche"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Spirometrie zur Überprüfung der Lungenfunktion“ für Menschen ohne Atembeschwerden mit „tendenziell negativ“.", nutzenQuelle: IGEL.spirometrie },
        ],
      },
      {
        id: "rauchstopp",
        label: "Rauchstopp",
        bereich: "Prävention",
        options: [{ id: "rauchstopp_kurs", name: "Rauchentwöhnungskurs", type: "igel", price: 150, benefits: ["Gruppenkurs über mehrere Wochen"], kasseWenn: "Krankenkassen bezuschussen zertifizierte Präventionskurse (§ 20 SGB V). Die Höhe legt jede Kasse fest." }],
      },
    ],
  },
  {
    id: "endo",
    name: "Endokrinologie und Diabetologie",
    kurz: "Diabetologische Praxis",
    teaser: "Schilddrüse, Glukosesensor, Ernährungsberatung",
    arztDativ: "Ihrer Diabetologin oder Ihrem Diabetologen",
    marketing: {
      headline: "Glukosesensor, Schilddrüse, Ernährung: klar, was die Kasse übernimmt",
      problem: "Patienten fragen nach Sensoren und Checks, deren Kostenübernahme von der Therapie abhängt.",
      beispiel: "Sensor bei intensivierter Insulintherapie auf Kasse, sonst mit Preis; Ernährungsberatung mit Hinweis auf Zuschüsse.",
    },
    anlaesse: [
      {
        id: "glukose",
        label: "Glukosesensor",
        bereich: "Diabetes",
        options: [
          { id: "cgm_kasse", name: "Kontinuierliche Glukosemessung bei intensivierter Insulintherapie", type: "kasse", price: 0, benefits: ["Kassenleistung nach Antrag"] },
          { id: "cgm_igel", name: "Glukosesensor ohne Insulintherapie (je Monat)", type: "igel", price: 60, benefits: ["Verlauf des Zuckers im Alltag sehen"], nutzen: NUTZEN_FRAGEN },
        ],
      },
      {
        id: "schilddruese",
        label: "Schilddrüse",
        bereich: "Diagnostik",
        options: [
          { id: "sd_kasse", name: "Ultraschall und Blutwerte bei Beschwerden oder Befund", type: "kasse", price: 0, benefits: [] },
          { id: "sd_igel", name: "Schilddrüsen-Check ohne Beschwerden", type: "igel", price: 50, benefits: ["Ultraschall und Blutwerte"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Ultraschall zur Früherkennung von Veränderungen der Schilddrüse“ und die IGeL „Blutuntersuchung zur Früherkennung von Schilddrüsenfunktionsstörungen“ jeweils für nicht-schwangere Erwachsene ohne Beschwerden mit „tendenziell negativ“.", nutzenQuelle: [IGEL.schilddrueseUltraschall, IGEL.schilddrueseBlut] },
        ],
      },
      {
        id: "ernaehrung",
        label: "Ernährungsberatung",
        bereich: "Prävention",
        options: [{ id: "ernaehrung_beratung", name: "Ernährungsberatung (je Termin)", type: "igel", price: 60, benefits: ["persönlicher Plan"], kasseWenn: "Manche Krankenkassen zahlen mit ärztlicher Bescheinigung einen Zuschuss. Bitte vorher bei der Kasse fragen." }],
      },
    ],
  },
  {
    id: "chirurgie",
    name: "Chirurgie, Phlebologie und Proktologie",
    kurz: "Chirurgische Praxis",
    teaser: "Krampfadern, Besenreiser, Hautveränderungen",
    arztDativ: "Ihrer Chirurgin oder Ihrem Chirurgen",
    marketing: {
      headline: "Medizinisch notwendig oder kosmetisch? Die Grenze klar zeigen",
      problem: "Ob eine Krampfader oder ein Muttermal auf Kasse behandelt wird, hängt am Befund. Patienten wollen das vorher wissen.",
      beispiel: "Behandlung bei Beschwerden auf Kasse, kosmetische Eingriffe mit Preis und ohne Druck.",
    },
    anlaesse: [
      {
        id: "venen",
        label: "Krampfadern und Besenreiser",
        bereich: "Venen",
        options: [
          { id: "venen_kasse", name: "Behandlung von Krampfadern bei Beschwerden", type: "kasse", price: 0, benefits: [] },
          { id: "besenreiser", zusatz: true, name: "Verödung von Besenreisern (je Sitzung)", type: "igel", price: 120, benefits: ["Behandlung aus kosmetischem Wunsch"], nutzen: "Behandlung aus kosmetischem Wunsch, keine Kassenleistung." },
        ],
      },
      {
        id: "haut_entfernung",
        label: "Entfernung von Hautveränderungen",
        bereich: "Kleine Eingriffe",
        options: [
          { id: "entfernung_kasse", name: "Entfernung bei medizinischer Indikation", type: "kasse", price: 0, benefits: ["Kassenleistung, z. B. bei Verdacht oder Beschwerden"] },
          { id: "entfernung_kosmetisch", name: "Entfernung aus kosmetischen Gründen", type: "igel", price: 150, benefits: ["ambulant, örtliche Betäubung"] },
        ],
      },
    ],
  },
  {
    id: "aesthetik",
    name: "Plastische und Ästhetische Chirurgie",
    kurz: "Ästhetische Praxis",
    teaser: "Nur auf Wunsch: Falten, Lider, Haut",
    arztDativ: "Ihrer Fachärztin oder Ihrem Facharzt",
    marketing: {
      headline: "Ästhetik ohne Druck: Preis, Ablauf und Bedenkzeit in Textform",
      problem: "Bei Wunschleistungen erwarten Patienten Klarheit über Kosten und Risiken, schriftlich und ohne Verkaufsgespräch.",
      beispiel: "Medizinisch begründete Eingriffe mit Hinweis auf Kostenzusage, Wunschbehandlungen mit Preis und Bedenkzeit.",
    },
    anlaesse: [
      {
        id: "gesicht",
        label: "Behandlung im Gesicht auf Wunsch",
        bereich: "Ästhetik",
        nurAufWunsch: true,
        options: [
          { id: "botulinum", name: "Faltenbehandlung mit Botulinum (Stirn)", type: "igel", price: 300, benefits: ["Spritzen in die Stirnmuskulatur"] },
          { id: "filler", name: "Hyaluron-Unterspritzung (je Spritze)", type: "igel", price: 350, benefits: ["Unterspritzung mit Hyaluronsäure"] },
        ],
      },
      {
        id: "lider",
        label: "Schlupflider",
        bereich: "Lider",
        options: [
          { id: "lider_kasse", name: "Lidkorrektur bei Einschränkung des Gesichtsfelds", type: "kasse", price: 0, benefits: ["Kassenleistung nach Prüfung und Kostenzusage"] },
          { id: "lider_aesthetik", name: "Lidstraffung aus ästhetischen Gründen", type: "igel", price: 2500, benefits: ["ambulant, örtliche Betäubung"] },
        ],
      },
    ],
  },
  {
    id: "physio",
    name: "Physiotherapie und Osteopathie",
    kurz: "Physiotherapie-Praxis",
    beruf: "therapie",
    teaser: "Verordnung mit Zuzahlung, Selbstzahler, Kurse",
    arztDativ: "Ihrer Physiotherapeutin oder Ihrem Physiotherapeuten",
    marketing: {
      headline: "Rezept zu Ende: Selbstzahler-Einheiten mit Preis zeigen",
      problem: "Nach dem Ende der Verordnung fragen Patienten, was weitere Einheiten kosten und was die Kasse erstattet.",
      beispiel: "Krankengymnastik auf Verordnung mit gesetzlicher Zuzahlung, Folgeeinheiten als Selbstzahler, Osteopathie mit Hinweis auf Kassenzuschüsse.",
    },
    anlaesse: [
      {
        id: "ruecken",
        label: "Rücken- oder Gelenkbeschwerden",
        bereich: "Behandlung",
        options: [
          { id: "kg_rezept", name: "Krankengymnastik auf Verordnung (6 Einheiten)", type: "kasse", price: 180, zuzahlung: true, benefits: ["Kassenleistung mit gesetzlicher Zuzahlung"] },
          { id: "kg_selbst", zusatz: true, name: "Weitere Krankengymnastik als Selbstzahler (6 Einheiten)", type: "igel", price: 270, benefits: ["ohne Unterbrechung weiterbehandeln"], kasseWenn: "Mit neuer Verordnung wieder Kassenleistung." },
          { id: "osteopathie", zusatz: true, name: "Osteopathie (je Sitzung)", type: "igel", price: 90, benefits: ["manuelle Behandlung"], kasseWenn: "Manche Krankenkassen erstatten einen Teil als Zusatzleistung, teils nur mit ärztlicher Bescheinigung. Bitte vorher bei der Kasse fragen.", nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Osteopathie bei unspezifischen Kreuzschmerzen“ mit „unklar“.", nutzenQuelle: IGEL.osteopathie },
        ],
      },
      {
        id: "praevention",
        label: "Training und Prävention",
        bereich: "Prävention",
        options: [
          { id: "kgg_karte", name: "Gerätetraining unter Anleitung (10 Termine)", type: "igel", price: 150, benefits: ["Training an Geräten"], kasseWenn: "Gerätegestützte Krankengymnastik ist mit Verordnung Kassenleistung." },
          { id: "rueckenkurs", name: "Rückenkurs (8 Termine)", type: "igel", price: 120, benefits: ["in der Gruppe"], kasseWenn: "Krankenkassen bezuschussen zertifizierte Präventionskurse (§ 20 SGB V). Die Höhe legt jede Kasse fest." },
        ],
      },
    ],
  },
  {
    id: "ergo",
    name: "Ergotherapie",
    kurz: "Ergotherapie-Praxis",
    beruf: "therapie",
    teaser: "Verordnung mit Zuzahlung, Folgeeinheiten, Hirnleistung",
    arztDativ: "Ihrer Ergotherapeutin oder Ihrem Ergotherapeuten",
    marketing: {
      headline: "Weiterbehandeln, wenn das Rezept endet: mit Preis statt Verlegenheit",
      problem: "Angehörige fragen, was die Behandlung ohne neues Rezept kostet. Eine schriftliche Übersicht spart Zeit und Missverständnisse.",
      beispiel: "Ergotherapie auf Verordnung mit Zuzahlung, Folgeeinheiten und Hirnleistungstraining als Selbstzahler.",
    },
    anlaesse: [
      {
        id: "ergo_behandlung",
        label: "Ergotherapie",
        bereich: "Behandlung",
        options: [
          { id: "ergo_rezept", name: "Ergotherapie auf Verordnung (10 Einheiten)", type: "kasse", price: 450, zuzahlung: true, benefits: ["Kassenleistung mit gesetzlicher Zuzahlung, für Kinder ohne Zuzahlung"] },
          { id: "ergo_selbst", zusatz: true, name: "Weitere Einheiten als Selbstzahler (je Einheit)", type: "igel", price: 55, benefits: ["ohne Unterbrechung weiterbehandeln"], kasseWenn: "Mit neuer Verordnung wieder Kassenleistung." },
          { id: "hirnleistung", zusatz: true, name: "Hirnleistungstraining (10 Einheiten)", type: "igel", price: 450, benefits: ["Gedächtnis und Konzentration üben"] },
        ],
      },
    ],
  },
  {
    id: "logo",
    name: "Logopädie",
    kurz: "Logopädie-Praxis",
    beruf: "therapie",
    teaser: "Sprachtherapie auf Rezept, Stimmtraining",
    arztDativ: "Ihrer Logopädin oder Ihrem Logopäden",
    marketing: {
      headline: "Sprachtherapie auf Rezept und Stimmtraining für Berufe: beides klar erklärt",
      problem: "Eltern und Berufstätige fragen, was die Kasse zahlt. Stimmtraining ohne Diagnose ist Selbstzahlerleistung.",
      beispiel: "Therapie auf Verordnung (für Kinder ohne Zuzahlung), Stimmtraining für Sprechberufe mit Preis.",
    },
    anlaesse: [
      {
        id: "sprache",
        label: "Sprach-, Sprech- oder Stimmtherapie",
        bereich: "Behandlung",
        options: [
          { id: "logo_rezept", name: "Logopädie auf Verordnung (10 Einheiten)", type: "kasse", price: 500, zuzahlung: true, benefits: ["Kassenleistung mit gesetzlicher Zuzahlung, für Kinder ohne Zuzahlung"] },
          { id: "stimmtraining", zusatz: true, name: "Stimmtraining für Sprechberufe (5 Einheiten)", type: "igel", price: 300, benefits: ["für Lehrkräfte, Vortragende, Callcenter"], nutzen: "Training ohne Krankheitswert, keine Kassenleistung." },
        ],
      },
    ],
  },
  {
    id: "podo",
    name: "Podologie",
    kurz: "Podologie-Praxis",
    beruf: "therapie",
    teaser: "Diabetischer Fuß auf Rezept, Fußpflege privat",
    arztDativ: "Ihrer Podologin oder Ihrem Podologen",
    marketing: {
      headline: "Diabetischer Fuß auf Rezept, Fußpflege privat: ohne Diskussion am Tresen",
      problem: "Ob podologische Behandlung Kassenleistung ist, hängt an der Diagnose. Das ist für Patienten schwer zu erkennen.",
      beispiel: "Podologische Therapie auf Verordnung mit Zuzahlung, medizinische Fußpflege ohne Verordnung mit Preis.",
    },
    anlaesse: [
      {
        id: "fuss",
        label: "Fußbehandlung",
        bereich: "Behandlung",
        options: [
          { id: "podo_rezept", name: "Podologische Therapie auf Verordnung (6 Behandlungen)", type: "kasse", price: 240, zuzahlung: true, benefits: ["Kassenleistung, z. B. bei diabetischem Fußsyndrom"] },
          { id: "fusspflege", name: "Medizinische Fußpflege ohne Verordnung (je Behandlung)", type: "igel", price: 35, benefits: ["Nägel, Hornhaut, Hühneraugen"], kasseWenn: "Bei diabetischem Fußsyndrom und einigen weiteren Diagnosen mit Verordnung Kassenleistung." },
        ],
      },
    ],
  },
  {
    id: "hebamme",
    name: "Hebammenhilfe",
    kurz: "Hebammenpraxis",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Kurse auf Kasse, Partnergebühr, Zusatzangebote",
    arztDativ: "Ihrer Hebamme",
    marketing: {
      headline: "Was die Kasse in Schwangerschaft und Wochenbett zahlt, und was nicht",
      problem: "Werdende Eltern fragen nach Kursen, Partnergebühr und Zusatzangeboten. Die Antworten wiederholen sich bei jeder Familie.",
      beispiel: "Geburtsvorbereitung und Wochenbett auf Kasse, Partnergebühr und Babymassage mit Hinweis auf Zuschüsse.",
    },
    anlaesse: [
      {
        id: "geburt",
        geschlecht: "W",
        label: "Geburtsvorbereitung und Wochenbett",
        bereich: "Begleitung",
        options: [
          { id: "gv_kurs", name: "Geburtsvorbereitungskurs und Wochenbettbetreuung", type: "kasse", price: 0, benefits: ["Kassenleistung für die Schwangere"] },
          { id: "partner", zusatz: true, name: "Partnergebühr für den Geburtsvorbereitungskurs", type: "igel", price: 90, benefits: ["Begleitperson nimmt teil"], kasseWenn: "Manche Krankenkassen erstatten die Partnergebühr; bitte nachfragen." },
          { id: "babymassage", zusatz: true, name: "Babymassage-Kurs", type: "igel", price: 90, benefits: ["in der Gruppe, mehrere Termine"], kasseWenn: "Einige Kassen bezuschussen Kurse rund um die Geburt." },
          { id: "akupunktur_geburt", zusatz: true, name: "Akupunktur zur Geburtsvorbereitung (je Sitzung)", type: "igel", price: 25, benefits: ["ab der 36. Woche"], nutzen: "Der IGeL-Monitor des Medizinischen Dienstes bewertet die IGeL „Akupunktur in der Schwangerschaft“ mit „unklar“.", nutzenQuelle: IGEL.akupunkturSchwangerschaft },
        ],
      },
    ],
  },
  {
    id: "pflege",
    name: "Ambulante Pflege",
    kurz: "Pflegedienst",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Pflegesachleistung, Entlastungsbetrag, Privatleistungen",
    arztDativ: "Ihrem Pflegedienst",
    marketing: {
      headline: "Was die Pflegekasse zahlt und was darüber hinaus kostet, für Angehörige verständlich",
      problem: "Angehörige verstehen Pflegegrade, Sachleistungsbeträge und Entlastungsbetrag kaum. Unklare Rechnungen kosten Vertrauen.",
      beispiel: "Pflegesachleistung nach Pflegegrad, Behandlungspflege auf Verordnung, zusätzliche Stunden mit Preis und Hinweis auf den Entlastungsbetrag.",
    },
    anlaesse: [
      {
        id: "pflegeplan",
        label: "Pflege und Betreuung zu Hause",
        bereich: "Pflege",
        options: [
          { id: "sachleistung", name: "Pflegesachleistungen nach Pflegegrad", type: "kasse", price: 0, benefits: ["Pflegekasse zahlt bis zum Höchstbetrag des Pflegegrads"] },
          { id: "behandlungspflege", name: "Behandlungspflege auf ärztliche Verordnung (z. B. Medikamente, Verbände)", type: "kasse", price: 0, benefits: ["Krankenkasse zahlt"] },
          { id: "betreuung_privat", zusatz: true, name: "Zusätzliche Betreuung über den Höchstbetrag hinaus (je Stunde)", type: "igel", price: 40, benefits: ["Begleitung, Gesellschaft, Entlastung der Angehörigen"], kasseWenn: "Der Entlastungsbetrag der Pflegekasse kann dafür eingesetzt werden." },
          { id: "hauswirtschaft", zusatz: true, name: "Hauswirtschaftliche Hilfe privat (je Stunde)", type: "igel", price: 35, benefits: ["Einkauf, Wäsche, Reinigung"], kasseWenn: "Der Entlastungsbetrag der Pflegekasse kann dafür eingesetzt werden." },
        ],
      },
    ],
  },
  {
    id: "apotheke",
    name: "Apotheke",
    kurz: "Apotheke",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Rezept mit Zuzahlung, Medikationsberatung, Selbstmedikation",
    arztDativ: "Ihrer Apotheke",
    marketing: {
      headline: "Zuzahlung, Medikationsberatung, Selbstmedikation: Kunden sehen, was sie zahlen",
      problem: "Kunden kennen ihren Anspruch auf pharmazeutische Dienstleistungen kaum und wundern sich über Zuzahlungen.",
      beispiel: "Arzneimittel auf Rezept mit gesetzlicher Zuzahlung, Medikationsberatung als Kassenleistung bei vielen Medikamenten, Messungen als Selbstzahler.",
    },
    anlaesse: [
      {
        id: "rezept",
        label: "Arzneimittel und Beratung",
        bereich: "Arzneimittel",
        options: [
          { id: "rx_kasse", name: "Arzneimittel auf Kassenrezept (je Packung)", type: "kasse", price: 40, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung mit gesetzlicher Zuzahlung"] },
          { id: "medikationsberatung", name: "Erweiterte Medikationsberatung bei Polymedikation", type: "kasse", price: 0, benefits: ["Kassenleistung bei dauerhaft mindestens fünf Wirkstoffen"] },
          { id: "otc", zusatz: true, name: "Rezeptfreies Präparat zur Selbstmedikation", type: "igel", price: 12, ohneErstattung: true, benefits: ["mit Beratung in der Apotheke"] },
          { id: "messung", zusatz: true, name: "Blutzucker- oder Cholesterinmessung", type: "igel", price: 8, ohneErstattung: true, benefits: ["Ergebnis in wenigen Minuten"], nutzen: "Ersetzt keine ärztliche Untersuchung." },
        ],
      },
    ],
  },
  {
    id: "hoerakustik",
    name: "Hörakustik",
    kurz: "Hörakustik",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Hörgerät ohne Aufzahlung oder mit Mehrkosten",
    arztDativ: "Ihrer Hörakustikerin oder Ihrem Hörakustiker",
    marketing: {
      headline: "Hörgerät ohne Aufzahlung oder höherwertig: die Differenz offen zeigen",
      problem: "Kunden fragen, wie viel die Kasse übernimmt und was ein höherwertiges Gerät wirklich zusätzlich kostet. Die Erklärung des Festbetrags braucht Zeit.",
      beispiel: "Aufzahlungsfreies Kassengerät immer zuerst, höherwertige Geräte mit Kassenanteil und Eigenanteil.",
    },
    anlaesse: [
      {
        id: "hoergeraet",
        label: "Hörgeräteversorgung",
        bereich: "Hörgeräte",
        options: [
          { id: "hg_kasse", name: "Hörgerät ohne Aufzahlung (je Ohr)", type: "kasse", price: 750, zuzahlung: "hilfsmittel", benefits: ["Kassenversorgung ohne Aufzahlung", "gesetzliche Zuzahlung 10 €"] },
          { id: "hg_plus", name: "Höherwertiges Hörgerät (je Ohr)", type: "igel", price: 1650, kasseAnteil: 750, zuzahlung: "hilfsmittel", benefits: ["z. B. Akku, Bluetooth, weitere Hörprogramme"] },
        ],
        notes: ["Ein aufzahlungsfreies Gerät muss immer angeboten werden; die Mehrkosten eines anderen Geräts tragen Sie nur, wenn Sie es ausdrücklich wählen."],
      },
    ],
  },
  {
    id: "optik",
    name: "Augenoptik",
    kurz: "Augenoptik",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Kassenzuschuss für Gläser, Gleitsicht, Zusatzoptionen",
    arztDativ: "Ihrer Augenoptikerin oder Ihrem Augenoptiker",
    marketing: {
      headline: "Wann die Kasse Brillengläser bezuschusst, und was Extras kosten",
      problem: "Kunden fragen, ob ihnen ein Kassenzuschuss zusteht, und wollen Zusatzoptionen einordnen können.",
      beispiel: "Hinweis auf den Kassenzuschuss für Kinder und bei starker Sehschwäche, Gleitsicht und Extras mit Preis.",
    },
    anlaesse: [
      {
        id: "brille",
        label: "Neue Brille",
        bereich: "Brille",
        options: [
          { id: "einstaerke", name: "Einstärkenbrille (Gläser und Fassung)", type: "igel", price: 180, benefits: ["für Ferne oder Nähe"], kasseWenn: "Für Kinder und Jugendliche sowie bei starker Sehschwäche zahlt die Kasse die Gläser bis zum Festbetrag; die Fassung zahlen alle selbst." },
          { id: "gleitsicht", name: "Gleitsichtbrille", type: "igel", price: 600, benefits: ["Ferne und Nähe in einem Glas"] },
          { id: "blaufilter", name: "Zusätzlicher Blaulichtfilter", type: "igel", price: 60, benefits: ["Beschichtung der Gläser"] },
        ],
      },
    ],
  },
  {
    id: "sanitaetshaus",
    name: "Sanitätshaus und Orthopädietechnik",
    kurz: "Sanitätshaus",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Einlagen, Kompression: Festbetrag plus Aufzahlung",
    arztDativ: "Ihrem Sanitätshaus",
    marketing: {
      headline: "Festbetrag, Zuzahlung, Aufzahlung: Hilfsmittel ohne Missverständnisse",
      problem: "Bei Einlagen und Kompressionsstrümpfen verwechseln Kunden gesetzliche Zuzahlung und freiwillige Aufzahlung. Das führt zu Diskussionen an der Kasse.",
      beispiel: "Versorgung auf Verordnung mit gesetzlicher Zuzahlung, Komfortvarianten mit Kassenanteil und klarer Aufzahlung.",
    },
    anlaesse: [
      {
        id: "einlagen",
        label: "Einlagen",
        bereich: "Hilfsmittel",
        options: [
          { id: "einlage_kasse", name: "Einlagen auf Verordnung", type: "kasse", price: 80, zuzahlung: "hilfsmittel", benefits: ["Kassenversorgung mit gesetzlicher Zuzahlung"] },
          { id: "einlage_komfort", name: "Einlagen mit Komfortausstattung", type: "igel", price: 140, kasseAnteil: 80, zuzahlung: "hilfsmittel", benefits: ["z. B. für Sportschuhe oder besonders dünn"] },
        ],
      },
      {
        id: "kompression",
        label: "Kompressionsstrümpfe",
        bereich: "Hilfsmittel",
        options: [
          { id: "kompr_kasse", name: "Kompressionsstrümpfe auf Verordnung", type: "kasse", price: 90, zuzahlung: "hilfsmittel", benefits: ["Kassenversorgung mit gesetzlicher Zuzahlung"] },
          { id: "kompr_mode", name: "Kompressionsstrümpfe in Modefarbe oder mit Muster", type: "igel", price: 120, kasseAnteil: 90, zuzahlung: "hilfsmittel", benefits: ["gleiche Kompressionsklasse, andere Farbe oder Muster"] },
        ],
      },
    ],
  },
  {
    id: "heilpraktiker",
    name: "Heilpraktik und Naturheilkunde",
    kurz: "Heilpraktiker-Praxis",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Privatleistungen, Erstattung durch Zusatzversicherung",
    arztDativ: "Ihrer Heilpraktikerin oder Ihrem Heilpraktiker",
    marketing: {
      headline: "Privat und transparent: Preise vorab, Erstattung klar benannt",
      problem: "Heilpraktiker-Leistungen zahlt die gesetzliche Krankenkasse nicht. Patienten wollen vorher wissen, was es kostet und was ihre Zusatzversicherung erstattet.",
      beispiel: "Jede Leistung mit Preis und Hinweis auf Erstattung durch Zusatzversicherungen.",
    },
    anlaesse: [
      {
        id: "naturheil",
        label: "Naturheilkundliche Behandlung",
        bereich: "Behandlung",
        options: [
          { id: "hp_anamnese", name: "Ausführliche Erstanamnese", type: "igel", price: 80, benefits: ["etwa 60 Minuten"], kasseWenn: "Gesetzliche Kassen zahlen nicht. Manche privaten Zusatzversicherungen für Heilpraktiker erstatten einen Teil. Bitte vorher dort fragen." },
          { id: "hp_akupunktur", name: "Akupunktur (je Sitzung)", type: "igel", price: 50, benefits: ["etwa 30 Minuten"], kasseWenn: "Manche privaten Zusatzversicherungen erstatten einen Teil. Bitte vorher dort fragen." },
          { id: "hp_verfahren", name: "Weitere naturheilkundliche Verfahren (je Sitzung)", type: "igel", price: 60, benefits: ["nach Absprache"], nutzen: NUTZEN_FRAGEN },
        ],
      },
    ],
  },
  {
    id: "klinik",
    name: "Klinik und Krankenhaus (Wahlleistungen)",
    kurz: "Klinik",
    beruf: "therapie",
    gruppe: "versorgung",
    teaser: "Ein- oder Zweibettzimmer, Wahlarzt, Zuzahlung",
    arztDativ: "Ihrer Klinik",
    marketing: {
      headline: "Wahlleistungen vor der Aufnahme klären, nicht am Krankenbett",
      problem: "Patienten entscheiden über Einbettzimmer und Wahlarzt oft unter Zeitdruck bei der Aufnahme und erleben danach Überraschungen auf der Rechnung.",
      beispiel: "Allgemeine Krankenhausleistung mit gesetzlicher Zuzahlung, Wahlleistungen mit Preis je Tag und Hinweis auf Zusatzversicherungen, vorab per Link.",
    },
    anlaesse: [
      {
        id: "aufenthalt",
        label: "Stationärer Aufenthalt",
        bereich: "Aufnahme",
        options: [
          { id: "allgemein", name: "Allgemeine Krankenhausleistung", type: "kasse", price: 0, benefits: ["Kassenleistung: allgemeine Krankenhausleistungen nach § 2 Abs. 2 KHEntgG", "gesetzliche Zuzahlung 10 € pro Tag, höchstens 28 Tage im Jahr"] },
          { id: "zweibett", zusatz: true, name: "Zweibettzimmer (je Tag)", type: "igel", price: 60, benefits: ["Zimmer mit zwei Betten"], kasseWenn: "Manche privaten Zusatzversicherungen übernehmen das. Bitte vorher dort fragen." },
          { id: "einbett", zusatz: true, name: "Einbettzimmer (je Tag)", type: "igel", price: 110, benefits: ["eigenes Zimmer"], kasseWenn: "Manche privaten Zusatzversicherungen übernehmen das. Bitte vorher dort fragen." },
          { id: "wahlarzt", zusatz: true, name: "Wahlärztliche Behandlung (geschätzt für den Aufenthalt)", type: "igel", price: 800, benefits: ["Behandlung durch die leitenden Ärztinnen und Ärzte"], kasseWenn: "Manche privaten Zusatzversicherungen übernehmen das. Bitte vorher dort fragen.", nutzen: "§ 2 Abs. 2 Satz 1 KHEntgG: „Allgemeine Krankenhausleistungen sind die Krankenhausleistungen, die unter Berücksichtigung der Leistungsfähigkeit des Krankenhauses im Einzelfall nach Art und Schwere der Krankheit für die medizinisch zweckmäßige und ausreichende Versorgung des Patienten notwendig sind.“ § 17 Abs. 1 Satz 1 KHEntgG: „Neben den Entgelten für die voll- und teilstationäre Behandlung dürfen andere als die allgemeinen Krankenhausleistungen als Wahlleistungen gesondert berechnet werden, wenn die allgemeinen Krankenhausleistungen durch die Wahlleistungen nicht beeinträchtigt werden und die gesonderte Berechnung mit dem Krankenhaus vereinbart ist.“", nutzenQuelle: [{ name: "§ 2 Abs. 2 Satz 1 KHEntgG", url: "https://www.gesetze-im-internet.de/khentgg/__2.html", stand: NUTZEN_STAND }, { name: "§ 17 Abs. 1 Satz 1 KHEntgG", url: "https://www.gesetze-im-internet.de/khentgg/__17.html", stand: NUTZEN_STAND }] },
        ],
        notes: ["Wahlleistungen werden vor der Erbringung schriftlich vereinbart."],
      },
    ],
  },
];

/** Vorerst ausgeblendet (Entscheidung 11.11.2026): die Versorgung, also Hebammen, Pflege, Apotheke,
 *  Hörakustik, Augenoptik, Sanitätshaus, Heilpraktiker und Kliniken. Die Daten bleiben vollständig
 *  erhalten; zum Wieder-Einblenden die Gruppe hier aus der Liste nehmen. */
export const AUSGEBLENDETE_GRUPPEN: string[] = ["versorgung"];
export const istSichtbar = (s: Specialty) => !s.gruppe || !AUSGEBLENDETE_GRUPPEN.includes(s.gruppe);
/** Die Fachrichtungen, die die Website und die Auswahl anbieten. */
export const SPECIALTIES: Specialty[] = ALLE_SPECIALTIES.filter(istSichtbar);

// Kacheltexte für die bestehenden Fächer.
const TEASER: Record<string, string> = {
  hausarzt: "Check-up, Reisemedizin, Sportuntersuchung",
  augen: "Glaukom-Vorsorge, OCT, Führerschein-Sehtest",
  haut: "Hautkrebs-Screening, Auflicht, Ästhetik auf Wunsch",
  gyn: "Krebsfrüherkennung, Ultraschall, Schwangerschaft",
  uro: "Prostata-Früherkennung, PSA-Test",
  ortho: "Stoßwelle, Hyaluron, Akupunktur, Knochendichte",
  hno: "Hörtest, Schnarchen und Schlafapnoe",
  kinder: "U10, U11, J2, Sport und Reise",
  kardio: "Herz-Check, Belastungs-EKG, Carotis",
};
for (const s of ALLE_SPECIALTIES) s.teaser ??= TEASER[s.id];

// Ergänzende Anlässe je Fach (lib/fachangebote.ts) anhängen; IDs bleiben eindeutig.
for (const s of ALLE_SPECIALTIES) {
  const extra = ZUSATZ_ANLAESSE[s.id] ?? [];
  for (const a of extra) if (!s.anlaesse.some((x) => x.id === a.id)) s.anlaesse.push(a);
}

export const isTherapie = (s: Specialty | null | undefined) => s?.beruf === "therapie";

export const SPECIALTY_IDS = [DENTAL_ID, ...ALLE_SPECIALTIES.map((s) => s.id), "andere"] as const;
/** Fächer, mit denen eine neue Praxis oder ein Gastzugang entstehen darf: nur sichtbare (ohne ausgeblendete Gruppen). */
export const NEU_WAEHLBARE_IDS = [DENTAL_ID, ...SPECIALTIES.map((s) => s.id), "andere"] as const;

export function specialty(id: string | null | undefined): Specialty | null {
  return ALLE_SPECIALTIES.find((s) => s.id === id) ?? null;
}

export const SPECIALTY_LABELS: Record<string, string> = {
  [DENTAL_ID]: "Zahnmedizin",
  ...Object.fromEntries(ALLE_SPECIALTIES.map((s) => [s.id, s.name])),
  andere: "Andere Fachrichtung (nur eigene Leistungen)",
};

/**
 * Fächer in Gruppen für jede Auswahl (Demo, Registrierung, Website): ärztliche Praxen, Zahnmedizin,
 * Therapie. Sorrida ist für alle Fächer da, deshalb steht keins als Voreinstellung vorn.
 */
export const FACH_GRUPPEN: { titel: string; faecher: { id: string; name: string; kurz: string }[] }[] = [
  { titel: "Ärztliche Praxen", faecher: SPECIALTIES.filter((s) => s.beruf !== "therapie").map((s) => ({ id: s.id, name: s.name, kurz: s.kurz })) },
  { titel: "Zahnärztliche Praxen", faecher: [{ id: DENTAL_ID, name: "Zahnmedizin", kurz: "Zahnmedizin" }] },
  { titel: "Therapie und Gesundheitsberufe", faecher: SPECIALTIES.filter((s) => s.beruf === "therapie").map((s) => ({ id: s.id, name: s.name, kurz: s.kurz })) },
].filter((g) => g.faecher.length > 0);

/** Auswahl bei der Anmeldung: nur sichtbare Fächer (ausgeblendete Gruppen fehlen). */
export const SPECIALTY_AUSWAHL: Record<string, string> = {
  ...Object.fromEntries(FACH_GRUPPEN.flatMap((g) => g.faecher.map((f) => [f.id, f.name]))),
  andere: "Andere Fachrichtung (nur eigene Leistungen)",
};

/** Zahnmedizin nur bei ausdrücklichem Fach "zahn". Fehlt das Fach, ist nichts zahnärztlich, sondern neutral. */
export function isDental(fach: string | null | undefined): boolean {
  return fach === DENTAL_ID;
}

/**
 * Nur für gespeicherte Vorschläge (input.fach): Zahnvorschläge tragen seit jeher kein fach, alle anderen Fächer
 * speichern ihr Fach mit (app/api/proposals setzt es aus der Praxis). Ohne fach ist ein Vorschlag also ein
 * Zahnvorschlag. Für das Fach einer Praxis gilt isDental.
 */
export function istZahnVorschlag(fach: string | null | undefined): boolean {
  return !fach || fach === DENTAL_ID;
}
