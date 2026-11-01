"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_TYPE_LABELS } from "@/lib/reportLabels";
import { estimateAmountCent, kassenLabel } from "@/lib/billing";

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

interface ServiceEntryData {
  id: string;
  performed: boolean;
  toothNumbers: string | null;
  quantity: number;
  note: string | null;
  faktor: number | null;
  catalogItem: {
    system: string;
    code: string;
    title: string;
    category: string;
    punktzahl: number | null;
    festbetragCent: number | null;
  };
}

interface ReportData {
  id: string;
  type: string;
  status: "ENTWURF" | "FINAL";
  generatedText: string | null;
  editedText: string | null;
  serviceSummary: string;
  serviceTemplateName: string | null;
  serviceEntries: ServiceEntryData[];
  reviewConfirmed: boolean;
  additionalContext: string | null;
  patient: { firstName: string; lastName: string };
  author: { name: string };
  createdAt: string;
  approval?: { name: string; at: string } | null;
}

type Revision = { id: string; text: string; createdAt: string; editedBy: { name: string } };

export function ReportEditor({
  report,
  practicePunktwerte,
}: {
  report: ReportData;
  practicePunktwerte: { gozPunktwertCent: number | null; bemaPunktwertCent: number | null };
}) {
  const router = useRouter();
  const [text, setText] = useState(report.editedText ?? report.generatedText ?? "");
  const [status, setStatus] = useState(report.status);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (revisions !== null) return;
    setLoadingHistory(true);
    const res = await fetch(`/api/reports/${report.id}/revisions`);
    const data = await res.json();
    setLoadingHistory(false);
    if (res.ok) setRevisions(data.revisions);
  }

  async function save(newStatus?: "ENTWURF" | "FINAL") {
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editedText: text, ...(newStatus ? { status: newStatus } : {}) }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Speichern fehlgeschlagen.");
      return;
    }

    if (newStatus) setStatus(newStatus);
    setMessage("Gespeichert.");
    router.refresh();
  }

  const totalEstimatedCent = useMemo(() => {
    let sum = 0;
    let any = false;
    for (const entry of report.serviceEntries) {
      if (!entry.performed) continue;
      const amount = estimateAmountCent(entry.catalogItem, entry.faktor, entry.quantity, practicePunktwerte);
      if (amount != null) {
        sum += amount;
        any = true;
      }
    }
    return any ? sum : null;
  }, [report.serviceEntries, practicePunktwerte]);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/reports/${report.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setRegenerating(false);

    if (!res.ok) {
      setError(data.error ?? "Neu generieren fehlgeschlagen.");
      return;
    }

    setText(data.report.generatedText);
    setMessage("Bericht wurde neu generiert.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {REPORT_TYPE_LABELS[report.type]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {report.patient.firstName} {report.patient.lastName} · erstellt am{" "}
            {report.createdAt} von {report.author.name}
          </p>
        </div>
        <span
          className={
            status === "FINAL"
              ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
              : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
          }
        >
          {status === "FINAL" ? "Final" : "Entwurf"}
        </span>
      </div>

      {text.startsWith("[TESTMODUS") ? (
        <p className="mb-4 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-800">
          Dieser Bericht wurde im <strong>Testmodus</strong> ohne KI-Verbindung erstellt (nur die
          erfassten Daten zusammengestellt, kein ausformulierter Text). Für echte KI-Formulierung ist
          serverseitig ein Anthropic-API-Key mit Guthaben hinterlegt und der Bericht neu zu generieren.
        </p>
      ) : (
        status === "ENTWURF" && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Dieser Bericht wurde von einer KI erstellt. Bitte prüfen Sie den Inhalt sorgfältig, bevor
            Sie ihn freigeben oder versenden.
          </p>
        )
      )}

      {status === "FINAL" && report.approval && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" data-testid="freigabe">
          Freigegeben von <strong>{report.approval.name}</strong> am {report.approval.at}. Eine spätere Änderung macht den Bericht
          wieder zum Entwurf und verlangt eine neue Freigabe.
        </p>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      <div className="card mb-4">
        <textarea
          className="min-h-[420px] w-full resize-y border-0 p-0 text-sm leading-relaxed text-slate-800 focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={status === "FINAL"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => save()}
          disabled={saving || status === "FINAL"}
          className="btn-secondary"
        >
          {saving ? "Speichert…" : "Änderungen speichern"}
        </button>
        <button
          onClick={regenerate}
          disabled={regenerating || status === "FINAL"}
          className="btn-secondary"
        >
          {regenerating ? "Generiert neu…" : "Neu generieren"}
        </button>
        {status === "ENTWURF" ? (
          <button onClick={() => save("FINAL")} disabled={saving} className="btn-primary">
            Als final freigeben
          </button>
        ) : (
          <button onClick={() => save("ENTWURF")} disabled={saving} className="btn-secondary">
            Wieder als Entwurf markieren
          </button>
        )}
        <a href={`/api/reports/${report.id}/pdf`} className="btn-secondary">
          Als PDF herunterladen
        </a>
        <button type="button" onClick={toggleHistory} className="btn-secondary">
          {showHistory ? "Verlauf ausblenden" : "Änderungsverlauf anzeigen"}
        </button>
      </div>

      {showHistory && (
        <div className="card mt-4">
          <h2 className="mb-3 font-medium text-slate-900">Änderungsverlauf</h2>
          {loadingHistory && <p className="text-sm text-slate-500">Lädt…</p>}
          {!loadingHistory && revisions?.length === 0 && (
            <p className="text-sm text-slate-500">
              Noch keine früheren Versionen – dieser Bericht wurde seit der Erstellung nicht
              bearbeitet.
            </p>
          )}
          {!loadingHistory && revisions && revisions.length > 0 && (
            <div className="space-y-3">
              {revisions.map((rev) => (
                <details key={rev.id} className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Version vom {new Date(rev.createdAt).toLocaleString("de-DE")} · vor
                    Bearbeitung durch {rev.editedBy.name}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{rev.text}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-brand-600 hover:underline"
                    onClick={() => {
                      setText(rev.text);
                      setMessage("Frühere Version in den Editor geladen – bitte prüfen und speichern.");
                    }}
                    disabled={status === "FINAL"}
                  >
                    Diese Version in den Editor laden
                  </button>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-slate-900">
            Erfasste Leistungen{report.serviceTemplateName ? ` – ${report.serviceTemplateName}` : ""}
          </h2>
          <div className="flex items-center gap-2">
            {totalEstimatedCent != null && (
              <span className="text-sm font-medium text-slate-700">
                ≈ {formatEuro(totalEstimatedCent)} geschätzt
              </span>
            )}
            {report.reviewConfirmed && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Vollständig geprüft
              </span>
            )}
          </div>
        </div>
        {totalEstimatedCent != null && (
          <p className="mb-3 text-xs text-slate-400">
            Geschätzter Gesamtbetrag der erbrachten Positionen – keine verbindliche Rechnung.
          </p>
        )}
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {report.serviceEntries.map((entry) => {
            const ref =
              entry.catalogItem.code !== "–"
                ? `${entry.catalogItem.system} ${entry.catalogItem.code}`
                : entry.catalogItem.system;
            const badge = kassenLabel(entry.catalogItem.system);
            const badgeClass =
              badge.tone === "gkv"
                ? "bg-blue-50 text-blue-700"
                : badge.tone === "privat"
                  ? "bg-purple-50 text-purple-700"
                  : badge.tone === "labor"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-500";
            const amountCent = entry.performed
              ? estimateAmountCent(entry.catalogItem, entry.faktor, entry.quantity, practicePunktwerte)
              : null;
            return (
              <div key={entry.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <div>
                  <span
                    className={
                      entry.performed
                        ? "text-slate-800"
                        : "text-slate-400 line-through decoration-2"
                    }
                  >
                    {entry.catalogItem.title}
                  </span>{" "}
                  <span className="text-xs text-slate-400">({ref})</span>{" "}
                  {entry.performed && (
                    <span
                      className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + badgeClass}
                    >
                      {badge.text}
                    </span>
                  )}
                  {entry.performed && (entry.toothNumbers || entry.quantity !== 1 || entry.note) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {entry.toothNumbers && `Zahn/Region: ${entry.toothNumbers}`}
                      {entry.toothNumbers && (entry.quantity !== 1 || entry.note) && " · "}
                      {entry.quantity !== 1 && `Anzahl: ${entry.quantity}`}
                      {entry.quantity !== 1 && entry.note && " · "}
                      {entry.note && entry.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {!entry.performed && <span className="text-xs text-slate-400">nicht erbracht</span>}
                  {amountCent != null && (
                    <span className="text-xs font-medium text-slate-600">{formatEuro(amountCent)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
