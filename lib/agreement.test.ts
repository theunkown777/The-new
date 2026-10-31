import { describe, expect, it } from "vitest";
import { agreementSchema, agreementText } from "@/lib/agreement";

describe("agreement", () => {
  it("prüft Name, Bestätigung und Unterschrift", () => {
    expect(agreementSchema.safeParse({ name: "Martina Weber", accept: true, signature: "data:image/png;base64,iVBORw0KGgo=" }).success).toBe(true);
    expect(agreementSchema.safeParse({ name: "M", accept: true, signature: "data:image/png;base64,AA==" }).success).toBe(false);
    expect(agreementSchema.safeParse({ name: "Martina Weber", accept: false, signature: "data:image/png;base64,AA==" }).success).toBe(false);
    expect(agreementSchema.safeParse({ name: "Martina Weber", accept: true, signature: "javascript:alert(1)" }).success).toBe(false);
  });
  it("Erklärungstext nennt Kasse zuerst und den Hinweis auf die Schriftform", () => {
    const t = agreementText({ practiceName: "Praxis", date: "01.11.2026", choices: ["Zahn 36: Keramik-Inlay"], kasse: 85, eigen: 805 });
    expect(t).toContain("Ich wähle: Zahn 36: Keramik-Inlay.");
    expect(t.indexOf("85 €")).toBeLessThan(t.indexOf("805 €"));
    expect(t).toContain("schriftliche Vereinbarung");
  });
});
