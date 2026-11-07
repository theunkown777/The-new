// Realistische Größen für die Demo je Fach: eine typische Einzel- oder kleine
// Gemeinschaftspraxis. Angelehnt an öffentliche Kennzahlen (Fallzahlen je
// Quartal aus dem Zi-Praxis-Panel, Angaben der Berufsverbände von Apotheken,
// Heilmittelerbringern, Pflege und Hilfsmittelhandwerk); gerundete
// Orientierungswerte, keine Statistik.
//
// patienten:   Stamm in der Demo (Patientinnen, Kunden, Klienten)
// quote:       Anteil mit Vorschlag zu Selbstzahler-, Aufzahlungs- oder Wahlleistungen
// termine:     Termine je Werktag [min, max] über alle Behandlungsplätze
// dauer:       übliche Termindauern in Minuten
// standorte:   Behandlungsplätze und Minuten je Tag (Grundlage der Auslastung)

export type DemoKennzahlen = {
  patienten: number;
  quote: number;
  termine: [number, number];
  dauer: number[];
  standorte: { name: string; address: string; rooms: number; minutesPerDay: number }[];
};

const ZWEI = (haupt: number, zweig: number, min = 510): DemoKennzahlen["standorte"] => [
  { name: "Hauptpraxis", address: "Musterstraße 1", rooms: haupt, minutesPerDay: min },
  ...(zweig ? [{ name: "Zweigpraxis", address: "Am Markt 7", rooms: zweig, minutesPerDay: 360 }] : []),
];
const EIN = (name: string, rooms: number, min = 480) => [{ name, address: "Musterstraße 1", rooms, minutesPerDay: min }];

export const DEMO_KENNZAHLEN: Record<string, DemoKennzahlen> = {
  zahn: { patienten: 1400, quote: 0.22, termine: [20, 28], dauer: [20, 30, 30, 45, 60], standorte: ZWEI(2, 1) },
  hausarzt: { patienten: 1500, quote: 0.06, termine: [38, 52], dauer: [10, 10, 15, 15, 20], standorte: ZWEI(2, 0) },
  augen: { patienten: 1400, quote: 0.18, termine: [32, 45], dauer: [10, 15, 15, 20], standorte: ZWEI(2, 0) },
  haut: { patienten: 1400, quote: 0.16, termine: [32, 45], dauer: [10, 10, 15, 20], standorte: ZWEI(2, 0) },
  gyn: { patienten: 1300, quote: 0.25, termine: [24, 32], dauer: [15, 15, 20, 30], standorte: ZWEI(2, 0) },
  uro: { patienten: 1200, quote: 0.15, termine: [24, 32], dauer: [15, 15, 20, 30], standorte: ZWEI(2, 0) },
  ortho: { patienten: 1400, quote: 0.14, termine: [32, 45], dauer: [10, 15, 15, 20], standorte: ZWEI(2, 0) },
  hno: { patienten: 1300, quote: 0.1, termine: [30, 42], dauer: [10, 15, 15, 20], standorte: ZWEI(2, 0) },
  kinder: { patienten: 1300, quote: 0.05, termine: [38, 52], dauer: [10, 10, 15, 20], standorte: ZWEI(2, 0) },
  kardio: { patienten: 900, quote: 0.08, termine: [20, 28], dauer: [20, 30, 30, 45], standorte: ZWEI(2, 0) },
  radiologie: { patienten: 1500, quote: 0.06, termine: [32, 44], dauer: [15, 20, 30, 30], standorte: EIN("Radiologie", 3, 600) },
  neuro: { patienten: 900, quote: 0.06, termine: [16, 24], dauer: [20, 30, 30], standorte: ZWEI(2, 0) },
  psych: { patienten: 120, quote: 0.04, termine: [6, 8], dauer: [50], standorte: EIN("Praxis", 1, 480) },
  gastro: { patienten: 800, quote: 0.08, termine: [16, 24], dauer: [20, 30, 30, 45], standorte: ZWEI(2, 0) },
  pneumo: { patienten: 1000, quote: 0.06, termine: [24, 32], dauer: [15, 15, 20, 30], standorte: ZWEI(2, 0) },
  endo: { patienten: 900, quote: 0.07, termine: [18, 26], dauer: [20, 30, 30], standorte: ZWEI(2, 0) },
  chirurgie: { patienten: 800, quote: 0.1, termine: [20, 28], dauer: [15, 20, 30, 45], standorte: ZWEI(2, 0) },
  aesthetik: { patienten: 450, quote: 0.55, termine: [8, 12], dauer: [30, 45, 60], standorte: EIN("Praxis", 2, 480) },
  physio: { patienten: 260, quote: 0.15, termine: [26, 34], dauer: [20, 20, 25, 30], standorte: EIN("Praxis", 3, 480) },
  ergo: { patienten: 90, quote: 0.1, termine: [12, 16], dauer: [45], standorte: EIN("Praxis", 2, 480) },
  logo: { patienten: 80, quote: 0.08, termine: [12, 16], dauer: [45], standorte: EIN("Praxis", 2, 480) },
  podo: { patienten: 320, quote: 0.25, termine: [12, 16], dauer: [30, 45, 45], standorte: EIN("Praxis", 2, 450) },
  hebamme: { patienten: 90, quote: 0.2, termine: [5, 7], dauer: [45, 60], standorte: EIN("Hebammenpraxis", 1, 480) },
  pflege: { patienten: 70, quote: 0.15, termine: [28, 38], dauer: [15, 20, 30, 45], standorte: EIN("Pflegedienst (Touren)", 3, 480) },
  apotheke: { patienten: 1800, quote: 0.05, termine: [3, 6], dauer: [15, 30, 30], standorte: EIN("Beratungsraum", 1, 540) },
  hoerakustik: { patienten: 900, quote: 0.35, termine: [6, 10], dauer: [30, 45, 60], standorte: EIN("Fachgeschäft", 2, 480) },
  optik: { patienten: 1100, quote: 0.4, termine: [6, 10], dauer: [20, 30, 30], standorte: EIN("Fachgeschäft", 1, 480) },
  sanitaetshaus: { patienten: 1200, quote: 0.2, termine: [8, 12], dauer: [20, 30, 30], standorte: EIN("Fachgeschäft", 2, 480) },
  heilpraktiker: { patienten: 180, quote: 0.5, termine: [5, 8], dauer: [60], standorte: EIN("Praxis", 1, 480) },
  klinik: { patienten: 1000, quote: 0.15, termine: [12, 18], dauer: [30, 30, 60], standorte: EIN("Klinik (Aufnahme und Ambulanz)", 2, 600) },
};

export const demoKennzahlen = (fach: string): DemoKennzahlen => DEMO_KENNZAHLEN[fach] ?? DEMO_KENNZAHLEN.hausarzt;

/** Erwartete Auslastung eines mittleren Tages (gebuchte Minuten durch Kapazität). */
export function erwarteteAuslastung(k: DemoKennzahlen): number {
  const termine = (k.termine[0] + k.termine[1]) / 2;
  const dauer = k.dauer.reduce((a, b) => a + b, 0) / k.dauer.length;
  const kapazitaet = k.standorte.reduce((a, s) => a + s.rooms * s.minutesPerDay, 0);
  return (termine * dauer) / kapazitaet;
}
