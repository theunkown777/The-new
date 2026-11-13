"use client";

import { useState } from "react";
import { WISHES, questionsFor } from "@/lib/anamnesis";

type Ans = { yes?: boolean; detail?: string };

export function AnamnesisForm({ token, practiceName, firstName, dental = true, postUrl, backHref }: { token: string; practiceName: string; firstName: string; dental?: boolean; postUrl?: string; backHref?: string }) {
  const QUESTIONS = questionsFor(dental);
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [wishes, setWishes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const open = QUESTIONS.filter((q) => answers[q.key]?.yes === undefined).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open > 0) {
      setError(`Bitte noch ${open} ${open === 1 ? "Frage" : "Fragen"} beantworten.`);
      return;
    }
    if (confirmName.trim().length < 2) {
      setError("Bitte bestätigen Sie die Angaben mit Ihrem Namen.");
      return;
    }
    setState("sending");
    setError("");
    const q = Object.fromEntries(QUESTIONS.map((x) => [x.key, { yes: !!answers[x.key].yes, detail: answers[x.key].yes ? answers[x.key].detail || undefined : undefined }]));
    const res = await fetch(postUrl ?? `/api/a/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, wishes, note: note || undefined, confirmName }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Senden fehlgeschlagen. Bitte erneut versuchen.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
        <h1 className="text-xl font-semibold text-slate-900">Vielen Dank, {firstName}</h1>
        <p className="mt-3 text-slate-600">Ihr Anamnesebogen ist bei {practiceName} angekommen. Sie müssen in der Praxis nichts mehr ausfüllen.</p>
        {backHref && <a href={backHref} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Behandlungsweg</a>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      {backHref && <a href={backHref} className="mb-4 inline-block text-sm text-brand-700 underline">← Zurück zu Ihrem Behandlungsweg</a>}
      <p className="text-sm font-medium text-brand-700">{practiceName}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Anamnesebogen für {firstName}</h1>
      <p className="mt-2 text-slate-600">
        Etwa drei Minuten. Ihre Angaben helfen uns, Sie sicher zu behandeln, und gehen direkt an Ihre Praxis. Sie unterliegen der{" "}
        {dental ? "zahnärztlichen" : "ärztlichen"} Schweigepflicht.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {QUESTIONS.map((q, i) => {
          const a = answers[q.key] ?? {};
          return (
            <fieldset key={q.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <legend className="sr-only">{q.text}</legend>
              <p className="font-medium text-slate-900">
                <span className="mr-1 text-slate-400">{i + 1}.</span>
                {q.text}
              </p>
              <div className="mt-3 flex gap-2">
                {[
                  [true, "Ja"],
                  [false, "Nein"],
                ].map(([v, label]) => (
                  <label
                    key={label as string}
                    className={`cursor-pointer rounded-lg border px-5 py-2 text-sm font-medium ${a.yes === v ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700"}`}
                  >
                    <input
                      type="radio"
                      name={q.key}
                      className="sr-only"
                      checked={a.yes === v}
                      onChange={() => setAnswers((s) => ({ ...s, [q.key]: { ...s[q.key], yes: v as boolean } }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {a.yes && q.detail && (
                <input
                  className="input mt-3"
                  aria-label={`${q.text} ${q.detail}`}
                  placeholder={q.detail}
                  maxLength={300}
                  value={a.detail ?? ""}
                  onChange={(e) => setAnswers((s) => ({ ...s, [q.key]: { ...s[q.key], detail: e.target.value } }))}
                />
              )}
            </fieldset>
          );
        })}

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="sr-only">Wünsche</legend>
          <p className="font-medium text-slate-900">Gibt es etwas, das Sie sich wünschen oder das wir wissen sollten? (freiwillig)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WISHES.map((w) => (
              <label key={w.key} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${wishes.includes(w.key) ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-700"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={wishes.includes(w.key)}
                  onChange={(e) => setWishes((s) => (e.target.checked ? [...s, w.key] : s.filter((x) => x !== w.key)))}
                />
                {w.text}
              </label>
            ))}
          </div>
          <textarea className="input mt-3 min-h-[70px]" maxLength={1000} placeholder="Weitere Hinweise (freiwillig)" value={note} onChange={(e) => setNote(e.target.value)} />
        </fieldset>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="label" htmlFor="confirm">Ich habe die Fragen nach bestem Wissen beantwortet. Name:</label>
          <input id="confirm" className="input" maxLength={120} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="name" />
        </div>

        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn btn-primary w-full py-3" disabled={state === "sending"}>
          {state === "sending" ? "Wird gesendet …" : "Anamnesebogen absenden"}
        </button>
        <p className="text-xs text-slate-500">Nach dem Absenden ist der Link verbraucht. Änderungen besprechen Sie bitte in der Praxis.</p>
      </form>
    </main>
  );
}
