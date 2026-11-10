"use client";

import { useEffect, useState } from "react";

type Item = { id: string; code: string; title: string; festbetragCent: number | null };

/**
 * Eigene Leistung in zwei Feldern anlegen: Name und (auf Wunsch) Preis. Ziffer und Einordnung
 * vergibt Sorrida. `onCreated` bekommt die fertige Katalogposition, z. B. um sie gleich in die
 * Sitzung zu übernehmen.
 */
export function LeistungSchnell({ vorgabe = "", onCreated, offen = false, titel = "Eigene Leistung anlegen", knopf = "Anlegen" }: {
  vorgabe?: string; onCreated?: (item: never) => void; offen?: boolean; titel?: string; knopf?: string;
}) {
  const [auf, setAuf] = useState(offen);
  const [name, setName] = useState(vorgabe);
  const [preis, setPreis] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (vorgabe) setName(vorgabe); }, [vorgabe]);

  async function anlegen() {
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Bitte einen Namen eingeben." });
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/catalog-items/schnell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, preis }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !d?.item) return setMsg({ ok: false, text: d?.error ?? "Anlegen fehlgeschlagen." });
    const it = d.item as Item;
    setMsg({ ok: true, text: d.schonVorhanden ? `„${it.title}“ gab es schon (${it.code}) und wurde übernommen.` : `„${it.title}“ ist angelegt (${it.code}${it.festbetragCent != null ? `, ${(it.festbetragCent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}` : ""}).` });
    setName("");
    setPreis("");
    onCreated?.(d.item as never);
  }

  if (!auf)
    return (
      <button type="button" className="text-sm text-brand-700 underline" onClick={() => setAuf(true)} data-testid="leistung-schnell-oeffnen">
        + {titel}
      </button>
    );
  // Kein <form>: der Kasten sitzt oft in einem größeren Formular.
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3" data-testid="leistung-schnell">
      <p className="text-sm font-medium text-slate-900">{titel}</p>
      <p className="text-xs text-slate-600">Nur der Name ist nötig. Ziffer und Einordnung vergibt Sorrida, den Preis können Sie später ergänzen.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input className="input w-full sm:flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Bleaching" aria-label="Name der Leistung" maxLength={120}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); anlegen(); } }} data-testid="leistung-schnell-name" />
        <input className="input w-full sm:w-36" value={preis} onChange={(e) => setPreis(e.target.value)} placeholder="Preis in €" inputMode="decimal" aria-label="Preis in Euro (freiwillig)"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); anlegen(); } }} data-testid="leistung-schnell-preis" />
        <button type="button" className="btn-primary shrink-0" onClick={anlegen} disabled={busy} data-testid="leistung-schnell-anlegen">{busy ? "Legt an …" : knopf}</button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`} role={msg.ok ? "status" : "alert"} data-testid="leistung-schnell-meldung">{msg.text}</p>}
    </div>
  );
}
