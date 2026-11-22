import { z } from "zod";
import { fachText } from "@/lib/fachText";

// Digitales Einverständnis im Patientenportal. Ersetzt nicht die schriftliche
// Vereinbarung des Fachs (Schriftform, vereinbarungFuer in lib/fachprofile.ts), dokumentiert aber vorab,
// dass der Patient Vorschlag, Kassenanteil und Eigenanteil gesehen und seine
// Wahl bestätigt hat.

export const MAX_SIGNATURE_BYTES = 80_000;

export const agreementSchema = z.object({
  name: z.string().trim().min(3, "Bitte Ihren vollständigen Namen eingeben").max(120),
  accept: z.literal(true, { error: "Bitte bestätigen Sie die Erklärung" }),
  signature: z
    .string()
    .max(MAX_SIGNATURE_BYTES, "Die Unterschrift ist zu groß")
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Bitte unterschreiben Sie im Feld"),
});

/**
 * Erklärungstext, der dem Patienten gezeigt und mit gespeichert wird. Mit `fach` in den Wörtern des Fachs
 * („Beratungsvorschlag“, „vor der Beratung in der Apotheke“); der Name der Praxis bleibt, wie er ist.
 */
export function agreementText(a: { practiceName: string; date: string; choices: string[]; kasse: number; eigen: number; privat?: boolean; fach?: string | null }): string {
  const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
  const ft = (s: string) => fachText(s, a.fach);
  return [
    `${ft("Ich habe den Behandlungsvorschlag von")} ${a.practiceName} vom ${a.date} gelesen.`,
    a.choices.length ? `Ich wähle: ${a.choices.join("; ")}.` : "",
    `Mir ist bekannt, dass meine ${a.privat ? "Versicherung nach meinem Tarif" : "Krankenkasse"} voraussichtlich ${eur(a.kasse)} ${a.privat ? "erstattet" : "übernimmt"} und mein Eigenanteil voraussichtlich ${eur(a.eigen)} beträgt.`,
    ft("Die schriftliche Vereinbarung unterschreibe ich vor der Behandlung in der Praxis. Ich kann meine Entscheidung bis dahin jederzeit ändern."),
  ]
    .filter(Boolean)
    .join(" ");
}
