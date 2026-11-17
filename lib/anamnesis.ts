import { z } from "zod";
import type { GlobalCode } from "@/lib/proposals";
import { ageFromBirthDate } from "@/lib/proposals";
import {
  ANAMNESE_FRAGEN,
  ANLIEGEN,
  ZAHN,
  ZAHN_VORSCHLAG_ANLIEGEN,
  ZAHN_VORSCHLAG_FRAGEN,
  anamneseFuer,
  type AnamneseProfil,
} from "@/lib/anamneseProfile";

// Digitaler Anamnesebogen. Besser als ein abgetipptes Papierformular, weil die Antworten (1) als Hinweise für die
// Behandlung oben stehen und (2) in der Zahnmedizin direkt in den Behandlungsvorschlag einfließen (Raucher,
// Knirschen, Wunsch nach helleren Zähnen) statt erneut abgefragt zu werden.
//
// Welche Fragen ein Fach stellt, steht in lib/anamneseProfile.ts. Hier stehen Prüfung, Speicherform und Anzeige.
// Gespeichert wird { v: 2, fach, ansprache, q, wishes, note, confirmName }. Ältere Bögen ohne `v` (Fassung 1,
// ohne Fach) bleiben lesbar.

export const ANAMNESIS_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const ALLE_FRAGEN = "Bitte alle Fragen beantworten";
const FREMD = "Der Bogen hat sich geändert. Bitte laden Sie die Seite neu.";
const fremdeSchluessel = (iss: { code?: string }) => (iss.code === "unrecognized_keys" ? FREMD : undefined);

const answer = z.object({ yes: z.boolean(), detail: z.string().trim().max(300).optional() }, { error: ALLE_FRAGEN });
const note = z.string().trim().max(1000).optional();
const confirmName = z.string().trim().min(2, "Bitte Ihren Namen zur Bestätigung eintragen").max(120);

/** Prüfung für den Bogen eines Fachs: genau seine Fragen, nur seine Anliegen, fremde Schlüssel werden abgelehnt. */
export function anamnesisSchemaFuer(profil: Pick<AnamneseProfil, "fragen" | "anliegen">) {
  const anliegen = profil.anliegen.map((a) => a.key) as [string, ...string[]];
  return z.strictObject(
    {
      q: z.strictObject(Object.fromEntries(profil.fragen.map((f) => [f.key, answer])), { error: fremdeSchluessel }),
      wishes: z
        .array(z.enum(anliegen, { error: FREMD }))
        .max(anliegen.length)
        .default([])
        .transform((w) => [...new Set(w)]),
      note,
      confirmName,
    },
    { error: fremdeSchluessel },
  );
}

/** Fassung 1 (bis November 2026): fester Fragensatz ohne Fach. Nur, um ältere offene Bögen noch anzunehmen. */
const V1_FRAGEN = ["medikamente", "blutverduenner", "gerinnung", "bisphosphonate", "allergien", "herz", "blutdruck", "diabetes", "infektion", "bestrahlung", "schwanger", "rauchen", "knirschen"];
const V1_ANLIEGEN = ["hell", "luecke", "zahnfleisch", "angst", "kosten"];
const v1Schema = z.strictObject({
  q: z.partialRecord(z.enum(V1_FRAGEN as [string, ...string[]]), answer),
  wishes: z.array(z.enum(V1_ANLIEGEN as [string, ...string[]])).max(V1_ANLIEGEN.length).default([]),
  note,
  confirmName,
});

/** Gelesene Anamnese (Fassung 1 oder 2). */
export type Anamnese = {
  v: 1 | 2;
  /** Bogen, der gefragt wurde ("zahn", Fach-ID, "neutral"); null bei Fassung 1. */
  fach: string | null;
  ansprache: "patient" | "eltern";
  q: Record<string, { yes: boolean; detail?: string }>;
  wishes: string[];
  note?: string;
  confirmName: string;
};
/** Früherer Name. */
export type AnamnesisAnswers = Anamnese;

export type AnamnesePruefung = { ok: true; daten: Anamnese } | { ok: false; fehler: string };

/**
 * Prüft die Antworten gegen den Bogen des Fachs und liefert die Speicherform (Fassung 2).
 * `altbestand`: Der Bogen wurde vor der Fachangabe angelegt (AnamnesisForm.fach fehlt). Dann wird auch die alte
 * Fassung angenommen, damit niemand an einem vorher geöffneten Bogen scheitert. Fremde Anliegen fallen dabei weg;
 * beantwortete Fragen bleiben erhalten, weil sie Hinweise wie Blutverdünner tragen.
 */
export function anamnesePruefen(body: unknown, profil: AnamneseProfil, opts: { altbestand?: boolean } = {}): AnamnesePruefung {
  const p = anamnesisSchemaFuer(profil).safeParse(body);
  if (p.success) return { ok: true, daten: speicherform(profil, p.data) };
  if (opts.altbestand) {
    const alt = v1Schema.safeParse(body);
    const pflicht = profil.fragen.map((f) => f.key).filter((k) => V1_FRAGEN.includes(k));
    if (alt.success && pflicht.every((k) => alt.data.q[k] !== undefined)) {
      const erlaubt = new Set(profil.anliegen.map((a) => a.key));
      const q = Object.fromEntries(Object.entries(alt.data.q).filter(([k]) => k !== "knirschen" || profil.fach === ZAHN)) as Record<string, { yes: boolean; detail?: string }>;
      return { ok: true, daten: speicherform(profil, { ...alt.data, q, wishes: alt.data.wishes.filter((w) => erlaubt.has(w)) }) };
    }
  }
  return { ok: false, fehler: p.error.issues[0]?.message ?? "Ungültige Angaben" };
}

