import { z } from "zod";

// Patientenakte in Sorrida: strukturierte Einträge (Allergien, Diagnosen,
// Befunde, Medikation, Notizen) und Dokumente. Ergänzt die Akte der
// Praxissoftware um das, was für Berichte, Vorschläge und die Vorbereitung
// eines Termins gebraucht wird.

export const ARTEN = ["ALLERGIE", "DIAGNOSE", "BEFUND", "MEDIKATION", "NOTIZ"] as const;
export type Art = (typeof ARTEN)[number];

export const ART_LABEL: Record<Art, string> = {
  ALLERGIE: "Allergie / Unverträglichkeit",
  DIAGNOSE: "Diagnose",
  BEFUND: "Befund",
  MEDIKATION: "Medikation",
  NOTIZ: "Notiz",
};

/** ICD-10-GM grob: Buchstabe, zwei Ziffern, optional Punkt und 1–2 Stellen, optional Zusatzkennzeichen G/V/Z/A und Seite R/L/B. */
export const ICD_RE = /^[A-Z]\d{2}(\.\d{1,2})?(\s?[GVZA])?(\s?[RLB])?$/;

export const entrySchema = z
  .object({
    art: z.enum(ARTEN),
    text: z.string().trim().min(2, "Bitte einen Text eingeben.").max(500),
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .optional()
      .nullable(),
    datum: z.string().optional().nullable(),
  })
  .refine((e) => !e.code || ICD_RE.test(e.code), { message: "Der ICD-10-Code hat ein ungültiges Format (z. B. K02.1).", path: ["code"] });

export const DOC_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};

/** Erkennt den Dateityp an den ersten Bytes, statt der Angabe des Browsers zu trauen. */
export function sniffMime(b: Uint8Array): string | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

export const safeFileName = (n: string) => n.replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120) || "dokument";

// ------------------------------------------------- Überblick vor Termin --

export interface BriefingInput {
  now: Date;
  alter: number | null;
  versicherung: string | null;
  entries: { art: string; text: string; code: string | null; datum: Date | null; inaktiv: boolean; createdAt: Date }[];
  anamneseWarnungen: string[];
  letzteBehandlung: { datum: Date; text: string } | null;
  offeneVorschlaege: { titel: string; seit: Date }[];
  offeneRechnungenCent: number;
  ueberfaellig: boolean;
  dokumente: number;
  anlass: string | null;
}

export interface Briefing {
  /** Rot hervorzuheben: Allergien und Warnungen aus der Anamnese. */
  achtung: string[];
  zeilen: { label: string; text: string }[];
}

const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Überblick für die Minute vor dem Termin, nach festen Regeln aus der Akte.
 * Wichtiges zuerst (Allergien, Warnungen), dann Diagnosen, Medikation,
 * letzte Behandlung und Offenes. Nichts wird hinzugefügt, was nicht in der
 * Akte steht.
 */
export function buildBriefing(i: BriefingInput): Briefing {
  const aktiv = i.entries.filter((e) => !e.inaktiv);
  const of = (a: Art) => aktiv.filter((e) => e.art === a);
  const achtung = [
    ...of("ALLERGIE").map((e) => `Allergie: ${e.text}`),
    ...i.anamneseWarnungen.map((w) => `Anamnese: ${w}`),
  ];
  const zeilen: Briefing["zeilen"] = [];
  if (i.anlass) zeilen.push({ label: "Anlass", text: i.anlass });
  zeilen.push({
    label: "Patient",
    text: [i.alter != null ? `${i.alter} Jahre` : "Alter unbekannt", i.versicherung].filter(Boolean).join(", "),
  });
  const diag = of("DIAGNOSE");
  if (diag.length) zeilen.push({ label: "Diagnosen", text: diag.map((e) => (e.code ? `${e.text} (${e.code})` : e.text)).join("; ") });
  const med = of("MEDIKATION");
  if (med.length) zeilen.push({ label: "Medikation", text: med.map((e) => e.text).join("; ") });
  const befund = of("BEFUND").sort((a, b) => (b.datum ?? b.createdAt).getTime() - (a.datum ?? a.createdAt).getTime())[0];
  if (befund) zeilen.push({ label: "Letzter Befund", text: `${fmt(befund.datum ?? befund.createdAt)}: ${befund.text}` });
  if (i.letzteBehandlung) zeilen.push({ label: "Letzte Behandlung", text: `${fmt(i.letzteBehandlung.datum)}: ${i.letzteBehandlung.text}` });
  if (i.offeneVorschlaege.length) {
    zeilen.push({
      label: "Offen",
      text: i.offeneVorschlaege.map((v) => `Vorschlag „${v.titel}“ seit ${fmt(v.seit)}`).join("; "),
    });
  }
  if (i.offeneRechnungenCent > 0) {
    zeilen.push({
      label: "Zahlung",
      text: `${(i.offeneRechnungenCent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € offen${i.ueberfaellig ? ", davon etwas überfällig. Taktvoll ansprechen." : "."}`,
    });
  }
  const notiz = of("NOTIZ").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (notiz) zeilen.push({ label: "Notiz", text: notiz.text });
  if (i.dokumente) zeilen.push({ label: "Dokumente", text: `${i.dokumente} in der Akte` });
  return { achtung, zeilen };
}

/** Text für den KI-Dienst: ohne Namen, Geburtsdatum, Versichertennummer. */
export function briefingAsText(b: Briefing): string {
  return [...b.achtung.map((a) => `ACHTUNG – ${a}`), ...b.zeilen.map((z) => `${z.label}: ${z.text}`)].join("\n");
}
