"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PatientKontakt({ patientId, email, phone, einwilligungAm, geschlecht = null }: { patientId: string; email: string | null; phone: string | null; einwilligungAm: string | null; geschlecht?: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({ email: email ?? "", phone: phone ?? "", einwilligung: !!einwilligungAm, geschlecht: geschlecht ?? "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/patients/${patientId}/kontakt`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Gespeichert." } : { ok: false, text: (await res.json().catch(() => ({}))).error ?? "Speichern fehlgeschlagen." });
    if (res.ok) router.refresh();
  }
  return (
    <form onSubmit={save} className="card space-y-3" data-testid="kontakt">
      <h2 className="font-semibold text-slate-900">Kontakt und Stammdaten</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <select className="input w-full" value={f.geschlecht} onChange={(e) => setF({ ...f, geschlecht: e.target.value })} aria-label="Geschlecht" data-testid="kontakt-geschlecht">
          <option value="">Geschlecht nicht angegeben</option>
          <option value="W">weiblich</option>
          <option value="M">männlich</option>
          <option value="D">divers</option>
        </select>
        <input className="input w-full" type="email" placeholder="E-Mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="E-Mail" data-testid="kontakt-email" />
        <input className="input w-full" type="tel" placeholder="Mobilnummer" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Mobilnummer" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={f.einwilligung} onChange={(e) => setF({ ...f, einwilligung: e.target.checked })} data-testid="kontakt-einwilligung" />
        <span>
          Der Patient willigt ein, Terminbestätigungen, Erinnerungen und Zahlungserinnerungen per E-Mail zu erhalten.
          {einwilligungAm && <span className="block text-xs text-slate-500">Einwilligung dokumentiert am {einwilligungAm}. Abhaken entfernen = Widerruf.</span>}
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-secondary" disabled={busy}>Speichern</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`} data-testid="kontakt-meldung">{msg.text}</span>}
      </div>
    </form>
  );
}
