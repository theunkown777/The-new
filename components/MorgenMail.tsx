"use client";

import { useState } from "react";

/** Schalter für die Morgen-Mail im Eingang (nur Praxisleitung). */
export function MorgenMail({ aktiv, an, versandBereit }: { aktiv: boolean; an: string; versandBereit: boolean }) {
  const [ein, setEin] = useState(aktiv);
  const [mail, setMail] = useState(an);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function speichern(naechster: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/praxis/morgenmail", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ an: mail, aktiv: naechster }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg(d?.error ?? "Speichern hat nicht geklappt.");
    setEin(naechster);
    setMsg(naechster ? "Eingeschaltet. Die erste Mail kommt am nächsten Werktag, wenn etwas offen ist." : "Ausgeschaltet.");
  }

  return (
    <section className="card mt-5 text-sm" data-testid="morgenmail">
      <h2 className="font-semibold text-slate-900">Morgens per E-Mail erinnern</h2>
      <p className="mt-1 text-slate-600">
        Werktags früh eine kurze Mail, wenn im Eingang etwas wartet: nur Zahlen („2 Rückmeldungen, 1 gemeldete Zahlung“), keine Namen und keine
        Gesundheitsangaben.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[16rem] flex-1">
          <span className="block text-slate-600">E-Mail-Adresse der Praxis (z. B. Empfang)</span>
          <input type="email" className="input mt-1 w-full" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="empfang@ihre-praxis.de" data-testid="morgenmail-an" />
        </label>
        <button type="button" className={ein ? "btn-secondary" : "btn-primary"} disabled={busy || !mail.trim()} onClick={() => speichern(!ein)} data-testid="morgenmail-schalter">
          {ein ? "Ausschalten" : "Einschalten"}
        </button>
      </div>
      {!versandBereit && <p className="mt-2 text-xs text-amber-800">Der E-Mail-Versand von Sorrida ist noch nicht freigeschaltet. Die Einstellung wird gespeichert und gilt, sobald er läuft.</p>}
      {msg && <p className="mt-2 text-slate-700" role="status">{msg}</p>}
    </section>
  );
}
