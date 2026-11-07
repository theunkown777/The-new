import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { bezahlteRechnung, checkoutParameter, connectState, connectStatePruefen, connectUrl, onlineZahlungStatus, signaturGueltig, stripeForm } from "./onlineZahlung";

describe("Online-Zahlung (Stripe Connect)", () => {
  it("ist ohne Schlüssel ausgeschaltet und nennt, was fehlt", () => {
    expect(onlineZahlungStatus({})).toEqual({ aktiv: false, fehlt: ["STRIPE_SECRET_KEY", "STRIPE_CLIENT_ID", "STRIPE_WEBHOOK_SECRET"] });
    expect(onlineZahlungStatus({ STRIPE_SECRET_KEY: "x", STRIPE_CLIENT_ID: "y", STRIPE_WEBHOOK_SECRET: "z" }).aktiv).toBe(true);
  });

  it("OAuth-State gilt nur für die eigene Praxis und 15 Minuten", () => {
    const s = connectState("p1", 1000);
    expect(connectStatePruefen(s, "p1", 2000)).toBe(true);
    expect(connectStatePruefen(s, "p2", 2000)).toBe(false);
    expect(connectStatePruefen(s, "p1", 1000 + 16 * 60_000)).toBe(false);
    expect(connectStatePruefen("p1.9999999999999.falsch", "p1", 2000)).toBe(false);
    expect(connectUrl("ca_1", s, "https://x.de/api/stripe/callback")).toMatch(/^https:\/\/connect\.stripe\.com\/oauth\/authorize\?response_type=code&client_id=ca_1&scope=read_write&state=/);
  });

  it("Checkout mit Rechnungsbetrag in Cent, ohne Gesundheitsangaben", () => {
    const p = checkoutParameter({ invoiceId: "inv1", practiceId: "p1", number: "2026-0042", amountCent: 12345, practiceName: "Praxis am Markt", successUrl: "https://x/ok", cancelUrl: "https://x/no" });
    const form = stripeForm(p);
    expect(form).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=12345");
    expect(form).toContain("metadata%5BinvoiceId%5D=inv1");
    expect(p["line_items[0][price_data][product_data][name]"]).toBe("Rechnung 2026-0042 · Praxis am Markt");
  });

  it("Webhook: nur mit gültiger, frischer Signatur", () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const t = 1_800_000_000;
    const sig = crypto.createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex");
    expect(signaturGueltig(body, `t=${t},v1=${sig}`, "whsec_test", t * 1000)).toBe(true);
    expect(signaturGueltig(body + " ", `t=${t},v1=${sig}`, "whsec_test", t * 1000)).toBe(false);
    expect(signaturGueltig(body, `t=${t},v1=${sig}`, "anderes", t * 1000)).toBe(false);
    expect(signaturGueltig(body, `t=${t},v1=${sig}`, "whsec_test", (t + 600) * 1000)).toBe(false);
    expect(signaturGueltig(body, null, "whsec_test")).toBe(false);
  });

  it("nur bezahlte Sitzungen in Euro markieren eine Rechnung als bezahlt", () => {
    const ev = (type: string, payment_status: string, currency = "eur") => ({ type, account: "acct_1", data: { object: { id: "cs_1", payment_status, currency, amount_total: 500, metadata: { invoiceId: "inv1" } } } });
    expect(bezahlteRechnung(ev("checkout.session.completed", "paid"))).toEqual({ invoiceId: "inv1", sessionId: "cs_1", account: "acct_1", amountCent: 500 });
    expect(bezahlteRechnung(ev("checkout.session.completed", "unpaid"))).toBeNull();
    expect(bezahlteRechnung(ev("checkout.session.async_payment_succeeded", "paid"))).not.toBeNull();
    expect(bezahlteRechnung(ev("checkout.session.completed", "paid", "usd"))).toBeNull();
    expect(bezahlteRechnung(ev("payment_intent.created", "paid"))).toBeNull();
  });
});
