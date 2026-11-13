// Zahnbefunde und FDI-Zahnschema. Eigenes Modul ohne weitere Abhängigkeiten,
// damit das Befund-Diktat klein bleibt.

export const FINDINGS = {
  karies_klein: "Karies, 1–2 Flächen",
  karies_gross: "Karies, ab 3 Flächen",
  fuellung_defekt: "Alte Füllung defekt",
  wurzel: "Entzündeter Nerv",
  zerstoert: "Stark zerstört, Krone nötig",
  stift: "Wurzelbehandelt, Krone mit Stiftaufbau nötig",
  teilkrone: "Großer Defekt, Zahnwand erhalten (Teilkrone)",
  fehlt: "Zahn fehlt",
  fissur: "Tiefe Fissuren, kariesfrei",
} as const;
export type FindingCode = keyof typeof FINDINGS;

export const GLOBAL_FINDINGS = {
  zahnstein: "Zahnstein und Beläge",
  psi: "Parodontitis (PSI-Code 3 oder 4)",
  bruxismus: "Knirschen oder Pressen",
  raucher: "Raucher",
  bleaching: "Patient wünscht hellere Zähne",
} as const;
export type GlobalCode = keyof typeof GLOBAL_FINDINGS;

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

export function isValidTooth(n: number): boolean {
  return ALL_TEETH.includes(n);
}
