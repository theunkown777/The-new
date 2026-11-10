import { describe, expect, it } from "vitest";
import { darfWhatsapp, waLink, whatsappApiAktiv, whatsappNummer, whatsappText } from "./whatsapp";

describe("WhatsApp", () => {
  it("bringt deutsche Mobilnummern in die internationale Form", () => {
    expect(whatsappNummer("0171 2345678")).toBe("491712345678");
    expect(whatsappNummer("+49 (171) 234-5678")).toBe("491712345678");
    expect(whatsappNummer("0049 171 2345678")).toBe("491712345678");
    expect(whatsappNummer("+43 660 1234567")).toBe("436601234567");
    expect(whatsappNummer("171 2345678")).toBeNull(); // ohne 0 oder Vorwahl nicht eindeutig
    expect(whatsappNummer("0171")).toBeNull();
    expect(whatsappNummer(null)).toBeNull();
  });
  it("verschickt nur mit Mobilnummer und eigener Einwilligung", () => {
    expect(darfWhatsapp({ phone: null, whatsappConsentAt: new Date() }).ok).toBe(false);
    expect(darfWhatsapp({ phone: "0171 2345678", whatsappConsentAt: null })).toEqual({ ok: false, grund: "Keine Einwilligung in Nachrichten per WhatsApp dokumentiert." });
    expect(darfWhatsapp({ phone: "0171 2345678", whatsappConsentAt: new Date() })).toEqual({ ok: true, nummer: "491712345678" });
  });
  it("baut den Link, der WhatsApp mit Empfänger und Text öffnet", () => {
    expect(waLink("491712345678", "Hallo Anna, Ihr Termin: Mo & Di")).toBe("https://wa.me/491712345678?text=Hallo%20Anna%2C%20Ihr%20Termin%3A%20Mo%20%26%20Di");
    expect(waLink(null, "x")).toBe("https://wa.me/?text=x");
  });
  it("Texte nennen Termin oder Link, aber keinen Behandlungsanlass und keinen Betrag", () => {
    const t = whatsappText("termin-bestaetigung", { firstName: "Anna", practiceName: "Praxis am Markt", start: new Date("2026-11-16T08:00:00Z"), ort: "Hauptpraxis" });
    expect(t).toContain("Anna");
    expect(t).toContain("Praxis am Markt (Hauptpraxis)");
    expect(t).toMatch(/16\.11\., 09:00 Uhr/);
    const z = whatsappText("zahlungserinnerung", { firstName: "Anna", practiceName: "Praxis am Markt", url: "https://www.sorrida.com/portal/abc" });
    expect(z).toContain("https://www.sorrida.com/portal/abc");
    expect(z).not.toMatch(/€|EUR|\d+,\d\d/);
    expect(whatsappText("portal-link", { firstName: "Anna", practiceName: "P", url: "https://x/portal/1" })).toContain("https://x/portal/1");
  });
  it("automatischer Versand ist nur mit allen drei Angaben aktiv", () => {
    expect(whatsappApiAktiv({})).toBe(false);
    expect(whatsappApiAktiv({ WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" })).toBe(false);
    expect(whatsappApiAktiv({ WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1", WHATSAPP_VORLAGE: "sorrida_hinweis" })).toBe(true);
  });
});
