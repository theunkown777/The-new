import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildNextSteps } from "@/lib/nextSteps";
import { buildProposal, formatEuro, resolvePrices, vergleicheJahre, showsJahresvergleich } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from "@/lib/reportLabels";
import { CopyTextButton } from "@/components/CopyTextButton";
import { PatientLinkPanel } from "@/components/PatientLinkPanel";
import { patientLinkState } from "@/lib/patientLink";

// Ergebnis des Abschluss-Schritts: was automatisch entstanden ist und was
// Rezeption bzw. Behandler noch erledigen müssen. Gemeinsam genutzt von der
// App (/abschluss) und dem Praxissoftware-Fenster (/embed/abschluss).
export async function WrapUpSummary({
  reportId,
  practiceId,
  links,
}: {
  reportId: string;
  practiceId: string;
  links: { report: string; proposal: string; patient: string; newWrapUp: string };
}) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, practiceId },
    include: {
      patient: true,
      proposals: { orderBy: { createdAt: "desc" }, take: 1 },
      practice: { select: { proposalPrices: true } },
    },
  });
  if (!report) return null;

  const proposal = report.proposals[0] ?? null;
  const input = proposal ? proposalInputSchema.safeParse(proposal.input) : null;
  const choices = proposal ? choicesSchema.safeParse(proposal.choices) : null;
  const items =
    input?.success ? buildProposal(input.data, resolvePrices(report.practice.proposalPrices)) : [];
  const ch = choices?.success ? choices.data : {};
  const patientFactors = input?.success ? input.data.patient : null;
  const steps = buildNextSteps({
    items,
    choices: ch,
    patient: patientFactors ?? { age: null, insurance: report.patient.insuranceType === "PKV" ? "PKV" : "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 },
    reportFinal: report.status === "FINAL",
    hasProposal: !!proposal,
    fach: input?.success ? input.data.fach : undefined,
  });
  const jv = patientFactors ? vergleicheJahre(items, ch, patientFactors) : null;
  const text = report.editedText ?? report.generatedText ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-green-700">Behandlung abgeschlossen</p>
          <h1 className="font-display text-3xl text-slate-900">
            {report.patient.firstName} {report.patient.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {(report.treatmentDate ?? report.createdAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · Automatisch erstellt:
            Bericht{proposal ? ", Behandlungsvorschlag, Patientenschreiben" : ""} und {steps.length} To-dos
          </p>
        </div>
        <Link href={links.newWrapUp} className="btn-secondary">Nächste Behandlung abschließen</Link>
      </div>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">To-dos</h2>
        {steps.length === 0 ? (
          <p className="text-sm text-slate-600">Nichts mehr zu tun. Der Bericht ist freigegeben.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {steps.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${s.urgent ? "text-red-700" : "text-slate-900"}`}>{s.text}</p>
                  {s.detail && <p className="text-xs text-slate-500">{s.detail}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {s.owner}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-medium text-slate-900">{REPORT_TYPE_LABELS[report.type]}</h2>
            <span className="text-xs text-slate-500">{REPORT_STATUS_LABELS[report.status]}</span>
          </div>
          <p className="line-clamp-[12] whitespace-pre-wrap text-sm text-slate-700">{text}</p>
          <Link href={links.report} className="btn-primary">
            {report.status === "FINAL" ? "Bericht ansehen" : "Bericht prüfen und freigeben"}
          </Link>
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium text-slate-900">Behandlungsvorschlag</h2>
          {proposal ? (
            <>
              <p className="text-sm text-slate-600">
                Eigenanteil bei empfohlener Versorgung: <b className="tabular-nums">{formatEuro(proposal.eigenanteilCent / 100)}</b>
                {jv?.betroffen && showsJahresvergleich() && jv.mehrkosten > 0.5 && (
                  <span className="text-red-700"> · ab 2027 ca. {formatEuro(jv.mehrkosten)} mehr</span>
                )}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700">
                {proposal.letterText}
              </pre>
              <div className="flex flex-wrap gap-2">
                <CopyTextButton text={proposal.letterText} label="Patientenschreiben kopieren" />
                <Link href={links.proposal.replace(":id", proposal.id)} className="btn-secondary">
                  Vorschlag mit Patient besprechen
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Keine Befunde eingetragen, daher kein Vorschlag. Bei Bedarf über „Neuer Vorschlag“ nachtragen.
            </p>
          )}
        </section>
      </div>

      {proposal && items.some((i) => i.options.length > 0) && (
        <PatientLinkPanel proposalId={proposal.id} state={patientLinkState(proposal, items)} firstName={report.patient.firstName} />
      )}

      <Link href={links.patient} className="text-sm text-brand-600 hover:underline">← Zum Patienten</Link>
    </div>
  );
}
