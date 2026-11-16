import { describe, expect, it } from "vitest";
import {
  LEISTUNG_SPRACHEN,
  kurzIn,
  leistungUebersetzungenSchema,
  mitKiEntwurf,
  nameIn,
  uebersetzungAktuell,
  uebersetzungStand,
  uebersetzungenBereinigt,
  uebersetzungsWoerterbuch,
  type UebersetzbareLeistung,
} from "@/lib/eigeneLeistung";
import { customOfferSchema, proposalInputSchema } from "@/lib/proposalSchema";

const leistung = (sprachen: NonNullable<UebersetzbareLeistung["uebersetzungen"]>["sprachen"], zu = { name: "Reisemedizinische Beratung", kurz: "Impfplan für Ihr Reiseziel" }): UebersetzbareLeistung => ({
  name: "Reisemedizinische Beratung",
  nutzen: "Impfplan für Ihr Reiseziel",
  uebersetzungen: { zu, sprachen },
});

describe("nameIn und kurzIn", () => {
  it("geprüfte Übersetzung wird gezeigt", () => {
    const l = leistung({ en: { name: "Travel health advice", kurz: "Vaccination plan for your destination", geprueft: true } });
    expect(nameIn(l, "en")).toBe("Travel health advice");
    expect(kurzIn(l, "en")).toBe("Vaccination plan for your destination");
  });
  it("ein ungeprüfter KI-Entwurf wird Patienten nie gezeigt", () => {
    const l = leistung({ en: { name: "Travel health advice", maschinell: true, geprueft: false } });
    expect(nameIn(l, "en")).toBe("Reisemedizinische Beratung");
    expect(kurzIn(l, "en")).toBe("Impfplan für Ihr Reiseziel");
  });
  it("Deutsch, fehlende Sprache und unbekannte Sprache: deutscher Text", () => {
    const l = leistung({ en: { name: "Travel health advice", geprueft: true } });
    expect(nameIn(l, "de")).toBe("Reisemedizinische Beratung");
    expect(nameIn(l, "tr")).toBe("Reisemedizinische Beratung");
    expect(nameIn(l, "fr")).toBe("Reisemedizinische Beratung");
    expect(nameIn({ name: "Attest" }, "en")).toBe("Attest");
    expect(kurzIn({ name: "Attest" }, "en")).toBeUndefined();
  });
  it("ändert die Praxis den deutschen Text, gilt die alte Übersetzung nicht mehr", () => {
    const l = { ...leistung({ en: { name: "Travel health advice", geprueft: true } }), name: "Reiseberatung mit Impfplan" };
    expect(uebersetzungAktuell(l)).toBe(false);
    expect(nameIn(l, "en")).toBe("Reiseberatung mit Impfplan");
    expect(uebersetzungStand(l, "en")).toBe("veraltet");
  });
  it("fehlt die Übersetzung des Hinweises, bleibt der Hinweis deutsch", () => {
    const l = leistung({ pl: { name: "Porada medycyny podróży", geprueft: true } });
    expect(nameIn(l, "pl")).toBe("Porada medycyny podróży");
    expect(kurzIn(l, "pl")).toBe("Impfplan für Ihr Reiseziel");
  });
});

describe("Stand je Sprache", () => {
  it("fehlt, maschinell, ungeprüft, geprüft", () => {
    const l = leistung({ en: { name: "A", maschinell: true, geprueft: false }, tr: { name: "B", geprueft: false }, uk: { name: "C", maschinell: true, geprueft: true }, ru: { name: "  ", geprueft: true } });
    expect(uebersetzungStand(l, "en")).toBe("maschinell");
    expect(uebersetzungStand(l, "tr")).toBe("ungeprueft");
    expect(uebersetzungStand(l, "uk")).toBe("geprueft");
    expect(uebersetzungStand(l, "ru")).toBe("fehlt");
    expect(uebersetzungStand(l, "ar")).toBe("fehlt");
  });
});

