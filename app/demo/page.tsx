"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

// Einstieg "Als Gast ansehen": legt per Klick eine eigene Demo-Praxis an und
// meldet direkt an. Bewusst per Knopf statt automatisch, damit Suchmaschinen
// und Link-Vorschauen keine Gastzugänge erzeugen.
export default function DemoPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/demo", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Der Gastzugang konnte nicht angelegt werden.");
      return;
    }
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (result?.error) {
      setBusy(false);
      setError("Anmeldung im Gastzugang fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sorrida-mark.svg" alt="" className="mx-auto mb-3 h-24 w-auto" />
        <h1 className="text-2xl font-semibold tracking-[0.2em] text-slate-900">SORRIDA</h1>
        <p className="mt-1 text-sm text-slate-500">Gastzugang</p>

        <div className="card mt-6 space-y-4 text-left">
          <p className="text-sm text-slate-700">
            Sie bekommen eine eigene Demo-Praxis mit vier erfundenen Beispielpatienten, einem fertigen
            Bericht und zwei Behandlungsvorschlägen. Alles lässt sich ausprobieren, auch „Behandlung
            abschließen“.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Keine Anmeldung, keine E-Mail nötig</li>
            <li>Bitte keine echten Patientendaten eingeben</li>
            <li>Der Zugang und alle Eingaben werden nach 24 Stunden gelöscht</li>
          </ul>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={start} disabled={busy} className="btn-primary w-full">
            {busy ? "Demo-Praxis wird vorbereitet…" : "Gastzugang öffnen"}
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Schon Kunde? <Link href="/login" className="font-medium text-brand-600 hover:underline">Anmelden</Link>
          {" · "}
          <Link href="/" className="hover:underline">Zur Website</Link>
        </p>
      </div>
    </main>
  );
}
