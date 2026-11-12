// Gebührenrechner für die Gebührenwerke, die Praxen in Deutschland nutzen.
// Rechnet Beträge, zeigt Schwellen- und Höchstwerte und was ein höherer
// Faktor bringt. Die amtlichen Werte stehen hier mit Stand und Quelle; was
// sich jährlich ändert (EBM-Orientierungswert, BEMA-Punktwerte je KZV),
// ist in den Einstellungen der Praxis zu pflegen.

/** Bundeseinheitlicher EBM-Orientierungswert 2026 (Bewertungsausschuss, 803. Sitzung, 17.09.2025); regional kann abweichen. */
export const EBM_ORIENTIERUNGSWERT_2026 = 12.7404;
/** Orientierungswert ab 1.1.2027 (Einigung im Bewertungsausschuss, KBV-Praxisnachricht vom 23.09.2026: +2,2 %). */
export const EBM_ORIENTIERUNGSWERT_2027 = 13.0207;
/** Orientierungswert, der am angegebenen Tag gilt. */
export const ebmOrientierungswert = (today = new Date()) => (today >= new Date(2027, 0, 1) ? EBM_ORIENTIERUNGSWERT_2027 : EBM_ORIENTIERUNGSWERT_2026);
const EBM_AB_2027 = new Date() >= new Date(2027, 0, 1);

export type Gebuehrenwerk = "GOAE" | "GOZ" | "EBM" | "BEMA" | "UVGOAE";

export interface WerkInfo {
  name: string;
  kurz: string;
  /** Wer zahlt typischerweise. */
  zahler: string;
  /** Amtlicher Punktwert in Cent, falls bundeseinheitlich. */
  punktwertCent?: number;
  punktwertQuelle?: string;
  /** Ob ein Steigerungsfaktor gilt. */
  faktor: boolean;
}

export const WERKE: Record<Gebuehrenwerk, WerkInfo> = {
  GOAE: { name: "Gebührenordnung für Ärzte", kurz: "GOÄ", zahler: "Privatversicherte, Beihilfe, Selbstzahler (IGeL)", punktwertCent: 5.82873, punktwertQuelle: "§ 5 Abs. 1 GOÄ, unverändert seit 1996", faktor: true },
  GOZ: { name: "Gebührenordnung für Zahnärzte", kurz: "GOZ", zahler: "Privatversicherte, Beihilfe, Selbstzahler, Mehrkosten bei Kassenpatienten", punktwertCent: 5.62421, punktwertQuelle: "§ 5 Abs. 1 GOZ, Stand GOZ 2012", faktor: true },
  EBM: { name: "Einheitlicher Bewertungsmaßstab", kurz: "EBM", zahler: "Gesetzliche Krankenkasse über die Kassenärztliche Vereinigung", punktwertCent: ebmOrientierungswert(), punktwertQuelle: EBM_AB_2027 ? "Orientierungswert 2027 (Bewertungsausschuss, Einigung 09/2026); regionale Punktwerte können abweichen" : "Orientierungswert 2026 (Bewertungsausschuss, 803. Sitzung); ab 1.1.2027: 13,0207 Cent; regionale Punktwerte können abweichen", faktor: false },
  BEMA: { name: "Bewertungsmaßstab zahnärztlicher Leistungen", kurz: "BEMA", zahler: "Gesetzliche Krankenkasse über die Kassenzahnärztliche Vereinigung", faktor: false },
  UVGOAE: { name: "Gebührenordnung der gesetzlichen Unfallversicherung", kurz: "UV-GOÄ", zahler: "Berufsgenossenschaft / Unfallkasse (Arbeits- und Wegeunfall)", faktor: false },
};

/** GOÄ-Leistungsgruppen mit eigenen Spannen (§ 5 Abs. 2–4 GOÄ). */
export type GoaeGruppe = "persoenlich" | "technisch" | "labor";

export const SPANNEN: Record<"GOAE_persoenlich" | "GOAE_technisch" | "GOAE_labor" | "GOZ", { schwelle: number; hoechst: number; label: string }> = {
  GOAE_persoenlich: { schwelle: 2.3, hoechst: 3.5, label: "persönlich-ärztliche Leistungen" },
  GOAE_technisch: { schwelle: 1.8, hoechst: 2.5, label: "medizinisch-technische Leistungen (Abschnitte A, E, O)" },
  GOAE_labor: { schwelle: 1.15, hoechst: 1.3, label: "Laborleistungen (Abschnitt M)" },
  GOZ: { schwelle: 2.3, hoechst: 3.5, label: "zahnärztliche Leistungen" },
};

