import { importiereAmtlich } from "../lib/amtlich/import";
import { PrismaClient } from "@prisma/client";
import { serializeDependsOn } from "../lib/serviceDependency";
import { FACHPROFILE } from "../lib/fachprofile";

const prisma = new PrismaClient();

/**
 * Beispielhafter Startkatalog für die Leistungserfassung.
 *
 * WICHTIG: Dies ist bewusst KEIN vollständiger, abrechnungsverbindlicher
 * GOZ-/BEMA-Katalog. Ziffern sind, wo nicht eindeutig bekannt, mit "–"
 * gekennzeichnet und müssen von der Praxis vor dem produktiven
 * Abrechnungseinsatz gegen das aktuell gültige offizielle Gebühren-
 * verzeichnis (BZÄK/KZBV) geprüft, korrigiert und ergänzt werden.
 * Punktwerte/Eurobeträge sind absichtlich nicht enthalten.
 */
type SeedItem = {
  key: string;
  system: "GOZ" | "BEMA" | "GOAE" | "BEL_II" | "SONSTIGES";
  code: string;
  title: string;
  description?: string;
  category: string;
  // Ob "Zahn/Region" bei dieser Position sinnvoll ist (z. B. Füllung: ja,
  // Aufklärungsgespräch: nein). Steuert nur die Standard-Sichtbarkeit des
  // Feldes in der Erfassung, nicht dessen Verfügbarkeit.
  toothRelevant: boolean;
  // Keys anderer CATALOG-Einträge, die nicht gemeinsam mit dieser Position
  // abgerechnet werden dürfen (z. B. zwei verschiedene Füllungsarten am
  // selben Zahn/Sitzung).
  ausschlussMit?: string[];
  // ISO-Datum, ab dem diese Position gültig ist (z. B. Reformdatum). Ohne
  // Angabe wird kein Gültigkeitszeitraum hinterlegt.
  gueltigAb?: string;
  // Wie oft diese Position je Patient innerhalb von frequenzlimitZeitraumTage
  // abgerechnet werden darf. Beispielhafte Praxispolicen zur
  // Veranschaulichung der Prüfung, keine verbindlichen Vorgaben - vor
  // Produktiveinsatz gegen die tatsächlich geltenden Regeln prüfen.
  frequenzlimitAnzahl?: number;
  frequenzlimitZeitraumTage?: number;
};

// §5 GOZ: Faktor 1,0-3,5, Regelhöchstfaktor 2,3, ab dem eine schriftliche
// Begründung Pflicht ist. Gilt einheitlich für alle GOZ-Positionen (nicht
// ziffernspezifisch) und wird hier pauschal auf jede GOZ-Position sowie -
// als gängige Vereinfachung - auch auf GOÄ-Positionen angewendet.
const STANDARD_FAKTOR = {
  faktorMin: 1.0,
  faktorMax: 3.5,
  regelhoechstfaktor: 2.3,
  begruendungspflichtAbFaktor: 2.3,
};

/** Privatziffern, die im Katalog fehlten (Code "–") oder falsch waren. */
const ZIFFER_KORREKTUR: { system: string; title: string; von: string; nach: string }[] = [
  { system: "GOZ", title: "Entfernung harter Zahnbeläge", von: "1000", nach: "4050/4055" },
  { system: "GOZ", title: "Eingehende Beratung", von: "–", nach: "Ä1" },
  { system: "GOZ", title: "Vitalitätsprüfung", von: "–", nach: "0070" },
  { system: "GOZ", title: "Röntgen Einzelzahnaufnahme", von: "–", nach: "Ä5000" },
  { system: "GOZ", title: "Röntgen Übersichtsaufnahme (OPG)", von: "–", nach: "Ä5004" },
  { system: "GOZ", title: "Infiltrationsanästhesie", von: "–", nach: "0090" },
  { system: "GOZ", title: "Leitungsanästhesie", von: "–", nach: "0100" },
  { system: "GOZ", title: "Füllung, einflächig", von: "–", nach: "2060" },
  { system: "GOZ", title: "Füllung, mehrflächig", von: "–", nach: "2080–2120" },
  { system: "GOZ", title: "Trepanation", von: "–", nach: "2390" },
  { system: "GOZ", title: "Wurzelkanalaufbereitung", von: "–", nach: "2410" },
  { system: "GOZ", title: "Wurzelkanalfüllung", von: "–", nach: "2440" },
  { system: "GOZ", title: "Zahnextraktion", von: "–", nach: "3000/3010" },
  { system: "BEMA", title: "Eingehende Beratung", von: "–", nach: "Ä1" },
];

