"use client";

import { useState } from "react";
import { formatEuro } from "@/lib/proposals";
import { installmentOffer, type Installments } from "@/lib/installments";

export function InstallmentSettings({ initial, readOnly = false }: { initial: Installments; readOnly?: boolean }) {
  const [cfg, setCfg] = useState<Installments>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const example = installmentOffer(2088, cfg);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/installments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cfg, provider: cfg.provider || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) setError(data.error ?? "Speichern fehlgeschlagen.");
    else setMessage("Gespeichert. Patienten-Links zeigen die Ratenzahlung ab sofort an.");
  }

  return (
    <form onSubmit={save} className="card space-y-4" data-testid="installment-settings">
      <div>
        <h2 className="font-medium text-slate-900">Ratenzahlung im Patienten-Link</h2>
        <p className="mt-1 text-sm text-slate-500">
          Wenn Ihre Praxis Teilzahlung anbietet, etwa über Ihren Abrechnungsdienstleister, erfahren Patienten es direkt beim Eigenanteil.
          Sie können ihr Interesse mit der Rückmeldung ankreuzen.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      <fieldset disabled={readOnly} className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          Ratenzahlung anbieten
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="inst-min">Ab Eigenanteil (€)</label>
            <input id="inst-min" type="number" min={0} className="input" value={cfg.minEur} onChange={(e) => setCfg({ ...cfg, minEur: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="inst-months">Laufzeit (Monate)</label>
            <input id="inst-months" type="number" min={2} max={72} className="input" value={cfg.months} onChange={(e) => setCfg({ ...cfg, months: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="inst-provider">Anbieter (optional)</label>
            <input id="inst-provider" type="text" maxLength={60} className="input" value={cfg.provider ?? ""} onChange={(e) => setCfg({ ...cfg, provider: e.target.value })} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={cfg.zinsfrei} onChange={(e) => setCfg({ ...cfg, zinsfrei: e.target.checked })} />
          <span>
            Für Patienten zinsfrei (die Kosten trägt die Praxis). Nur dann zeigt Sorrida eine Monatsrate. Bei Teilzahlung mit Zinsen steht
            nur „Ratenzahlung möglich, sprechen Sie uns an“, weil sonst Effektivzins und weitere Pflichtangaben nötig wären.
          </span>
        </label>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Beispiel bei 2.088 € Eigenanteil:{" "}
          <b>
            {example.kind === "rate"
              ? `oder ${example.months} × ${formatEuro(example.monthly)} zinsfrei`
              : example.kind === "ask"
                ? "Ratenzahlung möglich, sprechen Sie uns an"
                : "keine Anzeige"}
          </b>
        </p>
      </fieldset>
      {!readOnly && (
        <button className="btn-primary" disabled={saving}>
          {saving ? "Speichern …" : "Speichern"}
        </button>
      )}
    </form>
  );
}
