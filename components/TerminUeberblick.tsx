"use client";

import { useState } from "react";
import type { Briefing } from "@/lib/akte";

// Überblick vor dem Termin: regelbasiert aus der Akte. Auf Wunsch formuliert
// die KI daraus eine Kurzfassung, deutlich als KI-Entwurf gekennzeichnet.
export function TerminUeberblick({ patientId, briefing, ki }: { patientId: string; briefing: Briefing; ki: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function formulieren() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/briefing`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Nicht verfügbar.");
    setText(j.text);
  }

  return (
    <section className="card border-l-4 border-l-brand-600" data-testid="ueberblick">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Überblick vor dem Termin</h2>
        <span className="text-xs text-slate-500">aus der Akte, nach festen Regeln</span>
      </div>
      {briefing.achtung.length > 0 && (
        <ul className="mt-3 space-y-1" data-testid="ueberblick-achtung">
          {briefing.achtung.map((a) => (
            <li key={a} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800">{a}</li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[9rem_1fr]">
        {briefing.zeilen.map((z) => (
          <div key={z.label} className="contents">
            <dt className="text-slate-500">{z.label}</dt>
            <dd className="text-slate-800">{z.text}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-100 pt-3">
        {text ? (
          <div className="rounded-xl bg-purple-50 p-3 text-sm text-purple-950" data-testid="ueberblick-ki">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">KI-Entwurf, bitte gegen die Akte prüfen</p>
            <p className="mt-1">{text}</p>
          </div>
        ) : ki ? (
          <button type="button" className="btn-secondary text-sm" onClick={formulieren} disabled={busy}>
            {busy ? "Formuliert …" : "Als Kurzfassung formulieren (KI)"}
          </button>
        ) : (
          <p className="text-xs text-slate-500">KI-Kurzfassung nicht aktiv (kein KI-Zugang hinterlegt). Der Überblick oben ist vollständig.</p>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <p className="mt-2 text-xs text-slate-500">An den KI-Dienst gehen keine Namen, kein Geburtsdatum und keine Versichertennummer.</p>
      </div>
    </section>
  );
}
