import { Resend } from "resend";
import { betreiberMailFuss } from "@/lib/betreiber";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/** Testadresse von Resend. Nur für Versuche außerhalb der Produktion; im Betrieb darf sie nie Absender sein. */
export const RESEND_TESTABSENDER = "onboarding@resend.dev";

/** Ist eine eigene Absenderadresse gesetzt (RESEND_FROM_EMAIL)? Ohne sie gehen keine E-Mails an Patienten. */
export const eigenerAbsender = (env: Record<string, string | undefined> = process.env) => !!env.RESEND_FROM_EMAIL?.trim();

/**
 * Absender für eine E-Mail. Mit eigener Adresse: diese. Ohne: außerhalb der Produktion die Testadresse von Resend,
 * in Produktion (VERCEL_ENV=production) keine. Dann wird nicht verschickt.
 */
export function absenderAdresse(env: Record<string, string | undefined> = process.env): string | null {
  if (eigenerAbsender(env)) return env.RESEND_FROM_EMAIL!.trim();
  return env.VERCEL_ENV === "production" ? null : RESEND_TESTABSENDER;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** E-Mail von Sorrida selbst (Bestätigung, Einladung, Passwort, Morgen-Mail): Absenderangaben mit Impressum anhängen. */
  sorridaFuss?: boolean;
}

/** Absenderangaben unter E-Mails, die Sorrida selbst verschickt (lib/betreiber.ts). */
export const sorridaFussHtml = () => `<p style="color:#6b6460;font-size:13px">${escapeHtml(betreiberMailFuss())}</p>`;

// Ohne echten RESEND_API_KEY (z. B. im Testbetrieb) wird die Mail nicht
// verschickt, sondern nur serverseitig vermerkt - analog zum Testmodus der
// Berichtsgenerierung ohne Anthropic-Key. Ins Protokoll kommen nur Empfänger
// und Betreff, nie der Inhalt: Dort stehen Reset- und Einladungslinks, und
// wer das Server-Log lesen kann, könnte damit Konten übernehmen. Sobald ein
// echter Key gesetzt ist, greift automatisch der echte Versand.
/** Ist echter Mailversand eingerichtet? */
export const mailVersandAktiv = () => !!resend;

/** Dürfen E-Mails an Patienten gehen? Nur mit echtem Versand UND eigener Absenderadresse, nie mit der Testadresse von Resend. */
export const patientenMailAktiv = (env: Record<string, string | undefined> = process.env) => mailVersandAktiv() && eigenerAbsender(env);

/** Text für HTML-Mails maskieren (Namen von Personen und Praxen sind frei wählbar). */
export function escapeHtml(text: string | null | undefined): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Protokollzeile im Testmodus: nur Empfänger und Betreff, einzeilig. */
export function testmodusZeile(input: { to: string; subject: string }): string {
  const einzeilig = (t: string) => t.replace(/[\r\n]+/g, " ");
  return `[E-Mail-Testmodus, kein RESEND_API_KEY gesetzt] An: ${einzeilig(input.to)} | Betreff: ${einzeilig(input.subject)}`;
}

/** `versendet` ist nur true, wenn Resend die Mail angenommen hat (nicht im Testmodus, nicht bei Ablehnung). */
export async function sendEmail(input: SendEmailInput): Promise<{ testMode: boolean; versendet: boolean }> {
  if (!resend) {
    console.log(testmodusZeile(input));
    return { testMode: true, versendet: false };
  }

  const from = absenderAdresse();
  if (!from) {
    // Produktion ohne RESEND_FROM_EMAIL: lieber nichts verschicken als mit einer fremden Testadresse.
    console.error(`E-Mail nicht verschickt, RESEND_FROM_EMAIL fehlt: ${input.subject.replace(/[\r\n]+/g, " ")}`);
    return { testMode: false, versendet: false };
  }
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.sorridaFuss ? `${input.html}\n${sorridaFussHtml()}` : input.html,
  });
  if (error) console.error(`E-Mail nicht angenommen (${error.name}): ${input.subject}`);
  return { testMode: false, versendet: !error };
}
