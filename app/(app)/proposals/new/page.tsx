import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { ProposalEditor } from "@/components/ProposalEditor";
import { resolveMed } from "@/lib/practiceMed";
import { loadAnamnesis } from "@/lib/anamnesisView";
import { MODELLE, MODELL_BEFUNDE, istBleibenderZahn, teilBezeichnung, teilGueltig, type Modell } from "@/lib/modelle/markierung";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: { patientId?: string; modell?: string };
}) {
  const session = await getServerSession(authOptions);

  const [patients, practice] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId: session!.user.practiceId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, insuranceType: true, birthDate: true, geschlecht: true },
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

  // Im Modell markierte Stellen des Patienten: Zähne mit Befund füllen das Zahnschema vor, alles andere steht als Hinweis dabei.
  const marken = searchParams.patientId && patients.some((p) => p.id === searchParams.patientId)
    ? await prisma.modellMarkierung.findMany({ where: { practiceId: session!.user.practiceId, patientId: searchParams.patientId }, orderBy: { createdAt: "asc" }, select: { modell: true, teil: true, notiz: true, befund: true } })
    : [];
  const ausModell = marken
    .filter((m): m is typeof m & { modell: Modell } => (MODELLE as readonly string[]).includes(m.modell) && teilGueltig(m.modell as Modell, m.teil))
    .map((m) => ({
      name: teilBezeichnung(m.modell, m.teil),
      notiz: m.notiz,
      zahn: m.modell === "gebiss" && istBleibenderZahn(m.teil) ? Number(m.teil) : null,
      befund: m.modell === "gebiss" && m.befund && Object.prototype.hasOwnProperty.call(MODELL_BEFUNDE, m.befund) ? m.befund : null,
    }));

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-slate-900">Neuer Behandlungsvorschlag</h1>
      <ProposalEditor
        patients={patients.map((p) => ({ ...p, birthDate: p.birthDate?.toISOString() ?? null }))}
        initialPatientId={searchParams.patientId}
        prices={resolvePrices(practice?.proposalPrices)}
        practiceName={practice?.name ?? "Ihre Zahnarztpraxis"}
        initialGlobals={anamnesis?.globals}
        ausModell={ausModell}
        {...resolveMed(practice ?? {})}
      />
    </div>
  );
}
