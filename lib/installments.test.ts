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
});
