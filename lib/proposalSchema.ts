import { z } from "zod";
import {
  FINDINGS,
  GLOBAL_FINDINGS,
  PRICE_DEFS,
  PROPOSAL_STATUSES,
  buildLetter,
  buildProposal,
  isValidTooth,
  summarize,
  type FindingCode,
  type GlobalCode,
  type Prices,
  type ProposalInput,
} from "@/lib/proposals";

const findingCodes = Object.keys(FINDINGS) as [FindingCode, ...FindingCode[]];
const globalShape = Object.fromEntries(
  (Object.keys(GLOBAL_FINDINGS) as GlobalCode[]).map((k) => [k, z.boolean().optional()])
) as Record<GlobalCode, z.ZodOptional<z.ZodBoolean>>;

export const proposalInputSchema = z.object({
  teeth: z.record(
    z.string().refine((t) => /^\d{2}$/.test(t) && isValidTooth(Number(t)), "Ungültige Zahnnummer"),
    z.enum(findingCodes)
  ),
  globals: z.object(globalShape),
  patient: z.object({
    age: z.number().int().min(0).max(120).nullable(),
    insurance: z.enum(["GKV", "PKV"]),
    bonusYears: z.union([z.literal(0), z.literal(5), z.literal(10)]),
    haertefall: z.boolean(),
    erstattungProzent: z.number().min(0).max(100),
    zuschussJahr: z.union([z.literal(2026), z.literal(2027)]).optional(),
  }),
});

export const choicesSchema = z.record(z.string().max(40), z.string().max(40));
export const proposalStatusSchema = z.enum(PROPOSAL_STATUSES);

export const priceOverridesSchema = z.object(
  Object.fromEntries(PRICE_DEFS.map((d) => [d.key, z.number().min(0).max(100000)])) as Record<
    (typeof PRICE_DEFS)[number]["key"],
    z.ZodNumber
  >
);

/** Optionen, Summen und Patiententext serverseitig aus input + Praxispreisen berechnen. */
export function computeProposal(args: {
  input: ProposalInput;
  choices: Record<string, string>;
  prices: Prices;
  patientName: string;
  practiceName: string;
  date: Date;
}) {
  const items = buildProposal(args.input, args.prices);
  // Nur Wahlen für tatsächlich vorhandene Befunde/Optionen übernehmen.
  const choices: Record<string, string> = {};
  for (const item of items) {
    const c = args.choices[item.key];
    if (c && item.options.some((o) => o.id === c)) choices[item.key] = c;
  }
  const s = summarize(items, choices, args.input.patient);
  return {
    choices,
    baseTotalCent: Math.round(s.baseTotal * 100),
    planTotalCent: Math.round(s.planTotal * 100),
    eigenanteilCent: Math.round(s.netto * 100),
    letterText: buildLetter({
      items,
      choices,
      patient: args.input.patient,
      patientName: args.patientName,
      practiceName: args.practiceName,
      date: args.date,
    }),
  };
}
