// Anamnesebogen je Fachrichtung: reine Daten ohne Datenbank, nutzbar auf dem Server, im Browser und in Tests.
//
// Aufbau:
// - ANAMNESE_FRAGEN und ANLIEGEN sind der Katalog mit festen Schlüsseln. Ein Schlüssel wird nie für etwas
//   anderes verwendet und nie gelöscht, damit gespeicherte Antworten lesbar bleiben (lib/anamnesis.ts).
// - BASIS_FRAGEN und BASIS_ANLIEGEN bekommt jedes Fach, außer was es mit `ohneFragen`/`ohneAnliegen` abwählt.
//   Gesundheitsdaten nur, wenn das Fach sie braucht (Datensparsamkeit): Fachgeschäfte fragen nicht nach
//   Gerinnung oder Infektionen. Die Anliegen sind fachneutral: Kasse zuerst.
// - ANAMNESE_JE_FACH ergänzt je Fach eigene Fragen und Anliegen. Zahnärztliches steht nur bei "zahn".
// - Ein unbekanntes oder fehlendes Fach (auch "andere") bekommt den neutralen Bogen, nie den zahnärztlichen.
//
// Regeln für die Texte (geprüft in lib/anamneseProfile.test.ts):
// - Fragen beschreiben, was üblich in Anamnesebögen des Fachs steht. Keine Diagnose, keine Wertung, keine Werbung.
// - Hinweise an die Praxis nennen nur die Angabe des Patienten („Kontaktlinsen“), keine Anweisung und kein Risiko.
// - Anliegen sind Wünsche des Patienten. Keine Selbstzahlerleistung wird angeboten (lib/specialties.ts:
//   „Sorrida empfiehlt keine IGeL von sich aus“).

import type { GlobalCode } from "@/lib/proposals";

/** Fach der Zahnmedizin (wie DENTAL_ID in lib/specialties.ts; hier ohne Import, damit die Datei klein bleibt). */
export const ZAHN = "zahn";
/** Bogen für „andere“, ein fehlendes oder ein unbekanntes Fach. */
export const NEUTRAL = "neutral";
/** Bis zu diesem Alter (einschließlich) beantworten Eltern den Bogen, wo das Fach nichts anderes festlegt. */
export const ELTERN_BIS_ALTER = 15;
/** Ab diesem Alter beantworten Jugendliche den Bogen in Frauenheilkunde und Hebammenhilfe selbst. */
export const SELBST_AB_ALTER_VERTRAULICH = 12;

export type Hinweis = { level: "warn" | "info"; text: string };
export type Bedingung = { geschlecht?: "W" | "M"; abAlter?: number; bisAlter?: number };
export type Person = { geschlecht?: string | null; alter?: number | null };

export type AnamneseFrage = {
  key: string;
  /** Frage an die Patientin oder den Patienten. */
  text: string;
  /** Dieselbe Frage an Eltern („Nimmt Ihr Kind …“). */
  textEltern?: string;
  /** Rückfrage bei „Ja“. */
  detail?: string;
  /** Hinweis für die Praxis bei „Ja“: nur die Angabe, keine Anweisung. */
  hinweis?: Hinweis;
  /** Nur für dieses Geschlecht bzw. Alter gefragt. */
  fuer?: Bedingung;
  /** Nur, wenn die Person selbst antwortet; nie an Eltern (z. B. Schwangerschaft: vertraulich). */
  nurSelbst?: boolean;
};

export type Anliegen = {
  key: string;
  text: string;
  textEltern?: string;
  hinweis?: Hinweis;
  fuer?: Bedingung;
  /** Nur noch zum Lesen alter Bögen; wird nicht mehr angeboten. */
  alt?: boolean;
};

const fragen = (liste: AnamneseFrage[]) => Object.fromEntries(liste.map((f) => [f.key, f])) as Record<string, AnamneseFrage>;
const anliegen = (liste: Anliegen[]) => Object.fromEntries(liste.map((a) => [a.key, a])) as Record<string, Anliegen>;

