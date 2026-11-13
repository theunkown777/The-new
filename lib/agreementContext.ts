import type { Prisma } from "@prisma/client";
import { buildProposal, chosenOption, patientAnteile, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { agreementText } from "@/lib/agreement";

/** Erklärung, Kassen- und Eigenanteil für das Einverständnis eines Vorschlags. */
export function agreementContext(p: {
  id: string;
  status: string;
  createdAt: Date;
  input: Prisma.JsonValue;
  choices: Prisma.JsonValue;
  patientChoices: Prisma.JsonValue | null;
  practice: { name: string; proposalPrices: Prisma.JsonValue | null };
}) {
  const input = proposalInputSchema.safeParse(p.input);
  if (!input.success) return null;
  const items = buildProposal(input.data, resolvePrices(p.practice.proposalPrices)).filter((i) => i.options.length);
  const chosen = choicesSchema.safeParse(p.patientChoices ?? p.choices);
  const choices = chosen.success ? chosen.data : {};
  // Beträge aus Sicht des Patienten (nicht die Umsatzsicht der Praxis): Privattarif und Zusatzversicherung zählen mit.
  const { kasse, eigen } = patientAnteile(items, choices, input.data.patient);
  const text = agreementText({
    practiceName: p.practice.name,
    date: p.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
    choices: items.flatMap((i) => {
      const o = chosenOption(i, choices);
      return o ? [`${i.where}: ${o.name}`] : [];
    }),
    kasse,
    eigen,
    privat: input.data.patient.insurance === "PKV",
  });
  return { text, kasse, eigen, choices, privat: input.data.patient.insurance === "PKV" };
}
