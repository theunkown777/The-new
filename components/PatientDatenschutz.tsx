"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Auskunft (Export) und Löschung für Admins. Das Löschen verlangt den
// Nachnamen als Bestätigung; ob es erlaubt ist, entscheidet der Server
// anhand der Aufbewahrungsfrist.
export function PatientDatenschutz({ patientId, lastName }: { patientId: string; lastName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.push("/patients");
    router.refresh();
  }

  return (
    <section className="card mt-8" data-testid="datenschutz">
      <h2 className="font-semibold text-slate-900">Datenschutz</h2>
      <p className="mt-1 text-sm text-slate-600">
        Auskunft nach Art. 15 DSGVO als Datei. Löschen geht nur, wenn keine Aufbewahrungspflicht entgegensteht. Beides wird im Protokoll vermerkt.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`/api/patients/${patientId}/export`} className="btn-secondary" data-testid="export">
          Daten exportieren
        </a>
        {!open && (
          <button type="button" className="text-sm text-red-700 underline" onClick={() => setOpen(true)}>
            Patient löschen …
          </button>
        )}
      </div>
      {open && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <label className="block text-red-900">
            Zum Bestätigen den Nachnamen <b>{lastName}</b> eingeben:
            <input className="input mt-2 w-full max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="loeschen-bestaetigung" />
          </label>
          {error && <p className="mt-2 text-red-800" data-testid="loeschen-fehler">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button type="button" className="rounded-lg bg-red-700 px-3 py-2 font-medium text-white disabled:opacity-50" disabled={busy || !confirm} onClick={remove}>
              {busy ? "Löscht …" : "Endgültig löschen"}
            </button>
            <button type="button" className="text-slate-600 underline" onClick={() => { setOpen(false); setError(null); }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
