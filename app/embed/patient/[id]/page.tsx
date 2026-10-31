import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EMBED_VIEWS, type EmbedView } from "@/lib/connector";
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from "@/lib/reportLabels";
import { PROPOSAL_STATUS_LABELS, formatEuro, resolvePrices } from "@/lib/proposals";
import { PROPOSAL_STATUS_BADGE } from "@/lib/proposalLabels";
import { ServiceChecklistForm } from "@/components/ServiceChecklistForm";
import { ProposalEditor } from "@/components/ProposalEditor";
import { TreatmentWrapUp } from "@/components/TreatmentWrapUp";
import { resolveMed } from "@/lib/practiceMed";
import { loadAnamnesis } from "@/lib/anamnesisView";

const TAB_LABELS: Record<EmbedView, string> = {
  abschluss: "Behandlung abschließen",
  bericht: "Nur Bericht",
  vorschlag: "Neuer Vorschlag",
  verlauf: "Verlauf",
};

export default async function EmbedPatientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { view?: string };
}) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const view: EmbedView = (EMBED_VIEWS as readonly string[]).includes(searchParams.view ?? "")
    ? (searchParams.view as EmbedView)
    : "abschluss";

  const [patient, practice] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: params.id, practiceId },
      include: {
        reports: { orderBy: { createdAt: "desc" }, take: 20 },
        proposals: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.practice.findUnique({
      where: { id: practiceId },
      select: { name: true, gozPunktwertCent: true, bemaPunktwertCent: true, proposalPrices: true, specialty: true, medPrices: true, customOffers: true },
    }),
  ]);
  if (!patient) notFound();

  const patientOption = {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    insuranceType: patient.insuranceType,
    birthDate: patient.birthDate?.toISOString() ?? null,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="text-xs text-slate-500">
            {patient.birthDate ? `geb. ${patient.birthDate.toLocaleDateString("de-DE")} · ` : ""}
            {patient.insuranceType ?? "Versicherung unbekannt"}
            {patient.externalSource ? ` · ${patient.externalSource}-Nr. ${patient.externalId}` : ""}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-slate-200" aria-label="Ansicht">
        {EMBED_VIEWS.map((v) => (
          <Link
            key={v}
            href={`/embed/patient/${patient.id}?view=${v}`}
            aria-current={v === view ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${v === view ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {TAB_LABELS[v]}
          </Link>
        ))}
      </nav>

      {view === "abschluss" && (
        <TreatmentWrapUp
          {...resolveMed(practice ?? {})}
          anamnesis={await loadAnamnesis(practiceId, patient.id)}
          patient={patientOption}
          practicePunktwerte={{
            gozPunktwertCent: practice?.gozPunktwertCent ?? null,
            bemaPunktwertCent: practice?.bemaPunktwertCent ?? null,
          }}
          prices={resolvePrices(practice?.proposalPrices)}
          practiceName={practice?.name ?? "Ihre Zahnarztpraxis"}
          basePath="/embed/abschluss"
        />
      )}

      {view === "bericht" && (
        <div className="max-w-3xl">
          <ServiceChecklistForm
            patients={[patientOption]}
            initialPatientId={patient.id}
            practicePunktwerte={{
              gozPunktwertCent: practice?.gozPunktwertCent ?? null,
              bemaPunktwertCent: practice?.bemaPunktwertCent ?? null,
            }}
            savedHrefPrefix="/embed/report/"
          />
        </div>
      )}

      {view === "vorschlag" && (
        <ProposalEditor
          {...resolveMed(practice ?? {})}
          patients={[patientOption]}
          initialPatientId={patient.id}
          prices={resolvePrices(practice?.proposalPrices)}
          practiceName={practice?.name ?? "Ihre Zahnarztpraxis"}
          savedHrefPrefix="/embed/proposal/"
        />
      )}

      {view === "verlauf" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Berichte</h2>
            {patient.reports.length === 0 ? (
              <div className="card text-sm text-slate-500">Noch kein Bericht.</div>
            ) : (
              <div className="card divide-y divide-slate-100 p-0">
                {patient.reports.map((r) => (
                  <Link key={r.id} href={`/embed/report/${r.id}`} className="flex justify-between px-4 py-3 text-sm hover:bg-slate-50">
                    <span>
                      {REPORT_TYPE_LABELS[r.type]} · {r.createdAt.toLocaleDateString("de-DE")}
                    </span>
                    <span className="text-slate-500">{REPORT_STATUS_LABELS[r.status]}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Vorschläge</h2>
            {patient.proposals.length === 0 ? (
              <div className="card text-sm text-slate-500">Noch kein Vorschlag.</div>
            ) : (
              <div className="card divide-y divide-slate-100 p-0">
                {patient.proposals.map((p) => (
                  <Link key={p.id} href={`/embed/proposal/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                    <span>
                      {p.createdAt.toLocaleDateString("de-DE")} · Eigenanteil {formatEuro(p.eigenanteilCent / 100)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PROPOSAL_STATUS_BADGE[p.status]}`}>
                      {PROPOSAL_STATUS_LABELS[p.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
