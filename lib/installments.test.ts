import { describe, expect, it } from "vitest";
import { DEFAULT_INSTALLMENTS, installmentOffer, resolveInstallments } from "@/lib/installments";

describe("Ratenzahlung", () => {
  const on = { enabled: true, months: 12, zinsfrei: true, minEur: 300 };
  it("ist ohne Einstellung aus", () => {
    expect(resolveInstallments(null)).toEqual(DEFAULT_INSTALLMENTS);
    expect(installmentOffer(5000, DEFAULT_INSTALLMENTS, false)).toEqual({ kind: "none" });
  });
  it("zeigt eine aufgerundete Monatsrate nur wenn zinsfrei", () => {
    expect(installmentOffer(2088, on, false)).toEqual({ kind: "rate", months: 12, monthly: 174 });
    expect(installmentOffer(2088, { ...on, zinsfrei: false }, false)).toEqual({ kind: "ask" });
  });
  it("erst ab dem Mindestbetrag", () => {
    expect(installmentOffer(299, on, false)).toEqual({ kind: "none" });
    expect(installmentOffer(0, { ...on, minEur: 0 }, false)).toEqual({ kind: "none" });
  });
  it("verwirft ungültige Einstellungen", () => {
    expect(resolveInstallments({ enabled: true, months: 1, zinsfrei: true, minEur: 0 })).toEqual(DEFAULT_INSTALLMENTS);
  });
});

describe("Ratenanzeige angehalten (Verbraucherkreditrecht ab 20.11.2026)", () => {
  it("zeigt in der Voreinstellung weder Rate noch Hinweis auf Teilzahlung", () => {
    const an = { enabled: true, months: 12, zinsfrei: true, minEur: 300 };
    expect(installmentOffer(2088, an)).toEqual({ kind: "none" });
    expect(installmentOffer(2088, { ...an, zinsfrei: false })).toEqual({ kind: "none" });
  });
  it("das Patientenportal zeigt den Knopf „Ratenzahlung anfragen“ nur, wenn Raten nicht angehalten sind, und die Schnittstelle nimmt die Anfrage dann nicht an", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const lies = (datei: string) => fs.readFileSync(path.join(__dirname, "..", datei), "utf8");
    const portal = lies("components/PortalInvoice.tsx");
    // Jede Stelle, die den Text des Knopfs oder seine Bestätigung zeigt, hängt am Schalter.
    const zeilen = portal.split("\n");
    const stellen = zeilen.map((z, i) => ({ z, i })).filter(({ z }) => /t\.installments(Done)?\b/.test(z));
    expect(stellen.length).toBeGreaterThan(0);
    for (const { i } of stellen) expect(zeilen.slice(Math.max(0, i - 3), i + 1).join("\n"), `Zeile ${i + 1}`).toContain("!RATEN_ANGEHALTEN");
    expect(lies("app/api/portal/[token]/route.ts")).toMatch(/action === "raten" && RATEN_ANGEHALTEN/);
  });
  it("die Einstellungen sagen nach dem Speichern nicht, dass Patienten-Links Raten zeigen", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const text = fs.readFileSync(path.join(__dirname, "..", "components/InstallmentSettings.tsx"), "utf8");
    expect(text).toContain("Die Anzeige im Patienten-Link bleibt angehalten.");
    expect(text).toMatch(/RATEN_ANGEHALTEN \? "Gespeichert\. Die Anzeige/);
  });
});
