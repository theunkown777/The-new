"use client";

import { useState } from "react";

/** Anmeldefeld der Demnächst-Seite: geheime Zugangsdaten für die Vorschau. */
export function VorschauLogin({ weiter }: { weiter: string }) {
  const [benutzer, setBenutzer] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  return (
    <form
      className="mx-auto mt-10 grid w-full max-w-sm gap-3 rounded-2xl bg-white/10 p-5 text-left ring-1 ring-white/15 backdrop-blur"
      data-testid="vorschau-login"
      onSubmit={async (e) => {
        e.preventDefault();
        setLaeuft(true);
        setFehler(null);
        const res = await fetch("/api/vorschau", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ benutzer, passwort }) }).catch(() => null);
        const d = await res?.json().catch(() => null);
        if (res?.ok) window.location.href = weiter;
        else { setFehler(d?.error ?? "Keine Verbindung."); setLaeuft(false); }
      }}
    >
      <p className="text-sm font-medium text-white">Zugang für Partner und Pilotpraxen</p>
      <label className="block text-xs text-brand-100">
        Benutzername
        <input className="mt-1 w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 outline-none ring-2 ring-transparent focus:ring-brand-300" autoComplete="username" value={benutzer} onChange={(e) => setBenutzer(e.target.value)} required />
      </label>
      <label className="block text-xs text-brand-100">
        Passwort
        <input type="password" className="mt-1 w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 outline-none ring-2 ring-transparent focus:ring-brand-300" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
      </label>
      {fehler && <p className="rounded-lg bg-white/90 px-3 py-2 text-sm text-red-800" role="alert" data-testid="vorschau-fehler">{fehler}</p>}
      <button className="mt-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60" disabled={laeuft}>
        {laeuft ? "Einen Moment …" : "Zugang öffnen"}
      </button>
    </form>
  );
}
