// Übernahme einer amtlichen Leistung in den Abrechnungskatalog der Praxis.

/** Amtliches Verzeichnis → System im Praxiskatalog (siehe ServiceCatalogItem.system). */
export const KATALOG_SYSTEM: Record<string, string> = {
  EBM: "EBM",
  GOAE: "GOAE",
  GOZ: "GOZ",
  BEMA: "BEMA",
  HEILMITTEL: "HEILMITTEL",
  HEBAMME: "HEBAMME",
  HKP: "PFLEGE",
  SGB_XI: "PFLEGE",
  HMV: "HILFSMITTEL",
  APOTHEKE: "APO",
  HEILPRAKTIKER: "SELBST",
  UVGOAE: "UVGOAE",
};

export const SYSTEM_TITEL: Record<string, string> = {
  EBM: "EBM (Kasse, Ärzte)",
  GOAE: "GOÄ (privat, Ärzte)",
  GOZ: "GOZ (privat, Zahnärzte)",
  BEMA: "BEMA (Kasse, Zahnärzte)",
  HEILMITTEL: "Heilmittel (§ 125 SGB V)",
  HEBAMME: "Hebammenhilfe",
  HKP: "Häusliche Krankenpflege (HKP-RL)",
  SGB_XI: "Pflegeversicherung (SGB XI)",
  HMV: "Hilfsmittelverzeichnis",
  APOTHEKE: "Apotheke",
  HEILPRAKTIKER: "Heilpraktiker (BBhV Anlage 2)",
  UVGOAE: "UV-GOÄ (Berufsgenossenschaft)",
};

/** Kurzbezeichnung vor der Ziffer in Listen. */
export const SYSTEM_KURZ: Record<string, string> = {
  EBM: "EBM", GOAE: "GOÄ", GOZ: "GOZ", BEMA: "BEMA", HEILMITTEL: "HM", HEBAMME: "Hebamme", HKP: "HKP", SGB_XI: "SGB XI",
  HMV: "HMV", APOTHEKE: "Apotheke", HEILPRAKTIKER: "HP", UVGOAE: "UV-GOÄ",
};

/** Faktorgrenzen nach Gebührenordnung (GOÄ/GOZ: 1,0 bis 3,5; Regelhöchstsatz 2,3). */
export function katalogEintrag(a: { system: string; code: string; text: string; kapitel: string | null; punkte: number | null; euroCent: number | null; hinweis: string | null }) {
  const sys = KATALOG_SYSTEM[a.system] ?? "SONSTIGES";
  const privat = sys === "GOAE" || sys === "GOZ";
  return {
    system: sys,
    code: a.code.slice(0, 40),
    title: a.text.slice(0, 300),
    description: a.hinweis ? a.hinweis.slice(0, 1000) : null,
    category: (a.kapitel ?? SYSTEM_TITEL[a.system] ?? "Amtlich").slice(0, 80),
    toothRelevant: a.system === "GOZ" || a.system === "BEMA",
    punktzahl: a.punkte,
    festbetragCent: a.punkte == null ? a.euroCent : null,
    faktorMin: privat ? 1.0 : null,
    faktorMax: privat ? 3.5 : null,
    regelhoechstfaktor: privat ? 2.3 : null,
    begruendungspflichtAbFaktor: privat ? 2.3 : null,
  };
}
