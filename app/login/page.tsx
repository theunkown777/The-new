"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { safeCallbackPath } from "@/lib/safeRedirect";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      token: needsTotp ? token : undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "2FA_REQUIRED") {
        setNeedsTotp(true);
        setError(null);
        return;
      }
      if (result.error === "2FA_INVALID") {
        setError("Der 2FA-Code ist ungültig oder abgelaufen.");
        return;
      }
      if (result.error.startsWith("Zu viele")) {
        setError(result.error);
        return;
      }
      setError("E-Mail oder Passwort ist falsch.");
      return;
    }

    // Rücksprung z. B. in das aus der Praxissoftware geöffnete Fenster. Volle
    // Navigation statt router.push + refresh: der Start-Link ist ein
    // Einmal-Token und darf nur einmal gerendert werden.
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (callbackUrl) {
      window.location.assign(safeCallbackPath(callbackUrl, window.location.origin));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="mx-auto mb-3 h-24 w-auto" />
          <h1 className="text-2xl font-semibold tracking-[0.2em] text-slate-900">SORRIDA</h1>
          <p className="mt-1 text-sm text-slate-500">Anmeldung für Ihre Praxis</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              required
              disabled={needsTotp}
              className="input disabled:opacity-60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">Passwort</label>
              {!needsTotp && (
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                  Passwort vergessen?
                </Link>
              )}
            </div>
            <input
              id="password"
              type="password"
              required
              disabled={needsTotp}
              className="input disabled:opacity-60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {needsTotp && (
            <div>
              <label className="label" htmlFor="token">2FA-Code</label>
              <input
                id="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                placeholder="6-stelliger Code oder Backup-Code (XXXX-XXXX)"
                className="input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Anmelden…" : needsTotp ? "Code bestätigen" : "Anmelden"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Noch keine Praxis registriert?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/demo" className="hover:underline">Als Gast ansehen</Link> ·{" "}
          <Link href="/" className="hover:underline">Website</Link> ·{" "}
          <Link href="/impressum" className="hover:underline">Impressum</Link> ·{" "}
          <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
        </p>
      </div>
    </main>
  );
}
