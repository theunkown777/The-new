// Befundmodelle je Fach: Körperregionen mit häufigen Diagnosen (ICD-10-GM)
// und Hinweisen zur Abrechnung. Zweck ist Dokumentation und Abrechnung:
// Die Ärztin oder der Arzt wählt den Befund, Sorrida schlägt keine
// Diagnose vor und wertet keine Daten aus (siehe Zweckbestimmung,
// Notiz „Regulatorische Einordnung“). Codes sind Einstiege; endständig und
// mit Zusatzkennzeichen kodiert wird nach aktuellem ICD-10-GM im PVS.

export interface Befund {
  text: string;
  icd: string;
  /** Abrechnungshinweis: Was oft vergessen wird oder wofür der Befund Voraussetzung ist. */
  abrechnung?: string;
  /** Passendes Angebot im Behandlungsweg (Anlass-ID des Fachs). */
  anlass?: string;
  /** Nur bei diesem Geschlecht möglich (z. B. Prostata). */
  geschlecht?: "W" | "M";
}

export interface Region {
  id: string;
  name: string;
  befunde: Befund[];
}

const CHRONIKER = "Kontinuierliche Behandlung: Chronikerpauschale prüfen (Hausarzt EBM 03220/03221).";

export const BEFUNDMODELLE: Record<string, Region[]> = {
  zahn: [
    { id: "zaehne", name: "Zähne", befunde: [
      { text: "Karies des Dentins", icd: "K02.1", abrechnung: "Mehrkosten-Füllung nur mit schriftlicher Vereinbarung vor der Behandlung." },
      { text: "Pulpitis", icd: "K04.0", abrechnung: "Endodontie: GOZ-Analogpositionen und Begründung bei erhöhtem Aufwand prüfen." },
      { text: "Chronische apikale Parodontitis", icd: "K04.5" },
      { text: "Zahnverlust durch Extraktion oder Parodontitis", icd: "K08.1", abrechnung: "Zahnersatz: Befundklasse für den Festzuschuss, Bonusheft abfragen." },
      { text: "Attrition (übermäßiger Zahnabrieb)", icd: "K03.0" },
    ] },
    { id: "parodont", name: "Zahnfleisch und Parodont", befunde: [
      { text: "Chronische Gingivitis", icd: "K05.1", abrechnung: "PSI (BEMA 04) alle zwei Jahre, PZR als Selbstzahlerleistung anbieten." },
      { text: "Chronische Parodontitis", icd: "K05.3", abrechnung: "PAR-Strecke vollständig planen inkl. UPT-Termine (Recall)." },
    ] },
    { id: "kiefer", name: "Kiefer und Kiefergelenk", befunde: [
      { text: "Krankheiten des Kiefergelenks (CMD)", icd: "K07.6", abrechnung: "Funktionsanalyse und Aufbissschiene: privat bzw. GOZ-Abschnitt J." },
      { text: "Entzündliche Zustände der Kiefer", icd: "K10.2" },
    ] },
    { id: "schleimhaut", name: "Mundschleimhaut", befunde: [
      { text: "Rezidivierende orale Aphthen", icd: "K12.0" },
      { text: "Leukoplakie der Mundschleimhaut", icd: "K13.2", abrechnung: "Kontrolle und Dokumentation, ggf. Überweisung." },
    ] },
  ],
  kardio: [
    { id: "kreislauf", name: "Blutdruck und Gefäße", befunde: [
      { text: "Essentielle Hypertonie", icd: "I10.90", abrechnung: "Langzeit-Blutdruckmessung nach EBM, wenn indiziert dokumentieren." },
      { text: "Reine Hypercholesterinämie", icd: "E78.0", anlass: "herzcheck" },
    ] },
    { id: "koronarien", name: "Herzkranzgefäße", befunde: [
      { text: "Atherosklerotische Herzkrankheit (KHK)", icd: "I25.1", abrechnung: "DMP KHK: Einschreibung und Dokumentation werden gesondert vergütet." },
    ] },
    { id: "rhythmus", name: "Herzrhythmus", befunde: [
      { text: "Vorhofflimmern oder -flattern", icd: "I48.9", abrechnung: "Langzeit-EKG und Kontrollen dokumentieren; Antikoagulation in der Akte führen." },
      { text: "Kardiale Arrhythmie", icd: "I49.9" },
    ] },
    { id: "pumpe", name: "Herzmuskel und Klappen", befunde: [
      { text: "Herzinsuffizienz", icd: "I50.9", abrechnung: "DMP Herzinsuffizienz (Modul) prüfen." },
      { text: "Aortenklappenstenose", icd: "I35.0", abrechnung: "Verlaufs-Echokardiographie in festen Abständen: Recall setzen." },
    ] },
  ],
  ortho: [
    { id: "wirbelsaeule", name: "Wirbelsäule", befunde: [
      { text: "Kreuzschmerz", icd: "M54.5", abrechnung: "Bei Arbeitsunfall: über BG (UV-GOÄ) statt Kasse abrechnen." },
      { text: "Bandscheibenverlagerung", icd: "M51.2" },
      { text: "Zervikalneuralgie", icd: "M54.2" },
    ] },
    { id: "knie", name: "Knie", befunde: [
      { text: "Primäre Gonarthrose", icd: "M17.1", anlass: "gelenkschmerz", abrechnung: "Hyaluron- oder PRP-Injektionen sind IGeL: schriftlicher Vertrag vorher." },
      { text: "Meniskusschädigung durch alten Riss", icd: "M23.2" },
    ] },
    { id: "huefte", name: "Hüfte", befunde: [{ text: "Primäre Koxarthrose", icd: "M16.1", anlass: "gelenkschmerz" }] },
    { id: "schulter", name: "Schulter", befunde: [
      { text: "Läsion der Rotatorenmanschette", icd: "M75.1" },
      { text: "Impingement-Syndrom der Schulter", icd: "M75.4", abrechnung: "Stoßwellentherapie ist meist IGeL." },
    ] },
    { id: "fuss", name: "Fuß", befunde: [
      { text: "Hallux valgus", icd: "M20.1" },
      { text: "Fersensporn", icd: "M77.3", abrechnung: "Stoßwellentherapie ist meist IGeL." },
    ] },
    { id: "knochen", name: "Knochen", befunde: [{ text: "Postmenopausale Osteoporose", icd: "M81.0", geschlecht: "W", anlass: "osteoporose", abrechnung: "Knochendichtemessung ist Kassenleistung nur bei Fraktur ohne Unfall bzw. bestimmtem Verdacht, sonst IGeL." }] },
  ],
  haut: [
    { id: "flaeche", name: "Hautfläche", befunde: [
      { text: "Psoriasis vulgaris", icd: "L40.0" },
      { text: "Atopisches Ekzem", icd: "L20.8" },
      { text: "Acne vulgaris", icd: "L70.0" },
    ] },
    { id: "pigment", name: "Muttermale und Hautkrebsvorsorge", befunde: [
      { text: "Melanozytennävus", icd: "D22.9", anlass: "hautkrebs", abrechnung: "Hautkrebs-Screening ab 35 alle zwei Jahre Kassenleistung (EBM 01745/01746); Auflichtmikroskopie meist IGeL." },
      { text: "Aktinische Keratose", icd: "L57.0" },
    ] },
  ],
  augen: [
    { id: "druck", name: "Augeninnendruck und Sehnerv", befunde: [{ text: "Primäres Weitwinkelglaukom", icd: "H40.1", anlass: "glaukom", abrechnung: "Bei bekanntem Glaukom sind Kontrollen Kassenleistung; Früherkennung ohne Verdacht ist IGeL." }] },
    { id: "linse", name: "Linse", befunde: [{ text: "Senile Katarakt", icd: "H25.9", abrechnung: "Premium-Linsen: Mehrkosten schriftlich vereinbaren." }] },
    { id: "netzhaut", name: "Netzhaut", befunde: [{ text: "Degeneration der Makula", icd: "H35.3", anlass: "netzhaut" }] },
    { id: "refraktion", name: "Sehschärfe", befunde: [
      { text: "Myopie", icd: "H52.1" },
      { text: "Presbyopie", icd: "H52.4" },
    ] },
  ],
  hno: [
    { id: "nase", name: "Nase und Nebenhöhlen", befunde: [
      { text: "Allergische Rhinopathie durch Pollen", icd: "J30.1" },
      { text: "Chronische Sinusitis", icd: "J32.9" },
    ] },
    { id: "ohr", name: "Ohr", befunde: [
      { text: "Beidseitiger Schallempfindungs-Hörverlust", icd: "H90.3", anlass: "hoeren" },
      { text: "Tinnitus aurium", icd: "H93.1" },
    ] },
    { id: "schlaf", name: "Schlaf und Rachen", befunde: [
      { text: "Schlafapnoe", icd: "G47.3", anlass: "schnarchen" },
      { text: "Chronische Tonsillitis", icd: "J35.0" },
    ] },
  ],
  gyn: [
    { id: "zyklus", name: "Zyklus und Hormone", befunde: [
      { text: "Klimakterische Beschwerden", icd: "N95.1" },
      { text: "Endometriose", icd: "N80.9" },
    ] },
    { id: "uterus", name: "Gebärmutter", befunde: [{ text: "Leiomyom des Uterus", icd: "D25.9", anlass: "krebsvorsorge" }] },
    { id: "schwangerschaft", name: "Schwangerschaft", befunde: [{ text: "Überwachung einer normalen Schwangerschaft", icd: "Z34", anlass: "schwangerschaft", abrechnung: "Mutterschaftsvorsorge nach Richtlinie; zusätzliche Ultraschalle auf Wunsch sind IGeL." }] },
    { id: "infekt", name: "Infektionen", befunde: [{ text: "Akute Kolpitis", icd: "N76.0" }] },
  ],
  uro: [
    { id: "prostata", name: "Prostata", befunde: [{ text: "Prostatahyperplasie", icd: "N40", geschlecht: "M", anlass: "prostata", abrechnung: "PSA-Test zur Früherkennung ohne Verdacht ist IGeL." }] },
    { id: "harnwege", name: "Harnwege und Niere", befunde: [
      { text: "Harnwegsinfektion", icd: "N39.0" },
      { text: "Nierenstein", icd: "N20.0" },
      { text: "Harninkontinenz", icd: "R32", abrechnung: "Beckenbodentraining als Heilmittel verordnen; Inkontinenzhilfsmittel auf Rezept." },
      { text: "Belastungsinkontinenz", icd: "N39.3", abrechnung: "Beckenbodentraining als Heilmittel verordnen." },
    ] },
    { id: "maennergesundheit", name: "Männergesundheit", befunde: [{ text: "Erektile Dysfunktion organischen Ursprungs", icd: "N48.4", geschlecht: "M" }] },
  ],
  hausarzt: [
    { id: "stoffwechsel", name: "Stoffwechsel und Kreislauf", befunde: [
      { text: "Essentielle Hypertonie", icd: "I10.90", abrechnung: CHRONIKER },
      { text: "Diabetes mellitus Typ 2", icd: "E11.90", abrechnung: `${CHRONIKER} DMP Diabetes prüfen.` },
      { text: "Reine Hypercholesterinämie", icd: "E78.0", anlass: "checkup" },
    ] },
    { id: "atemwege", name: "Atemwege", befunde: [
      { text: "Akute Infektion der oberen Atemwege", icd: "J06.9" },
      { text: "Asthma bronchiale", icd: "J45.9", abrechnung: "DMP Asthma prüfen." },
    ] },
    { id: "psyche", name: "Psyche", befunde: [{ text: "Depressive Episode", icd: "F32.9", abrechnung: "Psychosomatische Grundversorgung nur mit Qualifikation abrechnen." }] },
    { id: "bewegung", name: "Bewegungsapparat", befunde: [{ text: "Kreuzschmerz", icd: "M54.5" }] },
    { id: "vorsorge", name: "Vorsorge", befunde: [{ text: "Allgemeine Gesundheitsuntersuchung", icd: "Z00.0", anlass: "checkup", abrechnung: "Check-up (EBM 01732) ab 35 alle drei Jahre, extrabudgetär." }] },
  ],
  neuro: [
    { id: "kopf", name: "Kopfschmerz und Anfälle", befunde: [
      { text: "Migräne", icd: "G43.9" },
      { text: "Epilepsie", icd: "G40.9" },
    ] },
    { id: "nerven", name: "Periphere Nerven", befunde: [
      { text: "Karpaltunnel-Syndrom", icd: "G56.0" },
      { text: "Polyneuropathie", icd: "G62.9" },
    ] },
    { id: "zns", name: "Zentrales Nervensystem", befunde: [{ text: "Multiple Sklerose", icd: "G35.9" }] },
  ],
  gastro: [
    { id: "speiseroehre", name: "Speiseröhre und Magen", befunde: [
      { text: "Refluxkrankheit mit Ösophagitis", icd: "K21.0" },
      { text: "Gastritis", icd: "K29.7" },
    ] },
    { id: "darm", name: "Darm", befunde: [
      { text: "Reizdarmsyndrom ohne Diarrhoe", icd: "K58.9" },
      { text: "Polyp des Kolons", icd: "K63.5", abrechnung: "Kontrollkoloskopie im Intervall: Recall setzen." },
    ] },
    { id: "leber", name: "Leber", befunde: [{ text: "Fettleber", icd: "K76.0" }] },
  ],
  pneumo: [
    { id: "lunge", name: "Lunge und Bronchien", befunde: [
      { text: "COPD", icd: "J44.9", abrechnung: "DMP COPD prüfen." },
      { text: "Asthma bronchiale", icd: "J45.9", abrechnung: "DMP Asthma prüfen." },
      { text: "Husten", icd: "R05" },
    ] },
    { id: "schlaf", name: "Schlaf", befunde: [{ text: "Schlafapnoe", icd: "G47.3" }] },
  ],
  endo: [
    { id: "schilddruese", name: "Schilddrüse", befunde: [
      { text: "Hypothyreose", icd: "E03.9" },
      { text: "Morbus Basedow", icd: "E05.0" },
      { text: "Mehrknotige Struma", icd: "E04.2" },
    ] },
    { id: "stoffwechsel", name: "Stoffwechsel und Hormone", befunde: [
      { text: "Diabetes mellitus Typ 2", icd: "E11.90" },
      { text: "Polyzystisches Ovarialsyndrom", icd: "E28.2", geschlecht: "W" },
    ] },
  ],
  psych: [
    { id: "stimmung", name: "Stimmung und Angst", befunde: [
      { text: "Depressive Episode", icd: "F32.9" },
      { text: "Generalisierte Angststörung", icd: "F41.1" },
      { text: "Posttraumatische Belastungsstörung", icd: "F43.1" },
    ] },
    { id: "weitere", name: "Aufmerksamkeit und Schlaf", befunde: [
      { text: "ADHS", icd: "F90.0" },
      { text: "Nichtorganische Insomnie", icd: "F51.0" },
    ] },
  ],
  kinder: [
    { id: "infekte", name: "Infekte", befunde: [
      { text: "Akute Infektion der oberen Atemwege", icd: "J06.9" },
      { text: "Otitis media", icd: "H66.9" },
    ] },
    { id: "haut", name: "Haut", befunde: [{ text: "Atopisches Ekzem", icd: "L20.8" }] },
    { id: "entwicklung", name: "Entwicklung", befunde: [
      { text: "ADHS", icd: "F90.0" },
      { text: "Entwicklungsverzögerung", icd: "R62.8", anlass: "vorsorge_kind", abrechnung: "U-Untersuchungen nach Kinder-Richtlinie extrabudgetär." },
    ] },
  ],
  physio: [
    { id: "ws", name: "Wirbelsäule (WS)", befunde: [{ text: "Kreuzschmerz", icd: "M54.5", abrechnung: "Diagnosegruppe WS: Höchstmenge je Verordnung prüfen." }] },
    { id: "ex", name: "Extremitäten (EX)", befunde: [
      { text: "Primäre Gonarthrose", icd: "M17.1", abrechnung: "Diagnosegruppe EX." },
      { text: "Läsion der Rotatorenmanschette", icd: "M75.1", abrechnung: "Diagnosegruppe EX; Schulter ggf. Blankoverordnung." },
    ] },
    { id: "zn", name: "Zentrales Nervensystem (ZN)", befunde: [{ text: "Hirninfarkt", icd: "I63.9", abrechnung: "Diagnosegruppe ZN, oft langfristiger Heilmittelbedarf." }] },
    { id: "ly", name: "Lymphabfluss (LY)", befunde: [{ text: "Lymphödem", icd: "I89.0", abrechnung: "Manuelle Lymphdrainage, Diagnosegruppe LY." }] },
  ],
  logo: [
    { id: "sprache", name: "Sprache und Sprechen", befunde: [
      { text: "Expressive Sprachstörung", icd: "F80.1" },
      { text: "Aphasie", icd: "R47.0" },
    ] },
    { id: "schlucken", name: "Schlucken", befunde: [{ text: "Dysphagie", icd: "R13.9" }] },
  ],
  podo: [
    { id: "fuss", name: "Fuß und Nägel", befunde: [
      { text: "Diabetisches Fußsyndrom", icd: "E11.74", abrechnung: "Podologische Therapie bei Diabetes ist Heilmittel auf Verordnung." },
      { text: "Eingewachsener Nagel", icd: "L60.0", abrechnung: "Nagelkorrekturspange: Heilmittel nur bei Verordnung, sonst privat." },
      { text: "Nagelpilz", icd: "B35.1" },
    ] },
  ],
  chirurgie: [
    { id: "bauch", name: "Bauchwand und Galle", befunde: [
      { text: "Leistenhernie", icd: "K40.90" },
      { text: "Gallenstein ohne Cholezystitis", icd: "K80.20" },
    ] },
    { id: "weichteile", name: "Haut und Weichteile", befunde: [{ text: "Abszess an einer Extremität", icd: "L02.4", abrechnung: "Bei Arbeitsunfall: BG-Fall." }] },
  ],
};

