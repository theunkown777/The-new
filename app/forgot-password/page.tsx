"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Anfrage fehlgeschlagen.");
      return;
    }
    setMessage(data.message);
  }

  return (
    <main className="website flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Passwort vergessen</h1>
          <p className="mt-1 text-sm text-slate-500">
            Wir schicken Ihnen einen Link zum Zurücksetzen.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
          )}
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
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Wird gesendet…" : "Link anfordern"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </main>
  );
}
