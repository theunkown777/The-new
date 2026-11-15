"use client";

import { useState, type ReactNode } from "react";

type Eintrag = { id: string; titel: string; zeile?: string; aktion: ReactNode };

/**
 * Sammelaktion: mehrere Personen ankreuzen und die Nachrichten nacheinander vorbereiten.
 * Jede Nachricht löst weiter ein Mensch aus (Text kopieren oder in WhatsApp senden); von allein geht nichts raus.
 */
export function Nacheinander({ eintraege, knopf = "Mehrere nacheinander vorbereiten", max = 30 }: { eintraege: Eintrag[]; knopf?: string; max?: number }) {
  const [offen, setOffen] = useState(false);
  const [wahl, setWahl] = useState<Set<string>>(new Set());
  const [schritt, setSchritt] = useState<number | null>(null);
  if (eintraege.length < 2) return null;
  const liste = eintraege.filter((e) => wahl.has(e.id));
  const start = () => { setWahl(new Set(eintraege.slice(0, max).map((e) => e.id))); setOffen(true); setSchritt(null); };
  const ende = () => { setOffen(false); setSchritt(null); };

  if (!offen)
    return <button type="button" className="btn-secondary" onClick={start} data-testid="sammel-start">{knopf}</button>;

  if (schritt === null)
    return (
      <div className="card space-y-3" data-testid="sammel-auswahl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-slate-900">Wen möchten Sie nacheinander anschreiben?</h2>
          <button type="button" className="text-sm text-slate-600 underline" onClick={ende}>Abbrechen</button>
        </div>
        <p className="text-sm text-slate-600">Sie gehen die Personen einzeln durch. Jede Nachricht kopieren oder senden Sie selbst; Sorrida verschickt nichts von allein.</p>
        <div className="flex gap-3 text-sm">
          <button type="button" className="text-brand-700 underline" onClick={() => setWahl(new Set(eintraege.slice(0, max).map((e) => e.id)))}>alle</button>
          <button type="button" className="text-brand-700 underline" onClick={() => setWahl(new Set())}>keine</button>
        </div>
        <ul className="max-h-72 space-y-1 overflow-auto">
          {eintraege.slice(0, max).map((e) => (
            <li key={e.id}>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={wahl.has(e.id)} onChange={(ev) => setWahl((w) => { const n = new Set(w); if (ev.target.checked) n.add(e.id); else n.delete(e.id); return n; })} />
                <span className="font-medium">{e.titel}</span>
                {e.zeile && <span className="text-slate-500">· {e.zeile}</span>}
              </label>
            </li>
          ))}
        </ul>
        {eintraege.length > max && <p className="text-xs text-slate-500">Gezeigt sind die ersten {max}.</p>}
        <button type="button" className="btn-primary" disabled={liste.length === 0} onClick={() => setSchritt(0)} data-testid="sammel-los">
          {liste.length} {liste.length === 1 ? "Person" : "Personen"} durchgehen
        </button>
      </div>
    );

  const e = liste[schritt];
  if (!e)
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3" role="status" data-testid="sammel-fertig">
        <p className="text-sm text-slate-800">Fertig: {liste.length} {liste.length === 1 ? "Person" : "Personen"} durchgegangen.</p>
        <button type="button" className="btn-secondary" onClick={ende}>Schließen</button>
      </div>
    );
  return (
    <div className="card space-y-3" data-testid="sammel-schritt">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{schritt + 1} von {liste.length}</p>
        <button type="button" className="text-sm text-slate-600 underline" onClick={ende}>Beenden</button>
      </div>
      <p className="font-display text-2xl text-slate-900">{e.titel}</p>
      {e.zeile && <p className="text-sm text-slate-600">{e.zeile}</p>}
      {/* key: jeder Schritt bekommt einen frischen Knopf, damit kein Link der vorigen Person stehen bleibt */}
      <div key={e.id}>{e.aktion}</div>
      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={() => setSchritt(schritt + 1)} data-testid="sammel-weiter">{schritt + 1 === liste.length ? "Abschließen" : "Weiter"}</button>
      </div>
    </div>
  );
}
