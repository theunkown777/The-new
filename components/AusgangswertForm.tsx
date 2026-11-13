"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ausgangswert } from "@/lib/wirkung";

/** Drei Schätzfragen vor dem Start: Daran misst der Wirkungsbericht später die Veränderung. */
export function AusgangswertForm({ wert }: { wert: Ausgangswert | null }) {
  const router = useRouter();
  const [v, setV] = useState({ vorschlaegeMonat: wert?.vorschlaegeMonat ?? "", ohneEntscheidungProzent: wert?.ohneEntscheidungProzent ?? "", tageBisZahlung: wert?.tageBisZahlung ?? "" } as Record<string, number | string>);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const feld = (k: string, label: string, hilfe: string) => (
    <label className="block text-sm">
      <span className="font-medium text-slate-900">{label}</span>
      <span className="block text-xs text-slate-500">{hilfe}</span>
      <input type="number" min={0} inputMode="numeric" className="input mt-1 w-32" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} data-testid={`ausgang-${k}`} required />
    </label>
  );
  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.round(Number(x))]));
    const res = await fetch("/api/praxis/ausgangswert", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg(d?.error ?? "Speichern hat nicht geklappt.");
    setMsg("Gespeichert.");
    router.refresh();
  }
  return (
    <form onSubmit={speichern} className="grid gap-4 sm:grid-cols-3 print:hidden" data-testid="ausgangswert-form">
      {feld("vorschlaegeMonat", "Vorschläge im Monat", "Wie viele Kostenvoranschläge oder Vorschläge geben Sie etwa im Monat mit?")}
      {feld("ohneEntscheidungProzent", "Ohne Entscheidung (%)", "Wie viel Prozent davon bleiben geschätzt ohne Rückmeldung?")}
      {feld("tageBisZahlung", "Tage bis zur Zahlung", "Wie viele Tage vergehen etwa von der Rechnung bis zum Geldeingang?")}
      <div className="flex items-center gap-3 sm:col-span-3">
        <button className="btn-primary" disabled={busy}>{wert ? "Ausgangswerte ändern" : "Ausgangswerte speichern"}</button>
        {msg && <span className="text-sm text-slate-600" role="status">{msg}</span>}
      </div>
    </form>
  );
}
