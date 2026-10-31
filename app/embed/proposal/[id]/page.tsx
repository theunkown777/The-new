import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProposal, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { ProposalEditor } from "@/components/ProposalEditor";
import { PatientLinkPanel } from "@/components/PatientLinkPanel";
import { patientLinkState } from "@/lib/patientLink";

export default async function EmbedProposalPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session!.user.practiceId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, insuranceType: true, birthDate: true } },
      practice: { select: { name: true, proposalPrices: true } },
    },
  });
  if (!proposal) notFound();

  const input = proposalInputSchema.safeParse(proposal.input);
  const choices = choicesSchema.safeParse(proposal.choices);
  const p = proposal.patient;
  const linkState = patientLinkState(
    proposal,
    input.success ? buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)) : [],
  );

  return (
    <div className="space-y-3">
      <Link href={`/embed/patient/${p.id}?view=verlauf`} className="text-sm text-brand-600 hover:underline">
        ← Zurück zum Patienten
      </Link>
      {input.success && choices.success ? (
        <ProposalEditor
          patients={[{ ...p, birthDate: p.birthDate?.toISOString() ?? null }]}
          prices={resolvePrices(proposal.practice.proposalPrices)}
          practiceName={proposal.practice.name}
          existing={{ id: proposal.id, patientId: p.id, status: proposal.status, input: input.data, choices: choices.data }}
          savedHrefPrefix="/embed/proposal/"
        />
      ) : (
        <div className="card text-sm text-red-700">Die gespeicherten Befunddaten sind ungültig.</div>
      )}
      {input.success && <PatientLinkPanel proposalId={proposal.id} state={linkState} firstName={p.firstName} />}
    </div>
  );
}