BEFUNDMODELLE.ergo = BEFUNDMODELLE.physio;

// Für Apotheke, Optik, Hörakustik, Sanitätshaus, Pflege, Hebammenhilfe,
// Heilpraktik, Klinik, Radiologie und Ästhetik gibt es bewusst kein
// Diagnosemodell: Dort stellt niemand ICD-Diagnosen bzw. die Diagnose kommt
// von der überweisenden Praxis. Ein Hausarzt-Modell wäre dort falsch.
const OHNE_BEFUNDMODELL = new Set(["apotheke", "optik", "hoerakustik", "sanitaetshaus", "pflege", "hebamme", "heilpraktiker", "klinik", "radiologie", "aesthetik"]);

export function befundmodell(fach: string | null | undefined, person?: { geschlecht?: string | null }): Region[] {
  const f = fach || "zahn";
  if (OHNE_BEFUNDMODELL.has(f)) return [];
  const regionen = BEFUNDMODELLE[f] ?? BEFUNDMODELLE.hausarzt;
  const g = person?.geschlecht;
  if (!g || g === "D") return regionen;
  return regionen
    .map((r) => ({ ...r, befunde: r.befunde.filter((b) => !b.geschlecht || b.geschlecht === g) }))
    .filter((r) => r.befunde.length > 0);
}
