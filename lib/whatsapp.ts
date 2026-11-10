import { terminZeit } from "@/lib/termine";

// Nachrichten per WhatsApp. Zwei Wege:
// 1. Ohne Einrichtung: Sorrida öffnet WhatsApp (App oder WhatsApp Web) auf dem Praxisgerät mit
//    fertigem Text und Empfänger; die Praxis tippt nur noch auf „Senden“. Absender ist das
//    WhatsApp der Praxis.
// 2. Mit WhatsApp Business Platform (Zugangsdaten in WHATSAPP_TOKEN und WHATSAPP_PHONE_NUMBER_ID,
//    freigegebene Vorlage in WHATSAPP_VORLAGE): Sorrida verschickt selbst.
// In beiden Fällen gilt: nur mit Mobilnummer und eigener Einwilligung, und in der Nachricht
// stehen keine Gesundheitsangaben (kein Anlass, keine Beträge), nur Termin oder Link.

export type WhatsappArt = "portal-link" | "termin-bestaetigung" | "termin-erinnerung" | "zahlungserinnerung";

/** Mobilnummer in die Form, die WhatsApp erwartet: nur Ziffern mit Ländervorwahl (deutsche Nummern ohne Vorwahl bekommen 49). */
export function whatsappNummer(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let n = phone.replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("0")) n = "49" + n.slice(1);
  else return null; // ohne führende 0 oder Ländervorwahl nicht eindeutig
  n = n.replace(/\D/g, "");
  return n.length >= 10 && n.length <= 15 ? n : null;
}

export function darfWhatsapp(p: { phone: string | null; whatsappConsentAt: Date | null }): { ok: true; nummer: string } | { ok: false; grund: string } {
  if (!p.phone) return { ok: false, grund: "Keine Mobilnummer hinterlegt." };
  const nummer = whatsappNummer(p.phone);
  if (!nummer) return { ok: false, grund: "Die Mobilnummer ist nicht vollständig (bitte mit 0 oder Ländervorwahl eintragen, z. B. 0171 2345678)." };
  if (!p.whatsappConsentAt) return { ok: false, grund: "Keine Einwilligung in Nachrichten per WhatsApp dokumentiert." };
  return { ok: true, nummer };
}

/** Link, der WhatsApp mit Empfänger und fertigem Text öffnet. Ohne Nummer wählt man den Kontakt in WhatsApp selbst. */
export const waLink = (nummer: string | null, text: string) => `https://wa.me/${nummer ?? ""}?text=${encodeURIComponent(text)}`;

export function whatsappText(art: WhatsappArt, a: { firstName: string; practiceName: string; start?: Date; ort?: string | null; url?: string }): string {
  const ort = a.ort ? ` (${a.ort})` : "";
  switch (art) {
    case "termin-bestaetigung":
      return `Hallo ${a.firstName}, Ihr Termin bei ${a.practiceName}${ort} ist eingetragen: ${terminZeit(a.start!)} Uhr. Falls Sie nicht kommen können, sagen Sie bitte rechtzeitig ab.`;
    case "termin-erinnerung":
      return `Hallo ${a.firstName}, kurze Erinnerung an Ihren Termin bei ${a.practiceName}${ort} am ${terminZeit(a.start!)} Uhr. Absagen bitte telefonisch.`;
    case "zahlungserinnerung":
      return `Hallo ${a.firstName}, ${a.practiceName} hat eine offene Rechnung für Sie hinterlegt. Unter diesem persönlichen Link sehen Sie die Details und können direkt bezahlen: ${a.url}`;
    default:
      return `Hallo ${a.firstName}, hier ist Ihr persönlicher Link von ${a.practiceName}: ${a.url} Dort finden Sie Ihre Unterlagen, Termine und Rechnungen. Bitte geben Sie den Link nicht weiter.`;
  }
}

export const whatsappApiAktiv = (env: Record<string, string | undefined> = process.env) => !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_VORLAGE);

/**
 * Versand über die WhatsApp Business Platform (Cloud API) mit einer von Meta freigegebenen Vorlage.
 * Die Vorlage braucht drei Platzhalter im Text: {{1}} Vorname, {{2}} Praxisname, {{3}} Nachricht oder Link.
 */
export async function whatsappSenden(a: { nummer: string; firstName: string; practiceName: string; inhalt: string }, env: Record<string, string | undefined> = process.env): Promise<{ ok: true } | { ok: false; fehler: string }> {
  if (!whatsappApiAktiv(env)) return { ok: false, fehler: "WhatsApp Business ist nicht eingerichtet." };
  const eins = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 900); // Platzhalter dürfen keine Zeilenumbrüche enthalten
  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: a.nummer, type: "template",
        template: { name: env.WHATSAPP_VORLAGE, language: { code: env.WHATSAPP_SPRACHE || "de" }, components: [{ type: "body", parameters: [a.firstName, a.practiceName, a.inhalt].map((text) => ({ type: "text", text: eins(text) })) }] },
      }),
    });
  } catch { return { ok: false, fehler: "WhatsApp ist nicht erreichbar." }; }
  if (res.ok) return { ok: true };
  const d = await res.json().catch(() => null);
  return { ok: false, fehler: `WhatsApp hat die Nachricht abgelehnt${d?.error?.message ? `: ${String(d.error.message).slice(0, 200)}` : ` (Fehler ${res.status})`}.` };
}
