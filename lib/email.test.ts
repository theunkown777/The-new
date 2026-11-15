import { afterEach, describe, expect, it, vi } from "vitest";

describe("E-Mail", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });

  it("escapeHtml maskiert Namen für HTML-Mails", async () => {
    const { escapeHtml } = await import("@/lib/email");
    expect(escapeHtml(`<img src=x onerror="a('b')"> & Co`)).toBe("&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt; &amp; Co");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml("Dr. Müller")).toBe("Dr. Müller");
  });

  it("Absender: eigene Adresse, sonst nur außerhalb der Produktion die Testadresse des Dienstes", async () => {
    const { absenderAdresse, eigenerAbsender, RESEND_TESTABSENDER } = await import("@/lib/email");
    expect(absenderAdresse({ RESEND_FROM_EMAIL: "praxis@sorrida.test" })).toBe("praxis@sorrida.test");
    expect(absenderAdresse({})).toBe(RESEND_TESTABSENDER);
    expect(absenderAdresse({ VERCEL_ENV: "preview" })).toBe(RESEND_TESTABSENDER);
    expect(absenderAdresse({ VERCEL_ENV: "production" })).toBeNull();
    expect(absenderAdresse({ VERCEL_ENV: "production", RESEND_FROM_EMAIL: "  " })).toBeNull();
    expect(eigenerAbsender({ RESEND_FROM_EMAIL: "a@b.de" })).toBe(true);
    expect(eigenerAbsender({})).toBe(false);
  });

  it("E-Mails an Patienten nur mit echtem Versand und eigener Absenderadresse", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const ohneKey = await import("@/lib/email");
    expect(ohneKey.patientenMailAktiv({ RESEND_FROM_EMAIL: "a@b.de" })).toBe(false);
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    const mitKey = await import("@/lib/email");
    expect(mitKey.patientenMailAktiv({})).toBe(false);
    expect(mitKey.patientenMailAktiv({ RESEND_FROM_EMAIL: "a@b.de" })).toBe(true);
  });

  it("Testmodus: im Protokoll stehen Empfänger und Betreff, nie der Inhalt mit dem Link", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendEmail, mailVersandAktiv } = await import("@/lib/email");
    expect(mailVersandAktiv()).toBe(false);
    const link = "https://sorrida.test/reset-password?token=GEHEIM123";
    const r = await sendEmail({ to: "a@x.de", subject: "Passwort zurücksetzen\n– Sorrida", html: `<p><a href="${link}">${link}</a></p>` });
    expect(r).toEqual({ testMode: true, versendet: false });
    const ausgabe = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(ausgabe).toContain("a@x.de");
    expect(ausgabe).toContain("Passwort zurücksetzen – Sorrida");
    expect(ausgabe).not.toContain("GEHEIM123");
    expect(ausgabe).not.toContain("<p>");
  });
});
