"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BefundDiktat } from "@/components/BefundDiktat";
import type { DiktatResult } from "@/lib/befundDiktat";
import {
  FINDINGS,
  GLOBAL_FINDINGS,
  LOWER_TEETH,
  PROPOSAL_STATUS_LABELS,
  UPPER_TEETH,
  ageFromBirthDate,
  buildLetter,
  buildProposal,
  chosenOption,
  defaultZuschussJahr,
  FESTZUSCHUSS_SAETZE,
  isZahnersatz,
  showsJahresvergleich,
  tageBisStichtag,
  vergleicheJahre,
  formatEuro,
  money,
  optionTypeLabel,
  summarize,
  type FindingCode,
  type GlobalCode,
  type PatientFactors,
  type Prices,
  type ProposalInput,
  type ZuschussJahr,
} from "@/lib/proposals";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  insuranceType: string | null;
  birthDate: string | null;
};

export type ExistingProposal = {
  id: string;
  patientId: string;
  status: string;
  input: ProposalInput;
  choices: Record<string, string>;
};

function defaultFactors(p: PatientOption | undefined): PatientFactors {
  return {
    age: p ? ageFromBirthDate(p.birthDate) : null,
    insurance: p?.insuranceType === "PKV" ? "PKV" : "GKV",
    bonusYears: 0,
    haertefall: false,
    erstattungProzent: p?.insuranceType === "PKV" ? 80 : 0,
    zuschussJahr: defaultZuschussJahr(),
  };
}