export const ANAMNESE_FRAGEN: Record<string, AnamneseFrage> = fragen([
  // --- Für alle Fächer ---
  { key: "medikamente", text: "Nehmen Sie regelmäßig Medikamente?", textEltern: "Nimmt Ihr Kind regelmäßig Medikamente?", detail: "Welche?" },
  { key: "blutverduenner", text: "Nehmen Sie blutverdünnende Medikamente (z. B. ASS, Phenprocoumon, Apixaban oder Rivaroxaban)?", textEltern: "Nimmt Ihr Kind blutverdünnende Medikamente?", detail: "Welche?", hinweis: { level: "warn", text: "Blutverdünner" } },
  { key: "gerinnung", text: "Haben Sie eine Blutgerinnungsstörung oder bluten Sie lange nach?", textEltern: "Hat Ihr Kind eine Blutgerinnungsstörung oder blutet es lange nach?", hinweis: { level: "warn", text: "Gerinnungsstörung" } },
  { key: "allergien", text: "Haben Sie Allergien oder Unverträglichkeiten (z. B. gegen Penicillin, Pflaster, Latex oder ein Mittel zur Betäubung)?", textEltern: "Hat Ihr Kind Allergien oder Unverträglichkeiten (z. B. gegen Penicillin, Pflaster, Latex oder ein Mittel zur Betäubung)?", detail: "Welche?", hinweis: { level: "warn", text: "Allergie" } },
  { key: "herz", text: "Haben Sie eine Herzerkrankung, eine künstliche Herzklappe oder einen Herzschrittmacher?", textEltern: "Hat Ihr Kind eine Herzerkrankung, eine künstliche Herzklappe oder einen Herzschrittmacher?", detail: "Welche?", hinweis: { level: "warn", text: "Herzerkrankung, Herzklappe oder Schrittmacher" } },
  { key: "blutdruck", text: "Haben Sie hohen Blutdruck?", textEltern: "Hat Ihr Kind hohen Blutdruck?", hinweis: { level: "info", text: "Bluthochdruck" } },
  { key: "diabetes", text: "Haben Sie Diabetes?", textEltern: "Hat Ihr Kind Diabetes?", hinweis: { level: "info", text: "Diabetes" } },
  { key: "infektion", text: "Haben oder hatten Sie eine Infektionskrankheit (z. B. Hepatitis, HIV, Tuberkulose)?", textEltern: "Hat oder hatte Ihr Kind eine Infektionskrankheit (z. B. Hepatitis, HIV, Tuberkulose)?", detail: "Welche?", hinweis: { level: "warn", text: "Infektionskrankheit" } },
  // Nicht an Eltern: Ob eine Jugendliche schwanger ist, fragt die Praxis sie selbst.
  { key: "schwanger", text: "Sind Sie schwanger oder könnten Sie schwanger sein?", hinweis: { level: "warn", text: "Schwangerschaft" }, fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },
  { key: "rauchen", text: "Rauchen Sie?", textEltern: "Raucht Ihr Kind?", hinweis: { level: "info", text: "Raucher" }, fuer: { abAlter: 12 } },

  // --- Zahnmedizin (bisherige Fragen des zahnärztlichen Bogens) ---
  { key: "bisphosphonate", text: "Erhalten oder erhielten Sie Medikamente gegen Osteoporose oder Knochenmetastasen (z. B. Bisphosphonate, Denosumab)?", textEltern: "Erhält oder erhielt Ihr Kind Medikamente gegen Osteoporose oder Knochenmetastasen (z. B. Bisphosphonate, Denosumab)?", detail: "Welche und seit wann?", hinweis: { level: "warn", text: "Medikamente gegen Osteoporose oder Knochenmetastasen" } },
  { key: "bestrahlung", text: "Wurden Sie im Kopf- oder Halsbereich bestrahlt?", textEltern: "Wurde Ihr Kind im Kopf- oder Halsbereich bestrahlt?", hinweis: { level: "warn", text: "Bestrahlung im Kopf- oder Halsbereich" } },
  { key: "knirschen", text: "Knirschen oder pressen Sie mit den Zähnen (z. B. nachts)?", textEltern: "Knirscht oder presst Ihr Kind mit den Zähnen (z. B. nachts)?", hinweis: { level: "info", text: "Knirschen/Pressen" } },

  // --- Mehrere Fächer ---
  { key: "operationen", text: "Wurden Sie schon einmal operiert oder lagen Sie im Krankenhaus?", textEltern: "Wurde Ihr Kind schon einmal operiert oder lag es im Krankenhaus?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere Operation oder Krankenhausaufenthalt" } },
  { key: "narkose", text: "Hatten Sie schon einmal Probleme mit einer Narkose, einer Beruhigungsspritze oder einer örtlichen Betäubung?", textEltern: "Hatte Ihr Kind schon einmal Probleme mit einer Narkose, einer Beruhigungsspritze oder einer örtlichen Betäubung?", detail: "Welche?", hinweis: { level: "warn", text: "Probleme mit Narkose oder Betäubung" } },
  { key: "thrombose", text: "Hatten Sie schon einmal eine Thrombose oder Lungenembolie?", textEltern: "Hatte Ihr Kind schon einmal eine Thrombose oder Lungenembolie?", detail: "Wann?", hinweis: { level: "warn", text: "Thrombose oder Lungenembolie" } },
  { key: "gelenkersatz", text: "Haben Sie ein künstliches Gelenk (z. B. Hüfte oder Knie)?", textEltern: "Hat Ihr Kind ein künstliches Gelenk?", detail: "Welches und seit wann?", hinweis: { level: "info", text: "Künstliches Gelenk" } },
  { key: "brille", text: "Tragen Sie eine Brille?", textEltern: "Trägt Ihr Kind eine Brille?", hinweis: { level: "info", text: "Brille" } },
  { key: "kontaktlinsen", text: "Tragen Sie Kontaktlinsen?", textEltern: "Trägt Ihr Kind Kontaktlinsen?", detail: "Welche Art?", hinweis: { level: "info", text: "Kontaktlinsen" } },
  { key: "augen_op", text: "Wurden Sie schon einmal an den Augen operiert oder gelasert?", textEltern: "Wurde Ihr Kind schon einmal an den Augen operiert oder gelasert?", detail: "Was, wann und an welchem Auge?", hinweis: { level: "info", text: "Frühere Operation oder Laserbehandlung am Auge" } },
  { key: "hoergeraet", text: "Tragen Sie ein Hörgerät?", textEltern: "Trägt Ihr Kind ein Hörgerät?", detail: "Auf welchem Ohr?", hinweis: { level: "info", text: "Hörgerät" } },
  { key: "ohrgeraeusche", text: "Haben Sie Ohrgeräusche (Tinnitus)?", textEltern: "Hat Ihr Kind Ohrgeräusche?", detail: "Seit wann?", hinweis: { level: "info", text: "Ohrgeräusche" } },
  { key: "verordnung", text: "Haben Sie eine ärztliche Verordnung (Rezept)?", textEltern: "Haben Sie eine ärztliche Verordnung (Rezept) für Ihr Kind?", hinweis: { level: "info", text: "Verordnung vorhanden" } },
  { key: "hilfsmittel_alltag", text: "Nutzen Sie Hilfsmittel im Alltag (z. B. Rollator, Greifhilfe oder Schiene)?", textEltern: "Nutzt Ihr Kind Hilfsmittel im Alltag (z. B. Schiene oder Sitzhilfe)?", detail: "Welche?", hinweis: { level: "info", text: "Hilfsmittel im Alltag" } },
  { key: "vollmacht", text: "Gibt es eine Vorsorgevollmacht, eine Patientenverfügung oder eine rechtliche Betreuung?", textEltern: "Gibt es für Ihr Kind eine rechtliche Betreuung oder eine Vormundschaft?", detail: "Wer ist eingetragen?", hinweis: { level: "info", text: "Vorsorgevollmacht, Patientenverfügung oder Betreuung" } },

  // --- Allgemeinmedizin ---
  { key: "dauererkrankung", text: "Haben Sie eine länger andauernde Erkrankung (z. B. Asthma, Schilddrüse, Niere oder Leber)?", textEltern: "Hat Ihr Kind eine länger andauernde Erkrankung (z. B. Asthma, Schilddrüse, Niere oder Leber)?", detail: "Welche?", hinweis: { level: "info", text: "Länger andauernde Erkrankung" } },
  { key: "familie_erkrankungen", text: "Gibt es in Ihrer Familie Erkrankungen wie Herzinfarkt, Schlaganfall, Diabetes oder Krebs?", detail: "Welche?", hinweis: { level: "info", text: "Erkrankungen in der Familie" } },

  // --- Augenheilkunde ---
  { key: "augen_familie", text: "Gibt es in Ihrer Familie Augenerkrankungen wie Grünen Star (Glaukom) oder Makuladegeneration?", detail: "Welche?", hinweis: { level: "info", text: "Augenerkrankung in der Familie" } },

  // --- Dermatologie ---
  { key: "hautkrebs", text: "Hatten Sie oder jemand in Ihrer Familie schon Hautkrebs?", textEltern: "Hatte Ihr Kind oder jemand in Ihrer Familie schon Hautkrebs?", detail: "Wer, und welche Art, falls bekannt?", hinweis: { level: "info", text: "Hautkrebs (selbst oder in der Familie)" } },
  { key: "sonnenbrand", text: "Hatten Sie oft Sonnenbrand oder gehen Sie regelmäßig ins Solarium?", textEltern: "Hatte Ihr Kind oft Sonnenbrand?", hinweis: { level: "info", text: "Häufig Sonnenbrand oder Solarium" } },
  { key: "hauterkrankung", text: "Haben Sie eine bekannte Hauterkrankung (z. B. Neurodermitis, Schuppenflechte oder Akne)?", textEltern: "Hat Ihr Kind eine bekannte Hauterkrankung (z. B. Neurodermitis, Schuppenflechte oder Akne)?", detail: "Welche?", hinweis: { level: "info", text: "Bekannte Hauterkrankung" } },
  { key: "salben", text: "Verwenden Sie zurzeit Cremes oder Salben, die Ihnen verschrieben wurden?", textEltern: "Verwendet Ihr Kind zurzeit Cremes oder Salben, die verschrieben wurden?", detail: "Welche?", hinweis: { level: "info", text: "Verschriebene Cremes oder Salben" } },

  // --- Frauenheilkunde ---
  // Erst ab 12 Jahren und nur an die Person selbst (in der Frauenheilkunde ab 12, siehe ANAMNESE_JE_FACH.gyn).
  { key: "verhuetung", text: "Verhüten Sie zurzeit?", detail: "Womit (z. B. Pille oder Spirale)?", hinweis: { level: "info", text: "Verhütung" }, fuer: { abAlter: 12 }, nurSelbst: true },
  // Die Krebsfrüherkennung beim Frauenarzt zahlt die Kasse ab 20 Jahren.
  { key: "letzte_vorsorge", text: "Waren Sie schon einmal zur Krebsfrüherkennung in einer Frauenarztpraxis?", detail: "Wann war das zuletzt?", fuer: { geschlecht: "W", abAlter: 20 }, nurSelbst: true },
  { key: "regelblutung", text: "Haben Sie Beschwerden mit der Regelblutung (z. B. starke Schmerzen oder unregelmäßige Blutungen)?", detail: "Welche?", hinweis: { level: "info", text: "Beschwerden mit der Regelblutung" }, fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },
  { key: "schwangerschaften", text: "Waren Sie schon einmal schwanger?", detail: "Wie oft, und gab es Geburten oder Kaiserschnitte?", fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },

  // --- Urologie ---
  { key: "wasserlassen", text: "Haben Sie Beschwerden beim Wasserlassen (z. B. häufiger Harndrang, Brennen oder schwacher Strahl)?", textEltern: "Hat Ihr Kind Beschwerden beim Wasserlassen (z. B. häufiger Harndrang oder Brennen)?", detail: "Welche?", hinweis: { level: "info", text: "Beschwerden beim Wasserlassen" } },
  { key: "harnsteine", text: "Hatten Sie schon einmal Nieren- oder Harnsteine?", textEltern: "Hatte Ihr Kind schon einmal Nieren- oder Harnsteine?", hinweis: { level: "info", text: "Frühere Nieren- oder Harnsteine" } },
  { key: "uro_op", text: "Wurden Sie schon einmal an Niere, Blase oder Geschlechtsorganen operiert?", textEltern: "Wurde Ihr Kind schon einmal an Niere, Blase oder Geschlechtsorganen operiert?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere Operation an Niere, Blase oder Geschlechtsorganen" } },

  // --- Orthopädie ---
  { key: "unfall_bewegungsapparat", text: "Hatten Sie Unfälle oder Operationen an Knochen, Gelenken oder der Wirbelsäule?", textEltern: "Hatte Ihr Kind Unfälle oder Operationen an Knochen, Gelenken oder der Wirbelsäule?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere Unfälle oder Operationen am Bewegungsapparat" } },
  { key: "osteoporose", text: "Wurde bei Ihnen Osteoporose (Knochenschwund) festgestellt?", textEltern: "Wurde bei Ihrem Kind Osteoporose (Knochenschwund) festgestellt?", hinweis: { level: "info", text: "Osteoporose" } },
  { key: "hilfsmittel_bewegung", text: "Nutzen Sie Hilfsmittel wie Einlagen, Bandagen oder Gehstützen?", textEltern: "Nutzt Ihr Kind Hilfsmittel wie Einlagen, Bandagen oder Gehstützen?", detail: "Welche?", hinweis: { level: "info", text: "Einlagen, Bandagen oder Gehstützen" } },

  // --- Hals-Nasen-Ohrenheilkunde ---
  { key: "hno_op", text: "Wurden Sie schon einmal an Ohren, Nase, Nasennebenhöhlen oder Mandeln operiert?", textEltern: "Wurde Ihr Kind schon einmal an Ohren, Nase, Nasennebenhöhlen oder Mandeln operiert?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere Operation an Ohren, Nase oder Mandeln" } },
  { key: "schnarchen", text: "Schnarchen Sie stark oder haben Sie nachts Atemaussetzer?", textEltern: "Schnarcht Ihr Kind stark oder hat es nachts Atemaussetzer?", hinweis: { level: "info", text: "Starkes Schnarchen oder Atemaussetzer" } },

  // --- Kinder- und Jugendmedizin (Fragen an die Eltern) ---
  { key: "impfpass", text: "Haben Sie den Impfpass Ihres Kindes zur Hand?" },
  { key: "u_heft", text: "Haben Sie das gelbe Untersuchungsheft (U-Heft) Ihres Kindes zur Hand?" },
  { key: "geburt_besonderheiten", text: "Gab es Besonderheiten in der Schwangerschaft oder bei der Geburt Ihres Kindes (z. B. Frühgeburt)?", detail: "Welche?", hinweis: { level: "info", text: "Besonderheiten in Schwangerschaft oder Geburt" } },
  { key: "rauchen_wohnung", text: "Wird in der Wohnung Ihres Kindes geraucht?", hinweis: { level: "info", text: "Rauchen in der Wohnung" } },

  // --- Kardiologie ---
  { key: "belastung", text: "Haben Sie bei Belastung Brustschmerzen, ein Engegefühl oder Atemnot?", textEltern: "Hat Ihr Kind bei Belastung Brustschmerzen, ein Engegefühl oder Atemnot?", hinweis: { level: "info", text: "Beschwerden bei Belastung" } },
  { key: "herzstolpern", text: "Spüren Sie Herzstolpern oder Herzrasen?", textEltern: "Spürt Ihr Kind Herzstolpern oder Herzrasen?", hinweis: { level: "info", text: "Herzstolpern oder Herzrasen" } },
  { key: "herzkatheter", text: "Hatten Sie schon eine Herzkatheter-Untersuchung, einen Stent oder eine Operation am Herzen?", textEltern: "Hatte Ihr Kind schon eine Herzkatheter-Untersuchung oder eine Operation am Herzen?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere Herzkatheter-Untersuchung, Stent oder Herzoperation" } },
  { key: "herz_familie", text: "Hatte jemand in Ihrer Familie vor dem 60. Lebensjahr einen Herzinfarkt oder Schlaganfall?", hinweis: { level: "info", text: "Herzinfarkt oder Schlaganfall in der Familie" } },

  // --- Radiologie ---
  { key: "metall_im_koerper", text: "Haben Sie einen Herzschrittmacher, eine Medikamentenpumpe oder Metallteile im Körper (z. B. Schrauben, Clips oder Splitter)?", textEltern: "Hat Ihr Kind einen Herzschrittmacher, eine Medikamentenpumpe oder Metallteile im Körper (z. B. Schrauben, Clips oder Splitter)?", detail: "Was und wo?", hinweis: { level: "warn", text: "Schrittmacher, Pumpe oder Metall im Körper" } },
  { key: "kontrastmittel", text: "Haben Sie schon einmal ein Kontrastmittel schlecht vertragen?", textEltern: "Hat Ihr Kind schon einmal ein Kontrastmittel schlecht vertragen?", detail: "Was ist passiert?", hinweis: { level: "warn", text: "Unverträglichkeit von Kontrastmittel" } },
  { key: "niere_schilddruese", text: "Haben Sie eine Nierenerkrankung oder eine Überfunktion der Schilddrüse?", textEltern: "Hat Ihr Kind eine Nierenerkrankung oder eine Überfunktion der Schilddrüse?", detail: "Welche?", hinweis: { level: "warn", text: "Nierenerkrankung oder Schilddrüsenüberfunktion" } },
  { key: "platzangst", text: "Haben Sie Platzangst in engen Räumen?", textEltern: "Hat Ihr Kind Angst in engen Räumen?", hinweis: { level: "info", text: "Platzangst" } },

  // --- Neurologie ---
  { key: "kopfschmerz", text: "Haben Sie häufig Kopfschmerzen oder Migräne?", textEltern: "Hat Ihr Kind häufig Kopfschmerzen oder Migräne?", detail: "Wie oft?", hinweis: { level: "info", text: "Häufige Kopfschmerzen oder Migräne" } },
  { key: "krampfanfall", text: "Hatten Sie schon einmal einen Krampfanfall oder sind Sie ohnmächtig geworden?", textEltern: "Hatte Ihr Kind schon einmal einen Krampfanfall oder ist es ohnmächtig geworden?", detail: "Wann?", hinweis: { level: "warn", text: "Krampfanfall oder Ohnmacht" } },
  { key: "schlaganfall", text: "Hatten Sie schon einmal einen Schlaganfall oder eine Hirnblutung?", textEltern: "Hatte Ihr Kind schon einmal einen Schlaganfall oder eine Hirnblutung?", detail: "Wann?", hinweis: { level: "warn", text: "Schlaganfall oder Hirnblutung" } },
  { key: "taubheit_schwindel", text: "Haben Sie Taubheitsgefühle, Lähmungen oder Schwindel?", textEltern: "Hat Ihr Kind Taubheitsgefühle, Lähmungen oder Schwindel?", detail: "Wo und seit wann?", hinweis: { level: "info", text: "Taubheitsgefühl, Lähmung oder Schwindel" } },

  // --- Psychiatrie und Psychotherapie ---
  { key: "psy_vorbehandlung", text: "Waren Sie schon einmal in psychotherapeutischer oder psychiatrischer Behandlung?", textEltern: "War Ihr Kind schon einmal in psychotherapeutischer oder psychiatrischer Behandlung?", detail: "Wann und wie lange?", hinweis: { level: "info", text: "Frühere psychotherapeutische oder psychiatrische Behandlung" } },
  { key: "psy_klinik", text: "Waren Sie schon einmal stationär in einer Klinik für seelische Gesundheit?", textEltern: "War Ihr Kind schon einmal stationär in einer Klinik für seelische Gesundheit?", detail: "Wann?", hinweis: { level: "info", text: "Früherer stationärer Aufenthalt in einer Klinik für seelische Gesundheit" } },
  { key: "psy_medikamente", text: "Nehmen Sie Medikamente gegen seelische Beschwerden (z. B. gegen Depression, Angst oder Schlafstörungen)?", textEltern: "Nimmt Ihr Kind Medikamente gegen seelische Beschwerden (z. B. gegen Depression, Angst oder Schlafstörungen)?", detail: "Welche?", hinweis: { level: "info", text: "Medikamente gegen seelische Beschwerden" } },

  // --- Gastroenterologie ---
  { key: "spiegelung", text: "Hatten Sie schon einmal eine Magen- oder Darmspiegelung?", textEltern: "Hatte Ihr Kind schon einmal eine Magen- oder Darmspiegelung?", detail: "Wann?", hinweis: { level: "info", text: "Frühere Magen- oder Darmspiegelung" } },
  { key: "darm_familie", text: "Gab es in Ihrer Familie Darmkrebs oder Darmpolypen?", detail: "Bei wem?", hinweis: { level: "info", text: "Darmkrebs oder Darmpolypen in der Familie" } },
  { key: "verdauung", text: "Haben Sie Verdauungsbeschwerden wie Sodbrennen, Durchfall oder Verstopfung?", textEltern: "Hat Ihr Kind Verdauungsbeschwerden wie Bauchschmerzen, Durchfall oder Verstopfung?", detail: "Welche?", hinweis: { level: "info", text: "Verdauungsbeschwerden" } },

  // --- Pneumologie ---
  { key: "atemnot_husten", text: "Haben Sie seit längerer Zeit Atemnot oder Husten?", textEltern: "Hat Ihr Kind seit längerer Zeit Atemnot oder Husten?", detail: "Seit wann?", hinweis: { level: "info", text: "Länger anhaltende Atemnot oder Husten" } },
  { key: "lungenerkrankung", text: "Haben Sie eine bekannte Lungenerkrankung (z. B. Asthma oder COPD)?", textEltern: "Hat Ihr Kind eine bekannte Lungenerkrankung (z. B. Asthma)?", detail: "Welche?", hinweis: { level: "info", text: "Bekannte Lungenerkrankung" } },
  { key: "inhalieren", text: "Benutzen Sie ein Spray oder Pulver zum Inhalieren?", textEltern: "Benutzt Ihr Kind ein Spray oder Pulver zum Inhalieren?", detail: "Welches?", hinweis: { level: "info", text: "Mittel zum Inhalieren" } },
  { key: "staub_beruf", text: "Hatten Sie im Beruf mit Staub, Dämpfen oder Asbest zu tun?", detail: "Womit und wie lange?", hinweis: { level: "info", text: "Staub, Dämpfe oder Asbest im Beruf" }, fuer: { abAlter: 16 } },

  // --- Endokrinologie und Diabetologie ---
  { key: "schilddruese", text: "Haben Sie eine Erkrankung der Schilddrüse oder wurden Sie an der Schilddrüse operiert?", textEltern: "Hat Ihr Kind eine Erkrankung der Schilddrüse oder wurde es an der Schilddrüse operiert?", detail: "Was genau?", hinweis: { level: "info", text: "Schilddrüsenerkrankung oder Schilddrüsenoperation" } },
  { key: "insulin_sensor", text: "Spritzen Sie Insulin oder tragen Sie einen Sensor zur Zuckermessung?", textEltern: "Bekommt Ihr Kind Insulin oder trägt es einen Sensor zur Zuckermessung?", detail: "Was genau?", hinweis: { level: "info", text: "Insulin oder Sensor zur Zuckermessung" } },
  { key: "unterzucker", text: "Hatten Sie schon Unterzuckerungen?", textEltern: "Hatte Ihr Kind schon Unterzuckerungen?", detail: "Wie oft?", hinweis: { level: "info", text: "Unterzuckerungen" } },
  { key: "gewicht", text: "Hat sich Ihr Gewicht in letzter Zeit ohne Absicht stark verändert?", textEltern: "Hat sich das Gewicht Ihres Kindes in letzter Zeit ohne erkennbaren Grund stark verändert?", hinweis: { level: "info", text: "Ungewollte Gewichtsveränderung" } },

  // --- Chirurgie, Phlebologie und Proktologie ---
  { key: "krampfadern", text: "Haben Sie Krampfadern oder oft geschwollene Beine?", hinweis: { level: "info", text: "Krampfadern oder geschwollene Beine" }, fuer: { abAlter: 16 } },

  // --- Plastische und Ästhetische Chirurgie ---
  { key: "aesthetik_vorbehandlung", text: "Hatten Sie schon ästhetische Behandlungen oder Operationen (z. B. Unterspritzungen)?", textEltern: "Hatte Ihr Kind schon ästhetische Behandlungen oder Operationen?", detail: "Was und wann?", hinweis: { level: "info", text: "Frühere ästhetische Behandlungen" } },
  { key: "narben", text: "Neigen Sie zu auffälligen oder wulstigen Narben?", textEltern: "Neigt Ihr Kind zu auffälligen oder wulstigen Narben?", hinweis: { level: "info", text: "Neigung zu wulstigen Narben" } },

  // --- Physiotherapie, Ergotherapie, Logopädie, Podologie ---
  { key: "physio_frueher", text: "Hatten Sie wegen dieser Beschwerden schon einmal Physiotherapie?", textEltern: "Hatte Ihr Kind wegen dieser Beschwerden schon einmal Physiotherapie?", detail: "Wann?", hinweis: { level: "info", text: "Frühere Physiotherapie wegen dieser Beschwerden" } },
  { key: "op_unfall_jahr", text: "Wurden Sie in den letzten zwölf Monaten operiert oder hatten Sie einen Unfall?", textEltern: "Wurde Ihr Kind in den letzten zwölf Monaten operiert oder hatte es einen Unfall?", detail: "Was und wann?", hinweis: { level: "info", text: "Operation oder Unfall in den letzten zwölf Monaten" } },
  { key: "alltag", text: "Fallen Ihnen Aufgaben im Alltag schwer (z. B. Anziehen, Schreiben oder Haushalt)?", textEltern: "Fallen Ihrem Kind Aufgaben im Alltag schwer (z. B. Anziehen, Schreiben oder Spielen)?", detail: "Welche?", hinweis: { level: "info", text: "Schwierigkeiten im Alltag" } },
  { key: "ergo_frueher", text: "Hatten Sie schon einmal Ergotherapie?", textEltern: "Hatte Ihr Kind schon einmal Ergotherapie?", detail: "Wann?" },
  { key: "schlucken", text: "Haben Sie Schwierigkeiten beim Schlucken oder verschlucken Sie sich oft?", textEltern: "Hat Ihr Kind Schwierigkeiten beim Schlucken oder verschluckt es sich oft?", hinweis: { level: "info", text: "Schwierigkeiten beim Schlucken" } },
  { key: "sprachen_zuhause", text: "Wird bei Ihnen zu Hause mehr als eine Sprache gesprochen?", textEltern: "Wird bei Ihrem Kind zu Hause mehr als eine Sprache gesprochen?", detail: "Welche?", hinweis: { level: "info", text: "Mehrere Sprachen zu Hause" } },
  { key: "fuesse_gefuehl", text: "Spüren Sie an den Füßen weniger als früher (z. B. Taubheit oder Kribbeln)?", textEltern: "Spürt Ihr Kind an den Füßen weniger als früher (z. B. Taubheit oder Kribbeln)?", hinweis: { level: "info", text: "Weniger Gefühl an den Füßen" } },
  { key: "fuesse_wunden", text: "Haben Sie offene Stellen oder Wunden an den Füßen?", textEltern: "Hat Ihr Kind offene Stellen oder Wunden an den Füßen?", detail: "Wo?", hinweis: { level: "warn", text: "Offene Stellen an den Füßen" } },
  { key: "orthopaedische_schuhe", text: "Tragen Sie orthopädische Schuhe oder Einlagen?", textEltern: "Trägt Ihr Kind orthopädische Schuhe oder Einlagen?", hinweis: { level: "info", text: "Orthopädische Schuhe oder Einlagen" } },

  // --- Hebammenhilfe ---
  // An die Frau selbst (Hebammenhilfe ab 12, siehe ANAMNESE_JE_FACH.hebamme).
  { key: "mutterpass", text: "Haben Sie einen Mutterpass?", fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },
  { key: "geburten", text: "Haben Sie schon ein Kind geboren?", detail: "Wie oft, und gab es einen Kaiserschnitt?", fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },
  { key: "fruehere_schwangerschaft", text: "Gab es in früheren Schwangerschaften oder bei früheren Geburten Besonderheiten?", detail: "Welche?", hinweis: { level: "info", text: "Besonderheiten in früheren Schwangerschaften oder Geburten" }, fuer: { geschlecht: "W", abAlter: 12 }, nurSelbst: true },

  // --- Ambulante Pflege ---
  { key: "pflegegrad", text: "Haben Sie einen Pflegegrad?", textEltern: "Hat Ihr Kind einen Pflegegrad?", detail: "Welchen?", hinweis: { level: "info", text: "Pflegegrad" } },
  { key: "sturz", text: "Sind Sie in den letzten zwölf Monaten gestürzt?", textEltern: "Ist Ihr Kind in den letzten zwölf Monaten gestürzt?", hinweis: { level: "warn", text: "Sturz in den letzten zwölf Monaten" } },

  // --- Apotheke ---
  { key: "medikationsplan", text: "Haben Sie einen Medikationsplan?", textEltern: "Hat Ihr Kind einen Medikationsplan?", hinweis: { level: "info", text: "Medikationsplan vorhanden" } },
  { key: "ohne_rezept", text: "Nehmen Sie Mittel ohne Rezept ein (z. B. Schmerzmittel, Nahrungsergänzung oder pflanzliche Mittel)?", textEltern: "Bekommt Ihr Kind Mittel ohne Rezept (z. B. Schmerzmittel, Nahrungsergänzung oder pflanzliche Mittel)?", detail: "Welche?", hinweis: { level: "info", text: "Mittel ohne Rezept" } },
  { key: "mehrere_praxen", text: "Bekommen Sie Rezepte aus mehreren Praxen?", textEltern: "Bekommt Ihr Kind Rezepte aus mehreren Praxen?", hinweis: { level: "info", text: "Rezepte aus mehreren Praxen" } },

  // --- Hörakustik ---
  { key: "ohr_op_entzuendung", text: "Wurden Sie schon an den Ohren operiert oder haben Sie oft Entzündungen im Ohr?", textEltern: "Wurde Ihr Kind schon an den Ohren operiert oder hat es oft Entzündungen im Ohr?", hinweis: { level: "info", text: "Ohroperation oder häufige Entzündungen im Ohr" } },

  // --- Augenoptik ---
  { key: "bildschirm", text: "Arbeiten Sie viel am Bildschirm?", textEltern: "Verbringt Ihr Kind viel Zeit am Bildschirm?", hinweis: { level: "info", text: "Viel Zeit am Bildschirm" } },

  // --- Sanitätshaus ---
  { key: "schwellung", text: "Haben Sie oft geschwollene Beine oder Füße?", textEltern: "Hat Ihr Kind oft geschwollene Beine oder Füße?", hinweis: { level: "info", text: "Geschwollene Beine oder Füße" } },
  { key: "druckstellen", text: "Haben Sie empfindliche Haut oder Druckstellen?", textEltern: "Hat Ihr Kind empfindliche Haut oder Druckstellen?", hinweis: { level: "info", text: "Empfindliche Haut oder Druckstellen" } },

  // --- Heilpraktik ---
  { key: "aerztliche_behandlung", text: "Sind Sie wegen Ihrer Beschwerden zurzeit auch in ärztlicher Behandlung?", textEltern: "Ist Ihr Kind wegen seiner Beschwerden zurzeit auch in ärztlicher Behandlung?", detail: "Bei wem?", hinweis: { level: "info", text: "Zurzeit auch in ärztlicher Behandlung" } },
  { key: "naturheilkunde_frueher", text: "Hatten Sie schon naturheilkundliche Behandlungen?", textEltern: "Hatte Ihr Kind schon naturheilkundliche Behandlungen?", detail: "Welche?" },
]);

