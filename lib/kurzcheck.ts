import { z } from "zod";
import { zahnNach } from "@/lib/modelle/gebiss";

// Kurz-Fragebogen vor dem Termin: höchstens fünf Fragen, jede mit Bildern zum Antippen.
// 1 Wo?  2 Wie stark?  3 Seit wann?  4 Wie zeigt es sich?  5 Was ist Ihnen wichtig?
// Wer keine Beschwerden hat (nur Kontrolle), beantwortet nur Frage 1 und 5.
// Der Fragebogen sammelt Angaben des Patienten. Er bewertet nichts und stellt keine Diagnose.

export type KurzArt = "zahn" | "koerper";
export const kurzArt = (fach: string | null | undefined): KurzArt => (!fach || fach === "zahn" ? "zahn" : "koerper");

/** Körperregionen zum Antippen: Lage im Körperumriss (400 × 880), Ansicht und ob es sie links und rechts gibt. */
export const REGIONEN: { id: string; name: string; ansicht: "vorn" | "hinten"; bei: [number, number]; r: number; paarig?: boolean }[] = [
  { id: "kopf", name: "Kopf", ansicht: "vorn", bei: [200, 52], r: 34 },
  { id: "hals", name: "Hals", ansicht: "vorn", bei: [200, 122], r: 20 },
  { id: "schulter", name: "Schulter", ansicht: "vorn", bei: [129, 165], r: 26, paarig: true },
  { id: "brust", name: "Brust", ansicht: "vorn", bei: [200, 205], r: 38 },
  { id: "bauch", name: "Bauch", ansicht: "vorn", bei: [200, 300], r: 38 },
  { id: "ellenbogen", name: "Arm und Ellenbogen", ansicht: "vorn", bei: [108, 300], r: 24, paarig: true },
  { id: "hand", name: "Hand und Handgelenk", ansicht: "vorn", bei: [84, 452], r: 26, paarig: true },
  { id: "huefte", name: "Hüfte und Leiste", ansicht: "vorn", bei: [156, 385], r: 26, paarig: true },
  { id: "oberschenkel", name: "Oberschenkel", ansicht: "vorn", bei: [160, 478], r: 26, paarig: true },
  { id: "knie", name: "Knie", ansicht: "vorn", bei: [166, 568], r: 26, paarig: true },
  { id: "unterschenkel", name: "Unterschenkel", ansicht: "vorn", bei: [168, 660], r: 24, paarig: true },
  { id: "fuss", name: "Fuß und Sprunggelenk", ansicht: "vorn", bei: [169, 772], r: 28, paarig: true },
  { id: "nacken", name: "Nacken", ansicht: "hinten", bei: [200, 122], r: 22 },
  { id: "ruecken_oben", name: "Oberer Rücken", ansicht: "hinten", bei: [200, 205], r: 40 },
  { id: "ruecken_unten", name: "Unterer Rücken", ansicht: "hinten", bei: [200, 305], r: 38 },
  { id: "gesaess", name: "Gesäß", ansicht: "hinten", bei: [200, 385], r: 36 },
  { id: "wade", name: "Wade und Achillessehne", ansicht: "hinten", bei: [168, 670], r: 26, paarig: true },
];

/** Bereiche im Mund, die sich ohne Zahnnummer wählen lassen. */
export const MUND_BEREICHE: { id: string; name: string }[] = [
  { id: "zahnfleisch", name: "Zahnfleisch" },
  { id: "kiefergelenk", name: "Kiefer oder Kiefergelenk" },
  { id: "unklar", name: "Ich weiß nicht genau, wo" },
];

export const SEIT = { heute: "seit heute", tage: "seit ein paar Tagen", wochen: "seit Wochen", monate: "seit Monaten oder länger" } as const;
export const SEIT_KURZ = { heute: "Heute", tage: "Ein paar Tage", wochen: "Wochen", monate: "Monate oder länger" } as const;

export const ZEICHEN: Record<KurzArt, { id: string; name: string }[]> = {
  zahn: [
    { id: "kalt", name: "Bei Kaltem" },
    { id: "heiss", name: "Bei Heißem oder Süßem" },
    { id: "kauen", name: "Beim Kauen oder Aufbeißen" },
    { id: "pochend", name: "Pochend, auch nachts" },
    { id: "blutet", name: "Zahnfleisch blutet" },
    { id: "geschwollen", name: "Geschwollen" },
    { id: "abgebrochen", name: "Etwas ist abgebrochen" },
    { id: "locker", name: "Zahn oder Füllung ist locker" },
  ],
  koerper: [
    { id: "stechend", name: "Stechend" },
    { id: "dumpf", name: "Dumpf oder drückend" },
    { id: "pochend", name: "Pochend" },
    { id: "brennend", name: "Brennend" },
    { id: "kribbelnd", name: "Kribbelnd oder taub" },
    { id: "steif", name: "Steif, schwer beweglich" },
    { id: "geschwollen", name: "Geschwollen" },
    { id: "bewegung", name: "Vor allem bei Bewegung" },
  ],
};

