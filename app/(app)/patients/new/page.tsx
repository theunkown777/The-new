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
    email: "",
    phone: "",
    geschlecht: "",
  });
  const [einwilligung, setEinwilligung] = useState(false);
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
      body: JSON.stringify({ ...form, einwilligung }),
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
      <h1 className="mb-6 font-display text-3xl text-slate-900">Neu anlegen</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="patient-neu-vorname">Vorname</label>
            <input id="patient-neu-vorname"
              required
              className="input"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="patient-neu-nachname">Nachname</label>
            <input id="patient-neu-nachname"
              required
              className="input"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="patient-neu-geschlecht">Geschlecht</label>
          <select id="patient-neu-geschlecht" className="input" value={form.geschlecht} onChange={(e) => update("geschlecht", e.target.value)} data-testid="geschlecht">
            <option value="">nicht angegeben</option>
            <option value="W">weiblich</option>
            <option value="M">männlich</option>
            <option value="D">divers</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">Steuert geschlechtsbezogene Vorsorge und Angebote (z. B. Prostata- oder Brust-Früherkennung).</p>
        </div>
        <div>
          <label className="label" htmlFor="patient-neu-geburtsdatum">Geburtsdatum</label>
          <input id="patient-neu-geburtsdatum"
            type="date"
            className="input"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="patient-neu-kassenart">Kassenart</label>
            <select id="patient-neu-kassenart"
              className="input"
              value={form.insuranceType}
              onChange={(e) => update("insuranceType", e.target.value)}
            >
              <option value="GKV">Gesetzlich (GKV)</option>
              <option value="PKV">Privat (PKV)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="patient-neu-krankenkasse">Krankenkasse</label>
            <input id="patient-neu-krankenkasse"
              className="input"
              value={form.insuranceName}
              onChange={(e) => update("insuranceName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="patient-neu-versichertennummer">Versichertennummer</label>
          <input id="patient-neu-versichertennummer"
            className="input"
            value={form.insuranceNumber}
            onChange={(e) => update("insuranceNumber", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="patient-neu-e-mail">E-Mail (optional)</label>
            <input id="patient-neu-e-mail" className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="patient-neu-mobilnummer">Mobilnummer (optional)</label>
            <input id="patient-neu-mobilnummer" className="input" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={einwilligung} onChange={(e) => setEinwilligung(e.target.checked)} />
          <span>Der Patient willigt ein, Terminbestätigungen, Erinnerungen und Zahlungserinnerungen per E-Mail zu erhalten.</span>
        </label>
        <div>
          <label className="label" htmlFor="patient-neu-notizen">Notizen (optional)</label>
          <textarea id="patient-neu-notizen"
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
