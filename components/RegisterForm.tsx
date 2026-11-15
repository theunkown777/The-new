"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FACH_GRUPPEN, SPECIALTY_AUSWAHL } from "@/lib/specialties";
import Link from "next/link";
import { BESTAETIGUNG_UNTERNEHMER, BESTAETIGUNG_VERTRAGSTEXTE } from "@/lib/registrierung";

// Formular der Registrierung. Nur zu sehen, wenn die Registrierung geöffnet ist (lib/registrierung.ts);
// die beiden Bestätigungen prüft der Server noch einmal (app/api/register/route.ts).
export function RegisterForm() {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState("");
  const [specialty, setSpecialty] = useState("");
  // Vorauswahl über /register?fach=haut (z. B. von den Fachseiten).
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("fach");
    if (f && f in SPECIALTY_AUSWAHL) setSpecialty(f);
  }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [unternehmer, setUnternehmer] = useState(false);
  const [vertragstexte, setVertragstexte] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unternehmer || !vertragstexte) return setError("Bitte bestätigen Sie beide Hinweise unter dem Formular.");
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceName, name, email, password, specialty, unternehmer, vertragstexte }),
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
          <p className="mt-1 text-sm text-slate-500">Nur für Praxen und andere Unternehmer. Nicht für Verbraucher.</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4" data-testid="register-form">
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
            <select id="specialty" required className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="" disabled>Bitte wählen …</option>
              {FACH_GRUPPEN.map((g) => (
                <optgroup key={g.titel} label={g.titel}>
                  {g.faecher.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value="andere">{SPECIALTY_AUSWAHL.andere}</option>
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
            <p className="mt-1 text-xs text-slate-500">Mindestens 8 Zeichen</p>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={unternehmer} onChange={(e) => setUnternehmer(e.target.checked)} data-testid="register-unternehmer" />
            <span>{BESTAETIGUNG_UNTERNEHMER}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={vertragstexte} onChange={(e) => setVertragstexte(e.target.checked)} data-testid="register-vertragstexte" />
            <span>
              {BESTAETIGUNG_VERTRAGSTEXTE}{" "}
              <Link href="/avv" target="_blank" className="text-brand-700 underline">AVV-Muster</Link>
              {" · "}
              <Link href="/impressum#zweck" target="_blank" className="text-brand-700 underline">Wofür Sorrida bestimmt ist</Link>
            </span>
          </label>
          <p className="text-xs text-slate-500">
            Das Konto kostet nichts. Kostenpflichtig wird Sorrida erst, wenn Sie später ausdrücklich ein Paket bestellen. Informationen zum
            Datenschutz: <Link href="/datenschutz" target="_blank" className="underline">Datenschutzerklärung</Link>.
          </p>
          <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="register-absenden">
            {loading ? "Wird erstellt…" : "Konto für die Praxis anlegen"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Bereits registriert?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Anmelden
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-slate-500" data-testid="register-rechtliches">
          <Link href="/impressum" className="hover:underline">Impressum</Link> ·{" "}
          <Link href="/datenschutz" className="hover:underline">Datenschutz</Link> ·{" "}
          <Link href="/avv" className="hover:underline">AVV-Muster</Link>
        </p>
      </div>
    </main>
  );
}
