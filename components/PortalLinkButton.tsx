"use client";

import { useState } from "react";

// Portal-Link für einen Patienten erzeugen: Link, QR-Code und SMS-Text zum Kopieren.
export function PortalLinkButton({ patientId, firstName, practiceName, label = "Portal-Link senden", className = "btn-secondary", onCreated }: {
  patientId: string;
  firstName: string;
  practiceName: string;
  label?: string;
  className?: string;
  onCreated?: () => void;
}) {
  const [state, setState] = useState<{ url: string; qr: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = state ? `Hallo ${firstName}, in Ihrem Patientenportal der ${practiceName} sehen Sie Ihre offenen Rechnungen und Dokumente: ${state.url}` : "";

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/portal`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Link konnte nicht erstellt werden.");
    setState({ url: data.url, qr: data.qr });
    onCreated?.();
  }

  if (!state)
    return (
      <span>
        <button type="button" className={className} onClick={create} disabled={busy} data-testid="portal-link-button">
          {busy ? "Wird erstellt …" : label}
        </button>
        {error && <span className="ml-2 text-sm text-red-700">{error}</span>}
      </span>
    );

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm" data-testid="portal-link">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.qr} alt="QR-Code zum Patientenportal" className="h-32 w-32 shrink-0 rounded-lg bg-white p-1" />
        <div className="min-w-0 space-y-2">
          <p className="font-medium text-slate-900">Portal-Link für {firstName} (60 Tage gültig)</p>
          <p className="break-all text-xs text-slate-600">{state.url}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch {
                  /* markieren */
                }
              }}
            >
              {copied ? "Kopiert" : "SMS-Text kopieren"}
            </button>
            <a className="btn-secondary" href={state.url} target="_blank" rel="noreferrer">Ansehen</a>
          </div>
          <p className="text-xs text-slate-500">Der Link ersetzt einen früheren Portal-Link dieses Patienten.</p>
        </div>
      </div>
    </div>
  );
}
