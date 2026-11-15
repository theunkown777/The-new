import { describe, expect, it } from "vitest";
import { darfMailen, einwilligungFortschreiben, einwilligungsText, kontaktSchema, leseVermerk, mailHtml, vermerkText } from "./kontakt";
describe("Kontakt und Einwilligung", () => {
  it("mailt nur mit Adresse und Einwilligung", () => {
    expect(darfMailen({ email: null, contactConsentAt: new Date() }).ok).toBe(false);
    expect(darfMailen({ email: "a@b.de", contactConsentAt: null }).ok).toBe(false);
    expect(darfMailen({ email: "a@b.de", contactConsentAt: new Date() }).ok).toBe(true);
  });
  it("prüft Adresse und Telefonnummer", () => {
    expect(kontaktSchema.safeParse({ email: "kein-mail" }).success).toBe(false);
    expect(kontaktSchema.safeParse({ email: "anna@example.de", phone: "+49 170 1234567" }).success).toBe(true);
    expect(kontaktSchema.safeParse({ phone: "abc" }).success).toBe(false);
  });
  it("Einwilligungstexte nennen Anbieter, Übermittlung in die USA und Widerruf", () => {
    const mail = einwilligungsText("email", { praxis: "Praxis Test", email: "anna@example.de" });
    expect(mail).toContain("Praxis Test");
    expect(mail).toContain("an anna@example.de");
    expect(mail).toMatch(/nicht Ende-zu-Ende verschlüsselt/);
    expect(mail).toMatch(/USA/);
    expect(mail).toMatch(/jederzeit bei der Praxis widerrufen/);
    const wa = einwilligungsText("whatsapp", { praxis: "Praxis Test", nummer: "0171 2345678" });
    expect(wa).toMatch(/WhatsApp gehört zu Meta/);
    expect(wa).toMatch(/USA/);
    expect(wa).toMatch(/keine Befunde und keine Beträge/);
    const nach = einwilligungsText("nachfassen", { praxis: "Praxis Test" });
    expect(nach).toMatch(/offene Behandlungs- und Kostenvorschläge/);
    // Ohne Adresse bleibt der Satz vollständig, ohne Platzhalter
    expect(einwilligungsText("email", { praxis: "" })).not.toMatch(/\[|undefined|null/);
  });
  it("Vermerk: neu erteilt mit wer und wie, bestehend unverändert, Widerruf löscht", () => {
    const jetzt = new Date("2026-11-15T10:00:00Z");
    const neu = einwilligungFortschreiben({ am: null }, true, { von: "Frau Muster", weg: "formular", jetzt });
    expect(neu).toEqual({ am: jetzt, vermerk: { von: "Frau Muster", weg: "formular" } });
    const alt = { am: new Date("2026-01-01T00:00:00Z"), vermerk: { von: "Herr Alt", weg: "muendlich" as const } };
    expect(einwilligungFortschreiben(alt, true, { von: "Frau Muster", weg: "formular", jetzt })).toBe(alt);
    expect(einwilligungFortschreiben(alt, undefined, { von: "Frau Muster", weg: "formular", jetzt })).toBe(alt);
    expect(einwilligungFortschreiben(alt, false, { von: "Frau Muster", weg: "formular", jetzt })).toEqual({ am: null });
    expect(vermerkText("15.11.2026", neu.vermerk)).toBe("Einwilligung dokumentiert am 15.11.2026, aufgenommen von Frau Muster, unterschriebenes Formular.");
    expect(vermerkText("15.11.2026")).toBe("Einwilligung dokumentiert am 15.11.2026.");
    expect(leseVermerk({ email: { von: "A", weg: "muendlich" }, whatsapp: { von: "B", weg: "erfunden" }, x: 1 })).toEqual({ email: { von: "A", weg: "muendlich" } });
    expect(leseVermerk(null)).toEqual({});
  });
  it("maskiert HTML und verlinkt URLs", () => {
    const h = mailHtml({ text: "Hallo <b>Anna</b>, zahlen Sie hier: https://x.de/portal/abc", practiceName: "Praxis & Co" });
    expect(h).toContain("&lt;b&gt;Anna");
    expect(h).toContain('<a href="https://x.de/portal/abc">');
    expect(h).toContain("Praxis &amp; Co");
  });
  it("Fuß der Patientenmail: Praxis mit Anschrift und Telefon, Widerruf, Versand über Sorrida", () => {
    const h = mailHtml({ text: "Ihr Termin", practiceName: "Praxis Test", absender: "Praxis Test, Markt 1, 48143 Münster, Telefon 0251 123456" });
    expect(h).toContain("Praxis Test, Markt 1, 48143 Münster, Telefon 0251 123456.");
    expect(h).toContain("Widerruf jederzeit bei der Praxis.");
    expect(h).toContain("Versand im Auftrag der Praxis über Sorrida.");
    // Ohne hinterlegte Anschrift steht wenigstens der Praxisname, nie ein Platzhalter
    const ohne = mailHtml({ text: "Ihr Termin", practiceName: "Praxis Test" });
    expect(ohne).toContain("Praxis Test. Sie erhalten diese Nachricht");
    expect(ohne).not.toMatch(/\[|undefined|, ,/);
  });
});
