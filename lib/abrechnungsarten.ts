// Alle Abrechnungsarten, die in deutschen Praxen vorkommen, mit Fachsprache,
// Rechenweg, Fristen und den Stellen, an denen Praxen erfahrungsgemäß Geld
// liegen lassen. Inhalt ist Fachwissen zum Nachschlagen, keine Rechtsberatung;
// verbindlich sind die jeweiligen Gebührenordnungen und Verträge.

import type { Gebuehrenwerk } from "@/lib/gebuehren";

export type ArtId = "gkv_ebm" | "gkv_bema" | "zahnersatz" | "pkv_goae" | "pkv_goz" | "beihilfe" | "igel" | "mehrkosten_zahn" | "bg" | "heilmittel" | "hebamme" | "selbstzahler_therapie" | "pflege" | "hilfsmittel";

export interface Abrechnungsart {
  id: ArtId;
  name: string;
  werk?: Gebuehrenwerk;
  zahler: string;
  /** Wie der Betrag entsteht, in einem Satz. */
  rechenweg: string;
  /** Fristen und Formvorschriften. */
  regeln: string[];
  /** Fachbegriffe, die in diesem Bereich jeder kennen muss. */
  begriffe: [string, string][];
  /** Wo Praxen Geld verlieren und was Sorrida dagegen tut. */
  geldhebel: { problem: string; massnahme: string; inSorrida?: string }[];
}