const CATALOG: SeedItem[] = [
  { key: "unters_privat", system: "GOZ", code: "0010", title: "Eingehende Untersuchung", description: "Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kieferkrankheiten", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "unters_gkv", system: "BEMA", code: "01", title: "Eingehende Untersuchung", description: "Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kieferkrankheiten sowie Erhebung des Zahnstatus", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "beratung_privat", system: "GOZ", code: "Ä1", title: "Eingehende Beratung", description: "Eingehende Beratung, ggf. unter Einbeziehung eines Patientengesprächs zu Befund und Behandlungsplan", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "beratung_gkv", system: "BEMA", code: "Ä1", title: "Eingehende Beratung", description: "Eingehende Beratung", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "anamnese", system: "SONSTIGES", code: "–", title: "Anamnese erhoben", description: "Allgemeine und zahnmedizinische Anamnese erhoben und dokumentiert", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "psi", system: "GOZ", code: "4005", title: "Parodontaler Screening Index (PSI)", description: "Erhebung des Parodontalen Screening Index", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "vitalitaet", system: "GOZ", code: "0070", title: "Vitalitätsprüfung", description: "Sensibilitäts-/Vitalitätsprüfung eines oder mehrerer Zähne", category: "Diagnostik & Beratung", toothRelevant: true },
  { key: "aufklaerung_dokumentiert", system: "SONSTIGES", code: "–", title: "Aufklärung dokumentiert", description: "Patient über Befund, Behandlungsalternativen und Risiken aufgeklärt; Einwilligung dokumentiert", category: "Diagnostik & Beratung", toothRelevant: false },

  { key: "rx_einzelzahn", system: "GOZ", code: "Ä5000", title: "Röntgen Einzelzahnaufnahme", description: "Zahnfilm, digitale Einzelzahnaufnahme", category: "Röntgen", toothRelevant: true },
  { key: "rx_uebersicht", system: "GOZ", code: "Ä5004", title: "Röntgen Übersichtsaufnahme (OPG)", description: "Orthopantomogramm / Panoramaschichtaufnahme", category: "Röntgen", toothRelevant: false },
  { key: "rx_befundung", system: "SONSTIGES", code: "–", title: "Röntgenbild befundet", description: "Röntgenaufnahme angefertigt und befundet", category: "Röntgen", toothRelevant: false },

  { key: "anaesthesie_infiltration", system: "GOZ", code: "0090", title: "Infiltrationsanästhesie", description: "Lokale Infiltrationsanästhesie", category: "Anästhesie", toothRelevant: true },
  { key: "anaesthesie_leitung", system: "GOZ", code: "0100", title: "Leitungsanästhesie", description: "Leitungsanästhesie", category: "Anästhesie", toothRelevant: true },

  { key: "zst_entfernung", system: "GOZ", code: "4050/4055", title: "Entfernung harter Zahnbeläge", description: "Entfernung harter Zahnbeläge (Zahnstein), unabhängig vom Ausmaß", category: "Prophylaxe", toothRelevant: false, frequenzlimitAnzahl: 1, frequenzlimitZeitraumTage: 365 },
  { key: "pzr", system: "GOZ", code: "1040", title: "Professionelle Zahnreinigung", description: "Entfernung weicher Zahnbeläge, Politur und Fluoridierung sämtlicher Zähne", category: "Prophylaxe", toothRelevant: false, frequenzlimitAnzahl: 2, frequenzlimitZeitraumTage: 365 },
  { key: "mundhygiene_instruktion", system: "SONSTIGES", code: "–", title: "Mundhygieneinstruktion", description: "Anleitung zur Mundhygiene gegeben", category: "Prophylaxe", toothRelevant: false },
  { key: "fluoridierung", system: "GOZ", code: "–", title: "Fluoridierung", description: "Lokale Fluoridierung", category: "Prophylaxe", toothRelevant: false },

  { key: "kariesexkavation", system: "SONSTIGES", code: "–", title: "Kariesexkavation", description: "Entfernung kariösen Zahnschmelzes/-dentins", category: "Füllungstherapie", toothRelevant: true },
  { key: "fuellung_einflaechig", system: "GOZ", code: "2060", title: "Füllung, einflächig", description: "Kompositfüllung, einflächig", category: "Füllungstherapie", toothRelevant: true, ausschlussMit: ["fuellung_mehrflaechig"] },
  { key: "fuellung_mehrflaechig", system: "GOZ", code: "2080–2120", title: "Füllung, mehrflächig", description: "Kompositfüllung, mehrflächig", category: "Füllungstherapie", toothRelevant: true, ausschlussMit: ["fuellung_einflaechig"] },
  { key: "fuellung_politur", system: "SONSTIGES", code: "–", title: "Füllung poliert", description: "Politur/Ausarbeitung der gelegten Füllung", category: "Füllungstherapie", toothRelevant: true },
  { key: "unterfuellung", system: "GOZ", code: "–", title: "Unterfüllung / Aufbaufüllung", description: "Unterfüllung bzw. Aufbaufüllung vor definitiver Versorgung", category: "Füllungstherapie", toothRelevant: true },

  { key: "wurzelkanal_aufbereitung", system: "GOZ", code: "2410", title: "Wurzelkanalaufbereitung", description: "Aufbereitung eines Wurzelkanals", category: "Endodontie", toothRelevant: true },
  { key: "wurzelkanal_fuellung", system: "GOZ", code: "2440", title: "Wurzelkanalfüllung", description: "Medikamentöse Einlage und/oder Wurzelfüllung", category: "Endodontie", toothRelevant: true },
  { key: "trepanation", system: "GOZ", code: "2390", title: "Trepanation", description: "Eröffnung der Pulpakammer als Erstmaßnahme", category: "Endodontie", toothRelevant: true },

  { key: "extraktion", system: "GOZ", code: "3000/3010", title: "Zahnextraktion", description: "Entfernung eines Zahnes", category: "Chirurgie", toothRelevant: true },
  { key: "wundversorgung", system: "SONSTIGES", code: "–", title: "Wundversorgung / Naht", description: "Blutstillung, ggf. Naht nach chirurgischem Eingriff", category: "Chirurgie", toothRelevant: true },
  { key: "postop_anweisung", system: "SONSTIGES", code: "–", title: "Postoperative Anweisung", description: "Mündliche und/oder schriftliche Verhaltensanweisung nach dem Eingriff gegeben", category: "Chirurgie", toothRelevant: false },

  // Systematische Parodontitisbehandlung (PAR-Richtlinie, seit 01.07.2021):
  // die offiziellen BEMA-Kürzel BEVa/BEVb, ATG, MHU, AITa/AITb, CPTa/CPTb,
  // UPTa-d werden in der Praxis als Kürzel statt der reinen Ziffer geführt -
  // deshalb hier bewusst als "code" hinterlegt, statt eine Nummer zu raten.
  { key: "par_beva", system: "BEMA", code: "BEVa", title: "Parodontaler Screening Index", description: "Erhebung des Parodontalen Screening Index (PSI) als Einstieg in die systematische PAR-Behandlung", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_bevb", system: "BEMA", code: "BEVb", title: "Erhebung Parodontalstatus", description: "Vollständige parodontale Befunderhebung (Taschentiefen, Attachmentverlust, Furkationsbefall, Zahnlockerung)", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_atg", system: "BEMA", code: "ATG", title: "Aufstellung Parodontal-Therapieplan", description: "Erstellung und Antrag des Parodontaltherapieplans zur Genehmigung durch die Krankenkasse", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_mhu", system: "BEMA", code: "MHU", title: "Mundhygieneunterweisung", description: "Unterweisung in Mundhygienetechniken im Rahmen der PAR-Behandlung", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_aita", system: "BEMA", code: "AITa", title: "Antiinfektiöse Therapie, geschlossenes Verfahren", description: "Nichtchirurgische subgingivale Reinigung (Scaling/Wurzelglättung) unter Lokalanästhesie", category: "Parodontologie", toothRelevant: true, gueltigAb: "2021-07-01" },
  { key: "par_aitb", system: "BEMA", code: "AITb", title: "Antiinfektiöse Therapie, offenes Verfahren", description: "Chirurgisches Vorgehen bei der antiinfektiösen Therapie an Zähnen mit fortbestehenden tiefen Resttaschen", category: "Parodontologie", toothRelevant: true, gueltigAb: "2021-07-01" },
  { key: "par_cpta", system: "BEMA", code: "CPTa", title: "Chirurgische Parodontitistherapie, resektiv", description: "Resektives chirurgisches Verfahren bei fortbestehenden Resttaschen nach antiinfektiöser Therapie", category: "Parodontologie", toothRelevant: true, gueltigAb: "2021-07-01" },
  { key: "par_cptb", system: "BEMA", code: "CPTb", title: "Chirurgische Parodontitistherapie, regenerativ", description: "Regeneratives chirurgisches Verfahren bei fortbestehenden Resttaschen nach antiinfektiöser Therapie", category: "Parodontologie", toothRelevant: true, gueltigAb: "2021-07-01" },
  { key: "par_upta", system: "BEMA", code: "UPTa", title: "Unterstützende Parodontitistherapie – Stufe a", description: "Erste Nachsorgesitzung im Rahmen der unterstützenden Parodontitistherapie", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_uptb", system: "BEMA", code: "UPTb", title: "Unterstützende Parodontitistherapie – Stufe b", description: "Nachsorgesitzung im Rahmen der unterstützenden Parodontitistherapie", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_uptc", system: "BEMA", code: "UPTc", title: "Unterstützende Parodontitistherapie – Stufe c", description: "Nachsorgesitzung im Rahmen der unterstützenden Parodontitistherapie", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },
  { key: "par_uptd", system: "BEMA", code: "UPTd", title: "Unterstützende Parodontitistherapie – Stufe d", description: "Abschließende Nachsorgestufe im Rahmen der zweijährigen unterstützenden Parodontitistherapie", category: "Parodontologie", toothRelevant: false, gueltigAb: "2021-07-01" },

  // Kassen-Gegenstücke (BEMA) mit gleichem Titel wie die Privatposition: Im Abschluss wird je nach
  // Kassenart des Patienten nur die passende vorbelegt (ServiceChecklistForm, defaultPerformedFor).
  { key: "psi_gkv", system: "BEMA", code: "04", title: "Parodontaler Screening Index (PSI)", description: "Erhebung des PSI-Code (einmal in zwei Jahren)", category: "Diagnostik & Beratung", toothRelevant: false },
  { key: "vitalitaet_gkv", system: "BEMA", code: "8 (ViPr)", title: "Vitalitätsprüfung", description: "Sensibilitäts-/Vitalitätsprüfung eines oder mehrerer Zähne", category: "Diagnostik & Beratung", toothRelevant: true },
  { key: "rx_einzelzahn_gkv", system: "BEMA", code: "Ä925a", title: "Röntgen Einzelzahnaufnahme", description: "Röntgendiagnostik der Zähne, bis zu zwei Aufnahmen", category: "Röntgen", toothRelevant: true },
  { key: "rx_uebersicht_gkv", system: "BEMA", code: "Ä935d", title: "Röntgen Übersichtsaufnahme (OPG)", description: "Orthopantomogramm / Panoramaschichtaufnahme", category: "Röntgen", toothRelevant: false },
  { key: "anaesthesie_infiltration_gkv", system: "BEMA", code: "40 (I)", title: "Infiltrationsanästhesie", description: "Lokale Infiltrationsanästhesie", category: "Anästhesie", toothRelevant: true },
  { key: "anaesthesie_leitung_gkv", system: "BEMA", code: "41a (L1)", title: "Leitungsanästhesie", description: "Leitungsanästhesie", category: "Anästhesie", toothRelevant: true },
  { key: "zst_gkv", system: "BEMA", code: "107 (Zst)", title: "Entfernung harter Zahnbeläge", description: "Entfernen harter Zahnbeläge, einmal im Kalenderjahr", category: "Prophylaxe", toothRelevant: false },
  { key: "fuellung_einflaechig_gkv", system: "BEMA", code: "13a (F1)", title: "Füllung, einflächig", description: "Füllung, einflächig (Kassenleistung)", category: "Füllungstherapie", toothRelevant: true, ausschlussMit: ["fuellung_mehrflaechig_gkv"] },
  { key: "fuellung_mehrflaechig_gkv", system: "BEMA", code: "13b–d (F2–F4)", title: "Füllung, mehrflächig", description: "Füllung, zwei-, drei- oder mehrflächig (Kassenleistung)", category: "Füllungstherapie", toothRelevant: true, ausschlussMit: ["fuellung_einflaechig_gkv"] },
  { key: "trepanation_gkv", system: "BEMA", code: "31 (Trep1)", title: "Trepanation", description: "Eröffnung der Pulpakammer als Erstmaßnahme", category: "Endodontie", toothRelevant: true },
  { key: "wurzelkanal_aufbereitung_gkv", system: "BEMA", code: "32 (WK)", title: "Wurzelkanalaufbereitung", description: "Aufbereitung eines Wurzelkanals", category: "Endodontie", toothRelevant: true },
  { key: "wurzelkanal_fuellung_gkv", system: "BEMA", code: "35 (WF)", title: "Wurzelkanalfüllung", description: "Wurzelkanalfüllung je Kanal", category: "Endodontie", toothRelevant: true },
  { key: "extraktion_gkv", system: "BEMA", code: "43–45 (X1–X3)", title: "Zahnextraktion", description: "Entfernung eines Zahnes", category: "Chirurgie", toothRelevant: true },

  { key: "dvt", system: "GOAE", code: "–", title: "Digitale Volumentomographie (DVT)", description: "3D-Röntgendiagnostik zur Planung komplexer prothetischer/chirurgischer Versorgungen; in der Zahnarztpraxis üblicherweise nach GOÄ abgerechnet", category: "Röntgen", toothRelevant: false },
  { key: "praeparation", system: "GOZ", code: "–", title: "Zahnpräparation", description: "Präparation eines Zahnes zur Aufnahme von Zahnersatz", category: "Prothetik", toothRelevant: true },
  { key: "abformung", system: "GOZ", code: "–", title: "Abformung", description: "Abformung eines oder beider Kiefer", category: "Prothetik", toothRelevant: false },
  { key: "bel_labor", system: "BEL_II", code: "–", title: "Zahntechnische Laborleistung", description: "Laborseitige Anfertigung von Zahnersatz (z. B. Kronen-/Brückengerüst) gemäß BEL II, i. d. R. Festbetrag statt Punktzahl/Faktor", category: "Prothetik", toothRelevant: true },
  { key: "provisorium", system: "GOZ", code: "–", title: "Provisorische Versorgung", description: "Eingliederung eines Provisoriums bis zur definitiven Versorgung", category: "Prothetik", toothRelevant: true },
  { key: "eingliederung_ersatz", system: "GOZ", code: "–", title: "Eingliederung Zahnersatz", description: "Eingliederung von Zahnersatz/Zahnkrone", category: "Prothetik", toothRelevant: true },

  { key: "ip_mundhygienestatus", system: "BEMA", code: "–", title: "Erhebung Mundhygienestatus", description: "Erhebung des Mundhygienestatus (Plaque-/Gingivitis-Index) bei Kindern/Jugendlichen", category: "Individualprophylaxe", toothRelevant: false },
  { key: "ip_ernaehrungsberatung", system: "BEMA", code: "–", title: "Ernährungsberatung", description: "Aufklärung über zahngesunde Ernährung", category: "Individualprophylaxe", toothRelevant: false },
  { key: "fissuren_versiegelung", system: "BEMA", code: "–", title: "Fissurenversiegelung", description: "Versiegelung kariesfreier Fissuren der bleibenden Molaren", category: "Individualprophylaxe", toothRelevant: true },

  { key: "notfall_diagnostik", system: "SONSTIGES", code: "–", title: "Schmerzdiagnostik", description: "Diagnostik zur Lokalisation der akuten Schmerzursache", category: "Notfallbehandlung", toothRelevant: true },
  { key: "notfall_akutmassnahme", system: "SONSTIGES", code: "–", title: "Akutmaßnahme zur Schmerzausschaltung", description: "Sofortmaßnahme zur Beseitigung akuter Schmerzen (z. B. Trepanation, Entlastung)", category: "Notfallbehandlung", toothRelevant: true },
  { key: "notfall_medikation", system: "SONSTIGES", code: "–", title: "Medikamentöse Versorgung", description: "Verordnung/Abgabe von Schmerz- oder Notfallmedikation", category: "Notfallbehandlung", toothRelevant: false },

  { key: "schiene_bissregistrierung", system: "GOZ", code: "–", title: "Bissregistrierung", description: "Registrierung der Kieferrelation", category: "Schienentherapie", toothRelevant: false },
  { key: "schiene_eingliederung", system: "GOZ", code: "–", title: "Eingliederung Aufbissschiene", description: "Einsetzen und Anpassen der Aufbissschiene", category: "Schienentherapie", toothRelevant: false },
  { key: "schiene_einschleifen", system: "SONSTIGES", code: "–", title: "Einschleifen/Kontrolle Schiene", description: "Okklusale Anpassung und Kontrolle der Schiene", category: "Schienentherapie", toothRelevant: false },
];

