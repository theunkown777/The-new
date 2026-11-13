"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [inviteInfo, setInviteInfo] = useState<{ email: string; practiceName: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setInviteError(data.error ?? "Einladung ungültig.");
          return;
        }
        setInviteInfo(data);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Beitreten fehlgeschlagen.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token || inviteError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {inviteError ?? "Kein gültiger Einladungslink."} Bitte um eine neue Einladung bitten.
      </p>
    );
  }

  if (done) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        Konto erstellt. Sie werden zur Anmeldung weitergeleitet…
      </p>
    );
  }

  if (!inviteInfo) return <p className="text-sm text-slate-500">Lädt…</p>;

  return (
    <>
      <p className="mb-4 text-center text-sm text-slate-500">
        Sie wurden zu <strong>{inviteInfo.practiceName}</strong> eingeladen ({inviteInfo.email}).
      </p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
          <p className="mt-1 text-xs text-slate-500">Mindestens 8 Zeichen</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Wird erstellt…" : "Konto erstellen"}
        </button>
      </form>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Einladung annehmen</h1>
        </div>
        <Suspense fallback={null}>
          <AcceptInviteForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </main>
  );
}