export const ANLIEGEN: Record<string, Anliegen> = anliegen([
  // --- Für alle Fächer: Kasse zuerst ---
  { key: "kasse", text: "Wissen, was die Krankenkasse übernimmt" },
  { key: "kosten_vorher", text: "Die Kosten vorher kennen" },
  { key: "angst", text: "Ich habe Angst vor der Behandlung", textEltern: "Mein Kind hat Angst vor der Behandlung", hinweis: { level: "info", text: "Angst vor der Behandlung angegeben" } },
  // Bis November 2026 angeboten; bleibt zum Lesen alter Bögen.
  { key: "kosten", text: "Kosten gering halten", alt: true },

  // --- Zahnmedizin (bisherige Wünsche des zahnärztlichen Bogens) ---
  { key: "hell", text: "hellere Zähne" },
  { key: "luecke", text: "eine Lücke schließen" },
  { key: "zahnfleisch", text: "Zahnfleischbluten loswerden" },

  // --- Je Fach ---
  { key: "checkup_kasse", text: "Wissen, wann die Kasse den Gesundheits-Check-up übernimmt" },
  { key: "impfschutz", text: "Meinen Impfschutz besprechen", textEltern: "Den Impfschutz meines Kindes besprechen" },
  { key: "brillenglaeser_kasse", text: "Wissen, was die Kasse bei Brillengläsern übernimmt" },
  { key: "hautkrebs_screening_kasse", text: "Wissen, ab wann die Kasse das Hautkrebs-Screening übernimmt" },
  { key: "vorsorge_kasse", text: "Wissen, welche Vorsorge die Kasse in meinem Alter übernimmt", textEltern: "Wissen, welche Vorsorge die Kasse im Alter meines Kindes übernimmt" },
  { key: "verhuetung_kasse", text: "Wissen, was die Kasse bei Verhütungsmitteln übernimmt", fuer: { abAlter: 12 } },
  { key: "frueherkennung_kasse", text: "Wissen, welche Früherkennung die Kasse übernimmt" },
  { key: "hilfsmittel_kasse", text: "Wissen, was die Kasse bei Hilfsmitteln übernimmt" },
  { key: "hoergeraet_kasse", text: "Wissen, was die Kasse bei einem Hörgerät übernimmt" },
  { key: "u_untersuchung_kasse", text: "Wissen, welche Vorsorgeuntersuchungen die Kasse übernimmt" },
  { key: "befunde", text: "Meine Befunde verständlich erklärt bekommen", textEltern: "Die Befunde meines Kindes verständlich erklärt bekommen" },
  { key: "mrt_kasse", text: "Wissen, wann die Kasse eine MRT-Untersuchung übernimmt" },
  { key: "therapieplatz_kasse", text: "Wissen, wie ich über die Kasse einen Therapieplatz bekomme", textEltern: "Wissen, wie mein Kind über die Kasse einen Therapieplatz bekommt" },
  { key: "kostenerstattung", text: "Wissen, wie die Kostenerstattung durch die Kasse abläuft" },
  { key: "darmkrebs_vorsorge_kasse", text: "Wissen, ab wann die Kasse die Darmkrebs-Früherkennung übernimmt" },
  { key: "rauchstopp", text: "Über einen Rauchstopp sprechen", fuer: { abAlter: 12 } },
  { key: "sensor_kasse", text: "Wissen, wann die Kasse einen Sensor zur Zuckermessung übernimmt" },
  { key: "krampfadern_kasse", text: "Wissen, wann die Kasse die Behandlung von Krampfadern übernimmt", fuer: { abAlter: 16 } },
  { key: "bedenkzeit", text: "Genug Zeit für meine Entscheidung haben", textEltern: "Genug Zeit für die Entscheidung haben" },
  { key: "zuzahlung", text: "Wissen, wie hoch die Zuzahlung ist" },
  { key: "uebungen", text: "Übungen für zu Hause bekommen", textEltern: "Übungen für zu Hause für mein Kind bekommen" },
  { key: "fussbehandlung_kasse", text: "Wissen, wann die Kasse die Fußbehandlung übernimmt" },
  { key: "hebammenhilfe_kasse", text: "Wissen, welche Hebammenhilfe die Kasse übernimmt" },
  { key: "wochenbett", text: "Die Betreuung im Wochenbett planen" },
  { key: "pflegekasse", text: "Wissen, was die Pflegekasse übernimmt" },
  { key: "angehoerige", text: "Angehörige in die Planung einbeziehen" },
  { key: "zuzahlung_befreiung", text: "Wissen, ob ich von der Zuzahlung befreit werden kann", textEltern: "Wissen, ob mein Kind Zuzahlungen leisten muss" },
  { key: "medikamente_durchsehen", text: "Meine Medikamente gemeinsam durchsehen", textEltern: "Die Medikamente meines Kindes gemeinsam durchsehen" },
  { key: "zusatzversicherung", text: "Wissen, ob eine Zusatzversicherung etwas übernimmt" },
  { key: "wahlleistungen", text: "Wissen, was Wahlleistungen kosten und was die Kasse übernimmt" },
]);

