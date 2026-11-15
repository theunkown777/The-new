"use client";

import { useState } from "react";

// Sperre des Empfangs-Tablets: Der Patient ist fertig (oder die Zeit ist abgelaufen). Zurück in die
// Praxis-Ansicht führt nur die vierstellige Empfangs-PIN oder eine neue Anmeldung.
export function EmpfangSperre({ mitPin }: { mitPin: boolean }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [nurAnmeldung, setNurAnmeldung] = useState(!mitPin);

  async function entsperren(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setFehler("Bitte die vierstellige PIN eingeben.");
    setBusy(true); setFehler(null);
    const res = await fetch("/api/empfang/entsperren", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setPin("");
    if (res?.ok) { window.location.replace(d?.ziel ?? "/empfang"); return; }
    setBusy(false);
    setFehler(d?.error ?? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    if (d?.code === "VERWORFEN" || d?.code === "KEINE_SITZUNG" || d?.code === "KEINE_PIN") setNurAnmeldung(true);
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm" data-testid="empfang-sperre">
      <p className="font-display text-3xl text-slate-900">Vielen Dank</p>
      <p className="mt-2 text-slate-600" data-testid="empfang-sperre-text">Bitte geben Sie das Tablet am Empfang zurück.</p>

      <div className="mt-8 border-t border-slate-100 pt-5 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Für das Praxisteam</p>
        {fehler && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert" data-testid="empfang-sperre-fehler">{fehler}</p>}
        {!nurAnmeldung && (
          <form onSubmit={entsperren} className="mt-2 flex items-end gap-2">
            <label className="min-w-0 flex-1"><span className="label">Empfangs-PIN</span>
              <input className="input text-center text-lg tracking-[0.5em]" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Empfangs-PIN" data-testid="empfang-pin-eingabe" /></label>
            <button className="btn btn-primary" disabled={busy || pin.length !== 4} data-testid="empfang-entsperren">{busy ? "Prüft …" : "Entsperren"}</button>
          </form>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {nurAnmeldung ? "Bitte melden Sie sich mit E-Mail und Passwort neu an. " : "PIN vergessen oder gesperrt? "}
          <a href="/login?callbackUrl=%2Fempfang" className="text-brand-700 underline" data-testid="empfang-neu-anmelden">Neu anmelden</a>
        </p>
      </div>
    </div>
  );
}
