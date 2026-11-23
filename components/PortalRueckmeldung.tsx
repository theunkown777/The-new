"use client";

import { useState } from "react";

// „Wie zufrieden waren Sie mit Ihrem Besuch?“ im Patientenportal: fünf Stufen, ein freiwilliger Satz.
// Nach dem Absenden erscheint bei allen derselbe neutrale Hinweis auf die öffentliche Bewertung, wenn die Praxis
// einen Link zu ihrem Google-Profil hinterlegt hat. Der Link wird erst bei einem Klick aufgerufen; geladen wird von dort nichts.

export type RueckmeldungText = {
  title: string;
  visit: string;
  scale: string[];
  note: string;
  privacy: string;
  send: string;
  pick: string;
  thanks: string;
  publicText: string;
  publicLink: string;
  failed: string;
};

export function PortalRueckmeldung({ token, appointmentId, t }: { token: string; appointmentId: string; t: RueckmeldungText }) {
  const [stufe, setStufe] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [stand, setStand] = useState<"offen" | "sendet" | "fertig">("offen");
  const [fehler, setFehler] = useState("");
  const [bewertungUrl, setBewertungUrl] = useState<string | null>(null);

  async function senden() {
    if (stufe == null) {
      setFehler(t.pick);
      return;
    }
    setStand("sendet");
    setFehler("");
    const res = await fetch(`/api/portal/${token}/rueckmeldung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, stufe, text: text.trim() || undefined }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    // Schon beantwortet (z. B. in einem zweiten Fenster): wie ein Erfolg behandeln, ohne Link.
    if (res?.ok || res?.status === 409) {
      setBewertungUrl(typeof data?.bewertungUrl === "string" ? data.bewertungUrl : null);
      setStand("fertig");
      return;
    }
    setFehler(t.failed);
    setStand("offen");
  }

  if (stand === "fertig") {
    return (
      <div className="mt-3 rounded-2xl bg-white p-4" role="status" data-testid="rueckmeldung-danke">
        <p className="font-medium text-slate-900">{t.thanks}</p>
        {bewertungUrl && (
          <p className="mt-2 text-sm text-slate-600" data-testid="rueckmeldung-bewertung">
            {t.publicText}{" "}
            <a href={bewertungUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline underline-offset-2" data-testid="rueckmeldung-bewertung-link">
              {t.publicLink}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-white p-4" data-testid="rueckmeldung">
      <p className="text-sm text-slate-500">{t.visit}</p>
      <fieldset className="mt-2">
        <legend className="font-medium text-slate-900">{t.title}</legend>
        <div className="mt-3 grid gap-2">
          {t.scale.map((label, i) => {
            const wert = i + 1;
            const an = stufe === wert;
            return (
              <label key={wert} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-700 ${an ? "border-brand-600 bg-brand-50 text-slate-900" : "border-slate-200 text-slate-700"}`}>
                <input type="radio" name="rueckmeldung-stufe" value={wert} checked={an} onChange={() => { setStufe(wert); setFehler(""); }} className="sr-only" data-testid={`rueckmeldung-stufe-${wert}`} />
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${an ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`} aria-hidden="true">{wert}</span>
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="label mt-4" htmlFor="rueckmeldung-text">{t.note}</label>
      <textarea id="rueckmeldung-text" className="input min-h-[72px]" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} data-testid="rueckmeldung-text" />
      <p className="mt-2 text-xs text-slate-500">{t.privacy}</p>
      <button type="button" className="btn btn-primary mt-3 w-full py-2.5 sm:w-auto" disabled={stand === "sendet"} onClick={senden} data-testid="rueckmeldung-senden">
        {t.send}
      </button>
      {fehler && <p className="mt-2 text-sm text-red-700" role="alert">{fehler}</p>}
    </div>
  );
}