/** Fragen für jedes Fach. */
export const BASIS_FRAGEN = ["medikamente", "blutverduenner", "gerinnung", "allergien", "herz", "blutdruck", "diabetes", "infektion", "schwanger", "rauchen"] as const;
/** Anliegen für jedes Fach (außer `ohneAnliegen`): Kasse zuerst, Angst zuletzt. */
export const BASIS_ANLIEGEN = ["kasse", "kosten_vorher", "angst"] as const;

/**
 * Für den Satz zur Schweigepflicht (§ 203 StGB):
 * - "zahn" und "arzt": zahnärztliche bzw. ärztliche Schweigepflicht.
 * - "heilberuf": andere Heilberufe mit staatlich geregelter Ausbildung (Psychotherapie, Heilmittel, Hebamme, Pflege,
 *   Apotheke) sowie Kliniken. Dort gilt die Schweigepflicht, aber nicht „ärztlich“.
 * - "vertraulich": Berufe, für die § 203 StGB nach herrschender Meinung nicht gilt (Heilpraktik, Augenoptik,
 *   Hörakustik, Sanitätshaus), und der neutrale Bogen. Dort steht keine Berufspflicht, nur Vertraulichkeit.
 */
export type Berufsgruppe = "zahn" | "arzt" | "heilberuf" | "vertraulich";
export type Ansprache = "patient" | "eltern";

