"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Schnellvorschlag ohne Akte: Name (und Geburtsdatum) nachtragen, damit Unterschrift, Rechnung und Erinnerungen möglich werden. */
export function AkteAnlegen({ patientId, kuerzel }: { patientId: string; kuerzel: string }) {
  const router = useRouter();
  const [f, setF] = useState({ firstName: "", lastName: "", geburtsdatum: "" });
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/patients/${patientId}/akte`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFehler((await res?.json().catch(() => null))?.error ?? "Speichern fehlgeschlagen.");
    router.refresh();
  }
  return (
    <form onSubmit={speichern} className="rounded-2xl border border-brand-200 bg-brand-50 p-4" data-testid="akte-anlegen">
      <p className="font-medium text-slate-900">Ohne Akte angelegt (Kürzel {kuerzel})</p>
      <p className="mt-1 text-sm text-slate-700">Zu diesem Vorschlag gibt es noch keinen Namen. Tragen Sie ihn ein, wenn die Behandlung zustande kommt: Dann sind Unterschrift, Rechnung und Erinnerungen möglich.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="text-sm text-slate-700">Vorname<input className="input mt-1 w-full" required maxLength={80} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} data-testid="akte-vorname" /></label>
        <label className="text-sm text-slate-700">Nachname<input className="input mt-1 w-full" required maxLength={80} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} data-testid="akte-nachname" /></label>
        <label className="text-sm text-slate-700">Geburtsdatum<input className="input mt-1 w-full" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={f.geburtsdatum} onChange={(e) => setF({ ...f, geburtsdatum: e.target.value })} /></label>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="akte-speichern">{busy ? "Speichert …" : "Akte anlegen"}</button>
      </div>
      {fehler && <p className="mt-2 text-sm text-red-700" role="alert">{fehler}</p>}
    </form>
  );
}
