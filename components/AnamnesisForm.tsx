"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { hinweisTeile, type AnamneseProfil } from "@/lib/anamneseProfile";

type Ans = { yes?: boolean; detail?: string };

/** Angaben vom eigenen Gerät des Patienten (components/AnamneseGeraet.tsx). Der Bogen selbst liest den Speicher nicht. */
export type GeraetUebernahme = {
  aktiv: boolean;
  /** Setzt Antworten in noch offene Fragen. Gibt zurück, wie viele Fragen gefüllt wurden. */
  einsetzen: (werte: Record<string, { yes: boolean; detail?: string }>, stand: string) => number;
  /** Nimmt übernommene Antworten zurück, die der Patient nicht geändert hat. */
  zuruecknehmen: () => void;
};
export type GeraetFelder = {
  /** Über den Fragen: Angebot, Angaben vom Gerät zu übernehmen. */
  uebernahme: (u: GeraetUebernahme) => ReactNode;
  /** Nach dem Senden: Angebot, eine Kopie der Antworten auf dem Gerät zu behalten. */
  nachSenden: (antworten: Record<string, Ans>) => ReactNode;
  /** Nach erfolgreichem Senden (für das Protokoll auf dem Gerät). */
  gesendet: (mitUebernahme: boolean) => void;
  markiert: (stand: string) => string;
  /** Was die Praxis dieses Bogens von der Übernahme sieht (Hinweis mit Stand), am Haken vor dem Senden. */
  praxisSieht: (stand: string) => string;
  geprueft: string;
  gepruefFehlt: string;
  /** Sprache und Schreibrichtung dieser Texte (Portalsprache); der Bogen selbst bleibt Deutsch. */
  lang: string;
  dir: "ltr" | "rtl";
};

const gleich = (a: Ans | undefined, b: Ans) => a?.yes === b.yes && (a?.detail ?? "") === (b.detail ?? "");

/**
 * Anamnesebogen für Patienten. Fragen und Anliegen kommen fertig vom Server (`anamneseFuer` in
 * lib/anamneseProfile.ts), passend zu Fach, Geschlecht und Alter. Ohne Profil gibt es keinen Bogen.
 */
