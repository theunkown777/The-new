import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { ProposalEditor } from "@/components/ProposalEditor";
import { resolveMed } from "@/lib/practiceMed";
import { loadAnamnesis } from "@/lib/anamnesisView";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: { patientId?: string };
}) {
  const session = await getServerSession(authOptions);

  const [patients, practice] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId: session!.user.practiceId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, insuranceType: true, birthDate: true },
    }),
    prisma.practice.findUnique({
      where: { id: session!.user.practiceId },
      select: { name: true, proposalPrices: true, specialty: true, medPrices: true, customOffers: true },
    }),
  ]);

  const anamnesis =
    searchParams.patientId && patients.some((p) => p.id === searchParams.patientId)
      ? await loadAnamnesis(session!.user.practiceId, searchParams.patientId)
      : null;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-slate-900">Neuer Behandlungsvorschlag</h1>
      <ProposalEditor
        patients={patients.map((p) => ({ ...p, birthDate: p.birthDate?.toISOString() ?? null }))}
        initialPatientId={searchParams.patientId}
        prices={resolvePrices(practice?.proposalPrices)}
        practiceName={practice?.name ?? "Ihre Zahnarztpraxis"}
        initialGlobals={anamnesis?.globals}
        {...resolveMed(practice ?? {})}
      />
    </div>
  );
}
