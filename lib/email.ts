import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const resend = apiKey ? new Resend(apiKey) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Ohne echten RESEND_API_KEY (z. B. im Testbetrieb) wird die Mail nicht
// verschickt, sondern nur serverseitig vermerkt - analog zum Testmodus der
// Berichtsgenerierung ohne Anthropic-Key. Ins Protokoll kommen nur Empfänger
// und Betreff, nie der Inhalt: Dort stehen Reset- und Einladungslinks, und
// wer das Server-Log lesen kann, könnte damit Konten übernehmen. Sobald ein
// echter Key gesetzt ist, greift automatisch der echte Versand.
/** Ist echter Mailversand eingerichtet? */
export const mailVersandAktiv = () => !!resend;

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

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) console.error(`E-Mail nicht angenommen (${error.name}): ${input.subject}`);
  return { testMode: false, versendet: !error };
}
