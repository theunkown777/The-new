"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogItem = {
  id: string;
  /** null = Vorgabe von Sorrida (schreibgeschützt) */
  practiceId?: string | null;
  system: string;
  code: string;
  title: string;
  category: string;
  toothRelevant: boolean;
  faktorMin: number | null;
  punktzahl: number | null;
  festbetragCent: number | null;
};

type RowState = { punktzahl: string; festbetrag: string; saving: boolean; saved: boolean; error: string | null };

const SYSTEME_JE_FACH: Record<string, string[]> = {
  zahn: ["GOZ", "BEMA", "GOAE", "BEL_II", "SONSTIGES"],
  therapie: ["HEILMITTEL", "SELBST", "SONSTIGES"],
  apotheke: ["APO", "HILFSMITTEL", "SELBST", "SONSTIGES"],
  versorgung: ["HILFSMITTEL", "SELBST", "SONSTIGES"],
  pflege: ["PFLEGE", "SELBST", "SONSTIGES"],
  hebamme: ["HEBAMME", "SELBST", "SONSTIGES"],
  selbst: ["SELBST", "SONSTIGES"],
  arzt: ["EBM", "GOAE", "UVGOAE", "SELBST", "SONSTIGES"],
};
const SYSTEM_LABEL: Record<string, string> = { GOAE: "GOÄ", UVGOAE: "UV-GOÄ", HEILMITTEL: "Heilmittel", PFLEGE: "Pflege", HEBAMME: "Hebammenhilfe", APO: "Apotheke", HILFSMITTEL: "Hilfsmittel", SELBST: "Selbstzahler", SONSTIGES: "Sonstiges", BEL_II: "BEL II" };

