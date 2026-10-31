import { prisma } from "@/lib/prisma";
import { buildProposal, resolvePrices, showsJahresvergleich, tageBisStichtag } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { analyze, rowsOf, type ProposalFacts, type Row } from "@/lib/analytics";
import { isDental } from "@/lib/specialties";

const DAY = 24 * 60 * 60 * 1000;

/** Daten einer Praxis für die Analyse laden (höchstens die letzten 12 Monate). */
export async function loadAnalysis(practiceId: string, zeitraumTage: number, now = new Date()) {
  const since = new Date(now.getTime() - Math.max(zeitraumTage, 190) * DAY);
  const [practice, list, invoices] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { proposalPrices: true, specialty: true } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, createdAt: { gte: since } },
      select: {
        id: true, status: true, createdAt: true, updatedAt: true, input: true, choices: true,
        shareCreatedAt: true, patientViewedAt: true, patientRespondedAt: true, patientWantsInstallments: true,
      },
      take: 5000,
    }),
    prisma.invoice.findMany({ where: { practiceId }, select: { status: true, amountCent: true, dueDate: true } }),
  ]);
  const prices = resolvePrices(practice?.proposalPrices);
  const proposals: ProposalFacts[] = [];
  const rows: Row[] = [];
  for (const p of list) {
    const input = proposalInputSchema.safeParse(p.input);
    if (!input.success) continue;
    const choices = choicesSchema.safeParse(p.choices);
    const f: ProposalFacts = {
      id: p.id,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      patient: input.data.patient,
      linked: !!p.shareCreatedAt,
      viewed: !!p.patientViewedAt,
      responded: !!p.patientRespondedAt,
      wantsInstallments: p.patientWantsInstallments,
      shareCreatedAt: p.shareCreatedAt,
      patientRespondedAt: p.patientRespondedAt,
      dental: isDental(input.data.fach),
    };
    proposals.push(f);
    rows.push(...rowsOf(f, buildProposal(input.data, prices).filter((i) => i.options.length), choices.success ? choices.data : {}));
  }
  return analyze({
    proposals,
    rows,
    invoices,
    now,
    zeitraumTage,
    tageBisStichtag: isDental(practice?.specialty) && showsJahresvergleich(now) ? tageBisStichtag(now) : null,
  });
}
