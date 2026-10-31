"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AUTH_UNAVAILABLE_MESSAGE, authServiceAvailable } from "@/lib/authAvailable";
import { DENTAL_ID, SPECIALTIES } from "@/lib/specialties";

// Einstieg "Als Gast ansehen": legt per Klick eine eigene Demo-Praxis an und
// meldet direkt an. Bewusst per Knopf statt automatisch, damit Suchmaschinen
// und Link-Vorschauen keine Gastzugänge erzeugen.
export default function DemoPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fach, setFach] = useState<string>(DENTAL_ID);
  const [rolle, setRolle] = useState<"praxis" | "patient">("praxis");

  // Vorauswahl über /demo?fach=haut (z. B. von den Fachgebietsseiten).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get("fach");
    if (f && SPECIALTIES.some((s) => s.id === f)) setFach(f);
    if (q.get("rolle") === "patient") setRolle("patient");
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    if (!(await authServiceAvailable())) {
      setBusy(false);
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }
    const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fach, rolle }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? `Der Gastzugang konnte nicht angelegt werden (Fehler ${res.status}). Details unter /api/status.`);
      return;
    }
    // Patientenansicht: direkt ins Portal, ohne Anmeldung in der Praxis.
    if (rolle === "patient" && data.portalUrl) {
      window.location.assign(data.portalUrl);
      return;
    }
    let result: Awaited<ReturnType<typeof signIn>>;
    try {
      result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    } catch {
      result = undefined;
    }
    if (!result || result.error) {
      setBusy(false);
      setError(`Anmeldung im Gastzugang fehlgeschlagen (${result?.error ?? "Anmeldedienst antwortet nicht"}). Meist fehlt NEXTAUTH_SECRET oder NEXTAUTH_URL passt nicht zur Adresse. Details unter /api/status.`);
      return;
    }
    // Prüfen, ob die Sitzung wirklich steht; sonst landet man stumm wieder auf dem Login.
    const session = await fetch("/api/auth/session").then((r) => r.json()).catch(() => null);
    if (!session?.user) {
      setBusy(false);
      setError("Angemeldet, aber die Sitzung wird nicht gespeichert. Meist passt NEXTAUTH_URL nicht zur geöffneten Adresse oder NEXTAUTH_SECRET fehlt. Details unter /api/status.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sorrida-mark.svg" alt="" className="mx-auto mb-3 h-24 w-auto" />
        <h1 className="font-brand text-3xl text-brand-700">SORRIDA</h1>
        <p className="mt-1 text-sm text-slate-500">Gastzugang</p>

        <div className="card mt-6 space-y-4 text-left">
          <fieldset>
            <legend className="label">Wie möchten Sie Sorrida ansehen?</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2" data-testid="demo-rolle">
              {([
                ["praxis", "Als Praxisleitung", "Das ganze System: Patienten, Vorschläge, Zahlungen, Analyse, Einstellungen."],
                ["patient", "Als Patient", "Nur das, was Patienten sehen: eigene Rechnungen, Vorschlag, Fragebogen. Nichts Internes."],
              ] as const).map(([id, titel, text]) => (
                <label key={id} className={`cursor-pointer rounded-xl border p-3 ${rolle === id ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:border-brand-300"}`}>
                  <input type="radio" name="rolle" value={id} checked={rolle === id} onChange={() => setRolle(id)} className="sr-only" />
                  <span className="block font-semibold text-slate-900">{titel}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-600">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="demo-fach">Ihr Fachgebiet</label>
            <select id="demo-fach" className="input" value={fach} onChange={(e) => setFach(e.target.value)}>
              <option value={DENTAL_ID}>Zahnmedizin</option>
              {SPECIALTIES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-700">
            Sie bekommen eine eigene Demo-Praxis mit rund 1000 erfundenen Patienten, Vorschlägen, Rückmeldungen und Anamnesen aus mehreren Monaten. Alles lässt sich
            ausprobieren, auch der Patienten-Link und der Anamnesebogen.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Keine Anmeldung, keine E-Mail nötig</li>
            <li>Bitte keine echten Patientendaten eingeben</li>
            <li>Der Zugang und alle Eingaben werden nach 24 Stunden gelöscht</li>
          </ul>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={start} disabled={busy} className="btn-primary w-full">
            {busy ? (rolle === "patient" ? "Patientenansicht wird vorbereitet…" : "Demo-Praxis mit 1000 Patienten wird angelegt…") : rolle === "patient" ? "Als Patient ansehen" : "Als Praxisleitung ansehen"}
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