type SeedTemplateItem = { key: string; dependsOn?: string[] };

type SeedTemplate = {
  name: string;
  description: string;
  items: SeedTemplateItem[];
};

function it(key: string, dependsOn?: string[]): SeedTemplateItem {
  return { key, dependsOn };
}

/** Privatposition → Kassenposition mit gleichem Titel. Vorlagen bekommen beide; vorbelegt wird nach Kassenart. */
const KASSE_ZU: Record<string, string> = {
  unters_privat: "unters_gkv",
  beratung_privat: "beratung_gkv",
  psi: "psi_gkv",
  vitalitaet: "vitalitaet_gkv",
  rx_einzelzahn: "rx_einzelzahn_gkv",
  rx_uebersicht: "rx_uebersicht_gkv",
  anaesthesie_infiltration: "anaesthesie_infiltration_gkv",
  anaesthesie_leitung: "anaesthesie_leitung_gkv",
  zst_entfernung: "zst_gkv",
  fuellung_einflaechig: "fuellung_einflaechig_gkv",
  fuellung_mehrflaechig: "fuellung_mehrflaechig_gkv",
  trepanation: "trepanation_gkv",
  wurzelkanal_aufbereitung: "wurzelkanal_aufbereitung_gkv",
  wurzelkanal_fuellung: "wurzelkanal_fuellung_gkv",
  extraktion: "extraktion_gkv",
};

