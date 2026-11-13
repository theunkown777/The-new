import { z } from "zod";
import {
  ABGEWAEHLT,
  FINDINGS,
  GLOBAL_FINDINGS,
  PRICE_DEFS,
  PROPOSAL_STATUSES,
  buildLetter,
  buildProposal,
  isValidTooth,
  istFreiwillig,
  summarize,
  type FindingCode,
  type GlobalCode,
  type Prices,
  type ProposalInput,
} from "@/lib/proposals";
import { SPECIALTY_IDS } from "@/lib/specialties";

export const customOfferSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  anlass: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  price: z.number().min(0).max(100000),
  kasse: z.boolean().optional(),
  kasseWenn: z.string().trim().max(300).optional(),
  nutzen: z.string().trim().max(300).optional(),
  benefits: z.array(z.string().trim().max(120)).max(6).optional(),
});

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
  fach: z.enum(SPECIALTY_IDS as unknown as [string, ...string[]]).optional(),
  anlaesse: z.array(z.string().max(60)).max(50).optional(),
  med: z
    .object({
      prices: z.record(z.string().max(60), z.number().min(0).max(100000)).optional(),
      custom: z.array(customOfferSchema).max(100).optional(),
    })
    .optional(),
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
    // „Nicht gewünscht“ bei freiwilligen Leistungen bleibt erhalten, sonst zählte die Leistung wieder mit.
    else if (c === ABGEWAEHLT && istFreiwillig(item)) choices[item.key] = c;
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
      fach: args.input.fach,
      date: args.date,
    }),
  };
}
