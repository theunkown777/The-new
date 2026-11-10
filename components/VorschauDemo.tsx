"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_PRICES,
  buildProposal,
  chosenOption,
  formatEuro,
  money,
  typeLabelOf,
  summarize,
  type PatientFactors,
  type ProposalInput,
} from "@/lib/proposals";
import { buildNextSteps } from "@/lib/nextSteps";
import { SPECIALTIES, specialty } from "@/lib/specialties";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";

// Interaktive Vorschau ohne Anmeldung: rechnet mit dem echten Regelwerk,
// speichert nichts. Fach umschalten, Option antippen, Ergebnis sehen.

const PATIENT: PatientFactors = { age: 46, insurance: "GKV", bonusYears: 10, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026 };
const AUSWAHL = ["zahn", "hausarzt", "haut", "ortho", "radiologie", "psych", "physio"];

function inputFor(fach: string): ProposalInput {
  if (fach === "zahn") return { teeth: { "36": "fehlt", "25": "karies_klein" }, globals: {}, patient: PATIENT };
  const s = specialty(fach)!;
  return { teeth: {}, globals: {}, patient: PATIENT, fach, anlaesse: s.anlaesse.filter((a) => !a.nurAufWunsch).slice(0, 2).map((a) => a.id) };
}

export function VorschauDemo() {
  const [fach, setFach] = useState("zahn");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const input = useMemo(() => inputFor(fach), [fach]);
  const items = useMemo(() => buildProposal(input, DEFAULT_PRICES).filter((i) => i.options.length), [input]);
  const sum = summarize(items, choices, PATIENT);
  const steps = buildNextSteps({ items, choices, patient: PATIENT, reportFinal: true, hasProposal: true, today: new Date("2026-11-02"), fach: fach === "zahn" ? undefined : fach });
  const name = fach === "zahn" ? "Zahnarztpraxis" : specialty(fach)?.kurz ?? "Praxis";

  const switchFach = (f: string) => {
    setFach(f);
    setChoices({});
    setSent(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Beispiel-Fach">
        {AUSWAHL.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={fach === f}
            onClick={() => switchFach(f)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${fach === f ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-600"}`}
          >
            <SpecialtyIcon id={f} className="h-4 w-4" />
            {f === "zahn" ? "Zahnmedizin" : SPECIALTIES.find((s) => s.id === f)?.kurz}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. Praxis */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="v1">
          <p className="font-mono text-xs uppercase tracking-wider text-brand-700">1 · Praxis</p>
          <h2 id="v1" className="mt-1 font-semibold text-slate-900">Nach dem Gespräch: Befund anklicken</h2>
          <p className="mt-1 text-sm text-slate-500">Sorrida zeigt die Kassenleistung zuerst und die Alternativen mit Eigenanteil.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((it) => (
              <li key={it.key} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{it.where}</p>
                <p className="font-medium text-slate-900">{it.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {it.options.map((o) => `${o.name} (${typeLabelOf(o, "GKV")})`).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Patient */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="v2">
          <p className="font-mono text-xs uppercase tracking-wider text-brand-700">2 · Patient, zu Hause</p>
          <h2 id="v2" className="mt-1 font-semibold text-slate-900">Optionen auf dem Handy vergleichen</h2>
          <div className="mx-auto mt-4 max-w-[300px] overflow-hidden rounded-[2rem] border-[8px] border-slate-800 bg-white">
            <div className="max-h-[420px] space-y-3 overflow-y-auto p-3">
              <p className="text-[11px] font-semibold text-brand-700">{name} am Markt</p>
              <p className="text-sm font-semibold leading-tight text-slate-900">Hallo Martina, hier ist Ihr Vorschlag</p>
              {items.map((it) => {
                const cur = chosenOption(it, choices);
                return (
                  <div key={it.key} className="rounded-xl border border-slate-200 p-2">
                    <p className="text-xs font-semibold text-slate-800">{it.title}</p>
                    <div className="mt-1 space-y-1">
                      {it.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setChoices({ ...choices, [it.key]: o.id })}
                          aria-pressed={cur?.id === o.id}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] ${cur?.id === o.id ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}
                        >
                          <span>
                            {o.name}
                          </span>
                          <b className="shrink-0 tabular-nums">{formatEuro(money(o, PATIENT).netto)}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setRecOpen(!recOpen)}
                aria-expanded={recOpen}
                className="rounded-full border border-salbei-300 bg-salbei-50 px-3 py-2 text-xs text-salbei-800"
              >
                Hier sehen Sie unsere Empfehlung
              </button>
              {recOpen && (
                <div className="rounded-xl border border-salbei-200 bg-salbei-50 p-2 text-[11px] text-slate-700" data-testid="vorschau-empfehlung">
                  {items.map((it) => {
                    const rec = it.options.find((o) => o.id === it.recommended);
                    const mine = chosenOption(it, choices);
                    return (
                      <p key={it.key}>
                        {it.title}: <b>{rec?.name ?? "–"}</b>
                        {mine?.id === rec?.id ? " ✓ wie gewählt" : ""}
                      </p>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => setSent(true)}
                className="w-full rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white"
              >
                {sent ? "Gesendet ✓" : "Diese Auswahl besprechen"}
              </button>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
              Ihr Eigenanteil <b className="text-base tabular-nums text-slate-900" data-testid="vorschau-summe">{formatEuro(sum.netto)}</b>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Tippen Sie eine Option an.</p>
        </section>

        {/* 3. Ergebnis */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="v3">
          <p className="font-mono text-xs uppercase tracking-wider text-brand-700">3 · Praxis, automatisch</p>
          <h2 id="v3" className="mt-1 font-semibold text-slate-900">Rückmeldung und To-dos</h2>
          <div className={`mt-4 rounded-xl border p-3 text-sm ${sent ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-dashed border-slate-300 text-slate-400"}`} data-testid="vorschau-rueckmeldung">
            {sent ? (
              <>
                <b>Martina Weber möchte besprechen</b>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {items.map((it) => (
                    <li key={it.key}>
                      {it.title}: {chosenOption(it, choices)?.name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              "Hier erscheint die Rückmeldung, sobald die Patientin im Handy auf „besprechen“ tippt."
            )}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {steps.map((st) => (
              <li key={st.id} className={`rounded-lg px-3 py-2 ${st.urgent ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}>
                <span className="text-xs text-slate-500">{st.owner}</span>
                <p className="leading-snug">{st.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-700 p-6 text-white">
        <p className="mr-auto text-lg font-semibold">Gefällt Ihnen das? Mit Ihren eigenen Leistungen sieht es genauso aus.</p>
        <Link href={`/demo?fach=${fach}`} className="rounded-full bg-white px-5 py-2.5 font-medium text-brand-700 hover:bg-brand-50">
          Eigene Demo-Praxis öffnen
        </Link>
        <Link href="/#fach" className="rounded-full border border-white/60 px-5 py-2.5 font-medium text-white hover:bg-white/10">
          Meine Praxis wählen
        </Link>
      </div>
    </div>
  );
}
