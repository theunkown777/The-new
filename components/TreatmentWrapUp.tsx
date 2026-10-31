"use client";

import { useRef } from "react";
import { ServiceChecklistForm } from "@/components/ServiceChecklistForm";
import { ProposalEditor } from "@/components/ProposalEditor";
import { AnamnesisFlags } from "@/components/AnamnesisFlags";
import type { AnamnesisSummary } from "@/lib/anamnesisView";
import type { Prices, ProposalInput } from "@/lib/proposals";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  insuranceType: string | null;
  birthDate: string | null;
};

// Abschluss einer Behandlung in einem Schritt: Leistungen bestätigen,
// optional Befunde anklicken, einmal speichern. Daraus entstehen Bericht
// (KI), Behandlungsvorschlag mit Patientenschreiben und die To-do-Liste.
export function TreatmentWrapUp({
  patient,
  practicePunktwerte,
  prices,
  practiceName,
  basePath,
  anamnesis,
}: {
  patient: PatientOption;
  practicePunktwerte: { gozPunktwertCent: number | null; bemaPunktwertCent: number | null };
  prices: Prices;
  practiceName: string;
  /** "/abschluss" in der App, "/embed/abschluss" im Praxissoftware-Fenster. */
  basePath: string;
  /** Hinweise aus der Anamnese über dem Abschluss; Raucher usw. gehen in den Vorschlag. */
  anamnesis?: Pick<AnamnesisSummary, "flags" | "submittedAt" | "globals">;
}) {
  const proposal = useRef<{ input: ProposalInput; choices: Record<string, string> } | null>(null);

  async function afterReport(reportId: string): Promise<string> {
    const p = proposal.current;
    const hasFindings =
      p && (Object.keys(p.input.teeth).length > 0 || Object.values(p.input.globals).some(Boolean));
    if (p && hasFindings) {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, input: p.input, choices: p.choices, reportId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          `Der Bericht ist gespeichert, der Vorschlag nicht: ${data.error ?? "unbekannter Fehler"}. Sie können ihn unter „Neuer Vorschlag“ nachtragen.`
        );
      }
    }
    return `${basePath}/${reportId}`;
  }

  return (
    <div className="space-y-4">
    {anamnesis && <AnamnesisFlags flags={anamnesis.flags} submittedAt={anamnesis.submittedAt} />}
    <ServiceChecklistForm
      patients={[patient]}
      initialPatientId={patient.id}
      practicePunktwerte={practicePunktwerte}
      submitLabel="Behandlung abschließen"
      submittingLabel="Bericht, Vorschlag und To-dos werden erstellt…"
      onCreated={afterReport}
      beforeSubmit={
        <details className="card group p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4">
            <span>
              <span className="font-medium text-slate-900">Befunde für Behandlungsvorschlag</span>
              <span className="ml-2 text-sm text-slate-500">optional</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Zähne mit Befund anklicken. Sorrida erstellt daraus Vorschlag, Patientenschreiben und
                die nötigen Anträge auf der To-do-Liste.
              </span>
            </span>
            <span className="text-sm font-medium text-brand-600 group-open:hidden">Befunde eintragen</span>
          </summary>
          <div className="border-t border-slate-100 p-4">
            <ProposalEditor
              patients={[patient]}
              initialPatientId={patient.id}
              initialGlobals={anamnesis?.globals}
              prices={prices}
              practiceName={practiceName}
              compact
              onChange={(input, choices) => {
                proposal.current = { input, choices };
              }}
            />
          </div>
        </details>
      }
    />
    </div>
  );
}
