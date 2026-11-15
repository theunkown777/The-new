import { z } from "zod";

// Kontaktdaten und Einwilligung. Nachrichten per E-Mail gehen nur raus, wenn
// eine Adresse hinterlegt ist UND die Einwilligung dokumentiert ist.
export const kontaktSchema = z.object({
  email: z.string().trim().max(200).optional().nullable().refine((v) => !v || z.string().email().safeParse(v).success, "Die E-Mail-Adresse ist ungültig."),
  phone: z.string().trim().max(40).optional().nullable().refine((v) => !v || /^[+0-9 ()/-]{6,}$/.test(v), "Die Telefonnummer ist ungültig."),
  einwilligung: z.boolean().optional(),
  /** Eigene Einwilligung für WhatsApp (getrennt von E-Mail) */
  whatsapp: z.boolean().optional(),
  /** Eigene Einwilligung, an offene Behandlungs- und Kostenvorschläge erinnert zu werden */
  nachfassen: z.boolean().optional(),
  /** Auf welchem Weg neu erteilte Einwilligungen aufgenommen wurden */
  weg: z.enum(["muendlich", "formular"]).optional(),
  geschlecht: z.enum(["W", "M", "D"]).optional().nullable().or(z.literal("")),
  /**
   * Geburtsdatum nachtragen oder berichtigen ("JJJJ-MM-TT"). Leer = unverändert: Es lässt sich hier
   * nicht entfernen, weil das Patientenportal es vor Unterschrift und Lastschrift abfragt.
   */
  geburtsdatum: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => {
      if (!v) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d.getUTCFullYear() >= 1900 && d.getTime() <= Date.now();
    }, "Das Geburtsdatum ist ungültig."),
});

// ── Einwilligungen: Wortlaut und Vermerk ─────────────────────────────────────────────────────────────
// Eine Einwilligung ist nur nachweisbar, wenn feststeht, was dem Patienten gesagt wurde und wer sie wann wie
// aufgenommen hat (Art. 7 Abs. 1 DSGVO). Der Wortlaut steht deshalb hier an einer Stelle; die Praxis liest ihn vor
// oder druckt ihn aus. Der Zeitpunkt steht am Patienten (contactConsentAt, whatsappConsentAt, nachfassConsentAt),
// wer und wie im Feld einwilligungVermerk.

export type EinwilligungArt = "email" | "whatsapp" | "nachfassen";
export const EINWILLIGUNG_WEGE = { muendlich: "mündlich in der Praxis", formular: "unterschriebenes Formular" } as const;
export type EinwilligungWeg = keyof typeof EINWILLIGUNG_WEGE;
export type EinwilligungVermerk = Partial<Record<EinwilligungArt, { von: string; weg: EinwilligungWeg }>>;

/** Wortlaut der Einwilligung aus Sicht des Patienten. Ohne Adresse oder Nummer bleibt der Satz vollständig. */
export function einwilligungsText(art: EinwilligungArt, a: { praxis: string; email?: string | null; nummer?: string | null }): string {
  const praxis = a.praxis.trim() || "meine Praxis";
  switch (art) {
    case "email":
      return `Ich bin einverstanden, dass mir ${praxis} Terminbestätigungen, Terminerinnerungen und Zahlungserinnerungen per E-Mail${a.email ? ` an ${a.email}` : ""} schickt. Die E-Mails sind nicht Ende-zu-Ende verschlüsselt und nennen die Praxis, den Termin und gegebenenfalls Rechnungsnummer und Betrag, aber keine Befunde. Der Versand läuft über Dienstleister der Praxis, auch mit Sitz in den USA. Ich kann die Einwilligung jederzeit bei der Praxis widerrufen.`;
    case "whatsapp":
      return `Ich bin einverstanden, dass mir ${praxis} Terminnachrichten, meinen persönlichen Link und Zahlungserinnerungen über WhatsApp${a.nummer ? ` an ${a.nummer}` : ""} schickt. WhatsApp gehört zu Meta; meine Nummer und der Zeitpunkt der Nachrichten werden dort verarbeitet, auch in den USA. In den Nachrichten stehen keine Befunde und keine Beträge. Ich kann die Einwilligung jederzeit bei der Praxis widerrufen.`;
    case "nachfassen":
      return `Ich möchte, dass mich ${praxis} an offene Behandlungs- und Kostenvorschläge erinnert: per Anruf oder auf den Wegen, denen ich oben zugestimmt habe. Ich kann das jederzeit bei der Praxis widerrufen.`;
  }
}

