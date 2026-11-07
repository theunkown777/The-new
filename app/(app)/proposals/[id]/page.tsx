import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_STATUS_LABELS, buildProposal, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { PROPOSAL_STATUS_BADGE } from "@/lib/proposalLabels";
import { ProposalEditor } from "@/components/ProposalEditor";
import { PatientLinkPanel } from "@/components/PatientLinkPanel";
import { patientLinkState } from "@/lib/patientLink";

export default async function ProposalDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session!.user.practiceId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, insuranceType: true, birthDate: true, externalId: true, geschlecht: true } },
      author: { select: { name: true } },
      practice: { select: { name: true, proposalPrices: true } },
      // Nur, was die Patientin bzw. der Patient ausdrücklich geteilt hat.
      zweitmeinungen: { where: { geteiltAt: { not: null } }, orderBy: { createdAt: "asc" } },
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
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-slate-900">
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

      <div className="mt-6">
        {input.success && <PatientLinkPanel proposalId={proposal.id} state={linkState} firstName={p.firstName} />}
      </div>

      {proposal.zweitmeinungen.length > 0 && (
        <section className="card mt-6" data-testid="zweitmeinung-praxis">
          <h2 className="font-display text-2xl text-slate-900">Zweitmeinung, vom Patienten geteilt</h2>
          <p className="mt-1 text-sm text-slate-600">
            {p.firstName} hat ein anderes Angebot neben diesen Vorschlag gelegt und mit Ihnen geteilt. Ein guter Anlass für ein kurzes Gespräch über Umfang, Material und
            Nachsorge, nicht nur über den Preis.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {proposal.zweitmeinungen.map((z) => (
              <li key={z.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
                <span>
                  <span className="block text-slate-900">{z.praxis || "Andere Praxis"}: {z.leistung}</span>
                  {z.notiz && <span className="block text-xs italic text-slate-500">„{z.notiz}“</span>}
                  <span className="block text-xs text-slate-400">geteilt am {z.geteiltAt!.toLocaleDateString("de-DE")}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-medium text-slate-900">Eigenanteil {(z.eigenanteilCent / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</span>
                  {z.gesamtCent != null && <span className="block text-xs text-slate-500">gesamt {(z.gesamtCent / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {proposal.agreedAt && (
        <section className="card mt-6 border-salbei-200 bg-salbei-50" data-testid="einverstaendnis">
          <h2 className="font-display text-2xl text-slate-900">Digitales Einverständnis</h2>
          <p className="mt-1 text-sm text-slate-700">
            Unterschrieben am {proposal.agreedAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} von <b>{proposal.agreedName}</b> auf dem Behandlungsweg (Patientenseite).
          </p>
          {proposal.agreedSignature && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proposal.agreedSignature} alt={`Unterschrift von ${proposal.agreedName}`} className="mt-3 h-24 rounded-xl border border-salbei-200 bg-white p-2" />
          )}
          <p className="mt-3 text-xs text-slate-600">
            Ersetzt nicht die schriftliche Mehrkosten- bzw. IGeL-Vereinbarung: Diese vor der Behandlung in der Praxis unterschreiben lassen.
          </p>
          <a href={`/api/proposals/${proposal.id}/einverstaendnis`} className="btn-secondary mt-3 inline-block" data-testid="einverstaendnis-pdf">
            Als PDF für die Akte (mit Gegenzeichnung)
          </a>
          {proposal.status === "ANGENOMMEN" && proposal.patient.externalId && (
            <a href={`/api/gdt?art=vorschlag&id=${proposal.id}`} className="btn-secondary ml-2 mt-3 inline-block" data-testid="gdt-export">
              Als GDT-Datei für die Praxissoftware
            </a>
          )}
        </section>
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
