import { z } from "zod";

// Rechnungen und Zahlungen: Die Praxis stellt den Eigenanteil in Rechnung,
// der Patient sieht ihn im Patientenportal und überweist per GiroCode
// (EPC-QR-Code, den jede deutsche Banking-App liest). Sorrida berührt dabei
// kein Geld: Die Zahlung geht direkt auf das Praxiskonto.

export const INVOICE_STATUSES = ["OFFEN", "GEMELDET", "BEZAHLT", "STORNIERT"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PORTAL_TTL_MS = 60 * 24 * 60 * 60 * 1000;
export const DEFAULT_DUE_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export type InvoiceView = {
  key: "bezahlt" | "gemeldet" | "ueberfaellig" | "heute" | "faellig" | "storniert";
  /** Kurztext für Status-Pillen, z. B. "Fällig in 5 Tagen". */
  label: string;
  /** Tage bis zur Fälligkeit (negativ = überfällig). */
  days: number;
  tone: "emerald" | "sky" | "red" | "amber" | "slate";
};

const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export function invoiceView(inv: { status: string; dueDate: Date }, now = new Date()): InvoiceView {
  const days = Math.round((startOfDay(inv.dueDate) - startOfDay(now)) / DAY);
  if (inv.status === "BEZAHLT") return { key: "bezahlt", label: "Bezahlt", days, tone: "emerald" };
  if (inv.status === "STORNIERT") return { key: "storniert", label: "Storniert", days, tone: "slate" };
  if (inv.status === "GEMELDET") return { key: "gemeldet", label: "Zahlung gemeldet", days, tone: "sky" };
  if (days < 0) return { key: "ueberfaellig", label: `Überfällig seit ${-days} ${-days === 1 ? "Tag" : "Tagen"}`, days, tone: "red" };
  if (days === 0) return { key: "heute", label: "Heute fällig", days, tone: "amber" };
  return { key: "faellig", label: `Fällig in ${days} ${days === 1 ? "Tag" : "Tagen"}`, days, tone: "amber" };
}

export const TONE_CLASSES: Record<InvoiceView["tone"], string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-600",
};

/** Offen im Sinne von "Geld steht noch aus" (auch wenn der Patient die Zahlung schon gemeldet hat). */
export const isOutstanding = (status: string) => status === "OFFEN" || status === "GEMELDET";

export function invoiceTotals(list: { status: string; dueDate: Date; amountCent: number; paidAt: Date | null }[], now = new Date()) {
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  let offenCent = 0, ueberfaelligCent = 0, gemeldetCent = 0, bezahltMonatCent = 0, ueberfaellig = 0, offen = 0;
  for (const i of list) {
    const v = invoiceView(i, now);
    if (isOutstanding(i.status)) {
      offenCent += i.amountCent;
      offen++;
    }
    if (v.key === "ueberfaellig") {
      ueberfaelligCent += i.amountCent;
      ueberfaellig++;
    }
    if (v.key === "gemeldet") gemeldetCent += i.amountCent;
    if (i.status === "BEZAHLT" && i.paidAt && i.paidAt >= month) bezahltMonatCent += i.amountCent;
  }
  return { offenCent, offen, ueberfaelligCent, ueberfaellig, gemeldetCent, bezahltMonatCent };
}

/** Rechnungsnummer je Praxis und Jahr, z. B. "2026-0042". */
export const invoiceNumber = (year: number, n: number) => `${year}-${String(n).padStart(4, "0")}`;

export const formatCent = (c: number) =>
  (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// ---------------------------------------------------------------- IBAN ----

export const normalizeIban = (s: string) => s.replace(/\s+/g, "").toUpperCase();

/** Prüfziffer nach ISO 13616 (Modulo 97). */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("DE") && iban.length !== 22) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

export const formatIban = (iban: string) => normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();

export const bankSchema = z.object({
  accountHolder: z.string().trim().min(2).max(70),
  iban: z.string().trim().refine(isValidIban, "Die IBAN ist ungültig."),
  bic: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => s === "" || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s), "Die BIC ist ungültig.")
    .optional(),
});

// ------------------------------------------------------------ GiroCode ----

/**
 * Inhalt eines GiroCodes (EPC069-12, Version 002). Banking-Apps füllen damit
 * Empfänger, IBAN, Betrag und Verwendungszweck aus. Version 002 erlaubt eine
 * leere BIC innerhalb des EWR.
 */
export function epcPayload(a: { name: string; iban: string; bic?: string | null; amountCent: number; reference: string }): string {
  const clean = (s: string, max: number) => s.replace(/[\r\n]+/g, " ").trim().slice(0, max);
  if (a.amountCent < 1 || a.amountCent > 99999999999) throw new Error("Betrag außerhalb des zulässigen Bereichs");
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    clean(a.bic ?? "", 11),
    clean(a.name, 70),
    normalizeIban(a.iban),
    `EUR${(a.amountCent / 100).toFixed(2)}`,
    "",
    "",
    clean(a.reference, 140),
  ].join("\n");
}

/** Verwendungszweck: Rechnungsnummer und Name, damit die Praxis die Zahlung zuordnen kann. */
export const paymentReference = (number: string, lastName: string) => `Rechnung ${number} ${lastName}`.slice(0, 140);

// ----------------------------------------------------------- Eingaben ----

export const invoiceCreateSchema = z.object({
  patientId: z.string().min(1).max(40),
  proposalId: z.string().max(40).optional(),
  title: z.string().trim().min(2).max(120),
  amountEur: z.number().positive().max(100000),
  dueDays: z.number().int().min(0).max(120).default(DEFAULT_DUE_DAYS),
});

export const invoiceActionSchema = z.object({
  action: z.enum(["bezahlt", "storniert", "offen", "erinnert"]),
});
