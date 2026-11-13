"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CatalogItem = {
  id: string;
  system: string;
  code: string;
  title: string;
  category: string;
};

type TemplateItem = {
  id: string;
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

export function TemplateEditor({ templateId, readOnly = false }: { templateId: string; readOnly?: boolean }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);

  const [addingId, setAddingId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [depSavingId, setDepSavingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/service-templates/${templateId}`).then((res) => res.json()),
      fetch("/api/catalog-items").then((res) => res.json()),
    ])
      .then(([tplData, catData]) => {
        if (!tplData.template) {
          setNotFound(true);
          return;
        }
        setTemplate(tplData.template);
        setName(tplData.template.name);
        setDescription(tplData.template.description ?? "");
        setCatalog(catData.items ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [templateId]);

  const usedIds = useMemo(() => new Set((template?.items ?? []).map((i) => i.catalogItemId)), [template]);
  const availableCatalog = useMemo(() => catalog.filter((c) => !usedIds.has(c.id)), [catalog, usedIds]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setMetaSaved(false);
    const res = await fetch(`/api/service-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description.trim() || null }),
    });
    setSavingMeta(false);
    if (res.ok) setMetaSaved(true);
  }

  async function addItem() {
    if (!addingId) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch(`/api/service-templates/${templateId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogItemId: addingId, dependsOn: [] }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setAddError(data.error ?? "Hinzufügen fehlgeschlagen.");
      return;
    }
    setAddingId("");
    load();
  }

  async function removeItem(itemId: string) {
    if (!confirm("Diese Position aus der Vorlage entfernen?")) return;
    setRemovingId(itemId);
    await fetch(`/api/service-templates/${templateId}/items/${itemId}`, { method: "DELETE" });
    setRemovingId(null);
    load();
  }

  async function toggleDependency(item: TemplateItem, prereqCatalogItemId: string, checked: boolean) {
    setDepSavingId(item.id);
    const nextDeps = checked
      ? [...item.dependsOn, prereqCatalogItemId]
      : item.dependsOn.filter((id) => id !== prereqCatalogItemId);
    await fetch(`/api/service-templates/${templateId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOn: nextDeps }),
    });
    setDepSavingId(null);
    load();
  }

  if (loading) return <div className="card text-sm text-slate-500">Lädt…</div>;
  if (notFound || !template) return <div className="card text-sm text-red-700">Vorlage nicht gefunden.</div>;

  return (
    <div className="space-y-6">
      <Link href="/settings/templates" className="text-sm text-blue-700 hover:underline">
        ← Alle Vorlagen
      </Link>

      <form onSubmit={saveMeta} className="card space-y-3">
        <div>
          <label className="label">Name</label>
          <input
            className="input disabled:opacity-60"
            value={name}
            disabled={readOnly}
            onChange={(e) => {
              setName(e.target.value);
              setMetaSaved(false);
            }}
            required
          />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <input
            className="input disabled:opacity-60"
            value={description}
            disabled={readOnly}
            onChange={(e) => {
              setDescription(e.target.value);
              setMetaSaved(false);
            }}
          />
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingMeta} className="btn-secondary">
              {savingMeta ? "Speichert…" : "Speichern"}
            </button>
            {metaSaved && <span className="text-xs text-green-700">Gespeichert.</span>}
          </div>
        )}
      </form>

      <div className="card p-0">
        <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Positionen ({template.items.length})
        </h2>
        <div className="divide-y divide-slate-100">
          {template.items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="text-sm font-medium text-slate-900">{item.catalogItem.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.catalogItem.code !== "–" ? `${item.catalogItem.system} ${item.catalogItem.code}` : item.catalogItem.system}
                    {" · "}
                    {item.catalogItem.category}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={removingId === item.id}
                    className="py-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    {removingId === item.id ? "Entfernt…" : "Entfernen"}
                  </button>
                )}
              </div>
              {template.items.length > 1 && (
                <div className="mt-2 border-t border-dashed border-slate-100 pt-2">
                  <div className="mb-1 text-xs text-slate-500">
                    Setzt eine dieser Positionen voraus (baut auf ihr auf):
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {template.items
                      .filter((other) => other.id !== item.id)
                      .map((other) => (
                        <label key={other.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            disabled={readOnly || depSavingId === item.id}
                            checked={item.dependsOn.includes(other.catalogItemId)}
                            onChange={(e) => toggleDependency(item, other.catalogItemId, e.target.checked)}
                          />
                          {other.catalogItem.title}
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {template.items.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">Noch keine Positionen in dieser Vorlage.</p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="card space-y-3">
          <h2 className="font-medium text-slate-900">Position hinzufügen</h2>
          {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addError}</p>}
          <div className="flex flex-wrap gap-3">
            <select
              className="input flex-1"
              value={addingId}
              onChange={(e) => setAddingId(e.target.value)}
            >
              <option value="">Katalogposition wählen…</option>
              {availableCatalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category} – {c.title} ({c.code !== "–" ? `${c.system} ${c.code}` : c.system})
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" disabled={!addingId || adding} onClick={addItem}>
              {adding ? "Fügt hinzu…" : "Hinzufügen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
