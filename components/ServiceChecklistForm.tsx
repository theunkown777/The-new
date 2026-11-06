"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeEffectivePerformed } from "@/lib/serviceDependency";
import { estimateAmountCent, kassenLabel } from "@/lib/billing";
import { MicButton } from "@/components/MicButton";

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  insuranceType: string | null;
};

type CatalogItem = {
  id: string;
  system: string;
  code: string;
  title: string;
  description: string | null;
  category: string;
  toothRelevant: boolean;
  faktorMin: number | null;
  faktorMax: number | null;
  regelhoechstfaktor: number | null;
  begruendungspflichtAbFaktor: number | null;
  ausschlussMit: string[];
  gueltigAb: string | null;
  gueltigBis: string | null;
  punktzahl: number | null;
  festbetragCent: number | null;
};

// Manche Vorlagen enthalten dieselbe Leistung doppelt als GOZ- und
// BEMA-Position (z. B. "Eingehende Untersuchung"), damit je nach Kassenart
// die passende gewählt werden kann. Ohne Vorbelegung wären standardmäßig
// beide als erbracht markiert, was fachlich falsch wäre (nur eine der
// beiden wird tatsächlich abgerechnet). Ist die Kassenart des Patienten
// bekannt, wird daher nur die dazu passende Dublette vorbelegt.
function defaultPerformedFor(
  item: TemplateItem,
  allItems: TemplateItem[],
  kassenart: string | null
): boolean {
  if (!kassenart) return true;
  const counterpart = allItems.find(
    (other) =>
      other.catalogItemId !== item.catalogItemId &&
      other.catalogItem.title === item.catalogItem.title &&
      ((item.catalogItem.system === "GOZ" && other.catalogItem.system === "BEMA") ||
        (item.catalogItem.system === "BEMA" && other.catalogItem.system === "GOZ"))
  );
  if (!counterpart) return true;
  if (item.catalogItem.system === "GOZ") return kassenart === "PKV";
  if (item.catalogItem.system === "BEMA") return kassenart === "GKV";
  return true;
}

type TemplateItem = {
  catalogItemId: string;
  position: number;
  dependsOn: string[];
  catalogItem: CatalogItem;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
};

type EntryState = {
  performed: boolean;
  toothNumbers: string;
  quantity: number;
  note: string;
  faktor: string;
  begruendung: string;
};

