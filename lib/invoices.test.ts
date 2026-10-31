import { describe, expect, it } from "vitest";
import { epcPayload, formatIban, invoiceNumber, invoiceTotals, invoiceView, isValidIban, paymentReference } from "@/lib/invoices";

const now = new Date(2026, 9, 31, 10);
const d = (days: number) => new Date(2026, 9, 31 + days, 18);

describe("invoiceView", () => {
  it("zeigt Fälligkeit, Überfälligkeit und Endzustände", () => {
    expect(invoiceView({ status: "OFFEN", dueDate: d(15) }, now)).toMatchObject({ key: "faellig", label: "Fällig in 15 Tagen", days: 15 });
    expect(invoiceView({ status: "OFFEN", dueDate: d(1) }, now).label).toBe("Fällig in 1 Tag");
    expect(invoiceView({ status: "OFFEN", dueDate: d(0) }, now).key).toBe("heute");
    expect(invoiceView({ status: "OFFEN", dueDate: d(-3) }, now)).toMatchObject({ key: "ueberfaellig", label: "Überfällig seit 3 Tagen" });
    expect(invoiceView({ status: "GEMELDET", dueDate: d(-3) }, now).key).toBe("gemeldet");
    expect(invoiceView({ status: "BEZAHLT", dueDate: d(-3) }, now).key).toBe("bezahlt");
    expect(invoiceView({ status: "STORNIERT", dueDate: d(3) }, now).key).toBe("storniert");
  });
});

describe("invoiceTotals", () => {
  it("summiert offen, überfällig und diesen Monat bezahlt", () => {
    const t = invoiceTotals(
      [
        { status: "OFFEN", dueDate: d(5), amountCent: 10000, paidAt: null },
        { status: "OFFEN", dueDate: d(-2), amountCent: 5000, paidAt: null },
        { status: "GEMELDET", dueDate: d(-2), amountCent: 2000, paidAt: null },
        { status: "BEZAHLT", dueDate: d(-9), amountCent: 7000, paidAt: new Date(2026, 9, 20) },
        { status: "BEZAHLT", dueDate: d(-60), amountCent: 9000, paidAt: new Date(2026, 8, 2) },
        { status: "STORNIERT", dueDate: d(-2), amountCent: 1000, paidAt: null },
      ],
      now,
    );
    expect(t).toEqual({ offenCent: 17000, offen: 3, ueberfaelligCent: 5000, ueberfaellig: 1, gemeldetCent: 2000, bezahltMonatCent: 7000 });
  });
});

describe("IBAN", () => {
  it("prüft die Prüfziffer", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("DE89370400440532013001")).toBe(false);
    expect(isValidIban("DE8937040044053201300")).toBe(false);
    expect(isValidIban("AT611904300234573201")).toBe(true);
    expect(formatIban("de89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });
});

describe("epcPayload", () => {
  it("baut einen GiroCode nach EPC069-12", () => {
    const p = epcPayload({ name: "Praxis Dr. Muster", iban: "DE89 3704 0044 0532 0130 00", amountCent: 12345, reference: paymentReference(invoiceNumber(2026, 7), "Weber") });
    expect(p.split("\n")).toEqual(["BCD", "002", "1", "SCT", "", "Praxis Dr. Muster", "DE89370400440532013000", "EUR123.45", "", "", "Rechnung 2026-0007 Weber"]);
  });
  it("lehnt Nullbeträge ab", () => {
    expect(() => epcPayload({ name: "X", iban: "DE89370400440532013000", amountCent: 0, reference: "r" })).toThrow();
  });
});

describe("Mahnstufen", () => {
  it("steigen bis zur letzten Mahnung und haben passende Texte", async () => {
    const { nextReminderLevel, reminderText, REMINDER_LABELS } = await import("@/lib/invoices");
    expect([0, 1, 2, 3].map(nextReminderLevel)).toEqual([1, 2, 3, 3]);
    expect(REMINDER_LABELS[3]).toBe("Letzte Mahnung");
    const base = { firstName: "Martina", practiceName: "Praxis", number: "2026-0007", amountCent: 18640, dueDate: new Date(2026, 9, 1), url: "https://x/portal/t" };
    expect(reminderText({ ...base, level: 1 })).toContain("freundliche Erinnerung");
    expect(reminderText({ ...base, level: 2 })).toContain("Raten");
    expect(reminderText({ ...base, level: 3 })).toContain("weitere Schritte");
    expect(reminderText({ ...base, level: 3 })).toContain("186,40 €");
  });
});
