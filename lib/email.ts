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
// verschickt, sondern nur serverseitig geloggt - analog zum Testmodus der
// Berichtsgenerierung ohne Anthropic-Key. So bleiben Passwort-Reset und
// E-Mail-Verifizierung ohne Kosten durchspielbar; sobald ein echter Key
// gesetzt ist, greift automatisch der echte Versand.
/** Ist echter Mailversand eingerichtet? */
export const mailVersandAktiv = () => !!resend;

export async function sendEmail(input: SendEmailInput): Promise<{ testMode: boolean }> {
  if (!resend) {
    console.log(
      `[E-Mail-Testmodus, kein RESEND_API_KEY gesetzt] An: ${input.to} | Betreff: ${input.subject}\n${input.html}`
    );
    return { testMode: true };
  }

  await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  return { testMode: false };
}
