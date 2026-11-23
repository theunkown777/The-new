import { describe, expect, it } from "vitest";
import { z } from "zod";
import "@/lib/zodDeutsch";
import { invoiceCreateSchema } from "@/lib/invoices";

const meldung = (schema: z.ZodType, wert: unknown) => {
  const r = schema.safeParse(wert);
  return r.success ? "" : r.error.issues[0].message;
};

describe("zod-Meldungen auf Deutsch", () => {
  it("übersetzt die Standardmeldungen in einfaches Deutsch", () => {
    const englisch = /expected|Too (small|big)|Invalid|Required/;
    const faelle: [z.ZodType, unknown][] = [
      [z.number().positive(), 0],
      [z.number().max(10), 11],
      [z.number(), "abc"],
      [z.string().min(2), "a"],
      [z.string().min(1), ""],
      [z.string().max(3), "abcd"],
      [z.string().email(), "x"],
      [z.enum(["a", "b"]), "c"],
      [z.object({ a: z.string() }), {}],
      [z.array(z.string()).min(1), []],
    ];
    for (const [schema, wert] of faelle) {
      const m = meldung(schema, wert);
      expect(m).not.toBe("");
      expect(m).not.toMatch(englisch);
    }
    expect(meldung(z.number().positive(), 0)).toBe("Der Wert muss größer als 0 sein.");
    expect(meldung(z.string().min(1), "")).toBe("Bitte dieses Feld ausfüllen.");
  });

  it("eigene Meldungen am Schema gehen vor (Rechnung)", () => {
    const basis = { patientId: "p1", title: "Test" };
    expect(meldung(invoiceCreateSchema, { ...basis, amountEur: 0 })).toBe("Der Betrag muss größer als 0 € sein.");
    expect(meldung(invoiceCreateSchema, { ...basis, amountEur: "abc" })).toBe("Bitte einen Betrag in Euro eingeben, z. B. 24,90.");
    expect(meldung(invoiceCreateSchema, { ...basis, title: "a", amountEur: 5 })).toBe("Bitte eine Bezeichnung eingeben.");
  });
});