function speicherform(profil: AnamneseProfil, e: { q: Record<string, { yes: boolean; detail?: string }>; wishes: string[]; note?: string; confirmName: string }): Anamnese {
  const q = Object.fromEntries(Object.entries(e.q).map(([k, a]) => [k, a.yes ? { yes: true, ...(a.detail ? { detail: a.detail } : {}) } : { yes: false }]));
  return { v: 2, fach: profil.fach, ansprache: profil.ansprache, q, wishes: e.wishes, ...(e.note ? { note: e.note } : {}), confirmName: e.confirmName };
}

/** Der Bogen für ein angelegtes Formular: Fach als Momentaufnahme vom Anlegen, sonst das heutige Fach der Praxis. */
export function anamneseProfilFuer(
  formFach: string | null | undefined,
  praxisFach: string | null | undefined,
  patient: { birthDate?: Date | string | null; geschlecht?: string | null },
): AnamneseProfil {
  return anamneseFuer(formFach ?? praxisFach, { geschlecht: patient.geschlecht ?? null, alter: ageFromBirthDate(patient.birthDate ?? null) });
}

const gespeichert = z.object({
  v: z.literal(2).optional(),
  fach: z.string().optional(),
  ansprache: z.enum(["patient", "eltern"]).optional(),
  q: z.record(z.string(), z.object({ yes: z.boolean(), detail: z.string().optional() })),
  wishes: z.array(z.string()).default([]),
  note: z.string().optional(),
  confirmName: z.string(),
});

export function parseAnamnesis(raw: unknown): Anamnese | null {
  const p = gespeichert.safeParse(raw);
  if (!p.success) return null;
  const d = p.data;
  return {
    v: d.v === 2 ? 2 : 1,
    fach: d.v === 2 ? (d.fach ?? null) : null,
    ansprache: d.ansprache ?? "patient",
    q: d.q,
    wishes: d.wishes,
    ...(d.note ? { note: d.note } : {}),
    confirmName: d.confirmName,
  };
}

export type AnamnesisFlag = { level: "warn" | "info"; text: string; detail?: string };

/** Hinweise aus den beantworteten Fragen und Anliegen. Sie nennen die Angabe, nicht, was daraus folgt. */
export function anamnesisFlags(a: Anamnese): AnamnesisFlag[] {
  const flags: AnamnesisFlag[] = [];
  for (const [k, f] of Object.entries(ANAMNESE_FRAGEN)) {
    const ans = a.q[k];
    if (ans?.yes && f.hinweis) flags.push({ ...f.hinweis, detail: ans.detail || undefined });
  }
  for (const w of a.wishes) {
    const h = ANLIEGEN[w]?.hinweis;
    if (h) flags.push({ ...h });
  }
  return flags.sort((x, y) => (x.level === y.level ? 0 : x.level === "warn" ? -1 : 1));
}

/**
 * Allgemeine Befunde für den zahnärztlichen Behandlungsvorschlag. Nur, wenn der Bogen zahnärztlich war;
 * bei Fassung 1 (ohne Fach) entscheidet das Fach der Praxis.
 */
export function anamnesisProposalGlobals(a: Anamnese, praxisFach?: string | null): GlobalCode[] {
  if ((a.fach ?? praxisFach) !== ZAHN) return [];
  const out = new Set<GlobalCode>();
  for (const [k, code] of Object.entries(ZAHN_VORSCHLAG_FRAGEN)) if (a.q[k]?.yes) out.add(code);
  for (const [k, code] of Object.entries(ZAHN_VORSCHLAG_ANLIEGEN)) if (a.wishes.includes(k)) out.add(code);
  return [...out];
}

export type AnamneseZeile = { frage: string; antwort: string; ja: boolean };

/** Alle Antworten zum Nachlesen: nur, was gefragt und beantwortet wurde, in der Reihenfolge des Katalogs. */
export function anamneseZeilen(a: Anamnese): AnamneseZeile[] {
  const eltern = a.ansprache === "eltern";
  return Object.values(ANAMNESE_FRAGEN)
    .filter((f) => a.q[f.key] !== undefined)
    .map((f) => {
      const ans = a.q[f.key];
      return { frage: eltern ? (f.textEltern ?? f.text) : f.text, antwort: ans.yes ? `Ja${ans.detail ? `: ${ans.detail}` : ""}` : "Nein", ja: ans.yes };
    });
}

/** Angekreuzte Anliegen als Text. */
export function anliegenTexte(a: Anamnese): string[] {
  const eltern = a.ansprache === "eltern";
  return a.wishes.flatMap((w) => {
    const x = ANLIEGEN[w];
    return x ? [eltern ? (x.textEltern ?? x.text) : x.text] : [];
  });
}
