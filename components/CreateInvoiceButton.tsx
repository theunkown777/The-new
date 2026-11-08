"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Rechnung aus einem angenommenen Vorschlag (Eigenanteil) oder frei anlegen.
export function CreateInvoiceButton({ patientId, proposalId, title, amountEur, label = "Rechnung erstellen", free = false }: {
  patientId: string;
  proposalId?: string;
  title: string;
  amountEur?: number;
  label?: string;
  free?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(title);
  const [amount, setAmount] = useState(amountEur ? amountEur.toFixed(2).replace(".", ",") : "");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, proposalId, title: t, amountEur: Number(amount.replace(/\./g, "").replace(",", ".")), dueDays: days }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Rechnung konnte nicht erstellt werden.");
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <button type="button" className={free ? "btn-secondary" : "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"} onClick={() => setOpen(true)} data-testid="create-invoice">
        {label}
      </button>
    );
  return (
    <form onSubmit={create} className="mt-2 grid w-full min-w-0 grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm" data-testid="invoice-form">
      <label className="col-span-2 block min-w-0">
        <span className="text-xs text-slate-500">Bezeichnung</span>
        <input className="input mt-1 w-full" value={t} onChange={(e) => setT(e.target.value)} required minLength={2} maxLength={120} />
      </label>
      <label className="block min-w-0">
        <span className="text-xs text-slate-500">Betrag (€)</span>
        <input className="input mt-1 w-full" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required pattern="[0-9.]*,?[0-9]{0,2}" />
      </label>
      <label className="block min-w-0">
        <span className="text-xs text-slate-500">Zahlbar in</span>
        <select className="input mt-1 w-full" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 30].map((d) => <option key={d} value={d}>{d} Tagen</option>)}
        </select>
      </label>
      {error && <p className="col-span-2 text-red-700">{error}</p>}
      <div className="col-span-2 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Abbrechen</button>
        <button className="btn-primary" disabled={busy}>{busy ? "…" : "Rechnung anlegen"}</button>
      </div>
    </form>
  );
}
