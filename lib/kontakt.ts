import { z } from "zod";

// Kontaktdaten und Einwilligung. Nachrichten per E-Mail gehen nur raus, wenn
// eine Adresse hinterlegt ist UND die Einwilligung dokumentiert ist.
export const kontaktSchema = z.object({
  email: z.string().trim().max(200).optional().nullable().refine((v) => !v || z.string().email().safeParse(v).success, "Die E-Mail-Adresse ist ungültig."),
  phone: z.string().trim().max(40).optional().nullable().refine((v) => !v || /^[+0-9 ()/-]{6,}$/.test(v), "Die Telefonnummer ist ungültig."),
  einwilligung: z.boolean().optional(),
  /** Eigene Einwilligung für WhatsApp (getrennt von E-Mail) */
  whatsapp: z.boolean().optional(),
  geschlecht: z.enum(["W", "M", "D"]).optional().nullable().or(z.literal("")),
});

export type NachrichtArt = "termin-bestaetigung" | "termin-erinnerung" | "zahlungserinnerung";

export function darfMailen(p: { email: string | null; contactConsentAt: Date | null }): { ok: true } | { ok: false; grund: string } {
  if (!p.email) return { ok: false, grund: "Keine E-Mail-Adresse hinterlegt." };
  if (!p.contactConsentAt) return { ok: false, grund: "Keine Einwilligung in Nachrichten per E-Mail dokumentiert." };
  return { ok: true };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Schlichte Mail: der Text, die Praxis als Absender, ein Satz zum Abbestellen. Keine Gesundheitsdaten außer dem Anlass, den die Praxis selbst einträgt. */
export function mailHtml(a: { text: string; practiceName: string }): string {
  const linked = esc(a.text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#24201f;max-width:560px">
<p>${linked}</p>
<p style="color:#6b6460;font-size:13px">${esc(a.practiceName)} · Sie erhalten diese Nachricht, weil Sie der Praxis Ihre Einwilligung gegeben haben. Wenn Sie keine Nachrichten mehr möchten, sagen Sie es bitte der Praxis.</p>
</div>`;
}

export const BETREFF: Record<NachrichtArt, (praxis: string) => string> = {
  "termin-bestaetigung": (p) => `Ihr Termin bei ${p}`,
  "termin-erinnerung": (p) => `Erinnerung an Ihren Termin bei ${p}`,
  "zahlungserinnerung": (p) => `Zahlungserinnerung von ${p}`,
};
