"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppText } from "@/components/FachKontext";
import { themaFuerFrage, vorschlagKnopf, type Antwort, type ThemaId } from "@/lib/praxisManager";

const STUFE: Record<Antwort["stufe"], { dot: string; label: string }> = {
  dringend: { dot: "bg-red-600", label: "Dringend" },
  beachten: { dot: "bg-amber-500", label: "Beachten" },
  ok: { dot: "bg-salbei-600", label: "In Ordnung" },
};

/** `start`: Thema aus der Adresse (/praxismanager?thema=…), z. B. von „Zeig mir wo“ in Frag Sorrida. */
export function PraxisManager({ antworten, start = null }: { antworten: Antwort[]; start?: ThemaId | null }) {
  const ft = useAppText();
  const startAntwort = start ? antworten.find((a) => a.thema === start) : undefined;
  const [frage, setFrage] = useState(startAntwort?.frage ?? "");
  const [gewaehlt, setGewaehlt] = useState<ThemaId | null>(startAntwort ? start : null);
  const [unbekannt, setUnbekannt] = useState(false);

  function fragen(e: React.FormEvent) {
    e.preventDefault();
    const t = themaFuerFrage(frage);
    setUnbekannt(!t || !antworten.some((a) => a.thema === t));
    setGewaehlt(t);
  }

  const sortiert = [...antworten].sort((a, b) => ord(a) - ord(b));
  const sichtbar = gewaehlt ? sortiert.filter((a) => a.thema === gewaehlt) : sortiert;

  return (
    <div className="space-y-4">
      <form onSubmit={fragen} className="card flex flex-col gap-3 sm:flex-row" role="search" data-hilfe="praxismanager-frage">
        <input
          className="input flex-1"
          placeholder="Frage stellen, z. B. „Welche Rechnungen sind offen?“"
          value={frage}
          onChange={(e) => setFrage(e.target.value)}
          aria-label="Frage an den Praxismanager"
          data-testid="manager-frage"
        />
        <button className="btn-primary" type="submit">Fragen</button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm" data-hilfe="praxismanager-themen">
        <button type="button" onClick={() => { setGewaehlt(null); setUnbekannt(false); }}
          className={`rounded-full px-3 py-1.5 ring-1 ${!gewaehlt ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200"}`}>
          Alles
        </button>
        {sortiert.map((a) => (
          <button key={a.thema} type="button" onClick={() => { setGewaehlt(a.thema); setUnbekannt(false); setFrage(a.frage); }}
            className={`rounded-full px-3 py-1.5 ring-1 ${gewaehlt === a.thema ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:text-brand-700"}`}>
            {a.frage}
          </button>
        ))}
      </div>

      {unbekannt && (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600" data-testid="manager-unbekannt">
          Dazu hat der Praxismanager keine Antwort. Er kennt Termine, offene Rechnungen, nicht Abgerechnetes, Berichte zur Freigabe, fällige Vorsorge, Umsatz (mit Freigabe) und Engpässe.
        </p>
      )}

      <div className="space-y-3">
        {(unbekannt ? sortiert : sichtbar).map((a) => {
          const s = STUFE[a.stufe];
          return (
            <section key={a.thema} className="card" data-testid="manager-antwort" data-thema={a.thema} data-hilfe={`praxismanager:${a.thema}`}>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
                {a.frage}
                <span className="sr-only">({s.label})</span>
              </p>
              <p className="mt-1 text-lg font-medium text-slate-900">{a.kurz}</p>
              {a.punkte.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {a.punkte.map((p) => <li key={p}>{ft(p)}</li>)}
                </ul>
              )}
              {a.vorschlag && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FBFAF8] px-4 py-3 text-sm">
                  <span className="text-slate-700"><b>Vorschlag:</b> {a.vorschlag.text}</span>
                  <Link href={a.vorschlag.href} className="btn-secondary whitespace-nowrap" data-testid="manager-vorschlag" data-hilfe={`praxismanager-knopf:${a.thema}`}>{vorschlagKnopf(a.vorschlag.href)}</Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const ord = (a: Antwort) => ({ dringend: 0, beachten: 1, ok: 2 })[a.stufe] * 10 + ["engpaesse", "termine", "rechnungen", "abrechnung", "berichte", "vorsorge", "umsatz"].indexOf(a.thema);