export const WICHTIG = {
  schnell: "Schnell weniger Beschwerden",
  ursache: "Verstehen, woher es kommt",
  kosten: "Kosten vorher kennen",
  angst: "Ich bin nervös vor der Behandlung",
  kontrolle: "Nur Kontrolle oder Vorsorge",
} as const;

const SEITEN = ["R", "L"] as const;
/** Gültige Angabe zu „Wo?“: Zahn ("zahn:36"), Mundbereich ("mund:zahnfleisch") oder Körperregion ("knie:R", "kopf"). */
export function ortGueltig(art: KurzArt, ort: string): boolean {
  const [a, b] = ort.split(":");
  if (art === "zahn") return (a === "zahn" && !!b && !!zahnNach(b)) || (a === "mund" && MUND_BEREICHE.some((m) => m.id === b));
  const r = REGIONEN.find((x) => x.id === a);
  return !!r && (r.paarig ? (SEITEN as readonly string[]).includes(b ?? "") : b === undefined);
}
export function ortName(ort: string): string {
  const [a, b] = ort.split(":");
  if (a === "zahn") return `Zahn ${b}`;
  if (a === "mund") return MUND_BEREICHE.find((m) => m.id === b)?.name ?? ort;
  const r = REGIONEN.find((x) => x.id === a);
  return r ? `${r.name}${b === "R" ? " rechts" : b === "L" ? " links" : ""}` : ort;
}

export const MAX_ORTE = 3;
export const kurzcheckSchema = (art: KurzArt) =>
  z
    .object({
      keine: z.boolean().default(false),
      orte: z.array(z.string().max(30)).max(MAX_ORTE).default([]),
      staerke: z.number().int().min(0).max(10).nullable().default(null),
      seit: z.enum(["heute", "tage", "wochen", "monate"]).nullable().default(null),
      zeichen: z.array(z.string().max(20)).max(4).default([]),
      wichtig: z.enum(["schnell", "ursache", "kosten", "angst", "kontrolle"]),
      notiz: z.string().max(200).transform((s) => s.replace(/\s+/g, " ").trim()).default(""),
    })
    .transform((d) => (d.keine ? { ...d, orte: [], staerke: null, seit: null, zeichen: [] } : d))
    .refine((d) => d.keine || d.orte.length > 0, { message: "Bitte tippen Sie an, wo Sie Beschwerden haben." })
    .refine((d) => d.orte.every((o) => ortGueltig(art, o)), { message: "Diese Stelle gibt es nicht." })
    .refine((d) => d.keine || (d.staerke !== null && d.seit !== null), { message: "Bitte geben Sie an, wie stark und seit wann." })
    .refine((d) => d.zeichen.every((x) => ZEICHEN[art].some((e) => e.id === x)), { message: "Unbekannte Angabe." })
    .transform((d) => ({ ...d, art, orte: Array.from(new Set(d.orte)), zeichen: Array.from(new Set(d.zeichen)) }));

export type KurzAntworten = z.infer<ReturnType<typeof kurzcheckSchema>>;

/** Gespeicherte Antworten wieder lesen; kaputte oder alte Einträge ergeben null. */
export function kurzcheckLesen(wert: unknown): KurzAntworten | null {
  const art = (wert as { art?: string } | null)?.art === "koerper" ? "koerper" : "zahn";
  const p = kurzcheckSchema(art).safeParse(wert);
  return p.success ? p.data : null;
}

export const staerkeWort = (n: number) => (n === 0 ? "keine" : n <= 3 ? "leicht" : n <= 6 ? "mittel" : n <= 8 ? "stark" : "sehr stark");

/** Die Antworten in Sätzen, so wie die Praxis sie in der Akte liest. */
export function kurzcheckText(a: KurzAntworten): string[] {
  const zeilen: string[] = [];
  if (a.keine) zeilen.push("Keine Beschwerden angegeben.");
  else {
    zeilen.push(`Wo: ${a.orte.map(ortName).join(", ")}`);
    zeilen.push(`Wie stark: ${a.staerke} von 10 (${staerkeWort(a.staerke ?? 0)}), ${a.seit ? SEIT[a.seit] : ""}`);
    if (a.zeichen.length) zeilen.push(`Wie es sich zeigt: ${a.zeichen.map((x) => ZEICHEN[a.art].find((e) => e.id === x)?.name ?? x).join(", ")}`);
  }
  zeilen.push(`Wichtig für den Termin: ${WICHTIG[a.wichtig]}`);
  if (a.notiz) zeilen.push(`Eigene Worte: „${a.notiz}“`);
  return zeilen;
}
