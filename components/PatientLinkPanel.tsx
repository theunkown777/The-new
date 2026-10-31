"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PATIENT_RESPONSE_LABELS, type PatientLinkState } from "@/lib/patientLink";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Patienten-Link erzeugen, als QR zeigen und Rückmeldung des Patienten anzeigen.
export function PatientLinkPanel({ proposalId, state, firstName }: { proposalId: string; state: PatientLinkState; firstName: string }) {
  const router = useRouter();
  const [link, setLink] = useState<{ url: string; qr: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proposals/${proposalId}/share`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError("Link konnte nicht erzeugt werden.");
      return;
    }
    const data = await res.json();
    setLink({ url: data.url, qr: data.qr });
    router.refresh();
  }

  async function revoke() {
    setBusy(true);
    await fetch(`/api/proposals/${proposalId}/share`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setLink(null);
    router.refresh();
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const smsText = link
    ? `Guten Tag ${firstName}, hier ist Ihr Behandlungsvorschlag mit allen Optionen und Kosten: ${link.url}`
    : "";

  return (
    <div className="card space-y-3" data-testid="patient-link-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-slate-900">Patienten-Link</h2>
        {state.active && state.expiresAt && (
          <span className="text-xs text-slate-500">aktiv bis {new Date(state.expiresAt).toLocaleDateString("de-DE")}</span>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Der Patient sieht seine Optionen mit Eigenanteil auf dem Handy, kann selbst vergleichen und meldet sich mit einem Tipp zurück.
        Der Link enthält keine Patientendaten und läuft nach 30 Tagen ab.
      </p>

      {state.response && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900" data-testid="patient-response">
          <strong>
            {firstName} {PATIENT_RESPONSE_LABELS[state.response] ?? state.response}
          </strong>
          {state.respondedAt && <span className="text-emerald-800"> · {fmt(state.respondedAt)}</span>}
          {state.choiceLabels.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {state.choiceLabels.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {state.note && <p className="mt-1 italic">„{state.note}“</p>}
        </div>
      )}
      {state.active && !state.response && (
        <p className="text-sm text-slate-600">
          {state.viewedAt ? `Vom Patienten geöffnet am ${fmt(state.viewedAt)}, noch keine Rückmeldung.` : "Noch nicht geöffnet."}
        </p>
      )}

      {link && (
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.qr} alt="QR-Code zum Patienten-Link" width={160} height={160} className="h-40 w-40 shrink-0" />
          <div className="min-w-0 space-y-2 text-sm">
            <p className="text-slate-600">Am Empfang zeigen oder abfotografieren lassen. Der Link wird nur jetzt angezeigt.</p>
            <code className="block break-all rounded bg-slate-100 p-2 text-xs" data-testid="patient-link-url">
              {link.url}
            </code>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" onClick={copy}>
                {copied ? "Kopiert" : "Link kopieren"}
              </button>
              <a className="btn btn-secondary" href={`mailto:?subject=${encodeURIComponent("Ihr Behandlungsvorschlag")}&body=${encodeURIComponent(smsText)}`}>
                Per E-Mail
              </a>
              <a className="btn btn-secondary" href={`sms:?&body=${encodeURIComponent(smsText)}`}>
                Per SMS
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
          {state.active ? "Neuen Link erzeugen" : "Link und QR-Code erzeugen"}
        </button>
        {state.active && (
          <button type="button" className="btn btn-secondary" onClick={revoke} disabled={busy}>
            Link sperren
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
