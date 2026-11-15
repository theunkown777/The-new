import { describe, expect, it } from "vitest";
import { BETREIBER, betreiberMailFuss, impressumVollstaendig } from "./betreiber";

describe("Betreiberdaten", () => {
  it("Impressum ist erst mit Telefonnummer vollständig", () => {
    expect(impressumVollstaendig({ ...BETREIBER, telefon: "" })).toBe(false);
    expect(impressumVollstaendig({ ...BETREIBER, telefon: "  " })).toBe(false);
    expect(impressumVollstaendig({ ...BETREIBER, telefon: "02 51 000" })).toBe(true);
  });
  it("E-Mail-Fuß nennt Namen, Anschrift und Impressum, aber keine leeren Angaben", () => {
    const fuss = betreiberMailFuss({ ...BETREIBER, telefon: "" }, { NEXTAUTH_URL: "https://beispiel.test/" });
    expect(fuss).toContain(BETREIBER.name);
    expect(fuss).toContain(BETREIBER.plzOrt);
    expect(fuss).toContain("Impressum: https://beispiel.test/impressum");
    expect(fuss).not.toMatch(/Telefon|\[|· ·/);
    expect(betreiberMailFuss({ ...BETREIBER, telefon: "02 51 000" }, {})).toContain("Telefon 02 51 000");
  });
});