export type FachAnamnese = {
  gruppe: Berufsgruppe;
  /** Eigene Fragen nach den BASIS_FRAGEN. */
  fragen: string[];
  /** Eigene Anliegen zwischen „Kosten“ und „Angst“. */
  anliegen: string[];
  /** "eltern": immer an die Eltern (Kinder- und Jugendmedizin). Ohne Angabe entscheidet das Alter (`selbstAb`). */
  ansprache?: "eltern";
  /** Ab diesem Alter antwortet die Person selbst; jünger antworten die Eltern. Ohne Angabe ab 16 (ELTERN_BIS_ALTER + 1). */
  selbstAb?: number;
  /** Fragen aus der Basis, die im Fach nicht passen (z. B. „Sind Sie schwanger?“ bei der Hebamme). */
  ohneFragen?: string[];
  /** Anliegen aus der Basis, die im Fach nicht passen (z. B. „Angst vor der Behandlung“ in der Apotheke). */
  ohneAnliegen?: string[];
  /** Wozu die Angaben dienen: „…, Sie sicher zu behandeln“. */
  zweck?: "behandeln" | "beraten" | "versorgen" | "betreuen";
  /** Neutraler Hinweis über den Fragen. Telefonnummern darin werden als Link gezeigt (hinweisTeile). */
  hinweis?: string;
  /** Derselbe Hinweis, wenn Eltern den Bogen ausfüllen. */
  hinweisEltern?: string;
};

