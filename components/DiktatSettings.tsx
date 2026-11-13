"use client";

import { useState } from "react";

/** Schalter „Diktat über den Sprachdienst des Browsers“ (nur Praxisleitung). */
export function DiktatSettings({ erlaubt, darfAendern }: { erlaubt: boolean; darfAendern: boolean }) {
  const [ein, setEin] = useState(erlaubt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function speichern(naechster: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/praxis/diktat", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cloud: naechster }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg(d?.error ?? "Speichern hat nicht geklappt.");
    setEin(naechster);
    setMsg(naechster ? "Erlaubt. Gilt nach dem nächsten Laden der Seite." : "Ausgeschaltet. Gilt nach dem nächsten Laden der Seite.");
  }

  return (
    <section id="diktat" className="card mt-6 scroll-mt-6 text-sm" data-testid="diktat-einstellung">
      <h2 className="font-semibold text-slate-900">Diktat</h2>
      <p className="mt-1 text-slate-600">
        Sorrida lässt die Sprache vom Browser erkennen. Kann der Browser das <b>auf dem Gerät</b> (aktuelles Chrome mit geladenem deutschen
        Sprachpaket), verlässt die Aufnahme den Rechner nicht; das ist immer erlaubt.
      </p>
      <p className="mt-2 text-slate-600">
        Andernfalls schickt der Browser die Aufnahme an den Sprachdienst seines Herstellers (bei Chrome Google, bei Safari Apple). Dafür gibt es
        keinen Vertrag zur Auftragsverarbeitung mit Sorrida. Dieser Weg ist deshalb ausgeschaltet, bis Sie ihn hier erlauben.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ein ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`} data-testid="diktat-stand">
          {ein ? "Sprachdienst des Browsers: erlaubt" : "Sprachdienst des Browsers: aus"}
        </span>
        {darfAendern ? (
          <button type="button" className={ein ? "btn-primary" : "btn-secondary"} disabled={busy} onClick={() => speichern(!ein)} data-testid="diktat-schalter">
            {ein ? "Ausschalten" : "Erlauben"}
          </button>
        ) : (
          <span className="text-xs text-slate-500">Nur die Praxisleitung kann das ändern.</span>
        )}
      </div>
      {ein && <p className="mt-2 text-xs text-slate-600">Bitte im Team vereinbaren: keine Namen und keine Geburtsdaten diktieren, nur Befunde und Leistungen.</p>}
      {msg && <p className="mt-2 text-slate-700" role="status">{msg}</p>}
    </section>
  );
}
