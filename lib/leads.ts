import { z } from "zod";
import { SPECIALTY_IDS, SPECIALTY_LABELS } from "@/lib/specialties";

/** Praxissoftware für das Anfrageformular: Zahnarzt-Systeme (VDDS-media) und Arzt-Systeme (GDT). */
export const LEAD_PVS_DENTAL = ["DS-Win", "CGM Z1", "charly", "EVIDENT"] as const;
export const LEAD_PVS_MEDICAL = ["Medistar", "TURBOMED", "CGM M1 PRO", "x.isynet", "ALBIS", "T2med"] as const;
export const LEAD_PVS = [...LEAD_PVS_DENTAL, ...LEAD_PVS_MEDICAL, "andere", "weiß nicht"] as const;

// Anfrage aus dem Formular der öffentlichen Website. "website" ist ein
// verstecktes Feld (Honeypot): Menschen lassen es leer, einfache Bots füllen
// es aus - solche Anfragen werden still verworfen.
export const leadSchema = z.object({
  practiceName: z.string().trim().min(2, "Bitte den Namen der Praxis angeben").max(120),
  contactName: z.string().trim().min(2, "Bitte Ihren Namen angeben").max(120),
  dentists: z.enum(["1", "2–3", "4–5", "mehr als 5"]),
  contact: z
    .string()
    .trim()
    .min(5, "Bitte Telefonnummer oder E-Mail angeben")
    .max(120)
    .refine((v) => /@/.test(v) || /\d{5,}/.test(v.replace(/[\s/()+-]/g, "")), "Bitte eine gültige Telefonnummer oder E-Mail angeben"),
  pvs: z.enum([...LEAD_PVS]).optional(),
  specialty: z.enum(SPECIALTY_IDS as unknown as [string, ...string[]]).optional(),
  callbackTime: z.enum(["vormittags", "mittags", "nachmittags", "egal"]).optional(),
  website: z.string().max(200).optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const isSpam = (l: LeadInput) => Boolean(l.website && l.website.trim());

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function leadEmailHtml(l: LeadInput): string {
  return `<p>Neue Anfrage über die Sorrida-Website:</p>
<ul>
<li><b>Praxis:</b> ${esc(l.practiceName)}</li>
<li><b>Ansprechpartner:</b> ${esc(l.contactName)}</li>
<li><b>Behandler:</b> ${esc(l.dentists)}</li>
<li><b>Erreichbar unter:</b> ${esc(l.contact)}</li>
${l.specialty ? `<li><b>Fachgebiet:</b> ${esc(SPECIALTY_LABELS[l.specialty] ?? l.specialty)}</li>\n` : ""}${l.pvs ? `<li><b>Praxissoftware:</b> ${esc(l.pvs)}</li>\n` : ""}${l.callbackTime ? `<li><b>Rückruf am besten:</b> ${esc(l.callbackTime)}</li>\n` : ""}</ul>`;
}
