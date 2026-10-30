import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { PROPOSAL_STATUS_BADGE } from "@/lib/proposalLabels";
import { ProposalEditor } from "@/components/ProposalEditor";

export default async function ProposalDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session!.user.practiceId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, insuranceType: true, birthDate: true } },
      author: { select: { name: true } },
      practice: { select: { name: true, proposalPrices: true } },
    },
  });
  if (!proposal) notFound();

  const input = proposalInputSchema.safeParse(proposal.input);
  const choices = choicesSchema.safeParse(proposal.choices);
  const p = proposal.patient;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Vorschlag für{" "}
            <Link href={`/patients/${p.id}`} className="hover:underline">
              {p.firstName} {p.lastName}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {proposal.createdAt.toLocaleDateString("de-DE")} · von {proposal.author.name} · zuletzt geändert{" "}
            {proposal.updatedAt.toLocaleDateString("de-DE")}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${PROPOSAL_STATUS_BADGE[proposal.status]}`}>
          {PROPOSAL_STATUS_LABELS[proposal.status]}
        </span>
      </div>

      {input.success && choices.success ? (
        <ProposalEditor
          patients={[{ ...p, birthDate: p.birthDate?.toISOString() ?? null }]}
          prices={resolvePrices(proposal.practice.proposalPrices)}
          practiceName={proposal.practice.name}
          existing={{
            id: proposal.id,
            patientId: p.id,
            status: proposal.status,
            input: input.data,
            choices: choices.data,
          }}
        />
      ) : (
        <div className="card text-sm text-red-700">Die gespeicherten Befunddaten sind ungültig.</div>
      )}

      {(proposal.status === "ANGENOMMEN" || proposal.status === "ABGELEHNT") && (
        <div className="card mt-6 space-y-2">
          <h2 className="font-medium text-slate-900">Gespeichertes Patientenschreiben</h2>
          <p className="text-xs text-slate-400">Stand beim letzten Speichern, als Nachweis der wirtschaftlichen Aufklärung.</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
            {proposal.letterText}
          </pre>
        </div>
      )}
    </div>
  );
}
