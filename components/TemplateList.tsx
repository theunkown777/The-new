"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  /** null = Vorgabe von Sorrida */
  practiceId?: string | null;
  items: { id: string }[];
};

export function TemplateList({ readOnly = false }: { readOnly?: boolean }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  const [showNewForm, setShowNewForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/service-templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const res = await fetch("/api/service-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description.trim() || null }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(data.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setName("");
    setDescription("");
    setShowNewForm(false);
    load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Diese Vorlage wirklich löschen?")) return;
    setDeletingId(id);
    setDeleteError((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`/api/service-templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setDeleteError((prev) => ({ ...prev, [id]: data.error ?? "Löschen fehlgeschlagen." }));
      return;
    }
    load();
  }

  if (loading) return <div className="card text-sm text-slate-500">Lädt…</div>;

  return (
    <div className="space-y-6">
      <div className="card p-0">
        <div className="divide-y divide-slate-100">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link href={`/settings/templates/${tpl.id}`} className="min-w-[220px] flex-1">
                <div className="text-sm font-medium text-slate-900">
                  {tpl.name}
                  {!tpl.practiceId && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">Vorgabe</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {tpl.items.length} Position{tpl.items.length === 1 ? "" : "en"}
                  {tpl.description ? ` · ${tpl.description}` : ""}
                </div>
              </Link>
              {!readOnly && tpl.practiceId && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => deleteTemplate(tpl.id)}
                    disabled={deletingId === tpl.id}
                    className="py-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    {deletingId === tpl.id ? "Löscht…" : "Löschen"}
                  </button>
                  {deleteError[tpl.id] && (
                    <span className="text-xs text-red-700">{deleteError[tpl.id]}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">Noch keine Vorlagen vorhanden.</p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="card">
          {!showNewForm ? (
            <button type="button" className="btn-secondary" onClick={() => setShowNewForm(true)}>
              + Neue Vorlage
            </button>
          ) : (
            <form onSubmit={createTemplate} className="space-y-3">
              <h2 className="font-medium text-slate-900">Neue Vorlage</h2>
              {createError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
              )}
              <div>
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Beschreibung (optional)</label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                    setName("");
                    setDescription("");
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
