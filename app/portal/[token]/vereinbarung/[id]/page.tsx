import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { buildProposal, chosenOption, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { rowsOf } from "@/lib/analytics";
import { agreementText } from "@/lib/agreement";
import { SignAgreement } from "@/components/SignAgreement";
import { KassenSockel } from "@/components/KassenSockel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Einverständnis", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Vereinbarung({ params }: { params: { token: string; id: string } }) {
  const patient = await portalPatient(params.token);
  const back = `/portal/${params.token}`;
  const proposal = patient
    ? await prisma.treatmentProposal.findFirst({
        where: { id: params.id, ...portalProposalWhere(patient.id), status: { in: ["ENTWURF", "BESPROCHEN", "ANGENOMMEN"] } },
        include: { practice: { select: { name: true, proposalPrices: true } } },
      })
    : null;
  const input = proposal ? proposalInputSchema.safeParse(proposal.input) : null;
  if (!patient || !proposal || !input?.success) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-slate-900">Nicht verfügbar</h1>
        <p className="mt-3 text-slate-600">Bitte fragen Sie in Ihrer Praxis nach.</p>
      </main>
    );
  }
  const items = buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)).filter((i) => i.options.length);
  const chosen = choicesSchema.safeParse(proposal.patientChoices ?? proposal.choices);
  const choices = chosen.success ? chosen.data : {};
  const rows = rowsOf({ id: proposal.id, status: proposal.status, createdAt: proposal.createdAt, patient: input.data.patient }, items, choices);
  const kasse = rows.reduce((s, r) => s + r.kasse, 0);
  const eigen = rows.reduce((s, r) => s + r.privat, 0);
  const text = agreementText({
    practiceName: proposal.practice.name,
    date: proposal.createdAt.toLocaleDateString("de-DE"),
    // Gewählte (oder empfohlene) Option je Befund bzw. Anlass.
    choices: items.flatMap((i) => {
      const o = chosenOption(i, choices);
      return o ? [`${i.where}: ${o.name}`] : [];
    }),
    kasse,
    eigen,
  });

  return (
    <main className="min-h-screen bg-[#F5F2EE]" data-testid="vereinbarung">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <a href={back} className="text-sm text-brand-700 underline">← Zurück zu Ihrem Portal</a>
        <h1 className="font-display mt-6 text-4xl leading-tight text-slate-900">Ihr Einverständnis</h1>
        <p className="mt-2 text-slate-600">Bestätigen Sie Ihre Wahl schon jetzt. Die Praxis sieht es sofort und bereitet alles vor.</p>
        <KassenSockel className="mt-5" kasse={kasse} eigen={eigen} />
        <div className="mt-6">
          {proposal.agreedAt ? (
            <div className="rounded-3xl bg-white p-6" data-testid="vereinbarung-fertig">
              <p className="font-display text-2xl text-slate-900">Bereits bestätigt</p>
              <p className="mt-2 text-sm text-slate-600">
                Am {proposal.agreedAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} von {proposal.agreedName}.
              </p>
            </div>
          ) : (
            <SignAgreement postUrl={`/api/portal/${params.token}/vereinbarung/${proposal.id}`} backHref={back} text={text} defaultName={`${patient.firstName} ${patient.lastName}`} />
          )}
        </div>
      </div>
    </main>
  );
}
