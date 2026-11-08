"use client";

import { useState } from "react";

type Key = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  gdtKennung?: string | null;
  connectorInfo?: string | null;
};

/** Rückmeldung des Connectors lesbar machen: Version und ob der Rückweg in die Praxissoftware läuft. */
function status(k: Key): { text: string; warnung: boolean } | null {
  if (!k.lastUsedAt || k.revokedAt) return null;
  const v = k.connectorInfo?.match(/SorridaConnector\/([\d.]+)/)?.[1];
  if (!v) return { text: "Ältere Connector-Version: bitte mit dem aktuellen install.ps1 neu installieren", warnung: true };
  const rueckweg = /rueckweg=1/.test(k.connectorInfo ?? "");
  const ablage = /ablage=1/.test(k.connectorInfo ?? "");
  const weg = rueckweg ? "Rückweg in die Praxissoftware (GDT) aktiv" : ablage ? "Berichte als PDF in den Ablageordner aktiv" : "Rückweg nicht eingerichtet";
  return { text: `Connector ${v} · ${weg}${k.gdtKennung ? ` · GDT-Kennung ${k.gdtKennung}` : ""}`, warnung: false };
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE") : "nie");

export function ConnectorSettings({
  initialKeys,
  server,
  readOnly = false,
}: {
  initialKeys: Key[];
  server: string;
  readOnly?: boolean;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [art, setArt] = useState<"vdds" | "gdt">("vdds");
  const command = secret
    ? `powershell -ExecutionPolicy Bypass -File install.ps1 -Server ${server || "https://ihre-sorrida-adresse.de"} -Key ${secret}` +
      (art === "gdt" ? ` -GdtFile C:\\GDT\\SORRIDA.GDT -GdtImport C:\\GDT\\IMPORT` : ` -Ablage C:\\Sorrida\\Berichte`)
    : "";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/connector-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Schlüssel konnte nicht erzeugt werden.");
      return;
    }
    setKeys([data.key, ...keys]);
    setSecret(data.secret);
    setName("");
  }

  async function revoke(id: string) {
    setError(null);
    const res = await fetch(`/api/settings/connector-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Widerrufen fehlgeschlagen.");
      return;
    }
    setKeys(keys.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich. Bitte den Befehl manuell markieren.");
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!readOnly && (
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <label className="label" htmlFor="connector-name">Name des PCs</label>
            <input
              id="connector-name"
              className="input"
              placeholder="z. B. Empfang, Behandlungszimmer 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Erzeugt…" : "Schlüssel erzeugen"}
          </button>
        </form>
      )}

      {secret && (
        <div className="space-y-2 rounded-lg border border-green-300 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            Schlüssel erzeugt. Er wird nur jetzt angezeigt. Installationsbefehl für diesen PC:
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Art der Praxissoftware">
            {([["vdds", "Zahnarztpraxis (VDDS-media)"], ["gdt", "Arztpraxis (GDT)"]] as const).map(([wert, label]) => (
              <button key={wert} type="button" role="radio" aria-checked={art === wert} onClick={() => setArt(wert)}
                className={`rounded-full px-3 py-1 text-xs ${art === wert ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                {label}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-white p-2 text-xs text-slate-800">{command}</pre>
          <button type="button" onClick={copy} className="btn-secondary">
            {copied ? "Kopiert" : "Befehl kopieren"}
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {keys.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {k.name} <span className="font-mono text-xs text-slate-400">{k.keyPrefix}…</span>
                </p>
                <p className="text-xs text-slate-500">
                  erstellt {fmt(k.createdAt)} · zuletzt verbunden {fmt(k.lastUsedAt)}
                </p>
                {status(k) && (
                  <p className={`text-xs ${status(k)!.warnung ? "text-amber-700" : "text-salbei-700"}`} data-testid="connector-status">{status(k)!.text}</p>
                )}
              </div>
              {k.revokedAt ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">widerrufen</span>
              ) : (
                !readOnly && (
                  <button type="button" onClick={() => revoke(k.id)} className="btn-secondary">
                    Widerrufen
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
