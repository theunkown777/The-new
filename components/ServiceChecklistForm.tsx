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
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
    setOpen({});
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
        <section className="card p-0" data-testid="leistungsliste">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-2xl text-slate-900">{selectedTemplate.name}</h2>
              {selectedTemplate.description && (
                <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600" data-testid="zaehler">
                <span className="font-semibold tabular-nums text-slate-900">{performedCount}</span> von {totalCount} erbracht
              </p>
              {totalEstimatedCent != null && (
                <p className="text-xs text-slate-500" title="Schätzung aus Punktwert und Faktor, keine Rechnung">
                  ≈ {formatEuro(totalEstimatedCent)}
                </p>
              )}
            </div>
          </header>

          <p className="px-5 pt-3 text-sm text-slate-500 sm:px-6">
            Alles ist als erbracht vorbelegt. Tippen Sie an, was heute <strong className="font-semibold text-slate-700">nicht</strong> gemacht wurde{struckCount > 0 ? ` (${struckCount} gestrichen)` : ""}.
          </p>

          <div className="space-y-5 px-3 pb-4 pt-3 sm:px-4">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-1 px-2 text-xs font-medium text-slate-400">{category}</h3>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const entry = entries[item.catalogItemId];
                    if (!entry) return null;
                    const locked = isLocked(item);
                    const eff = effective[item.catalogItemId] ?? false;
                    const offen = !!open[item.catalogItemId];
                    const badge = kassenLabel(item.catalogItem.system);
                    const art =
                      badge.tone === "gkv"
                        ? { text: "Kasse", cls: "text-salbei-700", dot: "bg-salbei-500" }
                        : badge.tone === "privat"
                          ? { text: item.catalogItem.system === "SELBST" ? "Selbstzahler" : "Privat", cls: "text-brand-700", dot: "bg-brand-600" }
                          : badge.tone === "labor"
                            ? { text: "Labor", cls: "text-amber-700", dot: "bg-amber-500" }
                            : { text: item.catalogItem.system === "APO" ? "Apotheke" : "ohne eigene Abrechnung", cls: "text-slate-500", dot: "bg-slate-300" };
                    const code = item.catalogItem.code !== "–" ? `${item.catalogItem.system} ${item.catalogItem.code}` : null;
                    const hasFaktor = item.catalogItem.faktorMin != null && item.catalogItem.faktorMax != null;
                    const threshold = item.catalogItem.begruendungspflichtAbFaktor ?? item.catalogItem.regelhoechstfaktor;
                    const faktorNum = entry.faktor.trim() !== "" ? Number(entry.faktor) : null;
                    const needsBegruendung = hasFaktor && threshold != null && faktorNum != null && faktorNum > threshold;
                    const showRegion = regionLabel !== null;
                    const regionPflicht = regionLabel !== null && item.catalogItem.toothRelevant && !entry.toothNumbers.trim();
                    const itemAmountCent = estimateAmountCent(item.catalogItem, faktorNum, Number(entry.quantity) || 1, practicePunktwerte);
                    const zusatz = [
                      entry.quantity > 1 ? `${entry.quantity}×` : null,
                      hasFaktor && entry.faktor ? `Faktor ${entry.faktor.replace(".", ",")}` : null,
                      entry.toothNumbers ? `${regionLabel ?? "Region"} ${entry.toothNumbers}` : null,
                      entry.note ? "Notiz" : null,
                    ].filter(Boolean) as string[];
                    return (
                      <li
                        key={item.catalogItemId}
                        className={`rounded-lg transition ${eff ? "bg-white" : "bg-slate-50"} ${offen ? "ring-1 ring-slate-200" : ""} ${item.dependsOn.length ? "ml-5" : ""}`}
                        data-testid="position"
                      >
                        <div className="flex items-center gap-3 px-2 py-2">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={eff}
                            aria-label={`${item.catalogItem.title}: ${eff ? "erbracht" : "nicht erbracht"}`}
                            disabled={locked}
                            onClick={() => toggleItem(item.catalogItemId)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed ${
                              eff ? "border-salbei-600 bg-salbei-600 text-white" : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            disabled={locked}
                            onClick={() => toggleItem(item.catalogItemId)}
                          >
                            <span className={`block text-[15px] ${eff ? "text-slate-900" : "text-slate-400 line-through"}`}>{item.catalogItem.title}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                              <span className={`inline-flex items-center gap-1 ${eff ? art.cls : ""}`} title={badge.text}>
                                <span className={`h-1.5 w-1.5 rounded-full ${eff ? art.dot : "bg-slate-300"}`} />
                                {art.text}
                              </span>
                              {code && <span>{code}</span>}
                              {eff && zusatz.map((z) => <span key={z} className="text-slate-600">· {z}</span>)}
                              {locked && <span>· setzt voraus: {titlesFor(item.dependsOn)}</span>}
                            </span>
                          </button>
                          {eff && !locked && (
                            <button
                              type="button"
                              onClick={() => setOpen((o) => ({ ...o, [item.catalogItemId]: !o[item.catalogItemId] }))}
                              aria-expanded={offen}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${regionPflicht || needsBegruendung ? "bg-amber-50 text-amber-800" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                              {regionPflicht ? `${regionLabel} fehlt` : needsBegruendung && !entry.begruendung ? "Begründung fehlt" : offen ? "Fertig" : "Details"}
                            </button>
                          )}
                        </div>

                        {eff && conflictingIds.has(item.catalogItemId) && (
                          <p className="mx-2 mb-2 ml-11 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            Schließt sich aus mit {titlesFor(item.catalogItem.ausschlussMit)}. Bitte eine davon streichen.
                          </p>
                        )}

                        {eff && !locked && offen && (
                          <div className="space-y-3 px-2 pb-3 pl-11">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs text-slate-500">Anzahl</span>
                              <div className="inline-flex items-center rounded-full border border-slate-200">
                                <button type="button" className="h-8 w-8 rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30" disabled={entry.quantity <= 1} onClick={() => updateItem(item.catalogItemId, { quantity: Math.max(1, entry.quantity - 1) })} aria-label="Eins weniger">−</button>
                                <span className="w-6 text-center text-sm tabular-nums" data-testid="anzahl">{entry.quantity}</span>
                                <button type="button" className="h-8 w-8 rounded-full text-slate-600 hover:bg-slate-100" onClick={() => updateItem(item.catalogItemId, { quantity: Math.min(99, entry.quantity + 1) })} aria-label="Eins mehr">+</button>
                              </div>
                              {hasFaktor && (
                                <label className="flex items-center gap-2 text-xs text-slate-500">
                                  Faktor
                                  <input
                                    className="input w-20 py-1 text-sm"
                                    type="number"
                                    step={0.1}
                                    min={item.catalogItem.faktorMin ?? undefined}
                                    max={item.catalogItem.faktorMax ?? undefined}
                                    value={entry.faktor}
                                    onChange={(e) => updateItem(item.catalogItemId, { faktor: e.target.value })}
                                  />
                                </label>
                              )}
                              {itemAmountCent != null && <span className="text-xs text-slate-500">≈ {formatEuro(itemAmountCent)}</span>}
                            </div>
                            <div className={`grid gap-2 ${showRegion ? "sm:grid-cols-[10rem_1fr]" : ""}`}>
                              {showRegion && (
                                <input
                                  className="input py-1.5"
                                  placeholder={regionLabel ?? ""}
                                  aria-label={regionLabel ?? "Region"}
                                  value={entry.toothNumbers}
                                  onChange={(e) => updateItem(item.catalogItemId, { toothNumbers: e.target.value })}
                                />
                              )}
                              <input
                                className="input py-1.5"
                                placeholder="Notiz für den Bericht (optional)"
                                aria-label="Notiz"
                                value={entry.note}
                                onChange={(e) => updateItem(item.catalogItemId, { note: e.target.value })}
                              />
                            </div>
                            {needsBegruendung && (
                              <label className="block">
                                <span className="mb-1 block text-xs text-amber-800">
                                  Faktor über {String(threshold).replace(".", ",")}: Begründung für die Rechnung
                                </span>
                                <textarea
                                  className="input min-h-14 py-1.5"
                                  placeholder="Warum war der Aufwand höher?"
                                  value={entry.begruendung}
                                  onChange={(e) => updateItem(item.catalogItemId, { begruendung: e.target.value })}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {totalEstimatedCent != null && (
            <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-400 sm:px-6">
              Beträge sind Schätzungen aus Punktwert und Faktor, keine Rechnung.
            </p>
          )}
        </section>
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