// Der Bogen liegt auch auf dem Tablet am Empfang. Deshalb „nicht unbedingt sofort“.
const KRISENHILFE =
  "Die Praxis liest diesen Bogen nicht unbedingt sofort. Hilfe in einer akuten Krise gibt es Tag und Nacht kostenlos bei der Telefonseelsorge unter 0800 111 0 111 oder 0800 111 0 222. Im Notfall wählen Sie 112.";
const KRISENHILFE_ELTERN =
  "Die Praxis liest diesen Bogen nicht unbedingt sofort. Kinder und Jugendliche erreichen die Nummer gegen Kummer kostenlos unter 116 111. Eltern erreichen das Elterntelefon kostenlos unter 0800 111 0 550. Tag und Nacht hilft die Telefonseelsorge unter 0800 111 0 111 oder 0800 111 0 222. Im Notfall wählen Sie 112.";

export const ANAMNESE_JE_FACH: Record<string, FachAnamnese> = {
  [ZAHN]: { gruppe: "zahn", fragen: ["bisphosphonate", "bestrahlung", "knirschen"], anliegen: ["hell", "luecke", "zahnfleisch"] },
  hausarzt: { gruppe: "arzt", fragen: ["operationen", "dauererkrankung", "familie_erkrankungen"], anliegen: ["checkup_kasse", "impfschutz"] },
  augen: { gruppe: "arzt", fragen: ["brille", "kontaktlinsen", "augen_op", "augen_familie"], anliegen: ["brillenglaeser_kasse"] },
  haut: { gruppe: "arzt", fragen: ["hautkrebs", "sonnenbrand", "hauterkrankung", "salben"], anliegen: ["hautkrebs_screening_kasse"] },
  // Jugendliche ab 12 beantworten den Bogen in der Frauenheilkunde selbst (vertraulich, ohne Eltern).
  gyn: { gruppe: "arzt", selbstAb: SELBST_AB_ALTER_VERTRAULICH, fragen: ["verhuetung", "letzte_vorsorge", "regelblutung", "schwangerschaften"], anliegen: ["vorsorge_kasse", "verhuetung_kasse"] },
  uro: { gruppe: "arzt", fragen: ["wasserlassen", "harnsteine", "uro_op"], anliegen: ["frueherkennung_kasse"] },
  ortho: { gruppe: "arzt", fragen: ["unfall_bewegungsapparat", "gelenkersatz", "osteoporose", "hilfsmittel_bewegung"], anliegen: ["hilfsmittel_kasse"] },
  hno: { gruppe: "arzt", fragen: ["hoergeraet", "ohrgeraeusche", "hno_op", "schnarchen"], anliegen: ["hoergeraet_kasse"] },
  kinder: { gruppe: "arzt", ansprache: "eltern", fragen: ["impfpass", "u_heft", "geburt_besonderheiten", "rauchen_wohnung"], anliegen: ["u_untersuchung_kasse", "impfschutz"] },
  kardio: { gruppe: "arzt", fragen: ["belastung", "herzstolpern", "herzkatheter", "herz_familie"], anliegen: ["befunde"] },
  radiologie: { gruppe: "arzt", fragen: ["metall_im_koerper", "kontrastmittel", "niere_schilddruese", "platzangst"], anliegen: ["mrt_kasse", "befunde"] },
  neuro: { gruppe: "arzt", fragen: ["kopfschmerz", "krampfanfall", "schlaganfall", "taubheit_schwindel"], anliegen: ["befunde"] },
  // Psychotherapie leisten auch Psychologische Psychotherapeutinnen und -therapeuten: Schweigepflicht ohne „ärztlich“.
  // Blutverdünner und Herz bleiben wegen der Psychopharmaka; Gerinnung und Infektionen braucht das Gespräch nicht.
  psych: { gruppe: "heilberuf", ohneFragen: ["gerinnung", "infektion"], fragen: ["psy_vorbehandlung", "psy_klinik", "psy_medikamente"], anliegen: ["therapieplatz_kasse", "kostenerstattung"], hinweis: KRISENHILFE, hinweisEltern: KRISENHILFE_ELTERN },
  gastro: { gruppe: "arzt", fragen: ["spiegelung", "darm_familie", "narkose", "verdauung"], anliegen: ["darmkrebs_vorsorge_kasse", "befunde"] },
  pneumo: { gruppe: "arzt", fragen: ["atemnot_husten", "lungenerkrankung", "inhalieren", "staub_beruf"], anliegen: ["rauchstopp", "befunde"] },
  endo: { gruppe: "arzt", fragen: ["schilddruese", "insulin_sensor", "unterzucker", "gewicht"], anliegen: ["sensor_kasse", "befunde"] },
  chirurgie: { gruppe: "arzt", fragen: ["operationen", "narkose", "thrombose", "krampfadern"], anliegen: ["krampfadern_kasse"] },
  aesthetik: { gruppe: "arzt", fragen: ["aesthetik_vorbehandlung", "narkose", "thrombose", "narben"], anliegen: ["bedenkzeit"] },
  physio: { gruppe: "heilberuf", fragen: ["verordnung", "physio_frueher", "op_unfall_jahr", "gelenkersatz"], anliegen: ["zuzahlung", "uebungen"] },
  // Herz bleibt (z. B. Elektrostimulation); Blut und Infektionen spielen in der Übungsbehandlung keine Rolle.
  ergo: { gruppe: "heilberuf", ohneFragen: ["blutverduenner", "gerinnung", "infektion"], fragen: ["verordnung", "alltag", "hilfsmittel_alltag", "ergo_frueher"], anliegen: ["zuzahlung", "uebungen"] },
  logo: { gruppe: "heilberuf", ohneFragen: ["blutverduenner", "gerinnung", "infektion"], fragen: ["verordnung", "schlucken", "hoergeraet", "sprachen_zuhause"], anliegen: ["zuzahlung", "uebungen"] },
  podo: { gruppe: "heilberuf", fragen: ["verordnung", "fuesse_gefuehl", "fuesse_wunden", "orthopaedische_schuhe"], anliegen: ["zuzahlung", "fussbehandlung_kasse"] },
  // Die Frage „Sind Sie schwanger?“ aus der Basis ist bei der Hebamme selbstverständlich und entfällt.
  hebamme: { gruppe: "heilberuf", selbstAb: SELBST_AB_ALTER_VERTRAULICH, ohneFragen: ["schwanger"], ohneAnliegen: ["angst"], zweck: "betreuen", fragen: ["mutterpass", "geburten", "fruehere_schwangerschaft"], anliegen: ["hebammenhilfe_kasse", "wochenbett"] },
  pflege: { gruppe: "heilberuf", zweck: "versorgen", ohneAnliegen: ["angst"], fragen: ["pflegegrad", "sturz", "hilfsmittel_alltag", "vollmacht"], anliegen: ["pflegekasse", "angehoerige"] },
  // Blutverdünner und Herz bleiben wegen der Wechselwirkungen; Gerinnung und Infektionen fragt die Apotheke nicht ab.
  apotheke: { gruppe: "heilberuf", zweck: "beraten", ohneFragen: ["gerinnung", "infektion"], ohneAnliegen: ["angst"], fragen: ["medikationsplan", "ohne_rezept", "mehrere_praxen"], anliegen: ["zuzahlung_befreiung", "medikamente_durchsehen"] },
  // Fachgeschäfte: nur, was für die Versorgung zählt (Medikamente, Allergien, Diabetes; beim Sanitätshaus auch Blutdruck).
  hoerakustik: { gruppe: "vertraulich", zweck: "versorgen", ohneFragen: ["blutverduenner", "gerinnung", "herz", "blutdruck", "infektion", "schwanger", "rauchen"], ohneAnliegen: ["angst"], fragen: ["hoergeraet", "verordnung", "ohrgeraeusche", "ohr_op_entzuendung"], anliegen: ["hoergeraet_kasse"] },
  optik: { gruppe: "vertraulich", zweck: "versorgen", ohneFragen: ["blutverduenner", "gerinnung", "herz", "blutdruck", "infektion", "schwanger"], ohneAnliegen: ["angst"], fragen: ["brille", "kontaktlinsen", "augen_op", "bildschirm"], anliegen: ["brillenglaeser_kasse"] },
  sanitaetshaus: { gruppe: "vertraulich", zweck: "versorgen", ohneFragen: ["blutverduenner", "gerinnung", "herz", "infektion", "schwanger"], ohneAnliegen: ["angst"], fragen: ["verordnung", "hilfsmittel_alltag", "schwellung", "druckstellen"], anliegen: ["hilfsmittel_kasse"] },
  heilpraktiker: { gruppe: "vertraulich", fragen: ["aerztliche_behandlung", "naturheilkunde_frueher", "operationen"], anliegen: ["zusatzversicherung"] },
  klinik: { gruppe: "heilberuf", fragen: ["operationen", "narkose", "thrombose", "vollmacht"], anliegen: ["wahlleistungen"] },
  [NEUTRAL]: { gruppe: "vertraulich", fragen: [], anliegen: [] },
};

