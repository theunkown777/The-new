import type { Prisma } from "@prisma/client";
import { buildProposal, chosenOption, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { rowsOf } from "@/lib/analytics";
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
  const rows = rowsOf({ id: p.id, status: p.status, createdAt: p.createdAt, patient: input.data.patient }, items, choices);
  const kasse = rows.reduce((s, r) => s + r.kasse, 0);
  const eigen = rows.reduce((s, r) => s + r.privat, 0);
  const text = agreementText({
    practiceName: p.practice.name,
    date: p.createdAt.toLocaleDateString("de-DE"),
    choices: items.flatMap((i) => {
      const o = chosenOption(i, choices);
      return o ? [`${i.where}: ${o.name}`] : [];
    }),
    kasse,
    eigen,
  });
  return { text, kasse, eigen, choices };
}