export function ServiceChecklistForm({
  patients,
  initialPatientId,
  practicePunktwerte,
  savedHrefPrefix = "/reports/",
  beforeSubmit,
  submitLabel = "Bericht generieren",
  submittingLabel = "Bericht wird generiert…",
  onCreated,
  regionLabel = "Zahn/Region",
}: {
  /** Bezeichnung des Regionsfelds je Fach (Zahn, Auge, Ohr, Körperregion); null blendet es aus */
  regionLabel?: string | null;
  patients: PatientOption[];
  initialPatientId?: string;
  practicePunktwerte: { gozPunktwertCent: number | null; bemaPunktwertCent: number | null };
  /** Ziel nach dem Speichern; im Praxissoftware-Fenster bleibt der Nutzer unter /embed. */
  savedHrefPrefix?: string;
  /** Zusätzlicher Inhalt vor der Prüf-Bestätigung (Abschluss-Schritt: Befunde). */
  beforeSubmit?: React.ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
  /**
   * Abschluss-Schritt: läuft nach dem Anlegen des Berichts (z. B. Vorschlag
   * speichern) und liefert das Ziel der Weiterleitung. Ein Fehler bleibt
   * im Formular stehen; der Bericht ist dann bereits gespeichert.
   */
  onCreated?: (reportId: string) => Promise<string>;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(initialPatientId ?? patients[0]?.id ?? "");
  const [type, setType] = useState<"BEFUND" | "KRANKENKASSE">("BEFUND");
  const [treatmentDate, setTreatmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [additionalContext, setAdditionalContext] = useState("");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [entries, setEntries] = useState<Record<string, EntryState>>({});
  const [expandedTooth, setExpandedTooth] = useState<Record<string, boolean>>({});
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/service-templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        if (data.templates?.[0]) setTemplateId(data.templates[0].id);
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const kassenart = useMemo(
    () => patients.find((p) => p.id === patientId)?.insuranceType ?? null,
    [patients, patientId]
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    const next: Record<string, EntryState> = {};
    for (const item of selectedTemplate.items) {
      const defaultFaktor = item.catalogItem.regelhoechstfaktor;
      next[item.catalogItemId] = {
        performed: defaultPerformedFor(item, selectedTemplate.items, kassenart),
        toothNumbers: "",
        quantity: 1,
        note: "",
        faktor: defaultFaktor != null ? String(defaultFaktor) : "",
        begruendung: "",
      };
    }
    setEntries(next);
    setExpandedTooth({});
    setReviewConfirmed(false);
  }, [selectedTemplate, kassenart]);

  const grouped = useMemo(() => {
    if (!selectedTemplate) return [];
    const byCategory = new Map<string, TemplateItem[]>();
    for (const item of selectedTemplate.items) {
      const list = byCategory.get(item.catalogItem.category) ?? [];
      list.push(item);
      byCategory.set(item.catalogItem.category, list);
    }
    return Array.from(byCategory.entries());
  }, [selectedTemplate]);

  // Positions with a satisfied prerequisite follow their own checkbox;
  // positions whose prerequisite was struck are forced un-performed and
  // locked, since they could not logically have happened either.
  const effective = useMemo(() => {
    if (!selectedTemplate) return {};
    const ownPerformed: Record<string, boolean> = {};
    Object.entries(entries).forEach(([id, e]) => {
      ownPerformed[id] = e.performed;
    });
    const dependencyItems = selectedTemplate.items.map((it) => ({
      id: it.catalogItemId,
      dependsOn: it.dependsOn,
    }));
    return computeEffectivePerformed(dependencyItems, ownPerformed);
  }, [selectedTemplate, entries]);

  function isLocked(item: TemplateItem): boolean {
    if (item.dependsOn.length === 0) return false;
    return !item.dependsOn.some((pid) => effective[pid]);
  }

  // Positions that are mutually exclusive per Katalog (z. B. zwei
  // Füllungsarten) dürfen nicht beide gleichzeitig erbracht sein.
  const conflictingIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedTemplate) return set;
    for (const item of selectedTemplate.items) {
      if (!(effective[item.catalogItemId] ?? false)) continue;
      for (const otherId of item.catalogItem.ausschlussMit) {
        if (effective[otherId]) {
          set.add(item.catalogItemId);
          set.add(otherId);
        }
      }
    }
    return set;
  }, [selectedTemplate, effective]);

  const totalCount = selectedTemplate?.items.length ?? 0;
  const performedCount = selectedTemplate
    ? selectedTemplate.items.filter((it) => effective[it.catalogItemId]).length
    : 0;
  const struckCount = totalCount - performedCount;

  const totalEstimatedCent = useMemo(() => {
    if (!selectedTemplate) return null;
    let sum = 0;
    let any = false;
    for (const item of selectedTemplate.items) {
      if (!effective[item.catalogItemId]) continue;
      const entry = entries[item.catalogItemId];
      if (!entry) continue;
      const faktorNum = entry.faktor.trim() !== "" ? Number(entry.faktor) : null;
      const amount = estimateAmountCent(
        item.catalogItem,
        faktorNum,
        Number(entry.quantity) || 1,
        practicePunktwerte
      );
      if (amount != null) {
        sum += amount;
        any = true;
      }
    }
    return any ? sum : null;
  }, [selectedTemplate, effective, entries, practicePunktwerte]);

  function toggleItem(catalogItemId: string) {
    setEntries((prev) => ({
      ...prev,
      [catalogItemId]: { ...prev[catalogItemId], performed: !prev[catalogItemId].performed },
    }));
    setReviewConfirmed(false);
  }

  function updateItem(catalogItemId: string, patch: Partial<EntryState>) {
    setEntries((prev) => ({ ...prev, [catalogItemId]: { ...prev[catalogItemId], ...patch } }));
  }

  function titlesFor(ids: string[]): string {
    if (!selectedTemplate) return "";
    return ids
      .map((id) => selectedTemplate.items.find((it) => it.catalogItemId === id)?.catalogItem.title)
      .filter(Boolean)
      .join(" oder ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError("Bitte einen Patienten auswählen.");
      return;
    }
    if (!selectedTemplate) {
      setError("Bitte einen Sitzungstyp auswählen.");
      return;
    }
    if (!reviewConfirmed) {
      setError("Bitte bestätigen Sie unten, dass Sie die Liste vollständig geprüft haben.");
      return;
    }
    if (conflictingIds.size > 0) {
      setError(
        "Mindestens zwei erbrachte Positionen schließen sich laut Katalog gegenseitig aus. Bitte eine der beiden streichen."
      );
      return;
    }

    setSubmitting(true);

    const payload = {
      patientId,
      type,
      treatmentDate: treatmentDate || null,
      serviceTemplateId: selectedTemplate.id,
      reviewConfirmed,
      additionalContext: additionalContext || null,
      entries: selectedTemplate.items.map((item) => {
        const e = entries[item.catalogItemId];
        return {
          catalogItemId: item.catalogItemId,
          performed: effective[item.catalogItemId] ?? false,
          toothNumbers: e.toothNumbers || null,
          quantity: Number(e.quantity) || 1,
          note: e.note || null,
          faktor: e.faktor.trim() !== "" ? Number(e.faktor) : null,
          begruendung: e.begruendung || null,
        };
      }),
    };

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "Bericht konnte nicht erstellt werden.");
      return;
    }

    if (onCreated) {
      try {
        router.push(await onCreated(data.report.id));
      } catch (err) {
        setSubmitting(false);
        setError(err instanceof Error ? err.message : "Abschluss fehlgeschlagen.");
      }
      return;
    }
    setSubmitting(false);
    router.push(`${savedHrefPrefix}${data.report.id}`);
  }

  if (patients.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        Bitte legen Sie zuerst einen Patienten an, bevor Sie einen Bericht erstellen.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Patient</label>
            <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Behandlungsdatum</label>
            <input
              type="date"
              className="input"
              value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Sitzungstyp / Leistungskomplex</label>
            <select
              className="input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loadingTemplates}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Berichtstyp</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as "BEFUND" | "KRANKENKASSE")}
            >
              <option value="BEFUND">Befund-/Behandlungsbericht</option>
              <option value="KRANKENKASSE">Bericht an Krankenkasse</option>
            </select>
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <div className="card">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium text-slate-900">{selectedTemplate.name}</h2>
              {selectedTemplate.description && (
                <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-slate-500">
                {performedCount} erbracht · {struckCount} gestrichen von {totalCount}
              </p>
              {totalEstimatedCent != null && (
                <p className="text-sm font-medium text-slate-700">
                  ≈ {formatEuro(totalEstimatedCent)} geschätzt
                </p>
              )}
            </div>
          </div>

          <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Alle Positionen sind standardmäßig als <strong>erbracht</strong> markiert. Streichen Sie
            gezielt, was der Arzt / die Ärztin bei diesem Termin <strong>nicht</strong> gemacht hat,
            statt Einzelnes anzuhaken. Manche Positionen bauen aufeinander auf: Wird ein
            vorausgehender Schritt gestrichen, werden abhängige Folgeschritte automatisch mit
            gestrichen und gesperrt.
          </p>
          {totalEstimatedCent != null && (
            <p className="mb-4 -mt-2 text-xs text-slate-400">
              Geschätzter Gesamtbetrag der erbrachten Positionen – keine verbindliche Rechnung,
              abhängig von hinterlegtem Punktwert und ggf. Labor-/Praxiskosten.
            </p>
          )}

          <div className="space-y-6">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {category}
                </h3>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {items.map((item) => {
                    const entry = entries[item.catalogItemId];
                    if (!entry) return null;
                    const isBranch = item.dependsOn.length > 0;
                    const locked = isLocked(item);
                    const eff = effective[item.catalogItemId] ?? false;
                    const ref =
                      item.catalogItem.code !== "–"
                        ? `${item.catalogItem.system} ${item.catalogItem.code}`
                        : item.catalogItem.system;
                    const badge = kassenLabel(item.catalogItem.system);
                    const badgeClass =
                      badge.tone === "gkv"
                        ? "bg-blue-50 text-blue-700"
                        : badge.tone === "privat"
                          ? "bg-purple-50 text-purple-700"
                          : badge.tone === "labor"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500";
                    return (
                      <div
                        key={item.catalogItemId}
                        className={
                          "px-3 py-3" + (isBranch ? " relative border-l-2 border-slate-100 pl-7" : "")
                        }
                      >
                        <label
                          className={
                            "flex items-start gap-3" + (locked ? " cursor-not-allowed" : " cursor-pointer")
                          }
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                            checked={entry.performed && !locked}
                            disabled={locked}
                            onChange={() => toggleItem(item.catalogItemId)}
                          />
                          <span className="flex-1">
                            <span
                              className={
                                eff
                                  ? "font-medium text-slate-900"
                                  : "font-medium text-slate-400 line-through decoration-2"
                              }
                            >
                              {item.catalogItem.title}
                            </span>{" "}
                            <span
                              className={
                                eff ? "text-xs text-slate-400" : "text-xs text-slate-300 line-through"
                              }
                            >
                              ({ref})
                            </span>{" "}
                            {eff && (
                              <span
                                className={
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium " + badgeClass
                                }
                              >
                                {badge.text}
                              </span>
                            )}
                          </span>
                          {locked && (
                            <span className="shrink-0 text-xs font-medium text-slate-400">gesperrt</span>
                          )}
                        </label>

                        {locked && (
                          <p className="ml-7 mt-1 text-xs italic text-slate-400">
                            Setzt voraus: {titlesFor(item.dependsOn)}
                          </p>
                        )}

                        {eff && conflictingIds.has(item.catalogItemId) && (
                          <p className="ml-7 mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            Schließt sich laut Katalog aus mit: {titlesFor(item.catalogItem.ausschlussMit)}.
                            Bitte eine der beiden Positionen streichen.
                          </p>
                        )}

                        {eff && !locked && (() => {
                          const showTooth = regionLabel !== null && (item.catalogItem.toothRelevant || !!expandedTooth[item.catalogItemId]);
                          const hasFaktor =
                            item.catalogItem.faktorMin != null && item.catalogItem.faktorMax != null;
                          const threshold =
                            item.catalogItem.begruendungspflichtAbFaktor ?? item.catalogItem.regelhoechstfaktor;
                          const faktorNum = entry.faktor.trim() !== "" ? Number(entry.faktor) : null;
                          const needsBegruendung =
                            hasFaktor && threshold != null && faktorNum != null && faktorNum > threshold;
                          const itemAmountCent = estimateAmountCent(
                            item.catalogItem,
                            faktorNum,
                            Number(entry.quantity) || 1,
                            practicePunktwerte
                          );
                          return (
                            <div className="ml-7 mt-2">
                              {itemAmountCent != null && (
                                <p className="mb-1 text-xs text-slate-500">
                                  ≈ {formatEuro(itemAmountCent)} geschätzt
                                </p>
                              )}
                              <div
                                className={
                                  "grid grid-cols-2 gap-2" +
                                  (showTooth || hasFaktor ? " sm:grid-cols-3" : "") +
                                  (showTooth && hasFaktor ? " lg:grid-cols-4" : "")
                                }
                              >
                                {showTooth && (
                                  <input
                                    className="input py-1 text-xs"
                                    placeholder={regionLabel ?? ""}
                                    autoFocus={!item.catalogItem.toothRelevant}
                                    value={entry.toothNumbers}
                                    onChange={(e) =>
                                      updateItem(item.catalogItemId, { toothNumbers: e.target.value })
                                    }
                                  />
                                )}
                                <input
                                  className="input py-1 text-xs"
                                  type="number"
                                  min={1}
                                  placeholder="Anzahl"
                                  value={entry.quantity}
                                  onChange={(e) =>
                                    updateItem(item.catalogItemId, { quantity: Number(e.target.value) })
                                  }
                                />
                                <input
                                  className="input py-1 text-xs"
                                  placeholder="Notiz (optional)"
                                  value={entry.note}
                                  onChange={(e) => updateItem(item.catalogItemId, { note: e.target.value })}
                                />
                                {hasFaktor && (
                                  <input
                                    className="input py-1 text-xs"
                                    type="number"
                                    step={0.1}
                                    min={item.catalogItem.faktorMin ?? undefined}
                                    max={item.catalogItem.faktorMax ?? undefined}
                                    placeholder="Faktor"
                                    value={entry.faktor}
                                    onChange={(e) => updateItem(item.catalogItemId, { faktor: e.target.value })}
                                  />
                                )}
                              </div>
                              {!showTooth && regionLabel !== null && (
                                <button
                                  type="button"
                                  className="mt-1.5 text-xs text-brand-600 hover:underline"
                                  onClick={() =>
                                    setExpandedTooth((prev) => ({ ...prev, [item.catalogItemId]: true }))
                                  }
                                >
                                  + {regionLabel} ergänzen
                                </button>
                              )}
                              {needsBegruendung && (
                                <div className="mt-2">
                                  <label className="mb-1 block text-xs font-medium text-amber-700">
                                    Begründung Pflicht (Faktor {entry.faktor} über Regelhöchstfaktor {threshold})
                                  </label>
                                  <textarea
                                    className="input min-h-14 py-1 text-xs"
                                    placeholder="Schriftliche Begründung für den erhöhten Faktor (§5 GOZ)"
                                    value={entry.begruendung}
                                    onChange={(e) =>
                                      updateItem(item.catalogItemId, { begruendung: e.target.value })
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="label mb-0">Zusätzlicher Kontext (optional)</label>
          <MicButton
            onTranscript={(text) =>
              setAdditionalContext((prev) => (prev ? `${prev} ${text}` : text))
            }
          />
        </div>
        <textarea
          className="input min-h-20"
          placeholder="z. B. Empfänger, Anlass des Berichts, Besonderheiten"
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          Kurz reinsprechen genügt – die KI formuliert daraus einen ausführlicheren Abschnitt im
          Bericht, ohne die übliche Struktur zu ändern. Die Spracherkennung läuft über den Browser
          (Chrome empfohlen) und verarbeitet Audio ggf. über dessen Anbieter – bei Patientendaten
          entsprechend vorsichtig verwenden.
        </p>
      </div>

      {beforeSubmit}

      <div className="card">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={reviewConfirmed}
            onChange={(e) => setReviewConfirmed(e.target.checked)}
          />
          <span className="text-sm text-slate-700">
            Ich habe die vollständige Leistungsliste oben geprüft und alle nicht erbrachten
            Positionen gestrichen.
          </span>
        </label>
      </div>

      <button type="submit" disabled={submitting || !selectedTemplate} className="btn-primary w-full">
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