/** Übernahme in den Behandlungsvorschlag: nur in der Zahnmedizin (lib/anamnesis.ts prüft das Fach). */
export const ZAHN_VORSCHLAG_FRAGEN: Record<string, GlobalCode> = { rauchen: "raucher", knirschen: "bruxismus" };
export const ZAHN_VORSCHLAG_ANLIEGEN: Record<string, GlobalCode> = { hell: "bleaching" };

const SCHWEIGEPFLICHT: Record<Berufsgruppe, string> = {
  zahn: "Ihre Angaben unterliegen der zahnärztlichen Schweigepflicht.",
  arzt: "Ihre Angaben unterliegen der ärztlichen Schweigepflicht.",
  heilberuf: "Ihre Angaben unterliegen der Schweigepflicht.",
  vertraulich: "Wir behandeln Ihre Angaben vertraulich.",
};

/** Welcher Bogen gilt: "zahn", ein Fach mit eigenem Bogen oder "neutral". Nie "zahn" ohne ausdrückliches Fach. */
export function anamneseFach(fach: string | null | undefined): string {
  if (fach === ZAHN) return ZAHN;
  return fach && Object.prototype.hasOwnProperty.call(ANAMNESE_JE_FACH, fach) ? fach : NEUTRAL;
}

/** Wie passtZuPerson in lib/fachprofile.ts: Unbekanntes Geschlecht oder Alter schließt nichts aus. */
function passt(b: Bedingung | undefined, p: Person): boolean {
  if (!b) return true;
  if (b.geschlecht && p.geschlecht && p.geschlecht !== "D" && p.geschlecht !== b.geschlecht) return false;
  if (b.abAlter != null && p.alter != null && p.alter < b.abAlter) return false;
  if (b.bisAlter != null && p.alter != null && p.alter > b.bisAlter) return false;
  return true;
}

