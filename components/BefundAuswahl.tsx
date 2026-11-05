"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@/lib/befundmodelle";

// Befund nach Körperregion wählen und als Diagnose mit ICD-10 in die Akte
// übernehmen. Die Auswahl trifft die Ärztin oder der Arzt; Sorrida zeigt nur
// häufige Befunde des Fachs und was bei der Abrechnung oft vergessen wird.
export function BefundAuswahl({ patientId, regionen, fachName, vorhanden }: { patientId: string; regionen: Region[]; fachName: string; vorhanden: string[] }) {
  const router = useRouter();
  const [region, setRegion] = useState(regionen[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const r = regionen.find((x) => x.id === region) ?? regionen[0];

  async function uebernehmen(text: string, icd: string) {
    setBusy(icd);
    const res = await fetch(`/api/patients/${patientId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ art: "DIAGNOSE", text, code: icd }),
    });
    setBusy(null);
    setMsg(res.ok ? `„${text}“ (${icd}) in die Akte übernommen.` : (await res.json().catch(() => ({}))).error ?? "Übernahme fehlgeschlagen.");
    if (res.ok) router.refresh();
  }

  if (!r) return null;
  return (
    <section className="card" data-testid="befundmodell">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Befund erfassen</h2>
        <span className="text-xs text-slate-500">{fachName} · häufige Befunde mit ICD-10</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Körperregion">
        {regionen.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === r.id} onClick={() => setRegion(x.id)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ${x.id === r.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:text-brand-700"}`}
            data-testid="befund-region">
            {x.name}
          </button>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {r.befunde.map((b) => {
          const schon = vorhanden.includes(b.icd);
          return (
            <li key={b.icd} className="flex flex-wrap items-start justify-between gap-3 py-2.5" data-testid="befund">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-900">{b.text} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{b.icd}</span></p>
                {b.abrechnung && <p className="mt-0.5 text-xs text-amber-900">Abrechnung: {b.abrechnung}</p>}
              </div>
              <button type="button" className="btn-secondary text-sm" disabled={schon || busy === b.icd} onClick={() => uebernehmen(b.text, b.icd)} data-testid="befund-uebernehmen">
                {schon ? "In der Akte" : busy === b.icd ? "…" : "In Akte übernehmen"}
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p className="mt-2 text-sm text-emerald-700" data-testid="befund-meldung">{msg}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Dokumentationshilfe: Die Diagnose stellt die Ärztin oder der Arzt. Codes sind Einstiege, endständig kodiert wird nach aktuellem ICD-10-GM in der Praxissoftware.
      </p>
    </section>
  );
}
