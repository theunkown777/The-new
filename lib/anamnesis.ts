import { z } from "zod";
import type { GlobalCode } from "@/lib/proposals";

// Digitaler Anamnesebogen. Besser als ein abgetipptes Papierformular, weil
// die Antworten (1) als Warnhinweise für die Behandlung oben stehen und
// (2) direkt in den Behandlungsvorschlag einfließen (Raucher, Knirschen,
// Wunsch nach helleren Zähnen) statt erneut abgefragt zu werden.

export const ANAMNESIS_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type Question = {
  key: string;
  text: string;
  /** Frage nach Details bei "Ja". */
  detail?: string;
  /** Hinweis für die Behandlung bei "Ja". */
  flag?: { level: "warn" | "info"; text: string };
  /** Übernahme in den Behandlungsvorschlag. */
  proposal?: GlobalCode;
};

export const QUESTIONS: Question[] = [
  { key: "medikamente", text: "Nehmen Sie regelmäßig Medikamente?", detail: "Welche?" },
  { key: "blutverduenner", text: "Nehmen Sie blutverdünnende Medikamente (z. B. ASS, Marcumar, Eliquis, Xarelto)?", detail: "Welche?", flag: { level: "warn", text: "Blutverdünner: Blutungsrisiko bei Eingriffen" } },
  { key: "gerinnung", text: "Haben Sie eine Blutgerinnungsstörung oder bluten Sie lange nach?", flag: { level: "warn", text: "Gerinnungsstörung" } },
  { key: "bisphosphonate", text: "Erhalten oder erhielten Sie Medikamente gegen Osteoporose oder Knochenmetastasen (z. B. Bisphosphonate, Denosumab)?", detail: "Welche und seit wann?", flag: { level: "warn", text: "Antiresorptive Therapie: Risiko Kiefernekrose bei Extraktion/Implantat" } },
  { key: "allergien", text: "Haben Sie Allergien oder Unverträglichkeiten (z. B. Penicillin, Betäubungsmittel, Latex)?", detail: "Welche?", flag: { level: "warn", text: "Allergie" } },
  { key: "herz", text: "Haben Sie eine Herzerkrankung, eine künstliche Herzklappe oder einen Herzschrittmacher?", detail: "Welche?", flag: { level: "warn", text: "Herz: ggf. Endokarditis-Prophylaxe prüfen" } },
  { key: "blutdruck", text: "Haben Sie hohen Blutdruck?", flag: { level: "info", text: "Bluthochdruck" } },
  { key: "diabetes", text: "Haben Sie Diabetes?", flag: { level: "info", text: "Diabetes: Parodontitis-Risiko, Wundheilung" } },
  { key: "infektion", text: "Haben oder hatten Sie eine Infektionskrankheit (z. B. Hepatitis, HIV, Tuberkulose)?", detail: "Welche?", flag: { level: "warn", text: "Infektionskrankheit" } },
  { key: "bestrahlung", text: "Wurden Sie im Kopf- oder Halsbereich bestrahlt?", flag: { level: "warn", text: "Bestrahlung Kopf/Hals: Risiko Osteoradionekrose" } },
  { key: "schwanger", text: "Sind Sie schwanger oder könnten Sie schwanger sein?", flag: { level: "warn", text: "Schwangerschaft: Röntgen und Medikamente prüfen" } },
  { key: "rauchen", text: "Rauchen Sie?", flag: { level: "info", text: "Raucher" }, proposal: "raucher" },
  { key: "knirschen", text: "Knirschen oder pressen Sie mit den Zähnen (z. B. nachts)?", flag: { level: "info", text: "Knirschen/Pressen" }, proposal: "bruxismus" },
];

export const WISHES = [
  { key: "hell", text: "hellere Zähne", proposal: "bleaching" as GlobalCode },
  { key: "luecke", text: "eine Lücke schließen" },
  { key: "zahnfleisch", text: "Zahnfleischbluten loswerden" },
  { key: "angst", text: "Ich habe Angst vor der Behandlung" },
  { key: "kosten", text: "Kosten gering halten" },
] as const;

const answer = z.object({ yes: z.boolean(), detail: z.string().trim().max(300).optional() });

export const anamnesisSchema = z.object({
  q: z.record(z.enum(QUESTIONS.map((q) => q.key) as [string, ...string[]]), answer),
  wishes: z.array(z.enum(WISHES.map((w) => w.key) as [string, ...string[]])).max(WISHES.length).default([]),
  note: z.string().trim().max(1000).optional(),
  confirmName: z.string().trim().min(2, "Bitte Ihren Namen zur Bestätigung eintragen").max(120),
}).refine((a) => QUESTIONS.every((q) => a.q[q.key] !== undefined), { message: "Bitte alle Fragen beantworten" });
export type AnamnesisAnswers = z.infer<typeof anamnesisSchema>;

export type AnamnesisFlag = { level: "warn" | "info"; text: string; detail?: string };

export function anamnesisFlags(a: AnamnesisAnswers): AnamnesisFlag[] {
  const flags: AnamnesisFlag[] = [];
  for (const q of QUESTIONS) {
    const ans = a.q[q.key];
    if (ans?.yes && q.flag) flags.push({ ...q.flag, detail: ans.detail || undefined });
  }
  if (a.wishes.includes("angst")) flags.push({ level: "info", text: "Angstpatient: mehr Zeit einplanen" });
  return flags.sort((x, y) => (x.level === y.level ? 0 : x.level === "warn" ? -1 : 1));
}

/** Allgemeine Befunde für den Behandlungsvorschlag, die sich aus der Anamnese ergeben. */
export function anamnesisProposalGlobals(a: AnamnesisAnswers): GlobalCode[] {
  const out = new Set<GlobalCode>();
  for (const q of QUESTIONS) if (q.proposal && a.q[q.key]?.yes) out.add(q.proposal);
  for (const w of WISHES) if ("proposal" in w && a.wishes.includes(w.key)) out.add(w.proposal);
  return [...out];
}

export function parseAnamnesis(raw: unknown): AnamnesisAnswers | null {
  const p = anamnesisSchema.safeParse(raw);
  return p.success ? p.data : null;
}
