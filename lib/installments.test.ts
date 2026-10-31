import { describe, expect, it } from "vitest";
import { DEFAULT_INSTALLMENTS, installmentOffer, resolveInstallments } from "@/lib/installments";

describe("Ratenzahlung", () => {
  const on = { enabled: true, months: 12, zinsfrei: true, minEur: 300 };
  it("ist ohne Einstellung aus", () => {
    expect(resolveInstallments(null)).toEqual(DEFAULT_INSTALLMENTS);
    expect(installmentOffer(5000, DEFAULT_INSTALLMENTS)).toEqual({ kind: "none" });
  });
  it("zeigt eine aufgerundete Monatsrate nur wenn zinsfrei", () => {
    expect(installmentOffer(2088, on)).toEqual({ kind: "rate", months: 12, monthly: 174 });
    expect(installmentOffer(2088, { ...on, zinsfrei: false })).toEqual({ kind: "ask" });
  });
  it("erst ab dem Mindestbetrag", () => {
    expect(installmentOffer(299, on)).toEqual({ kind: "none" });
    expect(installmentOffer(0, { ...on, minEur: 0 })).toEqual({ kind: "none" });
  });
  it("verwirft ungültige Einstellungen", () => {
    expect(resolveInstallments({ enabled: true, months: 1, zinsfrei: true, minEur: 0 })).toEqual(DEFAULT_INSTALLMENTS);
  });
});
