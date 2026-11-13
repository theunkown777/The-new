"use client";

import { useState } from "react";

export function BillingSettings({
  initialGozPunktwertCent,
  initialBemaPunktwertCent,
  readOnly = false,
}: {
  initialGozPunktwertCent: number | null;
  initialBemaPunktwertCent: number | null;
  readOnly?: boolean;
}) {
  const [gozPunktwert, setGozPunktwert] = useState(
    initialGozPunktwertCent != null ? String(initialGozPunktwertCent) : ""
  );
  const [bemaPunktwert, setBemaPunktwert] = useState(
    initialBemaPunktwertCent != null ? String(initialBemaPunktwertCent) : ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/settings/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gozPunktwertCent: gozPunktwert.trim() !== "" ? Number(gozPunktwert) : null,
        bemaPunktwertCent: bemaPunktwert.trim() !== "" ? Number(bemaPunktwert) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setMessage("Gespeichert.");
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-medium text-slate-900">Punktwerte</h2>
        <p className="mt-1 text-sm text-slate-500">
          Aus Punktzahl × Punktwert × Faktor (bzw. dem hinterlegten Festbetrag) schätzt die
          Leistungserfassung einen Rechnungsbetrag pro Position. Das ist eine Orientierungshilfe,
          keine verbindliche Rechnung – bitte gegen die tatsächlich gültigen Werte prüfen.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="goz-punktwert">
            GOZ-Punktwert (Cent je Punkt)
          </label>
          <input
            id="goz-punktwert"
            type="number"
            step="0.00001"
            min="0"
            className="input disabled:opacity-60"
            disabled={readOnly}
            value={gozPunktwert}
            onChange={(e) => setGozPunktwert(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Bundeseinheitlich gesetzlich fixiert (aktuell 5,62421 Cent, Stand seit der
            GOZ-Reform 2012) – wird bei Registrierung vorbelegt, hier änderbar für den Fall einer
            künftigen Reform.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="bema-punktwert">
            BEMA-Punktwert (Cent je Punkt)
          </label>
          <input
            id="bema-punktwert"
            type="number"
            step="0.00001"
            min="0"
            className="input disabled:opacity-60"
            disabled={readOnly}
            placeholder="von Ihrer KZV mitgeteilter Wert eintragen"
            value={bemaPunktwert}
            onChange={(e) => setBemaPunktwert(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Wird regional von Ihrer Kassenzahnärztlichen Vereinigung (KZV) mit den
            Krankenkassen des Bundeslands verhandelt – es gibt keinen bundeseinheitlichen Wert.
            Bitte den aktuell für Ihre Praxis gültigen Wert eintragen.
          </p>
        </div>

        {!readOnly && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Speichert…" : "Speichern"}
          </button>
        )}
      </form>
    </div>
  );
}