/** Ergänzt jede Privatposition einer Vorlage um ihr Kassen-Gegenstück; Abhängigkeiten gelten für beide (ODER). */
function mitKassenpositionen(items: SeedTemplateItem[]): SeedTemplateItem[] {
  const mitPaar = (keys?: string[]) => keys && [...new Set(keys.flatMap((k) => (KASSE_ZU[k] ? [k, KASSE_ZU[k]] : [k])))];
  const out: SeedTemplateItem[] = [];
  for (const x of items) {
    if (out.some((o) => o.key === x.key)) continue;
    out.push({ key: x.key, dependsOn: mitPaar(x.dependsOn) });
    const k = KASSE_ZU[x.key];
    if (k && !out.some((o) => o.key === k)) {
      const eigen = items.find((y) => y.key === k);
      out.push({ key: k, dependsOn: mitPaar(eigen?.dependsOn ?? x.dependsOn) });
    }
  }
  return out;
}

const TEMPLATES: SeedTemplate[] = [
  {
    name: "Kontrolluntersuchung",
    description: "Standard-Recall-/Kontrolltermin",
    items: [it("unters_privat"), it("unters_gkv"), it("psi"), it("rx_einzelzahn"), it("beratung_privat"), it("aufklaerung_dokumentiert")],
  },
  {
    name: "Erstuntersuchung / Neupatient",
    description: "Erster Termin bei neuem Patienten",
    items: [it("anamnese"), it("unters_privat"), it("unters_gkv"), it("rx_uebersicht"), it("rx_befundung"), it("psi"), it("beratung_privat"), it("aufklaerung_dokumentiert")],
  },
  {
    name: "Füllungstherapie",
    description: "Kariesbehandlung mit Füllung",
    items: [
      it("unters_privat"),
      it("aufklaerung_dokumentiert"),
      it("anaesthesie_infiltration"),
      it("kariesexkavation"),
      it("unterfuellung", ["kariesexkavation"]),
      it("fuellung_einflaechig", ["kariesexkavation"]),
      it("fuellung_mehrflaechig", ["kariesexkavation"]),
      it("fuellung_politur", ["fuellung_einflaechig", "fuellung_mehrflaechig"]),
    ],
  },
  {
    name: "Professionelle Zahnreinigung (PZR)",
    description: "Prophylaxesitzung",
    items: [it("psi"), it("zst_entfernung"), it("pzr"), it("fluoridierung"), it("mundhygiene_instruktion")],
  },
  {
    name: "Chirurgischer Eingriff (Extraktion)",
    description: "Zahnentfernung",
    items: [
      it("unters_privat"),
      it("aufklaerung_dokumentiert"),
      it("anaesthesie_leitung"),
      it("anaesthesie_infiltration"),
      it("extraktion"),
      it("wundversorgung", ["extraktion"]),
      it("postop_anweisung", ["extraktion"]),
    ],
  },
  {
    name: "Systematische Parodontitisbehandlung (PAR)",
    description: "Vollständiger PAR-Pfad nach der seit 2021 gültigen Systematik – von der Diagnostik über die antiinfektiöse und ggf. chirurgische Therapie bis zur zweijährigen Nachsorge (UPT)",
    items: [
      it("par_beva"),
      it("par_bevb", ["par_beva"]),
      it("par_atg", ["par_bevb"]),
      it("par_mhu", ["par_atg"]),
      it("par_aita", ["par_mhu"]),
      it("par_aitb", ["par_aita"]),
      it("par_cpta", ["par_aitb"]),
      it("par_cptb", ["par_aitb"]),
      it("par_upta", ["par_aita", "par_cpta", "par_cptb"]),
      it("par_uptb", ["par_upta"]),
      it("par_uptc", ["par_uptb"]),
      it("par_uptd", ["par_uptc"]),
    ],
  },
  {
    name: "Endodontische Behandlung (Wurzelkanal)",
    description: "Wurzelkanalbehandlung — vier Schritte, jeder baut auf dem vorherigen auf",
    items: [
      it("unters_privat"),
      it("aufklaerung_dokumentiert"),
      it("rx_einzelzahn"),
      it("anaesthesie_leitung"),
      it("vitalitaet"),
      it("trepanation", ["vitalitaet"]),
      it("wurzelkanal_aufbereitung", ["trepanation"]),
      it("wurzelkanal_fuellung", ["wurzelkanal_aufbereitung"]),
    ],
  },
  {
    name: "Prothetische Versorgung",
    description: "Zahnersatz-Termin",
    items: [
      it("unters_privat"),
      it("aufklaerung_dokumentiert"),
      it("dvt"),
      it("praeparation"),
      it("abformung", ["praeparation"]),
      it("bel_labor", ["abformung"]),
      it("provisorium", ["praeparation"]),
      it("eingliederung_ersatz", ["bel_labor"]),
    ],
  },
  {
    name: "Individualprophylaxe (Kind/Jugendliche)",
    description: "IP-Sitzung für Kinder und Jugendliche",
    items: [it("aufklaerung_dokumentiert"), it("ip_mundhygienestatus"), it("ip_ernaehrungsberatung"), it("mundhygiene_instruktion"), it("fluoridierung"), it("fissuren_versiegelung")],
  },
  {
    name: "Notfallbehandlung / Schmerzbehandlung",
    description: "Akuttermin außerhalb der planmäßigen Behandlung",
    items: [
      it("unters_privat"),
      it("unters_gkv"),
      it("notfall_diagnostik"),
      it("anaesthesie_infiltration"),
      it("notfall_akutmassnahme", ["notfall_diagnostik"]),
      it("notfall_medikation"),
      it("aufklaerung_dokumentiert"),
    ],
  },
  {
    name: "Schienentherapie (Aufbissschiene)",
    description: "Anfertigung und Eingliederung einer Aufbissschiene",
    items: [
      it("unters_privat"),
      it("aufklaerung_dokumentiert"),
      it("abformung"),
      it("schiene_bissregistrierung", ["abformung"]),
      it("schiene_eingliederung", ["schiene_bissregistrierung"]),
      it("schiene_einschleifen", ["schiene_eingliederung"]),
    ],
  },
];

