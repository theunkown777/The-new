"use client";

import { useState } from "react";

export function SupportForm({ defaultFach = "" }: { defaultFach?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]).filter(([, v]) => v !== ""));
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("idle");
      return setError(data.error ?? "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
    setState("done");
  }

  if (state === "done")
    return (
      <div className="rounded-3xl bg-white p-6 sm:p-8" data-testid="support-done">
        <p className="text-xl font-semibold text-slate-900">Danke, Ihre Nachricht ist bei uns.</p>
        <p className="mt-2 text-slate-600">Wir melden uns innerhalb eines Werktags und richten Sorrida gemeinsam mit Ihnen für Ihre Fachrichtung ein.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 sm:p-8" data-testid="support-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-700">Ihr Name</span>
          <input name="contactName" className="input mt-1" required minLength={2} maxLength={120} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Praxis oder Einrichtung (optional)</span>
          <input name="practiceName" className="input mt-1" maxLength={120} autoComplete="organization" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Ihre Fachrichtung</span>
          <input name="fach" className="input mt-1" required minLength={2} maxLength={120} defaultValue={defaultFach} placeholder="z. B. Nephrologie, Osteopathie, Zahntechnik" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Telefon oder E-Mail</span>
          <input name="contact" className="input mt-1" required minLength={5} maxLength={120} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-slate-700">Was bieten Sie an, was soll Sorrida für Sie erledigen? (optional)</span>
        <textarea name="message" className="input mt-1 min-h-[7rem]" maxLength={2000} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={state === "busy"}>{state === "busy" ? "Wird gesendet …" : "Hilfe anfragen"}</button>
        <p className="text-xs text-slate-500">Wir nutzen Ihre Angaben nur, um uns bei Ihnen zu melden.</p>
      </div>
    </form>
  );
}
