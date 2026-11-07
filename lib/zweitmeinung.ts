import { z } from "zod";

// Zweitmeinung im Patientenportal: Patientinnen und Patienten tragen das
// Angebot einer anderen Praxis ein und sehen es neben dem eigenen Vorschlag.
// Die Einträge bleiben privat, bis sie ausdrücklich geteilt werden.

export const MAX_ZWEITMEINUNGEN = 3;

const euroZuCent = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."))))
  .pipe(z.number().min(0).max(1_000_000))
  .transform((e) => Math.round(e * 100));

export const zweitmeinungSchema = z.object({
  praxis: z.string().trim().max(80).optional().transform((v) => v || null),
  leistung: z.string().trim().min(2, "Bitte kurz eintragen, was die andere Praxis vorschlägt.").max(160),
  eigenanteil: euroZuCent,
  gesamt: euroZuCent.optional().nullable(),
  notiz: z.string().trim().max(500).optional().transform((v) => v || null),
});

export const zweitmeinungTeilenSchema = z.object({ geteilt: z.boolean() });

export type ZweitmeinungEintrag = {
  id: string;
  praxis: string | null;
  leistung: string;
  eigenanteilCent: number;
  gesamtCent: number | null;
  notiz: string | null;
  geteilt: boolean;
};

/**
 * Eingriffe mit gesetzlichem Anspruch auf eine Zweitmeinung (§ 27b SGB V,
 * Zweitmeinungs-Richtlinie des G-BA, Fassung in Kraft seit 13.11.2025).
 * Bezeichnungen wie auf g-ba.de. Notfälle sind ausgenommen.
 */
const ANSPRUCH: [RegExp, string][] = [
  [/amputation/i, "Amputation beim diabetischen Fußsyndrom"],
  [/aortenaneurysma/i, "Eingriffe an Aortenaneurysmen"],
  [/halsschlagader|karotis/i, "Eingriffe an der Halsschlagader"],
  [/wirbelsäule|bandscheib|spondylodese|nukleotomie|diskektomie/i, "Eingriff an der Wirbelsäule"],
  [/mandel|tonsill/i, "Eingriff an Gaumen- oder Rachenmandeln (Tonsillektomie, Tonsillotomie)"],
  [/prostatakarzinom|prostatektomie|prostatakrebs.*(behandlung|operation|bestrahlung)/i, "Eingriffe bei lokal begrenztem Prostatakarzinom"],
  [/hüft.*(endoprothese|tep|gelenkersatz)|künstliches hüftgelenk/i, "Eingriffe zum Hüftgelenkersatz"],
  [/knie.*(endoprothese|tep)|künstliches kniegelenk/i, "Einsetzen einer Knieendoprothese"],
  [/herzschrittmacher|defibrillator|\bicd\b|crt/i, "Einsetzen eines Herzschrittmachers oder eines Defibrillators"],
  [/gallenblase|cholezystektom/i, "Gallenblasenentfernung (Cholezystektomie)"],
  [/gebärmutter.*entfern|hysterektom/i, "Gebärmutterentfernung (Hysterektomie)"],
  [/schulter.*(spiegel|arthroskop)|schulterarthroskop/i, "Gelenkspiegelung an der Schulter (Schulterarthroskopie)"],
  [/ablation|verödung.*herz|elektrophysiolog/i, "Herzkatheteruntersuchung und Ablationen am Herzen"],
];

/** Welcher Eingriff mit Anspruch auf Zweitmeinung steckt in diesen Texten (Titel, Optionen)? */
export function anspruchAufZweitmeinung(texte: string[]): string | null {
  const t = texte.join(" · ");
  return ANSPRUCH.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Hinweistext für die Patientenansicht, je nach Anspruch und Fach. */
export function zweitmeinungHinweis(texte: string[], dental: boolean): { titel: string; text: string } {
  const eingriff = anspruchAufZweitmeinung(texte);
  if (eingriff)
    return {
      titel: "Sie haben Anspruch auf eine Zweitmeinung",
      text: `Für „${eingriff}“ zahlt die gesetzliche Krankenkasse eine unabhängige Zweitmeinung (§ 27b SGB V). Ihre Praxis muss Sie mindestens 10 Tage vor dem Eingriff darauf hinweisen. Ärztinnen und Ärzte dafür finden Sie unter 116117.de/zweitmeinung.`,
    };
  if (dental)
    return {
      titel: "Zweitmeinung zum Heil- und Kostenplan",
      text: "Bei Zahnersatz und größeren Behandlungen holen viele eine zweite Meinung ein. Viele Krankenkassen und die Patientenberatung der Zahnärztekammern bieten das an. Tragen Sie das andere Angebot hier ein und vergleichen Sie in Ruhe.",
    };
  return {
    titel: "Eine zweite Meinung einholen",
    text: "Bei größeren Behandlungen ist eine zweite Meinung üblich und Ihr gutes Recht. Tragen Sie das andere Angebot hier ein und vergleichen Sie in Ruhe.",
  };
}

/** Fragen, die beim Vergleich helfen; nicht nur der Preis zählt. */
export function vergleichsFragen(dental: boolean): string[] {
  return [
    "Ist wirklich dieselbe Leistung gemeint (Umfang, Material, Anzahl der Termine)?",
    "Ist der Anteil der Krankenkasse bei beiden schon abgezogen?",
    "Was ist enthalten: Vor- und Nachsorge, Kontrollen, Labor?",
    dental ? "Welche Gewährleistung gibt es, und wo wird der Zahnersatz gefertigt?" : "Wer behandelt, und wie viel Erfahrung gibt es mit diesem Eingriff?",
    "Wie lange fallen Sie aus, und was passiert, wenn etwas nicht wie geplant läuft?",
  ];
}

export const alsEintrag = (z: { id: string; praxis: string | null; leistung: string; eigenanteilCent: number; gesamtCent: number | null; notiz: string | null; geteiltAt: Date | null }): ZweitmeinungEintrag => ({
  id: z.id,
  praxis: z.praxis,
  leistung: z.leistung,
  eigenanteilCent: z.eigenanteilCent,
  gesamtCent: z.gesamtCent,
  notiz: z.notiz,
  geteilt: !!z.geteiltAt,
});
