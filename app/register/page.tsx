"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SPECIALTY_LABELS } from "@/lib/specialties";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState("");
  const [specialty, setSpecialty] = useState("zahn");
  // Vorauswahl über /register?fach=haut (z. B. von den Fachseiten).
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("fach");
    if (f && f in SPECIALTY_LABELS) setSpecialty(f);
  }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceName, name, email, password, specialty }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registrierung fehlgeschlagen.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Praxis registrieren</h1>
          <p className="mt-1 text-sm text-slate-500">
            Erstellen Sie ein Konto für Ihre Praxis
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label className="label" htmlFor="practiceName">Praxisname</label>
            <input
              id="practiceName"
              required
              className="input"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="Praxis Mustermann"
            />
          </div>
          <div>
            <label className="label" htmlFor="specialty">Fachgebiet</label>
            <select id="specialty" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              {Object.entries(SPECIALTY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="name">Ihr Name</label>
            <input
              id="name"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Mindestens 8 Zeichen</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Wird erstellt…" : "Praxis registrieren"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Bereits registriert?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </main>
  );
}