describe("mitKiEntwurf", () => {
  const entwurf = Object.fromEntries(LEISTUNG_SPRACHEN.map((s) => [s, { name: `KI ${s}`, kurz: `Kurz ${s}` }]));
  it("setzt den Entwurf als maschinell und ungeprüft ein", () => {
    const u = mitKiEntwurf({ name: "Attest", nutzen: "für den Verein" }, entwurf);
    expect(u.zu).toEqual({ name: "Attest", kurz: "für den Verein" });
    for (const s of LEISTUNG_SPRACHEN) expect(u.sprachen[s]).toEqual({ name: `KI ${s}`, kurz: `Kurz ${s}`, maschinell: true, geprueft: false });
    expect(nameIn({ name: "Attest", nutzen: "für den Verein", uebersetzungen: u }, "en")).toBe("Attest");
  });
  it("geprüfte, aktuelle Übersetzungen bleiben stehen", () => {
    const l = leistung({ en: { name: "Travel health advice", geprueft: true }, tr: { name: "alt", maschinell: true, geprueft: false } });
    const u = mitKiEntwurf(l, entwurf);
    expect(u.sprachen.en).toEqual({ name: "Travel health advice", geprueft: true });
    expect(u.sprachen.tr?.name).toBe("KI tr");
  });
  it("nach einer Änderung des deutschen Texts werden auch geprüfte ersetzt", () => {
    const l = { ...leistung({ en: { name: "Travel health advice", geprueft: true } }), name: "Reiseberatung" };
    const u = mitKiEntwurf(l, entwurf);
    expect(u.sprachen.en).toMatchObject({ name: "KI en", geprueft: false });
    expect(u.zu.name).toBe("Reiseberatung");
  });
});

describe("Wörterbuch für die Patientenansicht", () => {
  it("enthält nur geprüfte, aktuelle Übersetzungen", () => {
    const a = leistung({ en: { name: "Travel health advice", kurz: "Vaccination plan", geprueft: true } });
    const b: UebersetzbareLeistung = { name: "Attest", uebersetzungen: { zu: { name: "Attest" }, sprachen: { en: { name: "Certificate", maschinell: true, geprueft: false } } } };
    expect(uebersetzungsWoerterbuch([a, b], "en")).toEqual({ "Reisemedizinische Beratung": "Travel health advice", "Impfplan für Ihr Reiseziel": "Vaccination plan" });
    expect(uebersetzungsWoerterbuch([a, b], "de")).toEqual({});
    expect(uebersetzungsWoerterbuch(null, "en")).toEqual({});
  });
});

describe("Speichern", () => {
  it("leere Sprachen fallen weg; ohne Inhalt bleibt nichts", () => {
    expect(uebersetzungenBereinigt({ zu: { name: "Attest" }, sprachen: { en: { name: " Certificate ", geprueft: true }, tr: { name: "  ", geprueft: false } } })).toEqual({ zu: { name: "Attest", kurz: undefined }, sprachen: { en: { name: "Certificate", kurz: undefined, geprueft: true } } });
    expect(uebersetzungenBereinigt({ zu: { name: "Attest" }, sprachen: { en: { name: "", geprueft: true } } })).toBeUndefined();
    expect(uebersetzungenBereinigt(null)).toBeUndefined();
  });
  it("das Schema der eigenen Leistung nimmt Übersetzungen an und lehnt Unbekanntes ab", () => {
    const basis = { id: "l1", anlass: "Reise", name: "Reisemedizinische Beratung", price: 30 };
    const ok = customOfferSchema.safeParse({ ...basis, uebersetzungen: { zu: { name: basis.name }, sprachen: { en: { name: "Travel health advice", geprueft: true } } } });
    expect(ok.success && ok.data.uebersetzungen?.sprachen.en?.name).toBe("Travel health advice");
    expect(customOfferSchema.safeParse(basis).success).toBe(true);
    expect(customOfferSchema.safeParse({ ...basis, uebersetzungen: { zu: { name: basis.name }, sprachen: { en: { name: "x".repeat(200), geprueft: true } } } }).success).toBe(false);
    expect(customOfferSchema.safeParse({ ...basis, uebersetzungen: { zu: { name: basis.name }, sprachen: { en: { name: "ohne Prüfvermerk" } } } }).success).toBe(false);
    expect(leistungUebersetzungenSchema.safeParse({ sprachen: {} }).success).toBe(false);
  });
  it("die Übersetzungen bleiben im gespeicherten Vorschlag erhalten", () => {
    const eingabe = {
      teeth: {}, globals: {}, patient: { age: 40, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 }, fach: "hausarzt", anlaesse: ["eigen_l1"],
      med: { custom: [{ id: "l1", anlass: "Reise", name: "Reisemedizinische Beratung", price: 30, uebersetzungen: { zu: { name: "Reisemedizinische Beratung" }, sprachen: { en: { name: "Travel health advice", geprueft: true } } } }] },
    };
    const r = proposalInputSchema.safeParse(eingabe);
    expect(r.success && r.data.med?.custom?.[0].uebersetzungen?.sprachen.en?.name).toBe("Travel health advice");
  });
});
