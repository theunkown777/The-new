"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AUTH_UNAVAILABLE_MESSAGE, authServiceAvailable } from "@/lib/authAvailable";
import { FACH_GRUPPEN } from "@/lib/specialties";

// Einstieg "Als Gast ansehen": legt per Klick eine eigene Demo-Praxis an und
// meldet direkt an. Bewusst per Knopf statt automatisch, damit Suchmaschinen
// und Link-Vorschauen keine Gastzugänge erzeugen.
export default function DemoPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fach, setFach] = useState<string>("");

  // Vorauswahl über /demo?fach=haut (z. B. von den Fachgebietsseiten).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get("fach");
    if (f && FACH_GRUPPEN.some((g) => g.faecher.some((s) => s.id === f))) setFach(f);
  }, []);

  async function start() {
    if (!fach) {
      setError("Bitte wählen Sie zuerst Ihr Fachgebiet.");
      return;
    }
    setBusy(true);
    setError(null);
    if (!(await authServiceAvailable())) {
      setBusy(false);
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }
    const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fach }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? `Der Gastzugang konnte nicht angelegt werden (Fehler ${res.status}). Details unter /api/status.`);
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
        <img src="/brand/sorrida-mark.webp" alt="" className="mx-auto mb-3 h-24 w-auto" />
        <h1 className="font-brand text-3xl text-brand-700">SORRIDA</h1>
        <p className="mt-1 text-sm text-slate-500">Gastzugang</p>

        <div className="card mt-6 space-y-4 text-left">
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900" data-testid="demo-zugang">
            Sie sehen Sorrida als <b>Geschäftsführung der Praxis</b>. Die Patientenansicht öffnen Sie von dort aus über den Link zum Behandlungsweg eines
            Patienten, so wie Ihre Patienten es später auch bekommen.
          </p>
          <div>
            <label className="label" htmlFor="demo-fach">Ihr Fachgebiet</label>
            <select id="demo-fach" className="input" value={fach} onChange={(e) => { setFach(e.target.value); setError(null); }} data-testid="demo-fach">
              <option value="" disabled>Bitte wählen …</option>
              {FACH_GRUPPEN.map((g) => (
                <optgroup key={g.titel} label={g.titel}>
                  {g.faecher.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Die Demo-Praxis bekommt die Leistungen, Regeln und Beispielpatienten dieses Fachs.</p>
          </div>
          <p className="text-sm text-slate-700">
            Sie bekommen eine eigene, überschaubare Demo-Praxis mit 30 bis 80 erfundenen Patienten, Vorschlägen, Rückmeldungen und Anamnesen aus mehreren Monaten. Alles lässt sich
            ausprobieren, auch der Patienten-Link und der Anamnesebogen.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Keine Anmeldung, keine E-Mail nötig</li>
            <li>Bitte keine echten Patientendaten eingeben</li>
            <li>Der Zugang und alle Eingaben werden nach 24 Stunden gelöscht</li>
          </ul>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={start} disabled={busy} className="btn-primary w-full">
            {busy ? "Demo-Praxis wird angelegt …" : "Demo-Praxis öffnen"}
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
