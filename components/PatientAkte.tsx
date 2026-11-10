"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARTEN, ART_LABEL, type Art } from "@/lib/akte";

type Entry = { id: string; art: string; text: string; code: string | null; datum: string | null; inaktiv: boolean; createdBy: string | null; createdAt: string };
type Doc = { id: string; name: string; mime: string; size: number; createdAt: string; createdBy: string | null };

const ART_CLS: Record<Art, string> = {
  ALLERGIE: "bg-red-50 text-red-800 ring-red-200",
  DIAGNOSE: "bg-brand-50 text-brand-800 ring-brand-100",
  BEFUND: "bg-slate-50 text-slate-800 ring-slate-200",
  MEDIKATION: "bg-amber-50 text-amber-900 ring-amber-200",
  NOTIZ: "bg-white text-slate-700 ring-slate-200",
};

export function PatientAkte({ patientId, entries, documents, isAdmin }: { patientId: string; entries: Entry[]; documents: Doc[]; isAdmin: boolean }) {
  const router = useRouter();
  const [art, setArt] = useState<Art>("DIAGNOSE");
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [datum, setDatum] = useState("");
  const [zeigeAlte, setZeigeAlte] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ art, text, code: art === "DIAGNOSE" && code ? code : null, datum: datum || null }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Speichern fehlgeschlagen.");
    setText(""); setCode(""); setDatum("");
    router.refresh();
  }

  async function toggle(id: string, inaktiv: boolean) {
    await fetch(`/api/patients/${patientId}/entries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inaktiv }) });
    router.refresh();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/patients/${patientId}/documents`, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Hochladen fehlgeschlagen.");
    router.refresh();
  }

  async function removeDoc(id: string) {
    if (!confirm("Dokument endgültig löschen?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const sichtbar = entries.filter((e) => zeigeAlte || !e.inaktiv);
  const alte = entries.filter((e) => e.inaktiv).length;

  return (
    <section className="card" data-testid="akte">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Akte</h2>
        {alte > 0 && (
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setZeigeAlte(!zeigeAlte)}>
            {zeigeAlte ? "Nur aktuelle zeigen" : `${alte} nicht mehr aktuelle zeigen`}
          </button>
        )}
      </div>

      {ARTEN.map((a) => {
        const list = sichtbar.filter((e) => e.art === a);
        if (!list.length) return null;
        return (
          <div key={a} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ART_LABEL[a]}</p>
            <ul className="mt-2 space-y-2">
              {list.map((e) => (
                <li key={e.id} className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm ring-1 ${ART_CLS[a]} ${e.inaktiv ? "opacity-60" : ""}`} data-testid="akte-eintrag">
                  <span className="min-w-0">
                    <span className={e.inaktiv ? "line-through" : ""}>{e.text}</span>
                    {e.code && <span className="ml-2 rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{e.code}</span>}
                    <span className="block text-xs opacity-70">
                      {e.datum ? `${e.datum} · ` : ""}eingetragen {e.createdAt}{e.createdBy ? ` von ${e.createdBy}` : ""}
                    </span>
                  </span>
                  <button type="button" className="shrink-0 text-xs underline opacity-70 hover:opacity-100" onClick={() => toggle(e.id, !e.inaktiv)}>
                    {e.inaktiv ? "wieder aktuell" : "nicht mehr aktuell"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {entries.length === 0 && <p className="mt-3 text-sm text-slate-500">Noch keine Einträge. Allergien zuerst eintragen, sie stehen dann vor jedem Termin oben.</p>}

      <form onSubmit={add} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <select className="input w-full" value={art} onChange={(e) => setArt(e.target.value as Art)} aria-label="Art" data-testid="akte-art">
            {ARTEN.map((a) => <option key={a} value={a}>{ART_LABEL[a]}</option>)}
          </select>
          <input className="input w-full" placeholder="z. B. Penicillin, Diabetes Typ 2, Metformin 1000" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text" data-testid="akte-text" />
        </div>
        <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[7rem_minmax(0,11rem)_1fr]">
          {art === "DIAGNOSE" ? (
            <input className="input w-full" placeholder="ICD-10" value={code} onChange={(e) => setCode(e.target.value)} aria-label="ICD-10-Code" data-testid="akte-code" />
          ) : <span />}
          <input type="date" className="input w-full" value={datum} onChange={(e) => setDatum(e.target.value)} aria-label="Datum" />
          <button className="btn-primary col-span-2 sm:col-span-1 sm:justify-self-end" disabled={busy || text.trim().length < 2}>Eintragen</button>
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dokumente</p>
          <label className="btn-secondary cursor-pointer text-sm">
            Datei hochladen
            <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} data-testid="akte-upload" />
          </label>
        </div>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Arztbriefe, Röntgenbilder oder Überweisungen als PDF, PNG oder JPEG, bis 5 MB.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2" data-testid="akte-dokument">
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="min-w-0 truncate text-brand-700 underline">{d.name}</a>
                <span className="shrink-0 text-xs text-slate-500">
                  {(d.size / 1024).toFixed(0)} KB · {d.createdAt}
                  {isAdmin && <button type="button" className="ml-3 text-red-700 underline" onClick={() => removeDoc(d.id)}>löschen</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="akte-fehler">{error}</p>}
    </section>
  );
}
