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
}

export interface Specialty {
  id: string;
  name: string;
  /** "Ihrer Augenärztin oder Ihrem Augenarzt" */
  arztDativ: string;
  /** Kurzbezeichnung für Website und Auswahl. */
  kurz: string;
  marketing: { headline: string; problem: string; beispiel: string };
  anlaesse: Anlass[];
}

export const DENTAL_ID = "zahn";

export const SPECIALTIES: Specialty[] = [
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
        label: "Brust-Früherkennung",
        bereich: "Vorsorge",
        options: [
          { id: "brust_tast", name: "Tastuntersuchung der Brust", type: "kasse", price: 20, kasseAbAlter: 30, benefits: ["Kassenleistung ab 30 jährlich"] },
          { id: "brust_us", name: "Ultraschall der Brust ohne Befund", type: "igel", price: 50, benefits: ["ergänzende Bildgebung, z. B. bei dichtem Brustgewebe"], kasseWenn: "Bei Tastbefund oder Verdacht Kassenleistung.", nutzen: "Als alleinige Vorsorge ist ein Nutzen nicht belegt; bei dichtem Gewebe gemeinsam abwägen." },
        ],
      },
      {
        id: "schwangerschaft",
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
];

export const SPECIALTY_IDS = [DENTAL_ID, ...SPECIALTIES.map((s) => s.id), "andere"] as const;

export function specialty(id: string | null | undefined): Specialty | null {
  return SPECIALTIES.find((s) => s.id === id) ?? null;
}

export const SPECIALTY_LABELS: Record<string, string> = {
  [DENTAL_ID]: "Zahnmedizin",
  ...Object.fromEntries(SPECIALTIES.map((s) => [s.id, s.name])),
  andere: "Andere Fachrichtung (nur eigene Leistungen)",
};

export function isDental(fach: string | null | undefined): boolean {
  return !fach || fach === DENTAL_ID;
}
