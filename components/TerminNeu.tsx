"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type P = { id: string; firstName: string; lastName: string; birthDate: string | null };

export function TerminNeu({ tag, standorte, anlaesse = [] }: { tag: string; standorte: { id: string; name: string }[]; anlaesse?: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<P[]>([]);
  const [patient, setPatient] = useState<P | null>(null);
  const [zeit, setZeit] = useState("09:00");
  const [minutes, setMinutes] = useState(30);
  const [reason, setReason] = useState("");
  const [locationId, setLocationId] = useState(standorte[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (patient || q.trim().length < 2) return setTreffer([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/patients?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setTreffer(((await r.json()).patients as P[]).slice(0, 8));
    }, 200);
    return () => clearTimeout(t);
  }, [q, patient]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return setError("Bitte zuerst eine Person auswählen.");
    setBusy(true);
    setError(null);
    const start = new Date(`${tag}T${zeit}:00`);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, start: start.toISOString(), minutes, reason, locationId: locationId || null }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Speichern fehlgeschlagen.");
    setPatient(null); setQ(""); setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-3" data-testid="termin-neu">
      <h2 className="font-semibold text-slate-900">Termin eintragen</h2>
      <div className="relative">
        {patient ? (
          <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span>{patient.lastName}, {patient.firstName}</span>
            <button type="button" className="text-xs underline" onClick={() => { setPatient(null); setQ(""); }}>ändern</button>
          </p>
        ) : (
          <input className="input w-full" placeholder="Name suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Name suchen" data-testid="termin-patient" />
        )}
        {treffer.length > 0 && !patient && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
            {treffer.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setPatient(p); setTreffer([]); }}>
                  {p.lastName}, {p.firstName}{p.birthDate ? <span className="text-slate-500"> · {new Date(p.birthDate).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">Uhrzeit<input type="time" className="input mt-1 w-full" value={zeit} onChange={(e) => setZeit(e.target.value)} step={300} /></label>
        <label className="text-xs text-slate-500">Dauer
          <select className="input mt-1 w-full" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} Min.</option>)}
          </select>
        </label>
      </div>
      <input className="input w-full" placeholder="Anlass, z. B. Kontrolle, Füllung 36" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Anlass" data-testid="termin-anlass" list="termin-anlaesse" />
      <datalist id="termin-anlaesse">
        {anlaesse.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      {standorte.length > 1 && (
        <select className="input w-full" value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Standort">
          {standorte.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !patient || reason.trim().length < 2}>Eintragen</button>
    </form>
  );
}
