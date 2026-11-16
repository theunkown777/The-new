import { z } from "zod";

// Angaben der Praxis für ihre Patienten. Gegenüber dem Patienten ist die Praxis der Anbieter von Portal, Patienten-Link
// und Anamnesebogen; dort gehören ihre Pflichtangaben hin (§ 5 DDG, bei Heilberufen mit Kammer und Aufsicht) und ihre
// Datenschutzhinweise (Art. 13 DSGVO). Sorrida speichert die Angaben als ein JSON-Feld an der Praxis (Practice.stammdaten)
// und zeigt nur, was eingetragen ist. Dieselben Angaben stehen im Fuß der E-Mails an Patienten.

const text = (max: number) => z.string().trim().max(max).optional().default("");
const link = z
  .string()
  .trim()
  .max(300)
  .optional()
  .default("")
  .refine((v) => !v || /^https:\/\/[^\s]+$/i.test(v), "Bitte eine vollständige Adresse mit https:// eintragen.");

export const stammdatenSchema = z.object({
  /** Inhaberin, Inhaber oder Rechtsform, z. B. „Dr. Anna Beispiel“ oder „MVZ Beispiel GmbH“ */
  inhaber: text(160),
  strasse: text(160),
  plzOrt: text(120),
  telefon: text(40).refine((v) => !v || /^[+0-9 ()/-]{5,}$/.test(v), "Die Telefonnummer ist ungültig."),
  email: text(200).refine((v) => !v || z.string().email().safeParse(v).success, "Die E-Mail-Adresse ist ungültig."),
  /** Gesetzliche Berufsbezeichnung und Staat, in dem sie verliehen wurde */
  berufsbezeichnung: text(200),
  kammer: text(200),
  /** Zuständige Aufsicht, z. B. Kassenärztliche oder Kassenzahnärztliche Vereinigung */
  aufsicht: text(200),
  berufsordnungUrl: link,
  /** Eigenes Impressum und eigene Datenschutzhinweise der Praxis, falls sie auf ihrer Website stehen */
  impressumUrl: link,
  datenschutzUrl: link,
});
export type Stammdaten = z.infer<typeof stammdatenSchema>;

export const LEERE_STAMMDATEN: Stammdaten = stammdatenSchema.parse({});

/** Liest das gespeicherte JSON. Unbekanntes oder Kaputtes ergibt leere Angaben, nie einen Fehler auf einer Patientenseite. */
export function leseStammdaten(json: unknown): Stammdaten {
  const r = stammdatenSchema.safeParse(json ?? {});
  return r.success ? r.data : LEERE_STAMMDATEN;
}

/** „Praxisname, Straße, PLZ Ort, Telefon …“ mit dem, was vorhanden ist. */
export function praxisZeile(name: string, s: Stammdaten): string {
  return [name, s.strasse, s.plzOrt, s.telefon ? `Telefon ${s.telefon}` : ""].map((x) => x.trim()).filter(Boolean).join(", ");
}

/** Was für den Auftritt gegenüber Patienten noch fehlt (für den Hinweis in den Einstellungen). */
export function stammdatenFehlen(s: Stammdaten): string[] {
  const fehlt: string[] = [];
  if (!s.inhaber) fehlt.push("Inhaber oder Rechtsform");
  if (!s.strasse || !s.plzOrt) fehlt.push("Anschrift");
  if (!s.telefon) fehlt.push("Telefon");
  if (!s.email) fehlt.push("E-Mail-Adresse");
  if (!s.berufsbezeichnung) fehlt.push("Berufsbezeichnung");
  if (!s.kammer) fehlt.push("zuständige Kammer");
  if (!s.aufsicht) fehlt.push("zuständige Aufsicht");
  if (!s.datenschutzUrl) fehlt.push("Datenschutzhinweise der Praxis");
  return fehlt;
}

/**
 * Was für die öffentliche Buchungsseite für neue Patienten (/t/<kennung>) noch fehlt. Dort geben Menschen
 * Namen, Geburtsdatum und Kontaktdaten ein, die noch keine Patienten sind: Die Seite muss zeigen, wer die Praxis
 * ist und wo ihre Datenschutzhinweise stehen. Ohne diese Angaben lässt sich die Seite nicht einschalten.
 */
export function buchungsseiteFehlt(s: Stammdaten): string[] {
  const fehlt: string[] = [];
  if (!s.strasse || !s.plzOrt) fehlt.push("Anschrift");
  if (!s.datenschutzUrl) fehlt.push("Link zu den Datenschutzhinweisen der Praxis");
  return fehlt;
}
