import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { buildProposal, resolvePrices, showsJahresvergleich, tageBisStichtag } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { PatientProposalView } from "@/components/PatientProposalView";
import { resolveInstallments } from "@/lib/installments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ihr Behandlungsvorschlag",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  // Vorschau beim Teilen per SMS/Messenger: neutral, ohne Patienten- oder Praxisdaten.
  openGraph: { title: "Ihr Behandlungsvorschlag", description: "Ihre Möglichkeiten und Ihr Eigenanteil, von Ihrer Zahnarztpraxis.", images: [{ url: "/og/vorschlag.png", width: 1200, height: 630 }] },
};

function Expired() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Dieser Link ist nicht mehr gültig</h1>
      <p className="mt-3 text-slate-600">
        Aus Datenschutzgründen sind Patienten-Links nur begrenzt gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen Link.
      </p>
    </main>
  );
}

// Öffentliche Ansicht für den Patienten. Gezeigt werden nur Vorname,
// Praxisname und die Optionen, keine Geburtsdaten oder Kassendaten.
export default async function PatientLinkPage({ params }: { params: { token: string } }) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(params.token)) return <Expired />;
  const proposal = await prisma.treatmentProposal.findUnique({
    where: { shareTokenHash: hashToken(params.token) },
    include: {
      patient: { select: { firstName: true } },
      practice: { select: { name: true, proposalPrices: true, installments: true } },
    },
  });
  if (!proposal || !proposal.shareExpiresAt || proposal.shareExpiresAt < new Date()) return <Expired />;

  const input = proposalInputSchema.safeParse(proposal.input);
  const saved = choicesSchema.safeParse(proposal.choices);
  if (!input.success) return <Expired />;

  if (!proposal.patientViewedAt) {
    await prisma.treatmentProposal.update({ where: { id: proposal.id }, data: { patientViewedAt: new Date() } });
  }

  const items = buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)).filter((i) => i.options.length > 0);
  const patientChoices = choicesSchema.safeParse(proposal.patientChoices);
  const now = new Date();

  return (
    <PatientProposalView
      token={params.token}
      practiceName={proposal.practice.name}
      firstName={proposal.patient.firstName}
      items={items}
      patient={input.data.patient}
      initialChoices={patientChoices.success ? patientChoices.data : saved.success ? saved.data : {}}
      alreadyResponded={proposal.patientResponse}
      showJahresvergleich={showsJahresvergleich(now)}
      tageBisStichtag={tageBisStichtag(now)}
      expiresAt={proposal.shareExpiresAt.toISOString()}
      installments={resolveInstallments(proposal.practice.installments)}
    />
  );
}