/**
 * Rein informatives Nachschlagewerk zu gängigen Selbstzahlerleistungen
 * (IGEL), NICHT patientenbezogen und ohne jede Vorschlags-/
 * Empfehlungslogik - siehe Kommentar am LexikonEntry-Modell. Die Einträge
 * beschreiben allgemein bekannte, gängige Abgrenzungen zwischen GKV- und
 * Selbstzahlerleistungen, bewusst vorsichtig formuliert ("i. d. R.", "je
 * nach Kasse"), da die genaue Ausgestaltung je Kasse/Bundesland variiert
 * und regelmäßig gegen den aktuellen Leistungskatalog geprüft werden muss.
 */
const LEXIKON: { category: string; title: string; gkvEinordnung: string; selbstzahlerOption: string }[] = [
  {
    category: "Prophylaxe",
    title: "Professionelle Zahnreinigung (PZR)",
    gkvEinordnung:
      "Bei den meisten gesetzlichen Kassen keine reguläre Regelleistung für Erwachsene; manche Kassen bezuschussen sie anteilig als freiwillige Satzungsleistung - abhängig von der jeweiligen Kasse.",
    selbstzahlerOption:
      "Regelmäßige PZR (häufig 1-4x jährlich je nach individuellem Kariesrisiko/Parodontalstatus) wird oft als Selbstzahlerleistung angeboten; die sinnvolle Frequenz ist eine fachliche Einschätzung im Einzelfall.",
  },
  {
    category: "Prophylaxe",
    title: "Fluoridierung bei Erwachsenen",
    gkvEinordnung:
      "Bei Kindern/Jugendlichen im Rahmen der Individualprophylaxe (IP) Kassenleistung; bei Erwachsenen i. d. R. keine reguläre GKV-Leistung.",
    selbstzahlerOption:
      "Kann bei erhöhter Kariesanfälligkeit oder freiliegenden Zahnhälsen im Einzelfall erwogen werden.",
  },
  {
    category: "Füllungstherapie",
    title: "Zahnfarbene Füllung im Seitenzahnbereich",
    gkvEinordnung:
      "Im Seitenzahnbereich übernimmt die GKV i. d. R. die Kosten einer einfachen Füllung vollständig; eine zahnfarbene Kompositfüllung ist dort meist eine Mehrkostenvereinbarung - die Kasse zahlt den Betrag der einfachen Ausführung, die Differenz trägt der Patient.",
    selbstzahlerOption:
      "Zahnfarbene Versorgung aus ästhetischen oder werkstoffkundlichen Gründen.",
  },
  {
    category: "Prothetik",
    title: "Zahnersatz (Kronen/Brücken/Prothesen)",
    gkvEinordnung:
      "Die GKV zahlt einen Festzuschuss zur sogenannten Regelversorgung (i. d. R. 60-75 % je nach Bonusheft-Nachweis); die Regelversorgung selbst ist meist einfach ausgeführt.",
    selbstzahlerOption:
      "Höherwertige/ästhetischere Versorgungen (z. B. Vollkeramik) über die Regelversorgung hinaus - der Festzuschuss wird angerechnet, die Mehrkosten trägt der Patient.",
  },
  {
    category: "Prothetik",
    title: "Zahnimplantate",
    gkvEinordnung:
      "Implantate sind nur in eng begrenzten medizinischen Ausnahmefällen eine reguläre GKV-Leistung; ansonsten wird lediglich der Festzuschuss zur Regelversorgung angerechnet.",
    selbstzahlerOption:
      "Implantatgetragener Zahnersatz als Alternative zu herausnehmbarem Zahnersatz - Indikation und Eignung erfordern fachliche Diagnostik im Einzelfall.",
  },
  {
    category: "Parodontologie",
    title: "Unterstützende Parodontitistherapie (UPT) nach Abschluss der Regelbehandlung",
    gkvEinordnung:
      "Die UPT ist seit der PAR-Reform 2021 für einen begrenzten Zeitraum nach der systematischen Behandlung GKV-Leistung; danach endet der reguläre Leistungsanspruch.",
    selbstzahlerOption:
      "Fortführung der unterstützenden Nachsorge über den GKV-Zeitraum hinaus, wenn parodontal weiterhin erhöhter Betreuungsbedarf besteht.",
  },
  {
    category: "Schienentherapie",
    title: "Aufbissschiene bei Bruxismus/CMD",
    gkvEinordnung:
      "Eine einfache Knirscherschiene ist i. d. R. GKV-Leistung; aufwendigere, funktionsanalytisch angepasste Schienen sind meist Selbstzahlerleistung.",
    selbstzahlerOption:
      "Individuell nach Funktionsanalyse angepasste Schiene, wenn die einfache Ausführung nicht ausreichend Beschwerdelinderung bringt.",
  },
  {
    category: "Diagnostik",
    title: "Digitale Volumentomographie (DVT)",
    gkvEinordnung:
      "DVT ist für die meisten zahnärztlichen Fragestellungen keine reguläre GKV-Leistung, da eine zweidimensionale Röntgenaufnahme meist als ausreichend gilt.",
    selbstzahlerOption:
      "Dreidimensionale Diagnostik z. B. vor Implantationen oder bei komplexen anatomischen Fragestellungen.",
  },
  {
    category: "Ästhetik",
    title: "Bleaching / Zahnaufhellung",
    gkvEinordnung: "Rein kosmetische Zahnaufhellung ist keine GKV-Leistung.",
    selbstzahlerOption:
      "Aufhellung auf Patientenwunsch aus ästhetischen Gründen, unabhängig vom zahnmedizinischen Befund.",
  },
  {
    category: "Individualprophylaxe",
    title: "Fissurenversiegelung bei Erwachsenen",
    gkvEinordnung:
      "Fissurenversiegelung der bleibenden Molaren ist bis zum 18. Lebensjahr GKV-Leistung; bei Erwachsenen i. d. R. nicht mehr.",
    selbstzahlerOption: "Versiegelung tiefer Fissuren bei Erwachsenen mit erhöhtem Kariesrisiko.",
  },
];

