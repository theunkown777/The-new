"use client";

import { useState } from "react";

/** Einstellungen → Rückmeldung: Link zum Google-Profil der Praxis hinterlegen oder entfernen. */
export function BewertungsLinkForm({ start }: { start: string }) {
  const [url, setUrl] = useState(start);
  const [hinterlegt, setHinterlegt] = useState(!!start);
  const [stand, setStand] = useState<"" | "speichert" | "gespeichert">("");
  const [fehler, setFehler] = useState("");

  async function speichern(wert: string) {
    setStand("speichert");
    setFehler("");
    const res = await fetch("/api/praxis/rueckmeldung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: wert }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      setUrl(data?.url ?? "");
      setHinterlegt(!!data?.url);
      setStand("gespeichert");
      return;
    }
    setFehler(data?.error ?? "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    setStand("");
  }

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        speichern(url);
      }}
      data-testid="bewertungslink-form"
    >
      <div>
        <label className="label" htmlFor="google-profil">Link zu Ihrem Google-Profil (freiwillig)</label>
        <input id="google-profil" className="input" type="url" inputMode="url" placeholder="https://g.page/r/…" value={url} onChange={(e) => { setUrl(e.target.value); setStand(""); }} maxLength={300} data-testid="bewertungslink-eingabe" />
        <p className="mt-1 text-xs text-slate-500">Erlaubt sind nur Adressen mit https:// auf google.com, g.page oder maps.app.goo.gl. Leer lassen, wenn kein Hinweis erscheinen soll.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={stand === "speichert"} data-testid="bewertungslink-speichern">Speichern</button>
        {hinterlegt && (
          <button type="button" className="btn btn-secondary" disabled={stand === "speichert"} onClick={() => speichern("")} data-testid="bewertungslink-entfernen">Link entfernen</button>
        )}
        {stand === "gespeichert" && <span className="text-sm text-emerald-700" role="status" data-testid="bewertungslink-gespeichert">Gespeichert.</span>}
      </div>
      {fehler && <p className="text-sm text-red-700" role="alert" data-testid="bewertungslink-fehler">{fehler}</p>}
    </form>
  );
}
