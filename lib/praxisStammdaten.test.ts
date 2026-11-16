import { describe, expect, it } from "vitest";
import { LEERE_STAMMDATEN, buchungsseiteFehlt, leseStammdaten, praxisZeile, stammdatenFehlen, stammdatenSchema } from "./praxisStammdaten";

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

describe("Buchungsseite für neue Patienten: nötige Angaben der Praxis", () => {
  it("ohne Anschrift und ohne Link zu den Datenschutzhinweisen fehlt beides", () => {
    expect(buchungsseiteFehlt(LEERE_STAMMDATEN)).toEqual(["Anschrift", "Link zu den Datenschutzhinweisen der Praxis"]);
  });
  it("mit Straße, Ort und Link fehlt nichts; Telefon oder Kammer sind dafür nicht nötig", () => {
    const s = { ...LEERE_STAMMDATEN, strasse: "Musterweg 1", plzOrt: "12345 Musterstadt", datenschutzUrl: "https://praxis.example/datenschutz" };
    expect(buchungsseiteFehlt(s)).toEqual([]);
    expect(buchungsseiteFehlt({ ...s, plzOrt: "" })).toEqual(["Anschrift"]);
    expect(buchungsseiteFehlt({ ...s, datenschutzUrl: "" })).toEqual(["Link zu den Datenschutzhinweisen der Praxis"]);
  });
});