export function ProposalEditor({
  patients,
  initialPatientId,
  initialGlobals,
  prices,
  practiceName,
  existing,
  savedHrefPrefix = "/proposals/",
  compact = false,
  onChange,
}: {
  patients: PatientOption[];
  initialPatientId?: string;
  /** Allgemeine Befunde aus der Anamnese (z. B. Raucher), nur für neue Vorschläge. */
  initialGlobals?: GlobalCode[];
  prices: Prices;
  practiceName: string;
  existing?: ExistingProposal;
  /** Ziel nach dem ersten Speichern; im Praxissoftware-Fenster bleibt der Nutzer unter /embed. */
  savedHrefPrefix?: string;
  /** Im Abschluss-Schritt: ohne eigene Speichern-Knöpfe und Schreiben-Reiter, gespeichert wird gemeinsam. */
  compact?: boolean;
  onChange?: (input: ProposalInput, choices: Record<string, string>) => void;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(existing?.patientId ?? initialPatientId ?? "");
  const patient = patients.find((p) => p.id === patientId);
  const [factors, setFactors] = useState<PatientFactors>(existing?.input.patient ?? defaultFactors(patient));
  const [teeth, setTeeth] = useState<Partial<Record<string, FindingCode>>>(existing?.input.teeth ?? {});
  const [globals, setGlobals] = useState<Partial<Record<GlobalCode, boolean>>>(
    existing?.input.globals ?? Object.fromEntries((initialGlobals ?? []).map((k) => [k, true])),
  );
  const [choices, setChoices] = useState<Record<string, string>>(existing?.choices ?? {});
  const [selected, setSelected] = useState<number>(16);
  const [tab, setTab] = useState<"praxis" | "patient">("praxis");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = existing?.status ?? "ENTWURF";
  const locked = status === "ANGENOMMEN" || status === "ABGELEHNT";

  const input: ProposalInput = { teeth, globals, patient: factors };
  const items = useMemo(() => buildProposal(input, prices), [teeth, globals, factors, prices]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = summarize(items, choices, factors);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";
  const letter = buildLetter({ items, choices, patient: factors, patientName, practiceName, date: new Date() });
  const delta = summary.planTotal - summary.baseTotal;
  const jv = vergleicheJahre(items, choices, factors);
  const jahr: ZuschussJahr = factors.zuschussJahr ?? defaultZuschussJahr();
  const zeigeVergleich = factors.insurance === "GKV" && !factors.haertefall;
  const tage = tageBisStichtag();
  const pct = (y: ZuschussJahr) => `${Math.round(FESTZUSCHUSS_SAETZE[y][factors.bonusYears] * 100)} %`;

  useEffect(() => {
    onChange?.({ teeth, globals, patient: factors }, choices);
  }, [teeth, globals, factors, choices]); // eslint-disable-line react-hooks/exhaustive-deps

  function changePatient(id: string) {
    setPatientId(id);
    setFactors(defaultFactors(patients.find((p) => p.id === id)));
  }
  function setFinding(n: number, f: string) {
    setTeeth((t) => {
      const next = { ...t };
      if (f) next[String(n)] = f as FindingCode;
      else delete next[String(n)];
      return next;
    });
  }

  function applyDiktat(r: DiktatResult) {
    setTeeth((t) => {
      const next = { ...t };
      for (const [n, c] of Object.entries(r.teeth)) {
        if (c === "ok") delete next[n];
        else if (c) next[n] = c;
      }
      return next;
    });
    if (r.globals.length) setGlobals((g) => ({ ...g, ...Object.fromEntries(r.globals.map((k) => [k, true])) }));
    const first = Object.keys(r.teeth).map(Number)[0];
    if (first) setSelected(first);
  }

  async function save(nextStatus?: string) {
    if (!patientId) {
      setError("Bitte zuerst einen Patienten wählen.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = locked ? { status: nextStatus } : { patientId, input, choices, status: nextStatus ?? status };
    const res = await fetch(existing ? `/api/proposals/${existing.id}` : "/api/proposals", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    if (existing) router.refresh();
    else router.push(`${savedHrefPrefix}${data.proposal.id}`);
  }

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich. Bitte den Text manuell markieren.");
    }
  }

  const tooth = (n: number, lower: boolean) => {
    const f = teeth[String(n)];
    const base = "aspect-[3/4] w-full border text-[10px] font-medium tabular-nums transition-colors disabled:cursor-default";
    const shape = lower ? "rounded-b-lg rounded-t" : "rounded-t-lg rounded-b";
    const color =
      f === "fehlt"
        ? "border-dashed border-slate-400 bg-slate-100 text-slate-400"
        : f === "fissur"
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : f
            ? "border-amber-500 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-400";
    return (
      <button
        key={n}
        type="button"
        onClick={() => setSelected(n)}
        aria-pressed={selected === n}
        aria-label={`Zahn ${n}${f ? `, ${FINDINGS[f]}` : ""}`}
        className={`${base} ${shape} ${color} ${selected === n ? "ring-2 ring-slate-900 ring-offset-1" : ""} ${n === 21 || n === 31 ? "ml-1" : ""}`}
      >
        {n}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {locked && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Dieser Vorschlag ist abgeschlossen ({PROPOSAL_STATUS_LABELS[status]}) und dient als
          Aufklärungsnachweis. Befund und Wahl sind nicht mehr änderbar, nur der Status.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <fieldset disabled={locked} className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-medium text-slate-900">Patient</h2>
            <div>
              <label className="label" htmlFor="proposal-patient">Patient</label>
              <select
                id="proposal-patient"
                className="input"
                value={patientId}
                disabled={!!existing}
                onChange={(e) => changePatient(e.target.value)}
              >
                <option value="">Bitte wählen…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="proposal-age">Alter</label>
                <input
                  id="proposal-age"
                  type="number"
                  min={0}
                  max={120}
                  className="input"
                  value={factors.age ?? ""}
                  onChange={(e) => setFactors({ ...factors, age: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="proposal-insurance">Versicherung</label>
                <select
                  id="proposal-insurance"
                  className="input"
                  value={factors.insurance}
                  onChange={(e) => {
                    const ins = e.target.value as "GKV" | "PKV";
                    setFactors({ ...factors, insurance: ins, erstattungProzent: ins === "PKV" ? 80 : 0 });
                  }}
                >
                  <option value="GKV">Gesetzlich</option>
                  <option value="PKV">Privat</option>
                </select>
              </div>
            </div>
            {factors.insurance === "GKV" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="proposal-bonus">Bonusheft</label>
                  <select
                    id="proposal-bonus"
                    className="input"
                    value={factors.bonusYears}
                    onChange={(e) => setFactors({ ...factors, bonusYears: Number(e.target.value) as 0 | 5 | 10 })}
                  >
                    <option value={0}>kein Bonus</option>
                    <option value={5}>5 Jahre (70 %)</option>
                    <option value={10}>10 Jahre (75 %)</option>
                  </select>
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={factors.haertefall}
                    onChange={(e) => setFactors({ ...factors, haertefall: e.target.checked })}
                  />
                  Härtefall
                </label>
              </div>
            )}
            {factors.insurance === "GKV" && (
              <div>
                <label className="label" htmlFor="proposal-zuschussjahr">Bewilligung des HKP durch die Kasse</label>
                <select
                  id="proposal-zuschussjahr"
                  className="input"
                  value={jahr}
                  onChange={(e) => setFactors({ ...factors, zuschussJahr: Number(e.target.value) as ZuschussJahr })}
                >
                  <option value={2026}>bis 31.12.2026 (60/70/75 %)</option>
                  <option value={2027}>ab 1.1.2027 (50/60/65 %)</option>
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="proposal-erstattung">
                {factors.insurance === "GKV" ? "Zusatzversicherung erstattet" : "PKV-Tarif erstattet"}:{" "}
                {factors.erstattungProzent} %
              </label>
              <input
                id="proposal-erstattung"
                type="range"
                min={0}
                max={100}
                step={10}
                className="w-full accent-brand-600"
                value={factors.erstattungProzent}
                onChange={(e) => setFactors({ ...factors, erstattungProzent: Number(e.target.value) })}
              />
            </div>
          </div>

          <BefundDiktat onApply={applyDiktat} />

          <div className="card space-y-3">
            <h2 className="font-medium text-slate-900">Zahnschema (FDI)</h2>
            <div className="flex justify-between text-[11px] text-slate-400"><span>rechts</span><span>Oberkiefer</span><span>links</span></div>
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5">{UPPER_TEETH.map((n) => tooth(n, false))}</div>
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5">{LOWER_TEETH.map((n) => tooth(n, true))}</div>
            <div className="flex justify-between text-[11px] text-slate-400"><span>rechts</span><span>Unterkiefer</span><span>links</span></div>
            <div className="rounded-lg bg-slate-50 p-3">
              <label className="label" htmlFor="proposal-finding">Befund an Zahn {selected}</label>
              <select
                id="proposal-finding"
                className="input"
                value={teeth[String(selected)] ?? ""}
                onChange={(e) => setFinding(selected, e.target.value)}
              >
                <option value="">Kein Befund</option>
                {Object.entries(FINDINGS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-2">
            <h2 className="mb-1 font-medium text-slate-900">Allgemeiner Befund</h2>
            {!existing && initialGlobals && initialGlobals.length > 0 && (
              <p className="text-xs text-slate-500" data-testid="globals-from-anamnesis">Aus der Anamnese übernommen, bitte prüfen.</p>
            )}
            {(Object.entries(GLOBAL_FINDINGS) as [GlobalCode, string][]).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!globals[k]}
                  onChange={(e) => setGlobals({ ...globals, [k]: e.target.checked })}
                />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 [&>div]:bg-white">
            <Stat label="Nur Kasse" value={formatEuro(summary.baseTotal)} />
            <Stat label="Gewählter Plan" value={formatEuro(summary.planTotal)} />
            <Stat
              label="Mehrumsatz"
              value={`${delta >= 0 ? "+" : ""}${formatEuro(delta)}`}
              hint={summary.baseTotal ? `+${Math.round((delta / summary.baseTotal) * 100)} % ggü. Kasse` : undefined}
              accent
            />
            <Stat label="Eigenanteil Patient" value={formatEuro(summary.netto)} />
          </div>

          {zeigeVergleich && jv.betroffen && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium text-slate-900">Festzuschuss sinkt zum 1.1.2027</h2>
                {showsJahresvergleich() && (
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    {tage === 0 ? "Heute letzter Tag" : `Noch ${tage} Tage`} für Bewilligung zu den alten Sätzen
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-lg bg-white p-3 ${jahr === 2026 ? "ring-2 ring-brand-600" : ""}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bewilligt bis 31.12.2026</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatEuro(jv.netto2026)}</p>
                  <p className="text-xs text-slate-400">Festzuschuss {pct(2026)} der Regelversorgung</p>
                </div>
                <div className={`rounded-lg bg-white p-3 ${jahr === 2027 ? "ring-2 ring-brand-600" : ""}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bewilligt ab 1.1.2027</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatEuro(jv.netto2027)}</p>
                  <p className="text-xs text-slate-400">Festzuschuss {pct(2027)} der Regelversorgung</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mehrkosten für den Patienten</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-red-700">+{formatEuro(jv.mehrkosten)}</p>
                  <p className="text-xs text-slate-400">bei der gewählten Versorgung</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Maßgeblich ist das Bewilligungsdatum der Krankenkasse, nicht der Behandlungstermin. Härtefälle
                erhalten weiter die volle Regelversorgung. Grundlage: GKV-Beitragssatzstabilisierungsgesetz, bitte
                aktuelle Festzuschussbeträge Ihrer KZV prüfen.
              </p>
            </div>
          )}

          {!compact && <div className="flex gap-1 border-b border-slate-200" role="tablist">
            {(["praxis", "patient"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {t === "praxis" ? "Praxisansicht" : "Schreiben an Patient"}
              </button>
            ))}
          </div>}

          {tab === "praxis" ? (
            items.length === 0 ? (
              <div className="card text-sm text-slate-500">
                Noch kein Befund. Wählen Sie im Zahnschema einen Zahn und setzen Sie einen Befund.
              </div>
            ) : (
              items.map((item) => {
                const chosen = chosenOption(item, choices);
                return (
                  <section key={item.key} className="card space-y-3 p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">{item.where}</span>
                      <h3 className="font-medium text-slate-900">{item.title}</h3>
                    </div>
                    {item.options.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {item.options.map((o) => {
                          const m = money(o, factors);
                          const active = chosen?.id === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              disabled={locked}
                              aria-pressed={active}
                              onClick={() => setChoices({ ...choices, [item.key]: o.id })}
                              className={`flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default ${active ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                            >
                              <span className="flex flex-wrap items-center justify-between gap-1">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${o.type === "kasse" || o.type === "regel" ? "border-green-600 text-green-700" : "border-slate-300 text-slate-500"}`}
                                >
                                  {optionTypeLabel(o.type, factors.insurance)}
                                </span>
                                {o.id === item.recommended && (
                                  <span className="text-[11px] font-semibold text-brand-700">Empfehlung</span>
                                )}
                              </span>
                              <span className="font-medium text-slate-900">{o.name}</span>
                              <ul className="list-disc pl-4 text-xs text-slate-500">
                                {o.benefits.map((b) => <li key={b}>{b}</li>)}
                              </ul>
                              <span className="mt-auto flex justify-between border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
                                Eigenanteil
                                <b className="tabular-nums text-amber-700">{formatEuro(m.netto)}</b>
                              </span>
                              {zeigeVergleich && isZahnersatz(o) && (
                                <span className="flex justify-between text-xs text-red-700">
                                  {jahr === 2026 ? "Ab 2027" : "Bis 31.12.2026"}
                                  <span className="tabular-nums">
                                    {formatEuro(money(o, factors, jahr === 2026 ? 2027 : 2026).netto)}
                                  </span>
                                </span>
                              )}
                              <span className="flex justify-between text-xs text-slate-400">
                                Volumen <span className="tabular-nums">{formatEuro(m.total)}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {(item.notes.length > 0 || item.excluded.length > 0) && (
                      <ul className="space-y-1 text-sm">
                        {item.notes.map((n) => (
                          <li key={n.text} className={n.kind === "warn" ? "text-amber-800" : "text-slate-700"}>
                            {n.kind === "warn" ? "⚠ " : "• "}
                            {n.text}
                          </li>
                        ))}
                        {item.excluded.map((x) => (
                          <li key={x} className="text-slate-400">○ Nicht vorgeschlagen: {x}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })
            )
          ) : (
            <div className="card space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={copyLetter} className="btn-secondary">
                  {copied ? "Kopiert" : "Text kopieren"}
                </button>
                <span className="text-xs text-slate-400">
                  Für E-Mail, Patientenportal oder Ausdruck. Gespeichert wird der Text beim Sichern des Vorschlags.
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">{letter}</pre>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Beträge sind Schätzungen aus der Preisliste Ihrer Praxis (Einstellungen → Vorschlagspreise).
            Die Empfehlung ist ein Vorschlag des Regelwerks; die fachliche Entscheidung trifft die
            behandelnde Person. HKP und Mehrkostenvereinbarung erstellen Sie wie gewohnt in Ihrer
            Praxissoftware.
          </p>

          {!compact && <div className="flex flex-wrap gap-2">
            {!locked && (
              <button type="button" disabled={saving} onClick={() => save()} className="btn-primary">
                {saving ? "Speichert…" : existing ? "Änderungen speichern" : "Vorschlag speichern"}
              </button>
            )}
            {existing &&
              (["BESPROCHEN", "ANGENOMMEN", "ABGELEHNT"] as const)
                .filter((s) => s !== status)
                .map((s) => (
                  <button key={s} type="button" disabled={saving} onClick={() => save(s)} className="btn-secondary">
                    Als „{PROPOSAL_STATUS_LABELS[s]}“ markieren
                  </button>
                ))}
          </div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
