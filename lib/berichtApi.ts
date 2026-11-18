import { z } from "zod";
import { DENTAL_ID, SPECIALTY_IDS } from "@/lib/specialties";

// Eingabe der Partner-Schnittstelle POST /api/v1/reports/generate (openapi.yaml: GenerateReportRequest).
// Hier statt in der Route, damit lib/berichtApi.test.ts die Regeln ohne Server prüfen kann.

const entrySchema = z.object({
  system: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  performed: z.boolean(),
  toothNumbers: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  note: z.string().optional().nullable(),
});

export const generateReportSchema = z.object({
  reportType: z.enum(["BEFUND", "KRANKENKASSE"]),
  practiceName: z.string().min(1),
  authorName: z.string().min(1),
  /** Fachrichtung der Praxis (wie in lib/specialties.ts). Bestimmt Stil und Platzhalter des Berichts. */
  fach: z.enum(SPECIALTY_IDS as unknown as [string, ...string[]], { error: "Unbekannte Fachrichtung (fach)" }).optional().nullable(),
  patient: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    birthDate: z.string().optional().nullable(),
    insuranceName: z.string().optional().nullable(),
    insuranceNumber: z.string().optional().nullable(),
  }),
  treatmentDate: z.string().optional().nullable(),
  entries: z.array(entrySchema).min(1),
  additionalContext: z.string().optional().nullable(),
});

/**
 * Fach für den Bericht, in dieser Reihenfolge (openapi.yaml):
 * 1. `fach` im Aufruf,
 * 2. die Fachrichtung, für die der Schlüssel ausgestellt ist (ApiClient.fach; ein Schlüssel gehört zu keiner Praxis),
 * 3. Zahnmedizin nur, wenn die Einträge zahnärztliche Verzeichnisse nennen (GOZ, BEMA),
 * 4. sonst neutral "andere". Zahnmedizin ist nie der stille Standard.
 */
export function berichtFachFuerApi(
  fach: string | null | undefined,
  schluesselFach: string | null | undefined,
  entries: { system: string }[],
): string {
  if (fach) return fach;
  if (schluesselFach && (SPECIALTY_IDS as readonly string[]).includes(schluesselFach)) return schluesselFach;
  if (entries.some((e) => e.system === "GOZ" || e.system === "BEMA")) return DENTAL_ID;
  return "andere";
}
