"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    insuranceType: "GKV",
    insuranceName: "",
    insuranceNumber: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Anlegen des Patienten.");
      return;
    }

    router.push(`/patients/${data.patient.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Neuer Patient</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Vorname</label>
            <input
              required
              className="input"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Nachname</label>
            <input
              required
              className="input"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Geburtsdatum</label>
          <input
            type="date"
            className="input"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Kassenart</label>
            <select
              className="input"
              value={form.insuranceType}
              onChange={(e) => update("insuranceType", e.target.value)}
            >
              <option value="GKV">Gesetzlich (GKV)</option>
              <option value="PKV">Privat (PKV)</option>
            </select>
          </div>
          <div>
            <label className="label">Krankenkasse</label>
            <input
              className="input"
              value={form.insuranceName}
              onChange={(e) => update("insuranceName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Versichertennummer</label>
          <input
            className="input"
            value={form.insuranceNumber}
            onChange={(e) => update("insuranceNumber", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Notizen (optional)</label>
          <textarea
            className="input min-h-20"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Wird gespeichert…" : "Patient anlegen"}
        </button>
      </form>
    </div>
  );
}
