import { describe, it, expect } from "vitest";
import { leadSchema, isSpam, leadEmailHtml } from "./leads";

const ok = { practiceName: "Zahnarztpraxis am Markt", contactName: "Dr. Anna Krüger", dentists: "2–3", contact: "040 123456" };

describe("leadSchema", () => {
  it("accepts a phone number or an e-mail address", () => {
    expect(leadSchema.safeParse(ok).success).toBe(true);
    expect(leadSchema.safeParse({ ...ok, contact: "praxis@example.de" }).success).toBe(true);
  });
  it("rejects contact details that are neither", () => {
    expect(leadSchema.safeParse({ ...ok, contact: "bitte anrufen" }).success).toBe(false);
  });
  it("rejects unknown dentist counts", () => {
    expect(leadSchema.safeParse({ ...ok, dentists: "99" }).success).toBe(false);
  });
});

describe("spam and e-mail", () => {
  it("treats a filled honeypot as spam", () => {
    expect(isSpam({ ...ok, dentists: "2–3", website: "http://spam" })).toBe(true);
    expect(isSpam({ ...ok, dentists: "2–3" })).toBe(false);
  });
  it("escapes HTML in the notification", () => {
    expect(leadEmailHtml({ ...ok, dentists: "1", practiceName: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