export const ARTEN: Record<ArtId, Abrechnungsart> = {
  gkv_ebm: {
    id: "gkv_ebm",
    name: "Gesetzlich versichert (EBM)",
    werk: "EBM",
    zahler: "Krankenkasse über die Kassenärztliche Vereinigung (KV)",
    rechenweg: "Punkte je Gebührenordnungsposition (GOP) × Orientierungswert (2026: 12,7404 Cent, regional abweichend möglich); Vergütung innerhalb des Regelleistungsvolumens (RLV/QZV), extrabudgetäre Leistungen voll.",
    regeln: ["Quartalsabrechnung an die KV, Abgabe bis meist zum 10.–15. Tag nach Quartalsende", "Versichertenkarte je Quartal einlesen", "Ausschlüsse und Höchstwerte im EBM beachten"],
    begriffe: [["GOP", "Gebührenordnungsposition im EBM"], ["RLV/QZV", "Regelleistungs- und qualifikationsgebundenes Zusatzvolumen (Budget)"], ["extrabudgetär", "außerhalb des Budgets voll vergütet, z. B. Vorsorge, Impfungen"], ["Versichertenpauschale", "Grundpauschale je Patient und Quartal"], ["Chronikerpauschale", "Zuschlag für kontinuierlich behandelte chronisch Kranke"]],
    geldhebel: [
      { problem: "Extrabudgetäre Vorsorge (Check-up, Hautkrebs-Screening, Impfungen) wird nicht angeboten", massnahme: "Fällige Vorsorge je Patient anzeigen und erinnern", inSorrida: "Vorsorge fällig, Erinnerungen" },
      { problem: "Chroniker- und Zuschlagspositionen vergessen", massnahme: "Diagnosen mit ICD-10 in der Akte führen, Hinweise zur Abrechnung", inSorrida: "Befundmodell mit Abrechnungshinweisen" },
      { problem: "Terminausfälle senken die Fallzahl", massnahme: "Bestätigung und Erinnerung vor dem Termin", inSorrida: "Termine, Erinnerungen per E-Mail" },
    ],
  },
  gkv_bema: {
    id: "gkv_bema",
    name: "Gesetzlich versichert, Zahnarzt (BEMA)",
    werk: "BEMA",
    zahler: "Krankenkasse über die Kassenzahnärztliche Vereinigung (KZV)",
    rechenweg: "Bewertungszahl je BEMA-Position × Punktwert der jeweiligen KZV und Kassenart.",
    regeln: ["Konservierend-chirurgisch quartalsweise, Kieferbruch/KB/PAR/ZE nach Genehmigung bzw. Plan", "Mehrkostenvereinbarung bei Füllungen (§ 28 Abs. 2 SGB V) vor der Behandlung schriftlich"],
    begriffe: [["KCH", "konservierend-chirurgische Leistungen"], ["PAR", "Parodontitis-Behandlung nach PAR-Richtlinie"], ["HKP", "Heil- und Kostenplan für Zahnersatz"], ["Punktwert", "je KZV und Kassenart verhandelt"]],
    geldhebel: [
      { problem: "Mehrkosten-Füllungen ohne schriftliche Vereinbarung", massnahme: "Vereinbarung vor Behandlung digital unterschreiben lassen", inSorrida: "Behandlungsweg mit digitalem Einverständnis" },
      { problem: "PAR-Strecke nicht vollständig (UPT-Termine fehlen)", massnahme: "Recall für unterstützende Parodontitistherapie", inSorrida: "Vorsorge fällig" },
    ],
  },
  zahnersatz: {
    id: "zahnersatz",
    name: "Zahnersatz mit Festzuschuss",
    werk: "BEMA",
    zahler: "Kasse zahlt befundbezogenen Festzuschuss (60/70/75 % je Bonus, Härtefall 100 %), Rest der Patient",
    rechenweg: "Festzuschuss nach Befundklasse; Regelversorgung über BEMA, gleichartige Versorgung als Mischung BEMA/GOZ, andersartige komplett GOZ.",
    regeln: ["HKP vor Behandlung von der Kasse genehmigen lassen (Gültigkeit 6 Monate)", "Bonusheft prüfen (5/10 Jahre lückenlos)"],
    begriffe: [["Regelversorgung", "Standardlösung, die der Festzuschuss abbildet"], ["gleichartig", "Regelversorgung plus Zusatzleistungen, Mehrkosten nach GOZ"], ["andersartig", "andere Versorgungsform, z. B. Implantat statt Brücke"], ["Härtefall", "doppelter Festzuschuss bei geringem Einkommen"]],
    geldhebel: [
      { problem: "Patienten lehnen ab, weil der Eigenanteil unklar ist", massnahme: "Eigenanteil je Option verständlich zeigen, Raten anbieten", inSorrida: "Behandlungsweg, Kassen-Sockel, Ratenwunsch" },
      { problem: "Bonusheft nicht geprüft, Zuschuss zu niedrig angesetzt", massnahme: "Bonus abfragen und im Vorschlag berücksichtigen", inSorrida: "Vorschlag mit Bonusstufe" },
    ],
  },
  pkv_goae: {
    id: "pkv_goae",
    name: "Privat versichert (GOÄ)",
    werk: "GOAE",
    zahler: "Patient (Rechnung), Erstattung durch private Versicherung",
    rechenweg: "Punkte × 5,82873 Cent × Steigerungsfaktor; Spannen 1,0–3,5 (persönlich), 1,0–2,5 (technisch), 1,0–1,3 (Labor).",
    regeln: ["Rechnung nach § 12 GOÄ: Datum, Nummer, Bezeichnung, Betrag, Faktor, Diagnose", "Begründung über Schwellenwert patientenbezogen", "Verjährung 3 Jahre zum Jahresende (§ 195 BGB), fällig ab Rechnungsstellung"],
    begriffe: [["Schwellenwert", "2,3 / 1,8 / 1,15 – darüber Begründungspflicht"], ["Analogabrechnung", "§ 6 Abs. 2 GOÄ: nicht aufgeführte Leistung nach gleichwertiger Position"], ["Zielleistungsprinzip", "Teilschritte einer Zielleistung nicht gesondert berechnen"], ["Abdingung", "abweichende Vereinbarung nach § 2 GOÄ"]],
    geldhebel: [
      { problem: "Pauschal 2,3-fach, obwohl Fall aufwendig war", massnahme: "Faktor nach Aufwand wählen, Begründung patientenbezogen", inSorrida: "Gebührenrechner mit Begründungshilfe" },
      { problem: "Rechnungen gehen spät raus, Zahlungen dauern", massnahme: "Rechnung am Behandlungstag, Zahlung per GiroCode, Mahnstufen", inSorrida: "Rechnungen, Portal, Bankabgleich" },
    ],
  },
  pkv_goz: {
    id: "pkv_goz",
    name: "Privat versichert, Zahnarzt (GOZ)",
    werk: "GOZ",
    zahler: "Patient, Erstattung durch private Versicherung",
    rechenweg: "Punkte × 5,62421 Cent × Faktor (1,0–3,5, Schwellenwert 2,3); Material und Labor gesondert.",
    regeln: ["Rechnung nach § 10 GOZ mit Zahnangabe", "Begründung über 2,3 patientenbezogen", "Heil- und Kostenplan bei Kosten über 1.000 € empfehlenswert"],
    begriffe: [["§ 6 Abs. 1 GOZ", "Analogberechnung nicht beschriebener Leistungen"], ["Laborkosten", "nach BEB oder Laborrechnung"], ["§ 2 Abs. 3 GOZ", "Verlangensleistungen auf Wunsch, schriftlich"]],
    geldhebel: [
      { problem: "Analogleistungen werden nicht berechnet", massnahme: "Eigene Leistungen im Katalog mit Analogposition hinterlegen", inSorrida: "Katalog, Vorlagen" },
      { problem: "Begründungen fehlen, Erstattung wird gekürzt, Patient zahlt verärgert nicht", massnahme: "Begründung vor dem Druck prüfen", inSorrida: "Abrechnungsprüfung: Faktor ohne Begründung" },
    ],
  },
  beihilfe: {
    id: "beihilfe",
    name: "Beihilfe (Beamte)",
    werk: "GOAE",
    zahler: "Patient; Erstattung anteilig durch Beihilfestelle und Restkostenversicherung",
    rechenweg: "Wie GOÄ/GOZ; Beihilfe erstattet in der Regel bis zum Schwellenwert, darüber nur mit Begründung.",
    regeln: ["Beihilfe-Regeln des Bundes oder Landes beachten", "Analog- und Verlangensleistungen oft nicht beihilfefähig – vorher sagen"],
    begriffe: [["Bemessungssatz", "Anteil, den die Beihilfe erstattet (z. B. 50/70 %)"], ["beihilfefähig", "von der Beihilfe anerkannt"]],
    geldhebel: [{ problem: "Patient zahlt nicht, weil die Beihilfe kürzt", massnahme: "Vorher auf nicht beihilfefähige Anteile hinweisen", inSorrida: "Vereinbarung mit Eigenanteil" }],
  },
  igel: {
    id: "igel",
    name: "Individuelle Gesundheitsleistungen (IGeL)",
    werk: "GOAE",
    zahler: "Gesetzlich Versicherte selbst",
    rechenweg: "Nach GOÄ mit Faktor; Kassenpatienten zahlen privat.",
    regeln: ["Schriftlicher Behandlungsvertrag vor der Leistung (§ 3 Abs. 1 BMV-Ä, § 630c BGB)", "Kein Drängen, Bedenkzeit; Information über voraussichtliche Kosten in Textform"],
    begriffe: [["IGeL", "Leistung, die die Kasse nicht zahlt"], ["Behandlungsvertrag", "schriftliche Vereinbarung vor IGeL"]],
    geldhebel: [
      { problem: "IGeL wird mündlich vereinbart, Rechnung wird später bestritten", massnahme: "Vereinbarung digital mit Kostenangabe", inSorrida: "Vorschlag mit digitalem Einverständnis und PDF" },
      { problem: "Patient versteht den Nutzen nicht und lehnt ab", massnahme: "Ehrliche Nutzenangabe und wann die Kasse zahlt", inSorrida: "Behandlungsweg mit Kassen-Sockel" },
    ],
  },
  mehrkosten_zahn: {
    id: "mehrkosten_zahn",
    name: "Mehrkosten bei Kassenpatienten (Zahn)",
    werk: "GOZ",
    zahler: "Kasse zahlt die vergleichbare BEMA-Leistung, Patient die Differenz nach GOZ",
    rechenweg: "GOZ-Betrag der gewählten Leistung minus BEMA-Betrag der Kassenleistung.",
    regeln: ["Schriftliche Mehrkostenvereinbarung vor Behandlung (§ 28 Abs. 2 SGB V)"],
    begriffe: [["Mehrkostenregelung", "Patient wählt aufwendigere Füllung, zahlt Differenz"]],
    geldhebel: [{ problem: "Differenz falsch berechnet oder nicht vereinbart", massnahme: "Differenz automatisch zeigen und unterschreiben lassen", inSorrida: "Behandlungsweg" }],
  },
  bg: {
    id: "bg",
    name: "Arbeits- und Wegeunfall (BG, UV-GOÄ)",
    werk: "UVGOAE",
    zahler: "Berufsgenossenschaft oder Unfallkasse",
    rechenweg: "Festbeträge der UV-GOÄ je Leistung; allgemeine oder besondere Heilbehandlung mit unterschiedlichen Sätzen; Berichte werden extra vergütet.",
    regeln: ["Durchgangsarztverfahren beachten", "Unfallbericht (F1000/F1050) zeitnah", "Abrechnung direkt mit dem Unfallversicherungsträger, nicht mit der Kasse"],
    begriffe: [["D-Arzt", "Durchgangsarzt mit Zulassung der DGUV"], ["allgemeine/besondere Heilbehandlung", "zwei Vergütungsstufen der UV-GOÄ"], ["F-Formulare", "Berichtsvordrucke der DGUV"]],
    geldhebel: [{ problem: "Arbeitsunfall wird als Kassenfall abgerechnet – die BG zahlt höher", massnahme: "Bei Anamnese nach Unfall bei der Arbeit oder auf dem Weg fragen", inSorrida: "Anamnese-Frage (Vorschlag)" }],
  },
  heilmittel: {
    id: "heilmittel",
    name: "Heilmittel (Physio, Ergo, Logo, Podologie)",
    zahler: "Krankenkasse nach Vergütungsliste; Patient zahlt Zuzahlung (10 % + 10 € je Verordnung)",
    rechenweg: "Vergütung je Position laut bundeseinheitlicher Preisliste; Zuzahlung zieht die Praxis ein.",
    regeln: ["Verordnung nach Heilmittel-Richtlinie prüfen (Diagnosegruppe, Höchstmenge, Frequenz)", "Behandlungsbeginn innerhalb von 28 Tagen", "Abrechnung über Abrechnungszentrum oder direkt nach § 302 SGB V"],
    begriffe: [["Diagnosegruppe", "z. B. WS (Wirbelsäule), EX (Extremitäten), ZN (Zentralnervensystem)"], ["orientierende Behandlungsmenge", "übliche Anzahl Einheiten je Verordnungsfall"], ["Blankoverordnung", "Therapeut bestimmt Art und Menge (z. B. Ergo, Physio Schulter)"], ["Zuzahlung", "10 % plus 10 € je Verordnung"]],
    geldhebel: [
      { problem: "Formfehler auf der Verordnung führen zu Absetzungen", massnahme: "Verordnung vor Behandlungsbeginn prüfen", inSorrida: "Prüfliste (geplant)" },
      { problem: "Zuzahlung wird nicht eingezogen", massnahme: "Zuzahlung als Rechnung mit GiroCode", inSorrida: "Rechnungen, Portal" },
      { problem: "Selbstzahlerangebote (z. B. Präventionskurse) werden nicht genutzt", massnahme: "Angebote mit ehrlichem Nutzen im Behandlungsweg", inSorrida: "Vorschläge Therapie" },
    ],
  },
  hebamme: {
    id: "hebamme",
    name: "Hebammenhilfe",
    zahler: "Krankenkasse nach Hebammenhilfevertrag",
    rechenweg: "Festbeträge je Leistung und Zeiteinheit laut Hebammenhilfevertrag.",
    regeln: ["Dokumentation je Besuch", "Abrechnung über Abrechnungsstelle oder direkt"],
    begriffe: [["Hebammenhilfevertrag", "Vergütungsgrundlage nach § 134a SGB V"], ["Wegegeld", "zusätzliche Vergütung für Hausbesuche"]],
    geldhebel: [{ problem: "Wegegeld und Zuschläge (Nacht, Wochenende) vergessen", massnahme: "Zeitpunkt und Ort jeder Leistung erfassen", inSorrida: "Termine mit Standort" }],
  },
  selbstzahler_therapie: {
    id: "selbstzahler_therapie",
    name: "Privat- und Selbstzahler in der Therapie",
    zahler: "Patient; Privatversicherte reichen bei der Versicherung ein",
    rechenweg: "Freie Preisvereinbarung, oft orientiert an Beihilfesätzen bzw. GebüTh.",
    regeln: ["Preis vor Behandlung in Textform", "Privatversicherte auf Erstattungsgrenzen hinweisen"],
    begriffe: [["Beihilfesätze", "Höchstbeträge, die die Beihilfe erstattet"], ["Privatrezept", "Verordnung für Privatversicherte"]],
    geldhebel: [{ problem: "Preise unter Wert, weil Privatpatienten wie Kassenpatienten behandelt werden", massnahme: "Eigene Preisliste je Leistung", inSorrida: "Eigene Leistungen und Preise" }],
  },
  pflege: {
    id: "pflege",
    name: "Pflege (SGB XI / SGB V)",
    zahler: "Pflegekasse (Sachleistung), Krankenkasse (Behandlungspflege), Pflegebedürftige (Eigenanteil)",
    rechenweg: "Leistungskomplexe oder Zeitvergütung nach Vertrag mit den Pflegekassen.",
    regeln: ["Leistungsnachweise monatlich", "Entlastungsbetrag (§ 45b SGB XI) ausschöpfen"],
    begriffe: [["Leistungskomplex", "pauschal vergütete Pflegeleistung"], ["Entlastungsbetrag", "monatlicher Betrag für Unterstützung im Alltag"]],
    geldhebel: [{ problem: "Entlastungsbetrag verfällt ungenutzt", massnahme: "Offene Budgets je Klient anzeigen", inSorrida: "geplant" }],
  },
  hilfsmittel: {
    id: "hilfsmittel",
    name: "Hilfsmittel (Hörakustik, Optik, Sanitätshaus)",
    zahler: "Kasse zahlt Festbetrag bzw. Vertragspreis, Patient Zuzahlung und Mehrkosten",
    rechenweg: "Vertragspreis/Festbetrag der Kasse; höherwertige Versorgung gegen schriftliche Mehrkostenerklärung.",
    regeln: ["Mehrkostenerklärung schriftlich vor Versorgung (§ 33 Abs. 1 SGB V)", "Aufzahlungsfreie Versorgung muss angeboten werden"],
    begriffe: [["Festbetrag", "Höchstbetrag, den die Kasse zahlt"], ["Mehrkostenerklärung", "Patient wählt bewusst höherwertig und zahlt Differenz"]],
    geldhebel: [{ problem: "Mehrkostenerklärung fehlt oder ist unklar", massnahme: "Vergleich Kassenversorgung gegen Wunschversorgung mit Unterschrift", inSorrida: "Behandlungsweg mit Kassen-Sockel" }],
  },
};

/** Welche Abrechnungsarten für ein Fach relevant sind, wichtigste zuerst. */
export function artenFuer(fach: string | null | undefined): Abrechnungsart[] {
  const f = fach ?? "hausarzt";
  const ids: ArtId[] =
    f === "zahn" ? ["gkv_bema", "zahnersatz", "mehrkosten_zahn", "pkv_goz", "beihilfe"]
    : ["physio", "ergo", "logo", "podo"].includes(f) ? ["heilmittel", "selbstzahler_therapie"]
    : f === "hebamme" ? ["hebamme", "selbstzahler_therapie"]
    : f === "pflege" ? ["pflege"]
    : ["hoerakustik", "optik", "sanitaetshaus"].includes(f) ? ["hilfsmittel"]
    : f === "heilpraktiker" ? ["selbstzahler_therapie"]
    : ["chirurgie", "ortho", "hausarzt", "radiologie"].includes(f) ? ["gkv_ebm", "pkv_goae", "beihilfe", "igel", "bg"]
    : ["gkv_ebm", "pkv_goae", "beihilfe", "igel"];
  return ids.map((i) => ARTEN[i]);
}
