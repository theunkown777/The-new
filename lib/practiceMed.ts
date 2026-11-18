import { z } from "zod";
import { customOfferSchema } from "@/lib/proposalSchema";
import { SPECIALTY_IDS } from "@/lib/specialties";
import type { CustomOffer, MedInput } from "@/lib/proposals";

// Fachgebiet und Praxisdaten für Arztpraxen lesen bzw. prüfen.

export const specialtySettingsSchema = z.object({
  specialty: z.enum(SPECIALTY_IDS as unknown as [string, ...string[]]),
  medPrices: z.record(z.string().max(60), z.number().min(0).max(100000)).default({}),
  customOffers: z.array(customOfferSchema).max(100).default([]),
});

export function resolveMed(p: { specialty?: string | null; medPrices?: unknown; customOffers?: unknown }): {
  fach: string;
  med: MedInput;
} {
  const prices = z.record(z.string(), z.number()).safeParse(p.medPrices);
  const custom = z.array(customOfferSchema).safeParse(p.customOffers);
  return {
    // Ohne Fach neutral ("andere"), nie Zahnmedizin. Alle Aufrufer lesen specialty mit.
    fach: p.specialty || "andere",
    med: { prices: prices.success ? prices.data : {}, custom: custom.success ? (custom.data as CustomOffer[]) : [] },
  };
}
