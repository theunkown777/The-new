import { describe, expect, it } from "vitest";
import { darfMailen, kontaktSchema, mailHtml } from "./kontakt";
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
  it("maskiert HTML und verlinkt URLs", () => {
    const h = mailHtml({ text: "Hallo <b>Anna</b>, zahlen Sie hier: https://x.de/portal/abc", practiceName: "Praxis & Co" });
    expect(h).toContain("&lt;b&gt;Anna");
    expect(h).toContain('<a href="https://x.de/portal/abc">');
    expect(h).toContain("Praxis &amp; Co");
  });
});
