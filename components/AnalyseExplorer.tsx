"use client";

import { useMemo, useState } from "react";
import type { Group } from "@/lib/analytics";
import { annahmeSatz } from "@/lib/analyseSatz";
import { KassenSockel } from "@/components/KassenSockel";

// Interaktive Analyse: Ansicht, Kennzahl und Sortierung wählen, Zeilen aufklappen und Monate anklicken. Nur Zahlen mit
// ihrer Grundlage; keine Hochrechnung von Mehrumsatz durch höhere Annahmequoten oder Preise.

type Ansicht = "leistung" | "thema" | "art";
type Kennzahl = "privat" | "umsatz" | "anzahl";
type Sortierung = "wert" | "quote";

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

function Ring({ value }: { value: number | null }) {
  const v = value ?? 0;
  const c = 2 * Math.PI * 16;
  return (
    <svg viewBox="0 0 40 40" className="h-14 w-14 shrink-0" role="img" aria-label={value == null ? "Annahmequote: zu wenig Fälle" : `Annahmequote ${v} Prozent`}>
      <circle cx="20" cy="20" r="16" fill="none" strokeWidth="5" className="stroke-slate-100" />
      {value != null && (
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-brand-600" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 20 20)" />
      )}
      <text x="20" y="23.5" textAnchor="middle" className="fill-slate-900 text-[10px] font-semibold">{value == null ? "–" : `${v}%`}</text>
    </svg>
  );
}

export function AnalyseExplorer({
  leistungen,
  themen,
  arten,
  monate,
}: {
  leistungen: Group[];
  themen: Group[];
  arten: Group[];
  monate: { monat: string; privat: number; kasse: number }[];
}) {
  const [ansicht, setAnsicht] = useState<Ansicht>("leistung");
  const [kennzahl, setKennzahl] = useState<Kennzahl>("privat");
  const [sort, setSort] = useState<Sortierung>("wert");
  const [offen, setOffen] = useState<string | null>(null);
  const [monat, setMonat] = useState<number | null>(null);

  const gruppen = ansicht === "leistung" ? leistungen : ansicht === "thema" ? themen : arten;
  const wert = (g: Group) => (kennzahl === "privat" ? g.privat : kennzahl === "umsatz" ? g.umsatz : g.angenommen);
  const liste = useMemo(
    () =>
      [...gruppen]
        .filter((g) => g.umsatz > 0 || g.entschieden > 0)
        .sort((a, b) => (sort === "quote" ? (b.quote ?? -1) - (a.quote ?? -1) : wert(b) - wert(a)))
        .slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gruppen, sort, kennzahl],
  );
  const max = Math.max(...liste.map(wert), 1);
  const fmtWert = (g: Group) => (kennzahl === "anzahl" ? `${g.angenommen}×` : eur(wert(g)));

  const monthMax = Math.max(...monate.map((m) => m.privat + m.kasse), 1);

  const chip = (aktiv: boolean) =>
    `rounded-full px-3 py-1 text-sm ${aktiv ? "bg-brand-600 text-white" : "bg-[#F5F2EE] text-slate-700 hover:text-brand-700"}`;

  return (
    <div className="space-y-6" data-testid="analyse-explorer">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-slate-900">Umsatz und Zusagen</h2>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Ansicht">
            {([["leistung", "Leistung"], ["thema", "Thema"], ["art", "Art"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={ansicht === k} className={chip(ansicht === k)} onClick={() => { setAnsicht(k); setOffen(null); }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            Kennzahl
            <select className="input w-auto py-1" value={kennzahl} onChange={(e) => setKennzahl(e.target.value as Kennzahl)} data-testid="kennzahl">
              <option value="privat">selbst bezahlt</option>
              <option value="umsatz">Umsatz gesamt (mit Kasse)</option>
              <option value="anzahl">Anzahl Zusagen</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Sortieren
            <select className="input w-auto py-1" value={sort} onChange={(e) => setSort(e.target.value as Sortierung)} data-testid="sortierung">
              <option value="wert">nach Kennzahl</option>
              <option value="quote">nach Annahmequote</option>
            </select>
          </label>
        </div>

        {liste.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Noch keine Vorschläge in diesem Zeitraum.</p>
        ) : (
          <ol className="mt-4 space-y-2" data-testid="top-leistungen">
            {liste.map((g, i) => {
              const auf = offen === g.name;
              return (
                <li key={g.name} className={`rounded-2xl border ${auf ? "border-brand-600 bg-white" : "border-transparent bg-[#FBFAF8]"}`}>
                  <button type="button" className="w-full px-4 py-3 text-left" aria-expanded={auf} onClick={() => setOffen(auf ? null : g.name)} data-testid="leistung-zeile">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="min-w-0 font-medium text-slate-800"><span className="mr-2 tabular-nums text-slate-500">{i + 1}.</span>{g.name}</span>
                      <b className="tabular-nums text-slate-900">{fmtWert(g)}</b>
                    </span>
                    <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <span className="block h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${(wert(g) / max) * 100}%` }} />
                    </span>
                  </button>
                  {auf && (
                    <div className="grid gap-4 border-t border-slate-100 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)]" data-testid="leistung-details">
                      <Ring value={g.quote} />
                      <div className="space-y-3 text-sm">
                        <p className="text-slate-700">
                          <b>{g.angenommen}</b> angenommen, <b>{Math.max(0, g.entschieden - g.angenommen)}</b> abgelehnt
                          {g.privat > 0 && <> · {Math.round(g.anteil * 100)} % Ihres Selbstzahler-Umsatzes</>}
                        </p>
                        {g.umsatz > 0 && <KassenSockel kasse={g.kasse} eigen={g.privat} labels={{ kasse: "Kasse", eigen: "selbst bezahlt" }} />}
                        <p className="rounded-xl bg-[#F5F2EE] px-3 py-2 text-slate-700" data-testid="annahme-satz">{annahmeSatz(g)}</p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="card" data-testid="verlauf">
        <h2 className="font-display text-2xl text-slate-900">Verlauf</h2>
        <p className="mt-1 text-sm text-slate-500">Monat antippen für die Aufteilung.</p>
        <div className="mt-4 flex h-44 items-end gap-3">
          {monate.map((m, i) => {
            const sum = m.privat + m.kasse;
            const aktiv = monat === i;
            return (
              <button
                key={m.monat}
                type="button"
                onClick={() => setMonat(aktiv ? null : i)}
                aria-pressed={aktiv}
                className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                data-testid="monat"
              >
                <span className="flex w-full max-w-[2.5rem] flex-col gap-[2px]" style={{ height: `${(sum / monthMax) * 85}%` }}>
                  {m.kasse > 0 && <span className="w-full rounded-t-[4px] bg-salbei-500" style={{ flex: m.kasse }} />}
                  {m.privat > 0 && <span className={`w-full ${aktiv ? "bg-brand-800" : "bg-brand-600 group-hover:bg-brand-700"} ${m.kasse > 0 ? "" : "rounded-t-[4px]"}`} style={{ flex: m.privat }} />}
                </span>
                <span className={`text-xs ${aktiv ? "font-semibold text-brand-700" : "text-slate-500"}`}>{m.monat}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 min-h-[1.5rem] text-sm text-slate-700" data-testid="monat-detail">
          {monat != null
            ? `${monate[monat].monat}: ${eur(monate[monat].privat)} selbst bezahlt, ${eur(monate[monat].kasse)} Kasse, zusammen ${eur(monate[monat].privat + monate[monat].kasse)}.`
            : "Bordeaux: selbst bezahlt · Salbei: Kasse"}
        </p>
      </section>
    </div>
  );
}
