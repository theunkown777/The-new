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
  it("Hülle: einspaltig, Papier, Vorschauzeile, Fuß; keine Bilder und nichts von fremden Servern", async () => {
    const { mailHuelle, sorridaFussHtml, istMailHuelle } = await import("@/lib/email");
    const html = mailHuelle({ betreff: "Passwort zurücksetzen\n– Sorrida", inhalt: "<p>Hallo Frau Beispiel,</p>", marke: true, fuss: sorridaFussHtml() });
    // Betreff als Vorschauzeile (einzeilig), noch vor dem sichtbaren Inhalt
    expect(html).toContain("Passwort zurücksetzen – Sorrida</div>");
    expect(html.indexOf("Passwort zurücksetzen – Sorrida</div>")).toBeLessThan(html.indexOf("Hallo Frau Beispiel"));
    expect(html).toContain("<title>Passwort zurücksetzen – Sorrida</title>");
    // eine Spalte, 600 px, Papier als Hintergrund, dunkle Schrift
    expect(html).toContain('width="600"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("background-color:#F5F2EE");
    expect(html).toContain("color:#24201F");
    // Wortmarke als Text, keine Bilder, keine fremden Schriften oder Stylesheets
    expect(html).toContain(">SORRIDA</td>");
    expect(html).not.toMatch(/<img|<link|@import|@font-face|url\(|<script|fonts\.googleapis|background-image/i);
    // Fuß mit den Absenderangaben von Sorrida
    expect(html).toContain("Impressum:");
    expect(html.indexOf("Impressum:")).toBeGreaterThan(html.indexOf("Hallo Frau Beispiel"));
    expect(istMailHuelle(html)).toBe(true);
    // nie doppelt einpacken
    expect(mailHuelle({ betreff: "x", inhalt: html })).toBe(html);
  });

  it("Hülle: eigene Vorschauzeile, maskierter Betreff, Praxis-Mails ohne Wortmarke", async () => {
    const { mailHuelle } = await import("@/lib/email");
    const html = mailHuelle({ betreff: "Ihr Termin bei <Praxis> & Co", inhalt: "<p>Text</p>", vorschau: "Morgen um 9 Uhr" });
    expect(html).toContain("Morgen um 9 Uhr</div>");
    expect(html).toContain("<title>Ihr Termin bei &lt;Praxis&gt; &amp; Co</title>");
    expect(html).not.toContain("SORRIDA");
    expect(html).not.toContain("Impressum:");
  });

  it("Knopf: Link mit sichtbarer Adresse darunter, nur http und https", async () => {
    const { mailKnopf } = await import("@/lib/email");
    const url = "https://sorrida.test/verify-email?token=abc&x=1";
    const html = mailKnopf("E-Mail-Adresse bestätigen", url);
    expect(html).toContain('href="https://sorrida.test/verify-email?token=abc&amp;x=1"');
    expect(html).toContain(">E-Mail-Adresse bestätigen</a>");
    expect(html).toContain(">https://sorrida.test/verify-email?token=abc&amp;x=1</a>");
    expect(html).not.toMatch(/<img/i);
    const boese = mailKnopf("Klick", "javascript:alert(1)");
    expect(boese).not.toContain("href=");
    expect(boese).toContain("javascript:alert(1)");
  });

  it("jede verschickte Mail steckt in der Hülle; Mails von Sorrida mit Wortmarke und Absenderangaben", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubEnv("RESEND_FROM_EMAIL", "post@sorrida.test");
    const send = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("resend", () => ({ Resend: class { emails = { send }; } }));
    const { sendEmail, istMailHuelle } = await import("@/lib/email");
    await sendEmail({ to: "a@x.de", subject: "Einladung – Sorrida", html: "<p>Hallo</p>", sorridaFuss: true });
    await sendEmail({ to: "b@x.de", subject: "Ihr Termin bei Praxis Beispiel", html: "<p>Guten Tag</p>" });
    vi.doUnmock("resend");
    expect(send).toHaveBeenCalledTimes(2);
    const [eins, zwei] = send.mock.calls.map((c) => c[0] as { html: string; subject: string });
    expect(istMailHuelle(eins.html)).toBe(true);
    expect(eins.html).toContain(">SORRIDA</td>");
    expect(eins.html).toContain("Impressum:");
    expect(eins.html).toContain("<p>Hallo</p>");
    expect(eins.subject).toBe("Einladung – Sorrida");
    expect(istMailHuelle(zwei.html)).toBe(true);
    expect(zwei.html).toContain("<p>Guten Tag</p>");
    expect(zwei.html).not.toContain("SORRIDA");
    expect(zwei.html).not.toContain("Impressum:");
  });
});