export function AnamnesisForm({ token, practiceName, firstName, profil, postUrl, backHref, geraet }: { token: string; practiceName: string; firstName: string; profil: AnamneseProfil; postUrl?: string; backHref?: string; geraet?: GeraetFelder }) {
  const QUESTIONS = profil.fragen;
  const eltern = profil.ansprache === "eltern";
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [wishes, setWishes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  // Vom Gerät übernommen: Stand und die eingesetzten Werte. Solange etwas übernommen ist, muss der Patient vor dem
  // Senden bestätigen, dass er alles geprüft hat.
  const [vorbef, setVorbef] = useState<{ stand: string; werte: Record<string, Ans> } | null>(null);
  const [geprueft, setGeprueft] = useState(false);
  const gepruefRef = useRef<HTMLInputElement>(null);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const open = QUESTIONS.filter((q) => answers[q.key]?.yes === undefined).length;

  const uebernahme: GeraetUebernahme = {
    aktiv: vorbef !== null,
    einsetzen(werte, stand) {
      const neu: Record<string, Ans> = {};
      for (const q of QUESTIONS) {
        const w = werte[q.key];
        if (!w || answersRef.current[q.key]?.yes !== undefined) continue;
        neu[q.key] = w.yes && q.detail && w.detail ? { yes: true, detail: w.detail } : { yes: w.yes };
      }
      if (Object.keys(neu).length === 0) return 0;
      answersRef.current = { ...answersRef.current, ...neu };
      setAnswers((s) => ({ ...s, ...Object.fromEntries(Object.entries(neu).filter(([k]) => s[k]?.yes === undefined)) }));
      setVorbef({ stand, werte: neu });
      setGeprueft(false);
      return Object.keys(neu).length;
    },
    zuruecknehmen() {
      if (!vorbef) return;
      setAnswers((s) => Object.fromEntries(Object.entries(s).filter(([k, a]) => !(vorbef.werte[k] && gleich(a, vorbef.werte[k])))));
      setVorbef(null);
      setGeprueft(false);
    },
  };

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
    if (vorbef && !geprueft && geraet) {
      setError(geraet.gepruefFehlt);
      gepruefRef.current?.focus();
      return;
    }
    setState("sending");
    setError("");
    const q = Object.fromEntries(QUESTIONS.map((x) => [x.key, { yes: !!answers[x.key].yes, detail: answers[x.key].yes ? answers[x.key].detail || undefined : undefined }]));
    const res = await fetch(postUrl ?? `/api/a/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Nur das Datum der übernommenen Angaben und die Bestätigung. Keine Herkunft, keine andere Praxis.
      body: JSON.stringify({ q, wishes, note: note || undefined, confirmName, vorbefuellt: vorbef ? { stand: vorbef.stand, geprueft: true } : undefined }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      geraet?.gesendet(vorbef !== null);
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Senden fehlgeschlagen. Bitte erneut versuchen.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <div className="text-center" role="status">
          <h1 className="text-xl font-semibold text-slate-900">{eltern ? "Vielen Dank" : `Vielen Dank, ${firstName}`}</h1>
          <p className="mt-3 text-slate-600">
            {eltern ? `Der Anamnesebogen für ${firstName}` : "Ihr Anamnesebogen"} ist bei {practiceName} angekommen. Sie müssen in der Praxis nichts mehr ausfüllen.
          </p>
        </div>
        {backHref && (
          <p className="text-center">
            <a href={backHref} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Behandlungsweg</a>
          </p>
        )}
        {geraet?.nachSenden(answers)}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      {backHref && <a href={backHref} className="mb-4 inline-block text-sm text-brand-700 underline">← Zurück zu Ihrem Behandlungsweg</a>}
      <p className="text-sm font-medium text-brand-700">{practiceName}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Anamnesebogen für {firstName}</h1>
      <p className="mt-2 text-slate-600" data-testid="anamnese-einleitung">
        Etwa drei Minuten. {profil.einleitung} Die Angaben gehen direkt an {practiceName}. {profil.schweigepflicht}
      </p>
      {profil.hinweis && (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700" data-testid="anamnese-hinweis">
          {/* Telefonnummern als Link: auf dem Handy direkt anrufen. */}
          {hinweisTeile(profil.hinweis).map((t, i) =>
            t.tel ? (
              <a key={i} href={`tel:${t.tel}`} className="whitespace-nowrap font-medium text-brand-700 underline">
                {t.text}
              </a>
            ) : (
              t.text
            ),
          )}
        </p>
      )}

      {geraet?.uebernahme(uebernahme)}

      <form onSubmit={submit} className="mt-8 space-y-4">
        {QUESTIONS.map((q, i) => {
          const a = answers[q.key] ?? {};
          const vomGeraet = vorbef && vorbef.werte[q.key] && gleich(answers[q.key], vorbef.werte[q.key]);
          return (
            <fieldset key={q.key} className="rounded-2xl border border-slate-200 bg-white p-4" data-vom-geraet={vomGeraet ? "ja" : undefined}>
              <legend className="sr-only">{q.text}</legend>
              <p className="font-medium text-slate-900">
                <span className="mr-1 text-slate-500">{i + 1}.</span>
                {q.text}
              </p>
              {vomGeraet && geraet && (
                <p className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200" lang={geraet.lang} dir={geraet.dir} data-testid="anamnese-vom-geraet">
                  {geraet.markiert(vorbef.stand)}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                {[
                  [true, "Ja"],
                  [false, "Nein"],
                ].map(([v, label]) => (
                  <label
                    key={label as string}
                    className={`cursor-pointer rounded-lg border px-5 py-2 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2 ${a.yes === v ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700"}`}
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
          <legend className="sr-only">Gibt es etwas, das Ihnen wichtig ist oder das wir wissen sollten? (freiwillig)</legend>
          <p className="font-medium text-slate-900" aria-hidden="true">Gibt es etwas, das Ihnen wichtig ist oder das wir wissen sollten? (freiwillig)</p>
          <div className="mt-3 flex flex-wrap gap-2" data-testid="anamnese-anliegen">
            {profil.anliegen.map((w) => (
              <label key={w.key} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2 ${wishes.includes(w.key) ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-700"}`}>
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
          <textarea className="input mt-3 min-h-[70px]" maxLength={1000} aria-label="Weitere Hinweise (freiwillig)" placeholder="Weitere Hinweise (freiwillig)" value={note} onChange={(e) => setNote(e.target.value)} />
        </fieldset>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="label" htmlFor="confirm">{eltern ? "Ich habe die Fragen für mein Kind nach bestem Wissen beantwortet. Mein Name:" : "Ich habe die Fragen nach bestem Wissen beantwortet. Name:"}</label>
          <input id="confirm" className="input" maxLength={120} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="name" />
        </div>

        {vorbef && geraet && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-900" htmlFor="vorbefuellt-geprueft">
              <input
                ref={gepruefRef}
                id="vorbefuellt-geprueft"
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                checked={geprueft}
                aria-invalid={error === geraet.gepruefFehlt ? true : undefined}
                aria-describedby={error === geraet.gepruefFehlt ? "anamnese-fehler vorbefuellt-praxis-sieht" : "vorbefuellt-praxis-sieht"}
                onChange={(e) => {
                  setGeprueft(e.target.checked);
                  if (e.target.checked && error === geraet.gepruefFehlt) setError("");
                }}
                data-testid="anamnese-geprueft"
              />
              <span lang={geraet.lang} dir={geraet.dir} data-testid="anamnese-geprueft-text">{geraet.geprueft}</span>
            </label>
            <p id="vorbefuellt-praxis-sieht" lang={geraet.lang} dir={geraet.dir} className="mt-2 text-sm text-slate-700" data-testid="anamnese-praxis-sieht">
              {geraet.praxisSieht(vorbef.stand)}
            </p>
          </div>
        )}

        {error && (
          <p
            id="anamnese-fehler"
            className="text-sm text-red-700"
            role="alert"
            lang={geraet && error === geraet.gepruefFehlt ? geraet.lang : undefined}
            dir={geraet && error === geraet.gepruefFehlt ? geraet.dir : undefined}
          >
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full py-3" disabled={state === "sending"}>
          {state === "sending" ? "Wird gesendet …" : "Anamnesebogen absenden"}
        </button>
        <p className="text-xs text-slate-500">Nach dem Absenden ist der Link verbraucht. Änderungen besprechen Sie bitte in der Praxis.</p>
      </form>
    </main>
  );
}
