import { z } from "zod";

// Wirkungsbericht: Was hat sich seit dem Start mit Sorrida verändert? Gemessen wird an Entscheidungen und Zeit,
// nicht an Umsatz. Der Ausgangswert ist eine Schätzung der Praxis vor dem Start und wird so beschriftet.

export const ausgangswertSchema = z.object({
  vorschlaegeMonat: z.number().int().min(0).max(5000),
  ohneEntscheidungProzent: z.number().int().min(0).max(100),
  tageBisZahlung: z.number().int().min(0).max(365),
});
export type Ausgangswert = z.infer<typeof ausgangswertSchema> & { erfasstAm?: string };

export interface WirkungVorschlag {
  status: string;
  createdAt: Date;
  updatedAt: Date;
  shareCreatedAt: Date | null;
  patientViewedAt: Date | null;
  patientRespondedAt: Date | null;
  agreedAt: Date | null;
}
export interface WirkungRechnung {
  status: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface WirkungMonat {
  /** "JJJJ-MM" in deutscher Zeit */
  monat: string;
  vorschlaege: number;
  gesendet: number;
  geoeffnet: number;
  rueckmeldung: number;
  entschieden: number;
  /** Anteil der Vorschläge dieses Monats, die noch ohne Entscheidung sind, in Prozent. */
  ohneEntscheidungProzent: number | null;
  /** Median der Tage vom Versand des Links bis zur ersten Reaktion des Patienten. */
  tageBisReaktion: number | null;
  /** Median der Tage von der Rechnung bis zum bestätigten Zahlungseingang. */
  tageBisZahlung: number | null;
}

const monatVon = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 7);
const tage = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 864e5);
export function median(werte: number[]): number | null {
  if (!werte.length) return null;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 10) / 10;
}

/** Kennzahlen je Monat, nach dem Monat, in dem der Vorschlag bzw. die Rechnung entstanden ist. */
export function wirkungJeMonat(vorschlaege: WirkungVorschlag[], rechnungen: WirkungRechnung[], monate: string[]): WirkungMonat[] {
  return monate.map((monat) => {
    const v = vorschlaege.filter((p) => monatVon(p.createdAt) === monat);
    const entschieden = v.filter((p) => p.status === "ANGENOMMEN" || p.status === "ABGELEHNT");
    const reaktion = v
      .filter((p) => p.shareCreatedAt && (p.patientRespondedAt || p.agreedAt))
      .map((p) => tage(p.shareCreatedAt!, (p.patientRespondedAt ?? p.agreedAt)!));
    const zahlung = rechnungen.filter((r) => monatVon(r.createdAt) === monat && r.status === "BEZAHLT" && r.paidAt).map((r) => tage(r.createdAt, r.paidAt!));
    return {
      monat,
      vorschlaege: v.length,
      gesendet: v.filter((p) => p.shareCreatedAt).length,
      geoeffnet: v.filter((p) => p.patientViewedAt).length,
      rueckmeldung: v.filter((p) => p.patientRespondedAt || p.agreedAt).length,
      entschieden: entschieden.length,
      ohneEntscheidungProzent: v.length ? Math.round(((v.length - entschieden.length) / v.length) * 100) : null,
      tageBisReaktion: median(reaktion),
      tageBisZahlung: median(zahlung),
    };
  });
}

/** Die letzten n Monate als "JJJJ-MM", ältester zuerst. */
export function letzteMonate(n: number, now = new Date()): string[] {
  const [y, m] = monatVon(now).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export const monatName = (monat: string) =>
  new Date(`${monat}-15T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
