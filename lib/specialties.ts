import { ZUSATZ_ANLAESSE } from "@/lib/fachangebote";
// Fachgebiete für Arztpraxen. Sorrida begann als Zahnarzt-Werkzeug; in
// anderen Fächern heißt das Gegenstück zur Mehrkostenvereinbarung
// "Individuelle Gesundheitsleistung" (IGeL): vom Patienten selbst bezahlt,
// nach GOÄ berechnet, nur mit schriftlicher Vereinbarung vor der Leistung
// (§ 18 Abs. 8 BMV-Ä).
//
// Grundsätze wie beim Zahnarzt, hier noch strenger:
// - Die Kassenleistung steht immer zuerst, mit dem Hinweis, wann die Kasse zahlt.
// - Bei jeder Selbstzahlerleistung steht ehrlich, was über ihren Nutzen bekannt ist.
// - Sorrida empfiehlt keine IGeL von sich aus. Eine Empfehlung setzt nur die Ärztin
//   oder der Arzt, indem die besprochene Option gewählt wird.
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
  /** Ehrlicher Hinweis zum belegten Nutzen. */
  nutzen?: string;
  /**
   * Gesetzliche Zuzahlung für Erwachsene: true/"heilmittel" = 10 % der Kosten + 10 € (ab 2027: 15 €) je Verordnung;
   * "hilfsmittel" = 10 %, mindestens 5 €, höchstens 10 € (auch Arzneimittel je Packung).
   */
  zuzahlung?: boolean | "heilmittel" | "hilfsmittel";
  /** Kassenanteil (Festbetrag), wenn der Patient ein höherwertiges Produkt wählt und nur die Differenz zahlt. */
  kasseAnteil?: number;
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
          { id: "labor_plus", name: "Erweitertes Labor ohne Beschwerden (z. B. Vitamin D, Schilddrüse)", type: "igel", price: 45, benefits: ["auf Wunsch, ohne Anlass"], kasseWenn: "Bei Beschwerden oder begründetem Verdacht Kassenleistung.", nutzen: "Ohne Beschwerden ist ein Nutzen für die meisten Werte nicht belegt." },
          { id: "us_abdomen", name: "Ultraschall der Bauchorgane ohne Beschwerden", type: "igel", price: 50, benefits: ["schmerzfrei, ohne Strahlung"], kasseWenn: "Bei Beschwerden Kassenleistung.", nutzen: "Als Vorsorge ohne Beschwerden ist kein Nutzen belegt; Zufallsbefunde können verunsichern." },
        ],
      },
      {
        id: "reise",
        label: "Reise mit Impfempfehlung",
        bereich: "Reisemedizin",
        options: [
          { id: "reiseberatung", name: "Reisemedizinische Beratung", type: "igel", price: 30, benefits: ["Impfplan und Malariaschutz für Ihr Reiseziel"], kasseWenn: "Viele Krankenkassen erstatten Reiseimpfungen als Satzungsleistung. Rechnung bei der Kasse einreichen." },
          { id: "reiseimpfung", name: "Reiseimpfungen nach Plan (je Impfung, zzgl. Impfstoff)", type: "igel", price: 15, benefits: ["Schutz nach aktueller Empfehlung für das Reiseland"], kasseWenn: "Viele Krankenkassen erstatten Reiseimpfungen als Satzungsleistung." },
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
      headline: "Glaukom-Vorsorge und OCT ehrlich erklärt statt am Tresen verkauft",
      problem: "Die Glaukom-Früherkennung ist die bekannteste IGeL und die meistkritisierte. Patienten fühlen sich schnell überrumpelt.",
      beispiel: "Untersuchung bei Verdacht als Kassenleistung, Vorsorge ohne Verdacht mit offenem Hinweis zum Nutzen.",
    },
    anlaesse: [
      {
        id: "glaukom",
        label: "Glaukom (Grüner Star): Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "glaukom_kasse", name: "Augendruck und Sehnerv bei Verdacht oder Risiko", type: "kasse", price: 40, benefits: ["Kassenleistung bei Verdacht, Risikofaktoren oder Beschwerden"] },
          { id: "glaukom_igel", name: "Glaukom-Vorsorge ohne Verdacht (Augendruck und Sehnerv)", type: "igel", price: 40, benefits: ["Messung des Augendrucks", "Beurteilung des Sehnervs"], nutzen: "Ob die Früherkennung ohne Beschwerden mehr nützt als schadet, ist wissenschaftlich nicht geklärt." },
          { id: "glaukom_oct", name: "Zusätzlich OCT des Sehnervs", type: "igel", price: 60, benefits: ["genaue Schichtaufnahme, gut für Verlaufskontrollen"], nutzen: "Ohne Verdacht ist ein Zusatznutzen nicht belegt." },
        ],
      },
      {
        id: "netzhaut",
        label: "Netzhaut und Makula",
        bereich: "Netzhaut",
        options: [
          { id: "oct_kasse", name: "OCT zur Behandlung bei feuchter AMD oder diabetischem Makulaödem", type: "kasse", price: 80, benefits: ["Kassenleistung zur Steuerung der Behandlung"] },
          { id: "oct_igel", name: "OCT der Netzhaut zur Vorsorge", type: "igel", price: 80, benefits: ["schmerzfreie Schichtaufnahme der Netzhaut"], nutzen: "Als Vorsorge ohne Beschwerden ist ein Nutzen nicht belegt." },
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
          { id: "auflicht", name: "Auflichtmikroskopie auffälliger Muttermale", type: "igel", price: 35, benefits: ["vergrößerte Ansicht der Pigmentmale"], kasseWenn: "Bei verdächtigen Malen Kassenleistung." },
          { id: "video", name: "Digitale Videodermatoskopie mit Verlaufskontrolle", type: "igel", price: 90, benefits: ["Bilder werden gespeichert und beim nächsten Termin verglichen"], kasseWenn: "Bei vielen auffälligen Malen fragen manche Kassen nach Einzelfallprüfung." },
        ],
        notes: ["Verdächtige Hautstellen werden immer zulasten der Kasse abgeklärt."],
      },
      {
        id: "aesthetik",
        label: "Patient wünscht ästhetische Behandlung",
        bereich: "Ästhetik",
        nurAufWunsch: true,
        options: [
          { id: "peeling", name: "Chemisches Peeling", type: "igel", price: 120, benefits: ["glattere, gleichmäßigere Haut"] },
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
      headline: "Vorsorge, Ultraschall, Schwangerschaft: ohne Druck und mit ehrlichem Nutzenhinweis",
      problem: "Der vaginale Ultraschall zur Krebsfrüherkennung ist die umsatzstärkste und umstrittenste IGeL. Wer ihn anbietet, braucht eine saubere Aufklärung.",
      beispiel: "Krebsfrüherkennung auf Kasse, Ultraschall ohne Beschwerden mit dem Hinweis, dass kein Nutzen belegt ist.",
    },
    anlaesse: [
      {
        id: "krebsvorsorge",
        geschlecht: "W",
        label: "Krebsfrüherkennung Gebärmutter und Eierstöcke",
        bereich: "Vorsorge",
        options: [
          { id: "kfu_gyn", name: "Krebsfrüherkennung mit Abstrich", type: "kasse", price: 40, benefits: ["Kassenleistung ab 20; ab 35 alle drei Jahre mit HPV-Test"] },
          { id: "us_vaginal", name: "Ultraschall von Gebärmutter und Eierstöcken ohne Beschwerden", type: "igel", price: 50, benefits: ["schmerzfrei, ohne Strahlung"], kasseWenn: "Bei Beschwerden oder auffälligem Befund Kassenleistung.", nutzen: "Zur Früherkennung bei beschwerdefreien Frauen ist kein Nutzen belegt; Fehlalarme können zu unnötigen Eingriffen führen." },
          { id: "hpv_u35", name: "HPV-Test vor dem 35. Lebensjahr", type: "igel", price: 45, benefits: ["Nachweis krebsauslösender Viren"], kasseWenn: "Ab 35 Teil der Kassenleistung, bei auffälligem Abstrich auch vorher.", nutzen: "Unter 35 sind HPV-Infektionen häufig und heilen meist von selbst aus." },
        ],
      },
      {
        id: "brust",
        geschlecht: "W",
        label: "Brust-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "brust_tast", name: "Tastuntersuchung der Brust", type: "kasse", price: 20, kasseAbAlter: 30, benefits: ["Kassenleistung ab 30 jährlich"] },
          { id: "brust_us", name: "Ultraschall der Brust ohne Befund", type: "igel", price: 50, benefits: ["ergänzende Bildgebung, z. B. bei dichtem Brustgewebe"], kasseWenn: "Bei Tastbefund oder Verdacht Kassenleistung.", nutzen: "Als alleinige Vorsorge ist ein Nutzen nicht belegt; bei dichtem Gewebe gemeinsam abwägen." },
        ],
      },
      {
        id: "schwangerschaft",
        geschlecht: "W", abAlter: 14, bisAlter: 50,
        label: "Schwangerschaft: Zusatzuntersuchungen",
        bereich: "Schwangerschaft",
        options: [
          { id: "mutterschaft", name: "Vorsorge nach Mutterschafts-Richtlinien", type: "kasse", price: 0, benefits: ["Kassenleistung, inklusive drei Ultraschall-Untersuchungen"] },
          { id: "toxo", name: "Toxoplasmose-Test", type: "igel", price: 25, benefits: ["zeigt, ob Sie schon geschützt sind"], kasseWenn: "Bei Verdacht auf eine Infektion Kassenleistung." },
          { id: "us_extra", name: "Zusätzlicher Ultraschall (auch 3D) auf Wunsch", type: "igel", price: 80, benefits: ["zusätzliche Bilder Ihres Kindes"], nutzen: "Medizinisch nicht notwendig, eine Wunschleistung." },
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
      headline: "PSA-Test mit ehrlicher Abwägung statt Häkchen auf dem Formular",
      problem: "Beim PSA-Test wollen Patienten wissen, ob er sinnvoll ist. Die Antwort braucht Zeit, die im Termin fehlt.",
      beispiel: "Tastuntersuchung ab 45 auf Kasse, PSA-Test mit Abwägung von Nutzen und Überdiagnosen.",
    },
    anlaesse: [
      {
        id: "prostata",
        geschlecht: "M",
        label: "Prostatakrebs-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "prostata_tast", name: "Tastuntersuchung der Prostata", type: "kasse", price: 20, kasseAbAlter: 45, benefits: ["Kassenleistung ab 45 jährlich"] },
          { id: "psa", name: "PSA-Test zur Früherkennung", type: "igel", price: 30, benefits: ["Bluttest, kann Krebs früher anzeigen"], kasseWenn: "Bei Beschwerden, Verdacht oder zur Verlaufskontrolle Kassenleistung.", nutzen: "Kann Todesfälle verhindern, führt aber auch zu Überdiagnosen und unnötigen Behandlungen. Bitte gemeinsam abwägen." },
          { id: "us_uro", name: "Ultraschall von Nieren und Blase ohne Beschwerden", type: "igel", price: 45, benefits: ["schmerzfrei, ohne Strahlung"], kasseWenn: "Bei Beschwerden Kassenleistung.", nutzen: "Ohne Beschwerden ist kein Nutzen belegt." },
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
      problem: "Viele Leistungen sind mal Kasse, mal Selbstzahler, je nach Diagnose. Patienten fühlen sich falsch beraten, wenn sie es später erfahren.",
      beispiel: "Stoßwelle bei Fersensporn als Kassenleistung kenntlich, Hyaluron mit offenem Nutzenhinweis.",
    },
    anlaesse: [
      {
        id: "gelenkschmerz",
        label: "Chronische Gelenk- oder Sehnenschmerzen",
        bereich: "Schmerztherapie",
        options: [
          { id: "ortho_kasse", name: "Behandlung nach Leitlinie (z. B. Physiotherapie, Medikamente)", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "eswt", name: "Stoßwellentherapie (je Sitzung)", type: "igel", price: 80, benefits: ["ohne Operation, meist 3–5 Sitzungen"], kasseWenn: "Bei Fersenschmerz (Plantarfasziitis) nach erfolgloser Vorbehandlung Kassenleistung." },
          { id: "hyaluron", name: "Hyaluronsäure-Injektion ins Knie (je Spritze)", type: "igel", price: 90, benefits: ["kann Beschwerden bei Arthrose lindern"], nutzen: "Der Nutzen bei Kniearthrose ist gering und umstritten." },
          { id: "akupunktur", name: "Akupunktur", type: "igel", price: 40, benefits: ["Ergänzung zur Schmerztherapie"], kasseWenn: "Bei chronischen Rücken- oder Knieschmerzen Kassenleistung." },
        ],
      },
      {
        id: "osteoporose",
        label: "Osteoporose-Abklärung",
        bereich: "Knochen",
        options: [
          { id: "dxa_kasse", name: "Knochendichtemessung (DXA) bei Verdacht", type: "kasse", price: 50, benefits: ["Kassenleistung nach Knochenbruch ohne Unfall oder bei begründetem Verdacht"] },
          { id: "dxa_igel", name: "Knochendichtemessung (DXA) zur Vorsorge", type: "igel", price: 50, benefits: ["geringe Strahlung, wenige Minuten"], nutzen: "Ohne Risikofaktoren ist ein Nutzen nicht belegt." },
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
          { id: "u_kasse", name: "U1 bis U9 und J1", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "u_extra", name: "U10, U11 oder J2", type: "igel", price: 50, benefits: ["Entwicklung, Schule, Pubertät"], kasseWenn: "Viele Krankenkassen zahlen sie über Verträge mit den Kinderärzten. Bitte bei der Kasse nachfragen." },
        ],
      },
      {
        id: "sport_kind",
        label: "Sport oder Reise",
        bereich: "Bescheinigung",
        options: [
          { id: "sporttaugl", name: "Sporttauglichkeits-Bescheinigung", type: "igel", price: 30, benefits: ["für Verein oder Wettkampf"] },
          { id: "reiseimpf_kind", name: "Reiseimpfungen (je Impfung, zzgl. Impfstoff)", type: "igel", price: 15, benefits: ["Schutz für das Reiseland"], kasseWenn: "Viele Krankenkassen erstatten Reiseimpfungen als Satzungsleistung." },
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
      headline: "Vorsorge ohne Beschwerden? Erst den Nutzen, dann den Preis",
      problem: "Gesunde fragen nach Herz-Checks. Viele Untersuchungen sind ohne Beschwerden nicht sinnvoll. Das will offen gesagt werden.",
      beispiel: "Abklärung bei Beschwerden auf Kasse, Belastungs-EKG ohne Beschwerden mit ehrlichem Hinweis.",
    },
    anlaesse: [
      {
        id: "herzcheck",
        label: "Herz-Check ohne Beschwerden",
        bereich: "Vorsorge",
        options: [
          { id: "kardio_kasse", name: "Abklärung bei Beschwerden oder Risikofaktoren", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "ergometrie", name: "Belastungs-EKG ohne Beschwerden", type: "igel", price: 70, benefits: ["zeigt die Belastbarkeit des Herzens"], nutzen: "Ohne Beschwerden ist ein Nutzen für die Vorsorge nicht belegt." },
          { id: "carotis", name: "Ultraschall der Halsschlagadern ohne Beschwerden", type: "igel", price: 60, benefits: ["sucht nach Ablagerungen"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt; Fachgesellschaften raten davon ab." },
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
      headline: "MRT auf Wunsch? Erst sagen, was die Kasse zahlt und was ein Befund ohne Beschwerden bringt",
      problem: "Selbstzahler-MRTs und Vorsorgeuntersuchungen werden am Telefon angefragt. Die ehrliche Antwort zu Nutzen und Zufallsbefunden kostet Zeit am Empfang.",
      beispiel: "Untersuchung mit Überweisung auf Kasse, Wunsch-MRT mit Preis und offenem Hinweis zu Zufallsbefunden.",
    },
    anlaesse: [
      {
        id: "mrt_wunsch",
        label: "MRT oder CT auf eigenen Wunsch",
        bereich: "Schnittbild",
        options: [
          { id: "mrt_kasse", name: "MRT mit Überweisung bei medizinischer Indikation", type: "kasse", price: 450, benefits: ["Kassenleistung mit Überweisung"] },
          { id: "mrt_igel", name: "MRT ohne Indikation (je Körperregion)", type: "igel", price: 450, benefits: ["schneller Termin, ohne Strahlung"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt; Zufallsbefunde können zu weiteren Untersuchungen führen." },
          { id: "ganzkoerper_mrt", name: "Ganzkörper-MRT zur Vorsorge", type: "igel", price: 950, benefits: ["Übersicht über viele Organe"], nutzen: "Ein Nutzen für Gesunde ist nicht belegt; häufige Zufallsbefunde verunsichern und ziehen Folgeuntersuchungen nach sich." },
        ],
      },
      {
        id: "mamma",
        geschlecht: "W",
        label: "Brustkrebs-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "mammo_screening", name: "Mammographie-Screening", type: "kasse", price: 90, kasseAbAlter: 50, benefits: ["Kassenleistung ab 50 alle zwei Jahre, mit Einladung"] },
          { id: "mamma_us", name: "Ultraschall der Brust ergänzend", type: "igel", price: 60, benefits: ["ohne Strahlung"], kasseWenn: "Bei Tastbefund oder Verdacht Kassenleistung.", nutzen: "Als alleinige Vorsorge ist ein Nutzen nicht belegt; bei dichtem Gewebe gemeinsam abwägen." },
        ],
      },
      {
        id: "knochen",
        label: "Knochendichte",
        bereich: "Knochen",
        options: [
          { id: "dxa_rad_kasse", name: "Knochendichtemessung (DXA) bei Verdacht", type: "kasse", price: 50, benefits: ["Kassenleistung nach Bruch ohne Unfall oder bei begründetem Verdacht"] },
          { id: "dxa_rad_igel", name: "Knochendichtemessung (DXA) zur Vorsorge", type: "igel", price: 50, benefits: ["geringe Strahlung, wenige Minuten"], nutzen: "Ohne Risikofaktoren ist ein Nutzen nicht belegt." },
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
      problem: "Besorgte Angehörige fragen nach Demenz-Tests, Gesunde nach Gefäß-Checks. Beides braucht eine ruhige, ehrliche Einordnung.",
      beispiel: "Abklärung bei Beschwerden auf Kasse, Check ohne Beschwerden mit klarem Hinweis zum Nutzen.",
    },
    anlaesse: [
      {
        id: "gedaechtnis",
        label: "Gedächtnis und Konzentration",
        bereich: "Diagnostik",
        options: [
          { id: "demenz_kasse", name: "Abklärung bei Beschwerden oder Verdacht", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "demenz_check", name: "Gedächtnis-Check ohne Beschwerden", type: "igel", price: 80, benefits: ["Tests zu Gedächtnis und Aufmerksamkeit"], nutzen: "Als Vorsorge ohne Beschwerden ist ein Nutzen nicht belegt." },
        ],
      },
      {
        id: "gefaesse",
        label: "Gefäß-Ultraschall ohne Beschwerden",
        bereich: "Vorsorge",
        options: [
          { id: "neuro_kasse", name: "Ultraschall bei Beschwerden oder Risikofaktoren", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "neuro_carotis", name: "Ultraschall der Halsschlagadern ohne Beschwerden", type: "igel", price: 60, benefits: ["sucht nach Ablagerungen"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt; Fachgesellschaften raten davon ab." },
        ],
      },
      {
        id: "kopfschmerz",
        label: "Chronischer Kopfschmerz",
        bereich: "Schmerz",
        options: [
          { id: "kopf_kasse", name: "Diagnostik und Behandlung nach Leitlinie", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "kopf_akupunktur", name: "Akupunktur bei Kopfschmerz", type: "igel", price: 40, benefits: ["Ergänzung zur Behandlung"], kasseWenn: "Akupunktur ist nur bei chronischen Rücken- oder Knieschmerzen Kassenleistung." },
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
          { id: "selbstzahler_sitzung", name: "Selbstzahler-Sitzung (je 50 Minuten)", type: "igel", price: 110, benefits: ["ohne Wartezeit auf einen Kassenplatz"], kasseWenn: "Bei langer Wartezeit kann die Kasse die Kosten einer Privatpraxis erstatten (Kostenerstattung nach § 13 Abs. 3 SGB V). Vorher bei der Kasse beantragen." },
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
      headline: "Darmkrebs-Vorsorge: ab 50 auf Kasse, davor ehrlich mit Preis",
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
          { id: "ifobt", name: "Stuhltest auf verstecktes Blut", type: "igel", price: 30, benefits: ["einfacher Test zu Hause"], kasseWenn: "Ab 50 im Rahmen der Vorsorge Kassenleistung.", nutzen: "Ersetzt die Darmspiegelung nicht." },
        ],
        notes: ["Bei Beschwerden oder familiärer Belastung ist die Darmspiegelung auch vor 50 Kassenleistung."],
      },
      {
        id: "unvertraeglich",
        label: "Nahrungsmittel-Unverträglichkeit",
        bereich: "Diagnostik",
        options: [
          { id: "atemtest_kasse", name: "Atemtest bei Beschwerden", type: "kasse", price: 45, benefits: ["Kassenleistung"] },
          { id: "atemtest_igel", name: "Atemtest ohne Beschwerden", type: "igel", price: 45, benefits: ["Laktose oder Fruktose"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt." },
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
          { id: "lufu_igel", name: "Lungenfunktion ohne Beschwerden (z. B. Raucher-Check)", type: "igel", price: 40, benefits: ["Ausgangswert für spätere Vergleiche"], nutzen: "Ohne Beschwerden ist der Nutzen begrenzt; am meisten bringt der Rauchstopp." },
        ],
      },
      {
        id: "rauchstopp",
        label: "Rauchstopp",
        bereich: "Prävention",
        options: [{ id: "rauchstopp_kurs", name: "Rauchentwöhnungskurs", type: "igel", price: 150, benefits: ["Gruppenkurs über mehrere Wochen"], kasseWenn: "Zertifizierte Präventionskurse bezuschussen viele Krankenkassen (§ 20 SGB V)." }],
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
          { id: "cgm_igel", name: "Glukosesensor ohne Insulintherapie (je Monat)", type: "igel", price: 60, benefits: ["Verlauf des Zuckers im Alltag sehen"], nutzen: "Ohne Insulintherapie ist ein Nutzen für die Behandlung nicht belegt." },
        ],
      },
      {
        id: "schilddruese",
        label: "Schilddrüse",
        bereich: "Diagnostik",
        options: [
          { id: "sd_kasse", name: "Ultraschall und Blutwerte bei Beschwerden oder Befund", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "sd_igel", name: "Schilddrüsen-Check ohne Beschwerden", type: "igel", price: 50, benefits: ["Ultraschall und Blutwerte"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt; harmlose Knoten werden häufig gefunden." },
        ],
      },
      {
        id: "ernaehrung",
        label: "Ernährungsberatung",
        bereich: "Prävention",
        options: [{ id: "ernaehrung_beratung", name: "Ernährungsberatung (je Termin)", type: "igel", price: 60, benefits: ["persönlicher Plan"], kasseWenn: "Viele Kassen bezuschussen Ernährungsberatung mit ärztlicher Bescheinigung." }],
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
      problem: "Ob eine Krampfader oder ein Muttermal auf Kasse behandelt wird, hängt am Befund. Patienten erfahren es oft zu spät.",
      beispiel: "Behandlung bei Beschwerden auf Kasse, kosmetische Eingriffe mit Preis und ohne Druck.",
    },
    anlaesse: [
      {
        id: "venen",
        label: "Krampfadern und Besenreiser",
        bereich: "Venen",
        options: [
          { id: "venen_kasse", name: "Behandlung von Krampfadern bei Beschwerden", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
          { id: "besenreiser", name: "Verödung von Besenreisern (je Sitzung)", type: "igel", price: 120, benefits: ["optische Verbesserung"], nutzen: "Kosmetische Behandlung, kein medizinischer Nutzen." },
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
          { id: "botulinum", name: "Faltenbehandlung mit Botulinum (Stirn)", type: "igel", price: 300, benefits: ["Wirkung für einige Monate"] },
          { id: "filler", name: "Hyaluron-Unterspritzung (je Spritze)", type: "igel", price: 350, benefits: ["Volumenaufbau"] },
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
      headline: "Rezept zu Ende, Beschwerden nicht: Anschlussbehandlung offen anbieten",
      problem: "Nach der Verordnung brechen viele Patienten ab, obwohl sie weitermachen würden. Sie wissen nicht, was Selbstzahler-Einheiten kosten und was die Kasse erstattet.",
      beispiel: "Krankengymnastik auf Verordnung mit gesetzlicher Zuzahlung, Folgeeinheiten als Selbstzahler, Osteopathie mit Hinweis auf Kassenzuschüsse.",
    },
    anlaesse: [
      {
        id: "ruecken",
        label: "Rücken- oder Gelenkbeschwerden",
        bereich: "Behandlung",
        options: [
          { id: "kg_rezept", name: "Krankengymnastik auf Verordnung (6 Einheiten)", type: "kasse", price: 180, zuzahlung: true, benefits: ["Kassenleistung mit gesetzlicher Zuzahlung"] },
          { id: "kg_selbst", name: "Weitere Krankengymnastik als Selbstzahler (6 Einheiten)", type: "igel", price: 270, benefits: ["ohne Unterbrechung weiterbehandeln"], kasseWenn: "Mit neuer Verordnung wieder Kassenleistung." },
          { id: "osteopathie", name: "Osteopathie (je Sitzung)", type: "igel", price: 90, benefits: ["ganzheitliche manuelle Behandlung"], kasseWenn: "Viele Krankenkassen erstatten Osteopathie anteilig als Zusatzleistung, oft mit ärztlicher Empfehlung." },
        ],
      },
      {
        id: "praevention",
        label: "Training und Prävention",
        bereich: "Prävention",
        options: [
          { id: "kgg_karte", name: "Gerätetraining unter Anleitung (10 Termine)", type: "igel", price: 150, benefits: ["Kraft und Stabilität"], kasseWenn: "Gerätegestützte Krankengymnastik ist mit Verordnung Kassenleistung." },
          { id: "rueckenkurs", name: "Rückenkurs (8 Termine)", type: "igel", price: 120, benefits: ["in der Gruppe"], kasseWenn: "Zertifizierte Präventionskurse bezuschussen viele Krankenkassen (§ 20 SGB V)." },
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
          { id: "ergo_selbst", name: "Weitere Einheiten als Selbstzahler (je Einheit)", type: "igel", price: 55, benefits: ["ohne Unterbrechung weiterbehandeln"], kasseWenn: "Mit neuer Verordnung wieder Kassenleistung." },
          { id: "hirnleistung", name: "Hirnleistungstraining (10 Einheiten)", type: "igel", price: 450, benefits: ["Gedächtnis und Konzentration üben"] },
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
          { id: "stimmtraining", name: "Stimmtraining für Sprechberufe (5 Einheiten)", type: "igel", price: 300, benefits: ["für Lehrkräfte, Vortragende, Callcenter"], nutzen: "Training ohne Krankheitswert, keine Kassenleistung." },
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
      problem: "Viele wissen nicht, dass podologische Behandlung bei bestimmten Diagnosen Kassenleistung ist, und andere erwarten es fälschlich.",
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
          { id: "partner", name: "Partnergebühr für den Geburtsvorbereitungskurs", type: "igel", price: 90, benefits: ["Begleitperson nimmt teil"], kasseWenn: "Manche Krankenkassen erstatten die Partnergebühr; bitte nachfragen." },
          { id: "babymassage", name: "Babymassage-Kurs", type: "igel", price: 90, benefits: ["in der Gruppe, mehrere Termine"], kasseWenn: "Einige Kassen bezuschussen Kurse rund um die Geburt." },
          { id: "akupunktur_geburt", name: "Akupunktur zur Geburtsvorbereitung (je Sitzung)", type: "igel", price: 25, benefits: ["ab der 36. Woche"], nutzen: "Ein Nutzen ist wissenschaftlich nicht sicher belegt." },
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
          { id: "betreuung_privat", name: "Zusätzliche Betreuung über den Höchstbetrag hinaus (je Stunde)", type: "igel", price: 40, benefits: ["Begleitung, Gesellschaft, Entlastung der Angehörigen"], kasseWenn: "Der Entlastungsbetrag der Pflegekasse kann dafür eingesetzt werden." },
          { id: "hauswirtschaft", name: "Hauswirtschaftliche Hilfe privat (je Stunde)", type: "igel", price: 35, benefits: ["Einkauf, Wäsche, Reinigung"], kasseWenn: "Der Entlastungsbetrag der Pflegekasse kann dafür eingesetzt werden." },
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
          { id: "otc", name: "Rezeptfreies Präparat zur Selbstmedikation", type: "igel", price: 12, benefits: ["mit Beratung in der Apotheke"] },
          { id: "messung", name: "Blutzucker- oder Cholesterinmessung", type: "igel", price: 8, benefits: ["Ergebnis in wenigen Minuten"], nutzen: "Ersetzt keine ärztliche Untersuchung." },
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
          { id: "hg_kasse", name: "Hörgerät ohne Aufzahlung (je Ohr)", type: "kasse", price: 750, zuzahlung: "hilfsmittel", benefits: ["Kassenversorgung mit moderner Technik", "gesetzliche Zuzahlung 10 €"] },
          { id: "hg_plus", name: "Höherwertiges Hörgerät (je Ohr)", type: "igel", price: 1650, kasseAnteil: 750, benefits: ["z. B. Akku, Bluetooth, besseres Sprachverstehen in Gruppen"] },
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
      headline: "Wann die Kasse Brillengläser bezuschusst, und welche Extras sich lohnen",
      problem: "Viele Kunden wissen nicht, ob ihnen ein Kassenzuschuss zusteht, und können Zusatzoptionen schlecht einordnen.",
      beispiel: "Hinweis auf den Kassenzuschuss für Kinder und bei starker Sehschwäche, Gleitsicht und Extras mit Preis und ehrlicher Einordnung.",
    },
    anlaesse: [
      {
        id: "brille",
        label: "Neue Brille",
        bereich: "Brille",
        options: [
          { id: "einstaerke", name: "Einstärkenbrille (Gläser und Fassung)", type: "igel", price: 180, benefits: ["für Ferne oder Nähe"], kasseWenn: "Für Kinder und Jugendliche sowie bei starker Sehschwäche zahlt die Kasse die Gläser bis zum Festbetrag; die Fassung zahlen alle selbst." },
          { id: "gleitsicht", name: "Gleitsichtbrille", type: "igel", price: 600, benefits: ["Ferne und Nähe in einem Glas"] },
          { id: "blaufilter", name: "Zusätzlicher Blaulichtfilter", type: "igel", price: 60, benefits: ["Beschichtung der Gläser"], nutzen: "Ein Nutzen für die Augengesundheit ist nicht belegt." },
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
          { id: "einlage_komfort", name: "Einlagen mit Komfortausstattung", type: "igel", price: 140, kasseAnteil: 80, benefits: ["z. B. für Sportschuhe oder besonders dünn"] },
        ],
      },
      {
        id: "kompression",
        label: "Kompressionsstrümpfe",
        bereich: "Hilfsmittel",
        options: [
          { id: "kompr_kasse", name: "Kompressionsstrümpfe auf Verordnung", type: "kasse", price: 90, zuzahlung: "hilfsmittel", benefits: ["Kassenversorgung mit gesetzlicher Zuzahlung"] },
          { id: "kompr_mode", name: "Kompressionsstrümpfe in Modefarbe oder mit Muster", type: "igel", price: 120, kasseAnteil: 90, benefits: ["gleiche Wirkung, andere Optik"] },
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
      problem: "Heilpraktiker-Leistungen sind fast immer Privatleistungen. Patienten wollen vorher wissen, was es kostet und was ihre Zusatzversicherung erstattet.",
      beispiel: "Jede Leistung mit Preis, Hinweis auf Erstattung durch Zusatzversicherungen und ehrlicher Angabe zum Nutzen.",
    },
    anlaesse: [
      {
        id: "naturheil",
        label: "Naturheilkundliche Behandlung",
        bereich: "Behandlung",
        options: [
          { id: "hp_anamnese", name: "Ausführliche Erstanamnese", type: "igel", price: 80, benefits: ["etwa 60 Minuten"], kasseWenn: "Gesetzliche Kassen zahlen nicht; private Zusatzversicherungen für Heilpraktiker erstatten oft anteilig." },
          { id: "hp_akupunktur", name: "Akupunktur (je Sitzung)", type: "igel", price: 50, benefits: ["etwa 30 Minuten"], kasseWenn: "Private Zusatzversicherungen erstatten oft anteilig." },
          { id: "hp_verfahren", name: "Weitere naturheilkundliche Verfahren (je Sitzung)", type: "igel", price: 60, benefits: ["nach Absprache"], nutzen: "Für viele naturheilkundliche Verfahren ist ein Nutzen wissenschaftlich nicht belegt." },
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
          { id: "allgemein", name: "Allgemeine Krankenhausleistung", type: "kasse", price: 0, benefits: ["Kassenleistung, medizinisch vollwertig", "gesetzliche Zuzahlung 10 € pro Tag, höchstens 28 Tage im Jahr"] },
          { id: "zweibett", name: "Zweibettzimmer (je Tag)", type: "igel", price: 60, benefits: ["mehr Ruhe"], kasseWenn: "Private Zusatzversicherungen übernehmen das oft." },
          { id: "einbett", name: "Einbettzimmer (je Tag)", type: "igel", price: 110, benefits: ["eigenes Zimmer"], kasseWenn: "Private Zusatzversicherungen übernehmen das oft." },
          { id: "wahlarzt", name: "Wahlärztliche Behandlung (geschätzt für den Aufenthalt)", type: "igel", price: 800, benefits: ["Behandlung durch die leitenden Ärztinnen und Ärzte"], kasseWenn: "Private Zusatzversicherungen übernehmen das oft.", nutzen: "Die allgemeine Krankenhausleistung ist medizinisch vollwertig." },
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
  uro: "Prostata-Früherkennung, PSA mit Abwägung",
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

export function specialty(id: string | null | undefined): Specialty | null {
  return ALLE_SPECIALTIES.find((s) => s.id === id) ?? null;
}

export const SPECIALTY_LABELS: Record<string, string> = {
  [DENTAL_ID]: "Zahnmedizin",
  ...Object.fromEntries(ALLE_SPECIALTIES.map((s) => [s.id, s.name])),
  andere: "Andere Fachrichtung (nur eigene Leistungen)",
};

/** Auswahl bei der Anmeldung: nur sichtbare Fächer (ausgeblendete Gruppen fehlen). */
export const SPECIALTY_AUSWAHL: Record<string, string> = {
  [DENTAL_ID]: "Zahnmedizin",
  ...Object.fromEntries(SPECIALTIES.map((s) => [s.id, s.name])),
  andere: "Andere Fachrichtung (nur eigene Leistungen)",
};

export function isDental(fach: string | null | undefined): boolean {
  return !fach || fach === DENTAL_ID;
}
