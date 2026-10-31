"use client";

import type { Specialty } from "@/lib/specialties";
import type { CustomOffer } from "@/lib/proposals";
import { CUSTOM_PREFIX } from "@/lib/medicalProposals";

// Anlässe für Arztpraxen ankreuzen (Gegenstück zum Zahnschema).
export function AnlassPicker({
  spec,
  custom,
  value,
  onChange,
}: {
  spec: Specialty | null;
  custom: CustomOffer[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((x) => x !== id));
  return (
    <div className="card space-y-2" data-testid="anlass-picker">
      <h2 className="mb-1 font-medium text-slate-900">Anlass des Gesprächs</h2>
      {spec?.anlaesse.map((a) => (
        <label key={a.id} className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={value.includes(a.id)} onChange={(e) => toggle(a.id, e.target.checked)} />
          <span>
            {a.label}
            {a.nurAufWunsch && <span className="block text-xs text-slate-400">nur auf ausdrücklichen Wunsch des Patienten</span>}
          </span>
        </label>
      ))}
      {custom.length > 0 && (
        <>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Eigene Leistungen</h3>
          {custom.map((c) => (
            <label key={c.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" checked={value.includes(`${CUSTOM_PREFIX}${c.id}`)} onChange={(e) => toggle(`${CUSTOM_PREFIX}${c.id}`, e.target.checked)} />
              <span>
                {c.anlass}: {c.name}
              </span>
            </label>
          ))}
        </>
      )}
      {!spec && custom.length === 0 && (
        <p className="text-sm text-slate-500">
          Für Ihr Fachgebiet sind noch keine Leistungen hinterlegt. Legen Sie sie unter Einstellungen → Fachgebiet und Leistungen an.
        </p>
      )}
    </div>
  );
}
