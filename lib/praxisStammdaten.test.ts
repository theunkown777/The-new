import { describe, expect, it } from "vitest";
import { LEERE_STAMMDATEN, leseStammdaten, praxisZeile, stammdatenFehlen, stammdatenSchema } from "./praxisStammdaten";

describe("Stammdaten der Praxis für Patienten", () => {
  it("liest Gespeichertes und verträgt Leeres oder Kaputtes", () => {
    expect(leseStammdaten(null)).toEqual(LEERE_STAMMDATEN);
    expect(leseStammdaten("kaputt")).toEqual(LEERE_STAMMDATEN);
    expect(leseStammdaten({ strasse: " Markt 1 ", plzOrt: "48143 Münster" }).strasse).toBe("Markt 1");
  });
  it("Zeile für Portal und E-Mail nennt nur, was vorhanden ist", () => {
    expect(praxisZeile("Praxis Test", LEERE_STAMMDATEN)).toBe("Praxis Test");
    expect(praxisZeile("Praxis Test", leseStammdaten({ strasse: "Markt 1", plzOrt: "48143 Münster", telefon: "0251 123456" }))).toBe("Praxis Test, Markt 1, 48143 Münster, Telefon 0251 123456");
  });
  it("prüft Links, Telefon und E-Mail", () => {
    expect(stammdatenSchema.safeParse({ impressumUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(stammdatenSchema.safeParse({ impressumUrl: "http://praxis.test/impressum" }).success).toBe(false);
    expect(stammdatenSchema.safeParse({ impressumUrl: "https://praxis.test/impressum" }).success).toBe(true);
    expect(stammdatenSchema.safeParse({ telefon: "abc" }).success).toBe(false);
    expect(stammdatenSchema.safeParse({ email: "kein-at" }).success).toBe(false);
  });
  it("nennt, was für den Auftritt gegenüber Patienten fehlt", () => {
    expect(stammdatenFehlen(LEERE_STAMMDATEN)).toContain("Anschrift");
    const voll = leseStammdaten({ inhaber: "Dr. A", strasse: "Markt 1", plzOrt: "48143 Münster", telefon: "0251 123456", email: "a@praxis.test", berufsbezeichnung: "Zahnärztin (Deutschland)", kammer: "ZÄK", aufsicht: "KZV", datenschutzUrl: "https://praxis.test/datenschutz" });
    expect(stammdatenFehlen(voll)).toEqual([]);
  });
});
