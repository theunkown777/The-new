"use client";

import { useState } from "react";
import { DEFAULT_PRICES, PRICE_DEFS, type Prices } from "@/lib/proposals";

export function ProposalPriceSettings({
  initialPrices,
  isCustom,
  readOnly = false,
}: {
  initialPrices: Prices;
  isCustom: boolean;
  readOnly?: boolean;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialPrices).map(([k, v]) => [k, String(v)]))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/settings/proposal-prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prices: Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, Number(v)])),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setMessage("Gespeichert. Neue Vorschläge rechnen ab sofort mit diesen Preisen.");
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-medium text-slate-900">Preise je Behandlungsoption</h2>
        <p className="mt-1 text-sm text-slate-500">
          Geschätztes Behandlungsvolumen in Euro inklusive Material und Labor, so wie Sie es Patienten
          nennen würden. Daraus berechnen Behandlungsvorschläge den Eigenanteil.{" "}
          {isCustom ? "" : "Aktuell sind Beispielwerte hinterlegt – bitte durch Ihre eigenen ersetzen."}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Zahnersatz bei Kassenpatienten: Den Festzuschuss nimmt Sorrida aus der amtlichen Tabelle je Befund. Die Regelversorgung
          (Krone, Brücke, Prothese) rechnen Sie nach BEMA und BEL II ab; Sorrida schätzt sie mit den Durchschnittskosten der
          Festzuschuss-Richtlinie. Ihre Preise für die Standardausführung gelten deshalb nur für Privatpatienten.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {PRICE_DEFS.map((d) => (
            <div key={d.key}>
              <label className="label" htmlFor={`price-${d.key}`}>{d.label}</label>
              <input
                id={`price-${d.key}`}
                type="number"
                min={0}
                step={1}
                required
                className="input disabled:opacity-60"
                disabled={readOnly}
                value={prices[d.key]}
                onChange={(e) => setPrices({ ...prices, [d.key]: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">Beispielwert: {DEFAULT_PRICES[d.key]} €</p>
            </div>
          ))}
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
