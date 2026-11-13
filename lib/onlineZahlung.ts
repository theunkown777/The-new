import crypto from "crypto";
import { signaturSecret } from "@/lib/geheimnis";

// Online-Zahlung im Patientenportal über Stripe Connect.
// - Jede Praxis verbindet ihr eigenes Stripe-Konto (OAuth). Zahlungen laufen
//   direkt auf dieses Konto ("Das Geld bleibt in der Praxis"); Sorrida erhält
//   keine Gelder und speichert keine Kartendaten.
// - DATEV: Mit dem "DATEV Datenservice Zahlungsdienstleister" für Stripe holt
//   die Steuerberatung die Stripe-Umsätze automatisch in DATEV. Im
//   Sorrida-Buchungsstapel stehen Online-Zahlungen deshalb auf dem
//   Geldtransitkonto statt auf der Bank.
// - Freigeschaltet erst, wenn STRIPE_SECRET_KEY, STRIPE_CLIENT_ID und
//   STRIPE_WEBHOOK_SECRET in Vercel stehen. Ohne sie zeigt Sorrida die
//   Funktion als "nicht eingerichtet" an und bietet sie Patienten nicht an.

// Nur für lokale Tests umstellbar (Test-Server statt Stripe); in Vercel nicht setzen.
export const STRIPE_API = process.env.STRIPE_API_BASE || "https://api.stripe.com";
export const STRIPE_CONNECT = process.env.STRIPE_CONNECT_BASE || "https://connect.stripe.com";

export function onlineZahlungStatus(env: Record<string, string | undefined> = process.env): { aktiv: boolean; fehlt: string[] } {
  const fehlt = ["STRIPE_SECRET_KEY", "STRIPE_CLIENT_ID", "STRIPE_WEBHOOK_SECRET"].filter((k) => !env[k]);
  return { aktiv: fehlt.length === 0, fehlt };
}

/** Formular-Kodierung für die Stripe-API (verschachtelte Schlüssel als a[b][c]). */
export function stripeForm(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

const secret = () => signaturSecret();

/** Signierter OAuth-"state": nur diese Praxis, 15 Minuten gültig. */
export function connectState(practiceId: string, now = Date.now()): string {
  const exp = now + 15 * 60_000;
  const sig = crypto.createHmac("sha256", secret()).update(`stripe:${practiceId}.${exp}`).digest("base64url");
  return `${practiceId}.${exp}.${sig}`;
}

export function connectStatePruefen(state: string | null, practiceId: string, now = Date.now()): boolean {
  if (!state) return false;
  const [pid, exp, sig] = state.split(".");
  if (pid !== practiceId || !exp || !sig || Number(exp) < now) return false;
  const soll = crypto.createHmac("sha256", secret()).update(`stripe:${pid}.${exp}`).digest("base64url");
  return soll.length === sig.length && crypto.timingSafeEqual(Buffer.from(soll), Buffer.from(sig));
}

export function connectUrl(clientId: string, state: string, redirectUri: string): string {
  return `${STRIPE_CONNECT}/oauth/authorize?${stripeForm({ response_type: "code", client_id: clientId, scope: "read_write", state, redirect_uri: redirectUri })}`;
}

/** Parameter für eine Checkout-Sitzung über eine Rechnung. Ohne Gesundheitsangaben. */
export function checkoutParameter(a: { invoiceId: string; practiceId: string; number: string; amountCent: number; practiceName: string; successUrl: string; cancelUrl: string }) {
  return {
    mode: "payment",
    locale: "de",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": a.amountCent,
    "line_items[0][price_data][product_data][name]": `Rechnung ${a.number} · ${a.practiceName}`.slice(0, 120),
    client_reference_id: a.invoiceId,
    "metadata[invoiceId]": a.invoiceId,
    "metadata[practiceId]": a.practiceId,
    "payment_intent_data[description]": `Rechnung ${a.number}`,
    "payment_intent_data[metadata][invoiceId]": a.invoiceId,
    success_url: a.successUrl,
    cancel_url: a.cancelUrl,
  };
}

/**
 * Stripe-Webhook-Signatur prüfen (Header "Stripe-Signature": t=…,v1=…).
 * Signiert wird "<t>.<roher Body>" mit HMAC-SHA256; Zeitstempel höchstens 5 Minuten alt.
 */
export function signaturGueltig(body: string, header: string | null, webhookSecret: string, now = Date.now(), toleranzSek = 300): boolean {
  if (!header) return false;
  const teile = header.split(",").map((x) => x.trim().split("="));
  const t = teile.find(([k]) => k === "t")?.[1];
  const v1 = teile.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !v1.length || Math.abs(now / 1000 - Number(t)) > toleranzSek) return false;
  const soll = crypto.createHmac("sha256", webhookSecret).update(`${t}.${body}`).digest("hex");
  return v1.some((v) => v.length === soll.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(soll)));
}

export type StripeEreignis = {
  type: string;
  account?: string;
  data: { object: { id: string; payment_status?: string; metadata?: Record<string, string>; amount_total?: number; currency?: string } };
};

/** Welche Rechnung gilt nach diesem Ereignis als online bezahlt? null = nichts zu tun. */
export function bezahlteRechnung(e: StripeEreignis): { invoiceId: string; sessionId: string; account: string | null; amountCent: number | null } | null {
  const bezahlt =
    (e.type === "checkout.session.completed" && e.data.object.payment_status === "paid") || e.type === "checkout.session.async_payment_succeeded";
  const invoiceId = e.data.object.metadata?.invoiceId;
  if (!bezahlt || !invoiceId || (e.data.object.currency && e.data.object.currency !== "eur")) return null;
  return { invoiceId, sessionId: e.data.object.id, account: e.account ?? null, amountCent: e.data.object.amount_total ?? null };
}
