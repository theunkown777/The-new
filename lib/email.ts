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

// ------------------------------------------------------------------ Hülle --
// Eine Hülle für alle Mails: einspaltig, 600 px, Papier als Hintergrund, dunkle Schrift auf Weiß.
// Lesbar ohne Bilder: keine Bilder, keine nachgeladenen Schriften, nichts von fremden Servern.

const MAIL_PAPIER = "#F5F2EE";
const MAIL_TINTE = "#24201F";
const MAIL_TINTE_2 = "#5E5650";
const MAIL_BORDEAUX = "#5A1D1D";
const MAIL_LINIE = "#DCD2C6";
const MAIL_SCHRIFT = "Arial,Helvetica,sans-serif";
/** Kennzeichen der Hülle, damit ein Inhalt nie doppelt eingepackt wird. */
const MAIL_HUELLE_KENNUNG = 'data-sorrida-huelle="1"';

export interface MailHuelleInput {
  betreff: string;
  /** Inhalt als HTML. Freie Texte (Namen) müssen bereits mit escapeHtml maskiert sein. */
  inhalt: string;
  /** Vorschauzeile im Posteingang; ohne Angabe steht dort der Betreff. */
  vorschau?: string;
  /** Wortmarke oben. Nur für Mails von Sorrida selbst; Nachrichten einer Praxis an ihre Patienten tragen keine. */
  marke?: boolean;
  /** Fuß als HTML, z. B. sorridaFussHtml(). */
  fuss?: string;
}

/** Ist dieses HTML schon eingepackt? */
export const istMailHuelle = (html: string) => html.includes(MAIL_HUELLE_KENNUNG);

/** Hülle um den Inhalt einer Mail (reine Funktion). */
export function mailHuelle(a: MailHuelleInput): string {
  if (istMailHuelle(a.inhalt)) return a.inhalt;
  const einzeilig = (t: string) => t.replace(/\s+/g, " ").trim();
  const betreff = escapeHtml(einzeilig(a.betreff));
  const vorschau = escapeHtml(einzeilig(a.vorschau ?? a.betreff));
  const marke = a.marke
    ? `<tr><td style="padding:4px 8px 16px 8px;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.3em;color:${MAIL_BORDEAUX};">SORRIDA</td></tr>`
    : "";
  const fuss = a.fuss ? `<tr><td style="padding:16px 8px 0 8px;font-family:${MAIL_SCHRIFT};font-size:13px;line-height:1.5;color:${MAIL_TINTE_2};">${a.fuss}</td></tr>` : "";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${betreff}</title>
</head>
<body style="margin:0;padding:0;background-color:${MAIL_PAPIER};color:${MAIL_TINTE};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${vorschau}</div>
<table role="presentation" ${MAIL_HUELLE_KENNUNG} width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${MAIL_PAPIER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
${marke}
<tr><td style="background-color:#FFFFFF;border:1px solid ${MAIL_LINIE};border-radius:10px;padding:28px;font-family:${MAIL_SCHRIFT};font-size:16px;line-height:1.55;color:${MAIL_TINTE};text-align:left;">
${a.inhalt}
</td></tr>
${fuss}
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Knopf für Mails: ein Link im Aussehen eines Knopfes, darunter die Adresse sichtbar zum Kopieren.
 * Nur http- und https-Adressen werden verlinkt; alles andere steht als Text da.
 */
export function mailKnopf(text: string, url: string): string {
  const adresse = escapeHtml(url.trim());
  if (!/^https?:\/\//i.test(url.trim())) return `<p>${escapeHtml(text)}: ${adresse}</p>`;
  return `<p style="margin:20px 0 8px 0;"><a href="${adresse}" style="display:inline-block;background-color:${MAIL_BORDEAUX};color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:6px;">${escapeHtml(text)}</a></p>
<p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:${MAIL_TINTE_2};word-break:break-all;">Oder diese Adresse in den Browser kopieren:<br><a href="${adresse}" style="color:${MAIL_BORDEAUX};">${adresse}</a></p>`;
}

/** Fertiges HTML einer Mail: Inhalt in der Hülle, bei Mails von Sorrida mit Wortmarke und Absenderangaben. */
export function mailFertig(input: { subject: string; html: string; sorridaFuss?: boolean }): string {
  return mailHuelle({ betreff: input.subject, inhalt: input.html, marke: !!input.sorridaFuss, fuss: input.sorridaFuss ? sorridaFussHtml() : undefined });
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
    // Jede Mail geht in der Sorrida-Hülle hinaus, gleich von welcher Stelle sie kommt.
    html: mailFertig(input),
  });
  if (error) console.error(`E-Mail nicht angenommen (${error.name}): ${input.subject}`);
  return { testMode: false, versendet: !error };
}