export function CatalogSettings({ readOnly = false, systeme = "zahn", regionLabel = "Zahn/Region" }: { readOnly?: boolean; systeme?: string; regionLabel?: string | null }) {
  const SYSTEMS = SYSTEME_JE_FACH[systeme] ?? SYSTEME_JE_FACH.arzt;
  const emptyNewItem = () => ({ system: SYSTEMS[0], code: "", title: "", category: "", toothRelevant: false, hasFaktor: SYSTEMS[0] === "GOZ" || SYSTEMS[0] === "GOAE" });
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  const [newItem, setNewItem] = useState(emptyNewItem());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/catalog-items")
      .then((res) => res.json())
      .then((data) => {
        const list: CatalogItem[] = data.items ?? [];
        setItems(list);
        const next: Record<string, RowState> = {};
        for (const item of list) {
          next[item.id] = {
            punktzahl: item.punktzahl != null ? String(item.punktzahl) : "",
            festbetrag: item.festbetragCent != null ? (item.festbetragCent / 100).toString() : "",
            saving: false,
            saved: false,
            error: null,
          };
        }
        setRows(next);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, CatalogItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return Array.from(byCategory.entries());
  }, [items]);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, saved: false, error: null } }));
  }

  async function saveRow(id: string) {
    const row = rows[id];
    if (!row) return;
    updateRow(id, { saving: true });

    const res = await fetch(`/api/catalog-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        punktzahl: row.punktzahl.trim() !== "" ? Number(row.punktzahl) : null,
        festbetragCent: row.festbetrag.trim() !== "" ? Math.round(Number(row.festbetrag) * 100) : null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false, error: data.error ?? "Fehler" } }));
      return;
    }
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false, saved: true, error: null } }));
  }

  async function deleteItem(id: string) {
    if (!confirm("Diese Katalogposition wirklich löschen?")) return;
    setDeletingId(id);
    setDeleteError((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`/api/catalog-items/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setDeleteError((prev) => ({ ...prev, [id]: data.error ?? "Löschen fehlgeschlagen." }));
      return;
    }
    load();
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const res = await fetch("/api/catalog-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(data.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setNewItem(emptyNewItem());
    setShowNewForm(false);
    load();
  }

  if (loading) return <div className="card text-sm text-slate-500">Lädt…</div>;

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Punktzahl und Festbetrag sind objektive Werte aus dem offiziellen Gebührenverzeichnis
        (GOZ/BEMA/BEL-II) und daher für alle Praxen geteilt, die diesen Referenzkatalog nutzen –
        nicht praxisspezifisch wie der Punktwert unter „Abrechnung“. Bitte gegen das aktuell
        gültige Verzeichnis prüfen, bevor Sie Werte eintragen. Ausschluss-Regeln,
        Gültigkeitszeiträume und Frequenzlimits lassen sich weiterhin nur über
        <code className="mx-1 rounded bg-blue-100 px-1 text-xs">prisma/seed.ts</code>
        pflegen.
      </p>

      {grouped.map(([category, categoryItems]) => (
        <div key={category} className="card p-0">
          <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {category}
          </h2>
          <div className="divide-y divide-slate-100">
            {categoryItems.map((item) => {
              const row = rows[item.id];
              if (!row) return null;
              const ref = item.code !== "–" ? `${item.system} ${item.code}` : item.system;
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="w-full sm:min-w-[220px] sm:w-auto sm:flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {item.title}
                      {!item.practiceId && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500" title="Vorgabe von Sorrida, schreibgeschützt">Vorgabe</span>}
                    </div>
                    <div className="text-xs text-slate-400">{ref}</div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                      <label className="mb-1 block text-xs text-slate-400">Punktzahl</label>
                      <input
                        className="input py-1 text-xs disabled:opacity-60"
                        type="number"
                        step="0.1"
                        min="0"
                        disabled={readOnly || !item.practiceId}
                        value={row.punktzahl}
                        onChange={(e) => updateRow(item.id, { punktzahl: e.target.value })}
                      />
                    </div>
                    <div className="w-28">
                      <label className="mb-1 block text-xs text-slate-400">Festbetrag (EUR)</label>
                      <input
                        className="input py-1 text-xs disabled:opacity-60"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={readOnly || !item.practiceId}
                        value={row.festbetrag}
                        onChange={(e) => updateRow(item.id, { festbetrag: e.target.value })}
                      />
                    </div>
                    {!readOnly && item.practiceId && (
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveRow(item.id)}
                            disabled={row.saving}
                            className="btn-secondary py-1 text-xs"
                          >
                            {row.saving ? "Speichert…" : "Speichern"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            disabled={deletingId === item.id}
                            className="py-1 text-xs font-medium text-red-600 hover:underline"
                          >
                            {deletingId === item.id ? "Löscht…" : "Löschen"}
                          </button>
                        </div>
                        {row.saved && <span className="text-xs text-green-700">Gespeichert.</span>}
                        {row.error && <span className="text-xs text-red-700">{row.error}</span>}
                        {deleteError[item.id] && (
                          <span className="text-xs text-red-700">{deleteError[item.id]}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!readOnly && (
        <div className="card">
          {!showNewForm ? (
            <button type="button" className="btn-secondary" onClick={() => setShowNewForm(true)}>
              + Neue Katalogposition
            </button>
          ) : (
            <form onSubmit={createItem} className="space-y-3">
              <h2 className="font-medium text-slate-900">Neue Katalogposition</h2>
              {createError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="label">System</label>
                  <select
                    className="input"
                    value={newItem.system}
                    onChange={(e) => setNewItem((p) => ({ ...p, system: e.target.value as typeof p.system }))}
                  >
                    {SYSTEMS.map((s) => (
                      <option key={s} value={s}>{SYSTEM_LABEL[s] ?? s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Ziffer</label>
                  <input
                    className="input"
                    placeholder="z. B. 0010 oder –"
                    value={newItem.code}
                    onChange={(e) => setNewItem((p) => ({ ...p, code: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Titel</label>
                  <input
                    className="input"
                    value={newItem.title}
                    onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Kategorie</label>
                  <input
                    className="input"
                    placeholder="z. B. Prophylaxe"
                    value={newItem.category}
                    onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                    required
                  />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newItem.toothRelevant}
                    onChange={(e) => setNewItem((p) => ({ ...p, toothRelevant: e.target.checked }))}
                  />
                  {regionLabel ?? "Region"} relevant
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newItem.hasFaktor}
                    onChange={(e) => setNewItem((p) => ({ ...p, hasFaktor: e.target.checked }))}
                  />
                  Faktor-Feld (GOZ/GOÄ)
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? "Legt an…" : "Anlegen"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewItem(emptyNewItem());
                    setCreateError(null);
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
