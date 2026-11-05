"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BankSettings({ initial, readOnly }: { initial: { accountHolder: string; iban: string; bic: string; glaeubigerId?: string }; readOnly: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/settings/bank", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Gespeichert. Das Portal zeigt ab sofort den GiroCode." } : { ok: false, text: data.error ?? "Speichern fehlgeschlagen." });
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3" id="konto" data-testid="bank-settings">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600">Kontoinhaber</span>
          <input className="input mt-1" value={v.accountHolder} onChange={(e) => setV({ ...v, accountHolder: e.target.value })} disabled={readOnly} required />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">IBAN</span>
          <input className="input mt-1 font-mono" value={v.iban} onChange={(e) => setV({ ...v, iban: e.target.value })} disabled={readOnly} required placeholder="DE.." />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">BIC (optional)</span>
          <input className="input mt-1 font-mono" value={v.bic} onChange={(e) => setV({ ...v, bic: e.target.value })} disabled={readOnly} />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Gläubiger-ID (für Lastschrift, optional)</span>
          <input className="input mt-1 font-mono" value={v.glaeubigerId ?? ""} onChange={(e) => setV({ ...v, glaeubigerId: e.target.value })} disabled={readOnly} placeholder="DE98ZZZ09999999999" data-testid="glaeubiger-id" />
          <span className="mt-1 block text-xs text-slate-500">Bei der Deutschen Bundesbank kostenlos beantragen. Dazu braucht die Praxis eine Lastschriftvereinbarung mit ihrer Bank.</span>
        </label>
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {!readOnly && <button className="btn-primary" disabled={busy}>{busy ? "Speichern …" : "Bankverbindung speichern"}</button>}
      {readOnly && <p className="text-xs text-slate-500">Nur Admins der Praxis können die Bankverbindung ändern.</p>}
    </form>
  );
}
