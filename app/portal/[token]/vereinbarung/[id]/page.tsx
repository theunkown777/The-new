import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { agreementContext } from "@/lib/agreementContext";
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
  if (!patient || !proposal || !agreementContext(proposal)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-slate-900">Nicht verfügbar</h1>
        <p className="mt-3 text-slate-600">Bitte fragen Sie in Ihrer Praxis nach.</p>
      </main>
    );
  }
  const ctx = agreementContext(proposal);
  if (!ctx) return null;
  const { text, kasse, eigen } = ctx;

  return (
    <main className="min-h-screen bg-[#F5F2EE]" data-testid="vereinbarung">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <a href={back} className="text-sm text-salbei-700 underline">← Zurück zu Ihrem Behandlungsweg</a>
        <h1 className="font-display mt-6 text-4xl leading-tight text-slate-900">Ihr Einverständnis</h1>
        <p className="mt-2 text-slate-600">Bestätigen Sie Ihre Wahl schon jetzt. Die Praxis sieht es sofort und bereitet alles vor.</p>
        <KassenSockel className="mt-5" kasse={kasse} eigen={eigen} />
        <div className="mt-6">
          {proposal.agreedAt ? (
            <div className="rounded-3xl bg-white p-6" data-testid="vereinbarung-fertig">
              <p className="font-display text-2xl text-slate-900">Bereits bestätigt</p>
              <p className="mt-2 text-sm text-slate-600">
                Am {proposal.agreedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })} von {proposal.agreedName}.
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
