import { z } from "zod";

// Ratenzahlung im Patienten-Link. Viele Praxen bieten Teilzahlung über ihren
// Abrechnungsdienstleister an; Patienten erfahren davon oft erst, wenn sie
// schon abgesagt haben. Eine Monatsrate zeigen wir nur, wenn die Praxis die
// Teilzahlung als zinsfrei für den Patienten kennzeichnet. Bei Raten mit
// Zinsen wären Effektivzins und weitere Pflichtangaben nötig (§ 17 PAngV);
// dann steht nur "Ratenzahlung möglich, sprechen Sie uns an".

export const installmentsSchema = z.object({
  enabled: z.boolean(),
  /** Laufzeit für die Beispielrate in Monaten. */
  months: z.number().int().min(2).max(72),
  /** Für den Patienten zinsfrei (Kosten trägt die Praxis). */
  zinsfrei: z.boolean(),
  /** Ab diesem Eigenanteil wird Ratenzahlung angeboten. */
  minEur: z.number().int().min(0).max(100000),
  /** Optional, z. B. Name des Abrechnungsdienstleisters. */
  provider: z.string().trim().max(60).optional(),
});
export type Installments = z.infer<typeof installmentsSchema>;

export const DEFAULT_INSTALLMENTS: Installments = { enabled: false, months: 12, zinsfrei: false, minEur: 300 };

export function resolveInstallments(raw: unknown): Installments {
  const parsed = installmentsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_INSTALLMENTS;
}

export type InstallmentOffer = { kind: "none" } | { kind: "rate"; months: number; monthly: number } | { kind: "ask" };

/** Was zum Eigenanteil angezeigt wird. Raten werden auf volle Euro aufgerundet. */
export function installmentOffer(eigen: number, cfg: Installments): InstallmentOffer {
  if (!cfg.enabled || eigen < Math.max(cfg.minEur, 1)) return { kind: "none" };
  if (!cfg.zinsfrei) return { kind: "ask" };
  return { kind: "rate", months: cfg.months, monthly: Math.ceil(eigen / cfg.months) };
}