async function main() {
  console.log("Seede globalen Leistungskatalog…");

  // Ziffern früher ohne Angabe bzw. falsch: im globalen Katalog umbenennen, bevor nach Ziffer gesucht wird.
  for (const u of ZIFFER_KORREKTUR) {
    const alt = await prisma.serviceCatalogItem.findFirst({ where: { practiceId: null, system: u.system, code: u.von, title: u.title } });
    const neu = await prisma.serviceCatalogItem.findFirst({ where: { practiceId: null, system: u.system, code: u.nach, title: u.title } });
    if (alt && !neu) await prisma.serviceCatalogItem.update({ where: { id: alt.id }, data: { code: u.nach } });
  }

  const itemIdByKey = new Map<string, string>();
  for (const item of CATALOG) {
    const faktorFields =
      item.system === "GOZ" || item.system === "GOAE" ? STANDARD_FAKTOR : {};
    const gueltigAb = item.gueltigAb ? new Date(item.gueltigAb) : null;
    const frequenzlimitAnzahl = item.frequenzlimitAnzahl ?? null;
    const frequenzlimitZeitraumTage = item.frequenzlimitZeitraumTage ?? null;

    const existing = await prisma.serviceCatalogItem.findFirst({
      where: { practiceId: null, system: item.system, code: item.code, title: item.title, OR: [{ fach: "zahn" }, { fach: null }] },
    });
    const record = existing
      ? await prisma.serviceCatalogItem.update({
          where: { id: existing.id },
          data: {
            fach: "zahn",
            description: item.description,
            category: item.category,
            toothRelevant: item.toothRelevant,
            gueltigAb,
            frequenzlimitAnzahl,
            frequenzlimitZeitraumTage,
            ...faktorFields,
          },
        })
      : await prisma.serviceCatalogItem.create({
          data: {
            practiceId: null,
            fach: "zahn",
            system: item.system,
            code: item.code,
            title: item.title,
            description: item.description,
            category: item.category,
            toothRelevant: item.toothRelevant,
            gueltigAb,
            frequenzlimitAnzahl,
            frequenzlimitZeitraumTage,
            ...faktorFields,
          },
        });
    itemIdByKey.set(item.key, record.id);
  }

  // Zweiter Durchlauf: ausschlussMit auflösen, nachdem alle Positionen
  // existieren (referenzierte Keys können später im Katalog stehen).
  for (const item of CATALOG) {
    if (!item.ausschlussMit?.length) continue;
    const selfId = itemIdByKey.get(item.key);
    if (!selfId) continue;
    const excludedIds = item.ausschlussMit
      .map((key) => itemIdByKey.get(key))
      .filter((v): v is string => !!v);
    await prisma.serviceCatalogItem.update({
      where: { id: selfId },
      data: { ausschlussMit: serializeDependsOn(excludedIds) },
    });
  }

  console.log(`Katalog: ${itemIdByKey.size} Positionen.`);
  console.log("Seede Sitzungstyp-Vorlagen…");

  for (const tpl of TEMPLATES) {
    let template = await prisma.serviceTemplate.findFirst({
      where: { practiceId: null, name: tpl.name, OR: [{ fach: "zahn" }, { fach: null }] },
    });
    if (!template) {
      template = await prisma.serviceTemplate.create({
        data: { practiceId: null, fach: "zahn", name: tpl.name, description: tpl.description },
      });
    } else {
      await prisma.serviceTemplate.update({ where: { id: template.id }, data: { fach: "zahn", description: tpl.description } });
    }

    const tplItems = mitKassenpositionen(tpl.items);
    for (let i = 0; i < tplItems.length; i++) {
      const seedItem = tplItems[i];
      const catalogItemId = itemIdByKey.get(seedItem.key);
      if (!catalogItemId) continue;
      const dependsOnIds = (seedItem.dependsOn ?? [])
        .map((key) => itemIdByKey.get(key))
        .filter((v): v is string => !!v);

      await prisma.serviceTemplateItem.upsert({
        where: { templateId_catalogItemId: { templateId: template.id, catalogItemId } },
        update: { position: i, dependsOn: serializeDependsOn(dependsOnIds) },
        create: { templateId: template.id, catalogItemId, position: i, dependsOn: serializeDependsOn(dependsOnIds) },
      });
    }
  }

  console.log(`Vorlagen: ${TEMPLATES.length}.`);

  // Sitzungstypen der übrigen Fächer aus lib/fachprofile.ts
  let fachVorlagen = 0;
  for (const [fach, profil] of Object.entries(FACHPROFILE)) {
    for (const st of profil.sitzungstypen) {
      let template = await prisma.serviceTemplate.findFirst({ where: { practiceId: null, fach, name: st.name } });
      template = template
        ? await prisma.serviceTemplate.update({ where: { id: template.id }, data: { description: st.description } })
        : await prisma.serviceTemplate.create({ data: { practiceId: null, fach, name: st.name, description: st.description } });
      for (let i = 0; i < st.leistungen.length; i++) {
        const l = st.leistungen[i];
        const faktor = l.system === "GOAE" ? STANDARD_FAKTOR : {};
        const existing = await prisma.serviceCatalogItem.findFirst({ where: { practiceId: null, fach, system: l.system, code: l.code, title: l.title } });
        const item = existing
          ? await prisma.serviceCatalogItem.update({ where: { id: existing.id }, data: { category: l.category, toothRelevant: !!l.region, ...faktor } })
          : await prisma.serviceCatalogItem.create({ data: { practiceId: null, fach, system: l.system, code: l.code, title: l.title, category: l.category, toothRelevant: !!l.region, ...faktor } });
        await prisma.serviceTemplateItem.upsert({
          where: { templateId_catalogItemId: { templateId: template.id, catalogItemId: item.id } },
          update: { position: i },
          create: { templateId: template.id, catalogItemId: item.id, position: i },
        });
      }
      fachVorlagen++;
    }
  }
  console.log(`Fach-Vorlagen: ${fachVorlagen}.`);

  console.log("Seede Leistungslexikon…");
  for (let i = 0; i < LEXIKON.length; i++) {
    const entry = LEXIKON[i];
    const existing = await prisma.lexikonEntry.findFirst({ where: { title: entry.title } });
    if (existing) {
      await prisma.lexikonEntry.update({
        where: { id: existing.id },
        data: { ...entry, position: i },
      });
    } else {
      await prisma.lexikonEntry.create({ data: { ...entry, position: i } });
    }
  }
  console.log(`Lexikon: ${LEXIKON.length} Einträge.`);

  // Amtliche Leistungsverzeichnisse (GOÄ, UV-GOÄ, GOZ, BEMA, Heilmittel, Hebammen, HKP, SGB XI,
  // Hilfsmittelverzeichnis, Apotheke, Heilpraktiker) und EBM aus der KBV-Stammdatei.
  // Die KBV-Lizenzvereinbarung Stammdateien hat der Betreiber am 07.11.2026 gelesen und akzeptiert.
  // Abschalten (z. B. bei Kündigung der Lizenz): KBV_STAMMDATEN_LIZENZ=abgelehnt.
  const ebm = (process.env.KBV_STAMMDATEN_LIZENZ ?? "akzeptiert").trim().toLowerCase() !== "abgelehnt";
  try {
    const n = await importiereAmtlich(prisma, { ebm });
    console.log(`Amtliche Leistungen: ${Object.entries(n).map(([k, v]) => `${k} ${v}`).join(", ")}${ebm ? "" : " (EBM abgeschaltet: KBV_STAMMDATEN_LIZENZ=abgelehnt)"}.`);
  } catch (e) {
    // Ein Fehler beim EBM-Download darf den Build nicht stoppen; die übrigen Verzeichnisse sind dann schon da.
    console.error("Amtliche Leistungen: Import unvollständig:", e instanceof Error ? e.message : e);
  }

  console.log("Fertig.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