export function spanne(werk: Gebuehrenwerk, gruppe: GoaeGruppe = "persoenlich") {
  if (werk === "GOZ") return SPANNEN.GOZ;
  if (werk === "GOAE") return SPANNEN[`GOAE_${gruppe}` as const];
  return null;
}

/** Betrag in Cent, kaufmännisch gerundet je Position (wie in der Rechnung). */
export function betragCent(a: { werk: Gebuehrenwerk; punkte?: number; faktor?: number; punktwertCent?: number; euroBetrag?: number; anzahl?: number }): number {
  const n = a.anzahl ?? 1;
  if (a.werk === "UVGOAE") return Math.round((a.euroBetrag ?? 0) * 100) * n;
  const pw = a.punktwertCent ?? WERKE[a.werk].punktwertCent;
  if (pw == null || a.punkte == null) return 0;
  const f = WERKE[a.werk].faktor ? a.faktor ?? 1 : 1;
  return Math.round(a.punkte * pw * f) * n;
}

export interface FaktorPruefung {
  stufe: "ok" | "begruendung" | "vereinbarung" | "unzulaessig";
  text: string;
}

/**
 * Prüft einen Faktor gegen die Spanne: bis Schwellenwert ohne Begründung,
 * darüber bis Höchstwert nur mit schriftlicher, patientenbezogener
 * Begründung (§ 5 Abs. 2, § 12 Abs. 3 GOÄ / § 10 Abs. 3 GOZ), über dem
 * Höchstwert nur mit abweichender Vereinbarung vor der Behandlung (§ 2 GOÄ/GOZ).
 */
export function pruefeFaktor(werk: Gebuehrenwerk, faktor: number, gruppe: GoaeGruppe = "persoenlich"): FaktorPruefung {
  const s = spanne(werk, gruppe);
  if (!s) return { stufe: "ok", text: `${WERKE[werk].kurz} kennt keinen Steigerungsfaktor.` };
  if (faktor < 1) return { stufe: "unzulaessig", text: "Unter dem Einfachsatz ist nicht zulässig." };
  if (faktor <= s.schwelle) return { stufe: "ok", text: `Bis ${fmt(s.schwelle)}-fach ohne Begründung.` };
  if (faktor <= s.hoechst) return { stufe: "begruendung", text: `Über ${fmt(s.schwelle)}-fach: schriftliche, auf diesen Patienten bezogene Begründung in der Rechnung nötig.` };
  return { stufe: "vereinbarung", text: `Über ${fmt(s.hoechst)}-fach nur mit schriftlicher Vereinbarung vor der Behandlung (§ 2), inkl. Hinweis, dass die Erstattung nicht gesichert ist.` };
}

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

/** Was eine Steigerung gegenüber dem Schwellenwert bringt, in Cent. */
export function mehrbetragCent(a: { werk: "GOAE" | "GOZ"; punkte: number; faktor: number; gruppe?: GoaeGruppe; anzahl?: number }): number {
  const s = spanne(a.werk, a.gruppe)!;
  return betragCent({ werk: a.werk, punkte: a.punkte, faktor: a.faktor, anzahl: a.anzahl }) - betragCent({ werk: a.werk, punkte: a.punkte, faktor: s.schwelle, anzahl: a.anzahl });
}

/**
 * Bausteine für die Begründung nach § 5 Abs. 2 GOÄ / GOZ. Sie sind
 * Formulierungshilfen: Eine Begründung muss den konkreten Fall beschreiben,
 * pauschale Texte erkennen Kostenträger nicht an. Deshalb jeweils mit Lücke
 * für die patientenbezogene Angabe.
 */
export const BEGRUENDUNGEN: { kriterium: "Schwierigkeit" | "Zeitaufwand" | "Umstände"; text: string }[] = [
  { kriterium: "Schwierigkeit", text: "Erschwerte Durchführung wegen [anatomische Besonderheit benennen]" },
  { kriterium: "Schwierigkeit", text: "Überdurchschnittlicher Schwierigkeitsgrad durch [Vorerkrankung/Befund benennen]" },
  { kriterium: "Zeitaufwand", text: "Erhöhter Zeitaufwand von [Minuten] Minuten statt üblich [Minuten] Minuten wegen [Grund]" },
  { kriterium: "Zeitaufwand", text: "Mehrfache Unterbrechung der Behandlung erforderlich wegen [Grund, z. B. Würgereiz, Kreislauf]" },
  { kriterium: "Umstände", text: "Ausgeprägte Behandlungsangst mit erforderlicher Beruhigung über [Minuten] Minuten" },
  { kriterium: "Umstände", text: "Eingeschränkte Kooperationsfähigkeit wegen [Grund, z. B. Demenz, Behinderung, Alter]" },
];
