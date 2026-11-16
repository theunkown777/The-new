"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HILFE_HINWEIS, HILFE_WISSEN } from "@/lib/hilfeWissen";
import { sucheHilfe } from "@/lib/hilfeSuche";

interface KiAntwort { passt: boolean; antwort: string; quellen: { id: string; frage: string; pfad: string; href: string }[] }

/** „Frag Sorrida“: Suche in der festen Wissenssammlung; mit eingeschalteten KI-Hilfen zusätzlich eine Antwort als Entwurf. */
export function HilfePraxis({ fach, ki }: { fach: "zahn" | "andere"; ki: boolean }) {
  const [frage, setFrage] = useState("");
  const [kiAntwort, setKiAntwort] = useState<KiAntwort | null>(null);
  const [kiLaeuft, setKiLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const treffer = useMemo(() => sucheHilfe(frage, HILFE_WISSEN, { anzahl: 3, fach }), [frage, fach]);
  const alle = useMemo(() => HILFE_WISSEN.filter((e) => !e.nur || e.nur === fach), [fach]);
  const gefragt = frage.trim().length >= 3;

  async function mitKi() {
    setKiLaeuft(true);
    setFehler(null);
    setKiAntwort(null);
    const res = await fetch("/api/ki/hilfe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frage }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setKiLaeuft(false);
    if (!res?.ok || typeof d?.passt !== "boolean") return setFehler(d?.error ?? "Die Antwort mit KI hat nicht geklappt. Die Einträge unten stehen weiter bereit.");
    setKiAntwort({ passt: d.passt, antwort: String(d.antwort ?? ""), quellen: Array.isArray(d.quellen) ? d.quellen : [] });
  }

  return (
    <div className="space-y-6" data-testid="hilfe-praxis">
      <form className="card space-y-3" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="label" htmlFor="hilfe-frage">Ihre Frage zur Bedienung</label>
        <input
          id="hilfe-frage"
          type="search"
          className="input w-full"
          value={frage}
          maxLength={500}
          autoComplete="off"
          placeholder="z. B. Wie lege ich einen Vorschlag an?"
          aria-describedby="hilfe-frage-hinweis"
          onChange={(e) => { setFrage(e.target.value); setKiAntwort(null); setFehler(null); }}
          data-testid="hilfe-frage"
        />
        <p id="hilfe-frage-hinweis" className="text-xs text-slate-500">Bitte keine Patientendaten eingeben: keine Namen, keine Geburtsdaten, keine Befunde.</p>
        {ki && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-secondary" disabled={!gefragt || kiLaeuft} onClick={mitKi} data-testid="hilfe-ki">
              {kiLaeuft ? "KI formuliert …" : "Mit KI beantworten"}
            </button>
            <span className="text-xs text-slate-500">Schickt Ihre Frage und die passenden Hilfetexte an den KI-Dienst. Die Antwort ist ein Entwurf und stützt sich nur auf diese Texte.</span>
          </div>
        )}
      </form>

      {fehler && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{fehler}</p>}

      {kiAntwort && (
        <section className="card border-amber-200 bg-amber-50" aria-labelledby="hilfe-ki-titel" data-testid="hilfe-ki-antwort">
          <h2 id="hilfe-ki-titel" className="text-xs font-semibold uppercase tracking-wide text-amber-900">Entwurf der KI, bitte am Eintrag prüfen</h2>
          {kiAntwort.passt ? (
            <>
              <p className="mt-2 text-sm text-slate-800">{kiAntwort.antwort}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">Quelle:</p>
              <ul className="mt-1 space-y-1 text-sm">
                {kiAntwort.quellen.map((q) => (
                  <li key={q.id}>
                    <Link href={q.href} className="text-brand-700 underline">{q.frage}</Link> <span className="text-xs text-slate-500">({q.pfad})</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-800">Zu dieser Frage steht nichts in der Hilfe. Die KI antwortet nur aus den Hilfetexten und rät nicht.</p>
          )}
        </section>
      )}

      <section aria-labelledby="hilfe-treffer-titel" aria-live="polite" data-testid="hilfe-treffer">
        <h2 id="hilfe-treffer-titel" className="mb-2 text-sm font-semibold text-slate-900">{gefragt ? "Passende Einträge" : "Stellen Sie oben Ihre Frage"}</h2>
        {gefragt && treffer.length === 0 && (
          <p className="card text-sm text-slate-600" data-testid="hilfe-kein-treffer">
            Dazu gibt es keinen Eintrag. Versuchen Sie ein anderes Wort, sehen Sie unten alle Themen durch oder schreiben Sie uns über die{" "}
            <Link href="/hilfe" className="text-brand-700 underline">Hilfe-Seite</Link>.
          </p>
        )}
        <ul className="space-y-3">
          {gefragt && treffer.map(({ eintrag: e }) => (
            <li key={e.id} className="card" data-testid="hilfe-eintrag">
              <h3 className="font-medium text-slate-900">{e.frage}</h3>
              <p className="mt-1 text-sm text-slate-700">{e.antwort}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Menü: {e.pfad}</span>
                <Link href={e.href} className="font-medium text-brand-700 underline" data-testid="hilfe-eintrag-link">Seite öffnen</Link>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-lg bg-[#F5F2EE] px-3 py-2 text-sm text-slate-600" data-testid="hilfe-hinweis">{HILFE_HINWEIS}</p>

      <details className="card" data-testid="hilfe-alle">
        <summary className="cursor-pointer text-sm font-medium text-slate-900">Alle Themen ({alle.length})</summary>
        <ul className="mt-3 space-y-3">
          {alle.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-slate-900">{e.frage}</p>
              <p className="mt-0.5 text-slate-700">{e.antwort}</p>
              <p className="mt-0.5 text-xs text-slate-500">Menü: {e.pfad} · <Link href={e.href} className="text-brand-700 underline">Seite öffnen</Link></p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