export type AnamneseProfil = {
  /** "zahn", Fach-ID oder "neutral" */
  fach: string;
  gruppe: Berufsgruppe;
  ansprache: Ansprache;
  fragen: { key: string; text: string; detail?: string }[];
  anliegen: { key: string; text: string }[];
  /** „Ihre Angaben helfen uns, Sie sicher zu behandeln.“ */
  einleitung: string;
  /** „Ihre Angaben unterliegen der ärztlichen Schweigepflicht.“ */
  schweigepflicht: string;
  hinweis?: string;
};

/**
 * Wer antwortet: die Eltern (Kinder- und Jugendmedizin immer, sonst jünger als `selbstAb` des Fachs bzw. 16 Jahre)
 * oder die Person selbst. Unbekanntes Alter: die Person selbst. Gilt für den Anamnesebogen und für die fünf Fragen
 * vor dem Termin (app/portal/[token]/fragen).
 */
export function anspracheFuer(fach: string | null | undefined, alter: number | null | undefined): Ansprache {
  const d = ANAMNESE_JE_FACH[anamneseFach(fach)];
  return d.ansprache === "eltern" || (alter != null && alter < (d.selbstAb ?? ELTERN_BIS_ALTER + 1)) ? "eltern" : "patient";
}

/**
 * Fragt das Fach nach Angst vor der Behandlung? Nicht dort, wo nicht behandelt wird (Apotheke, Hilfsmittel, Pflege,
 * Hebamme). Gilt für den Gesundheitsfragebogen und den Kurz-Fragebogen gleich.
 */
export const fragtNachAngst = (fach: string | null | undefined) => !ANAMNESE_JE_FACH[anamneseFach(fach)].ohneAnliegen?.includes("angst");

/** Der Bogen für ein Fach und eine Person: Fragen und Anliegen gefiltert nach Geschlecht und Alter. */
export function anamneseFuer(fach: string | null | undefined, person: Person = {}): AnamneseProfil {
  const f = anamneseFach(fach);
  const d = ANAMNESE_JE_FACH[f];
  const eltern = anspracheFuer(fach, person.alter) === "eltern";
  const fragenKeys = [...new Set([...BASIS_FRAGEN, ...d.fragen])].filter((k) => !d.ohneFragen?.includes(k));
  const anliegenKeys = [...new Set(["kasse", "kosten_vorher", ...d.anliegen, "angst"])].filter((k) => !d.ohneAnliegen?.includes(k));
  const zweck = d.zweck ?? "behandeln";
  const hinweis = eltern ? (d.hinweisEltern ?? d.hinweis) : d.hinweis;
  return {
    fach: f,
    gruppe: d.gruppe,
    ansprache: eltern ? "eltern" : "patient",
    fragen: fragenKeys
      .map((k) => ANAMNESE_FRAGEN[k])
      .filter((q) => passt(q.fuer, person) && !(eltern && q.nurSelbst))
      .map((q) => ({ key: q.key, text: eltern ? (q.textEltern ?? q.text) : q.text, ...(q.detail ? { detail: q.detail } : {}) })),
    anliegen: anliegenKeys
      .map((k) => ANLIEGEN[k])
      .filter((a) => passt(a.fuer, person))
      .map((a) => ({ key: a.key, text: eltern ? (a.textEltern ?? a.text) : a.text })),
    einleitung: `Ihre Angaben helfen uns, ${eltern ? "Ihr Kind" : "Sie"} sicher zu ${zweck}.`,
    schweigepflicht: SCHWEIGEPFLICHT[d.gruppe],
    ...(hinweis ? { hinweis } : {}),
  };
}

export type HinweisTeil = { text: string; tel?: string };

/** Teilt einen Hinweis in Text und Telefonnummern (z. B. „0800 111 0 111“, „116 111“, „112“), damit sie als tel:-Link erscheinen. */
export function hinweisTeile(text: string): HinweisTeil[] {
  const teile: HinweisTeil[] = [];
  let rest = 0;
  for (const m of text.matchAll(/\b\d{3,4}(?: \d{1,3})*\b/g)) {
    if (m.index > rest) teile.push({ text: text.slice(rest, m.index) });
    teile.push({ text: m[0], tel: m[0].replace(/ /g, "") });
    rest = m.index + m[0].length;
  }
  if (rest < text.length) teile.push({ text: text.slice(rest) });
  return teile;
}