export function leseVermerk(json: unknown): EinwilligungVermerk {
  const aus: EinwilligungVermerk = {};
  if (!json || typeof json !== "object") return aus;
  for (const art of ["email", "whatsapp", "nachfassen"] as const) {
    const v = (json as Record<string, unknown>)[art] as { von?: unknown; weg?: unknown } | undefined;
    if (v && typeof v.von === "string" && typeof v.weg === "string" && v.weg in EINWILLIGUNG_WEGE) aus[art] = { von: v.von.slice(0, 120), weg: v.weg as EinwilligungWeg };
  }
  return aus;
}

/**
 * Schreibt eine Einwilligung fort. `gewuenscht` undefined = unverändert. Der Zeitpunkt bleibt, solange die
 * Einwilligung besteht; neu erteilt bekommt sie Zeitpunkt und Vermerk (wer, wie), ein Widerruf löscht beides.
 */
export function einwilligungFortschreiben(
  alt: { am: Date | null; vermerk?: { von: string; weg: EinwilligungWeg } },
  gewuenscht: boolean | undefined,
  neu: { von: string; weg: EinwilligungWeg; jetzt?: Date },
): { am: Date | null; vermerk?: { von: string; weg: EinwilligungWeg } } {
  if (gewuenscht === undefined) return alt;
  if (!gewuenscht) return { am: null };
  if (alt.am) return alt;
  return { am: neu.jetzt ?? new Date(), vermerk: { von: neu.von, weg: neu.weg } };
}

/** „dokumentiert am 15.11.2026, aufgenommen von Frau Muster, mündlich in der Praxis“ */
export function vermerkText(am: string, v?: { von: string; weg: EinwilligungWeg }): string {
  return `Einwilligung dokumentiert am ${am}${v ? `, aufgenommen von ${v.von}, ${EINWILLIGUNG_WEGE[v.weg]}` : ""}.`;
}

export type NachrichtArt = "termin-bestaetigung" | "termin-erinnerung" | "zahlungserinnerung";

export function darfMailen(p: { email: string | null; contactConsentAt: Date | null }): { ok: true } | { ok: false; grund: string } {
  if (!p.email) return { ok: false, grund: "Keine E-Mail-Adresse hinterlegt." };
  if (!p.contactConsentAt) return { ok: false, grund: "Keine Einwilligung in Nachrichten per E-Mail dokumentiert." };
  return { ok: true };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Schlichte Mail: der Text, die Praxis als erkennbarer Absender (Name, Anschrift und Telefon, soweit hinterlegt:
 * `absender` aus praxisZeile in lib/praxisStammdaten.ts), ein Satz zum Widerruf und der Hinweis auf den Versand über Sorrida.
 * Keine Gesundheitsdaten außer dem Anlass, den die Praxis selbst einträgt.
 */
export function mailHtml(a: { text: string; practiceName: string; absender?: string }): string {
  const linked = esc(a.text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#24201f;max-width:560px">
<p>${linked}</p>
<p style="color:#6b6460;font-size:13px">${esc(a.absender?.trim() || a.practiceName)}. Sie erhalten diese Nachricht, weil Sie der Praxis dafür Ihre Einwilligung gegeben haben. Widerruf jederzeit bei der Praxis. Versand im Auftrag der Praxis über Sorrida.</p>
</div>`;
}

export const BETREFF: Record<NachrichtArt, (praxis: string) => string> = {
  "termin-bestaetigung": (p) => `Ihr Termin bei ${p}`,
  "termin-erinnerung": (p) => `Erinnerung an Ihren Termin bei ${p}`,
  "zahlungserinnerung": (p) => `Zahlungserinnerung von ${p}`,
};
