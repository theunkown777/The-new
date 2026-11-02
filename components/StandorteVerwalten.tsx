"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type S = { id: string; name: string; address: string | null; rooms: number; minutesPerDay: number; termine: number };
const leer = { name: "", address: "", rooms: 1, stunden: 8 };

export function StandorteVerwalten({ standorte }: { standorte: S[] }) {
  const router = useRouter();
  const [f, setF] = useState(leer);
  const [edit, setEdit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(edit ? `/api/locations/${edit}` : "/api/locations", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name, address: f.address || null, rooms: f.rooms, minutesPerDay: Math.round(f.stunden * 60) }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Speichern fehlgeschlagen.");
    setF(leer); setEdit(null);
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Standort entfernen? Termine bleiben erhalten, verlieren aber die Zuordnung.")) return;
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card divide-y divide-slate-100 p-0">
        {standorte.length === 0 && <p className="p-4 text-sm text-slate-600">Noch kein Standort. Ohne Standort rechnet die Auslastung mit einem Behandlungsplatz und 8 Stunden.</p>}
        {standorte.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid="standort">
            <div>
              <p className="font-medium text-slate-900">{s.name}</p>
              <p className="text-sm text-slate-600">{[s.address, `${s.rooms} ${s.rooms === 1 ? "Behandlungsplatz" : "Behandlungsplätze"}`, `${s.minutesPerDay / 60} Std. pro Tag`, `${s.termine} Termine`].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button type="button" className="ziel underline" onClick={() => { setEdit(s.id); setF({ name: s.name, address: s.address ?? "", rooms: s.rooms, stunden: s.minutesPerDay / 60 }); }}>bearbeiten</button>
              <button type="button" className="ziel text-red-700 underline" onClick={() => remove(s.id)}>entfernen</button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2" data-testid="standort-form">
        <h2 className="font-semibold text-slate-900 sm:col-span-2">{edit ? "Standort bearbeiten" : "Standort hinzufügen"}</h2>
        <label className="text-sm text-slate-600">Name<input className="input mt-1 w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Hauptpraxis, Zweigpraxis Nord" data-testid="standort-name" /></label>
        <label className="text-sm text-slate-600">Adresse (optional)<input className="input mt-1 w-full" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <label className="text-sm text-slate-600">Behandlungsplätze<input type="number" min={1} max={50} className="input mt-1 w-full" value={f.rooms} onChange={(e) => setF({ ...f, rooms: Number(e.target.value) })} data-testid="standort-plaetze" /></label>
        <label className="text-sm text-slate-600">Sprechzeit pro Tag (Std.)<input type="number" min={1} max={24} step={0.5} className="input mt-1 w-full" value={f.stunden} onChange={(e) => setF({ ...f, stunden: Number(e.target.value) })} /></label>
        {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={f.name.trim().length < 2}>{edit ? "Speichern" : "Hinzufügen"}</button>
          {edit && <button type="button" className="text-sm underline" onClick={() => { setEdit(null); setF(leer); }}>Abbrechen</button>}
        </div>
      </form>
    </div>
  );
}
