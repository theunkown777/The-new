"use client";

import { useMemo, useState } from "react";
import {
  chosenOption,
  isZahnersatz,
  money,
  optionTypeLabel,
  summarize,
  vergleicheJahre,
  type PatientFactors,
  type ProposalItem,
} from "@/lib/proposals";
import { installmentOffer, type Installments } from "@/lib/installments";
import { UI, euro, tr, type PatientLang } from "@/lib/patientI18n";

type Props = {
  token: string;
  practiceName: string;
  firstName: string;
  items: ProposalItem[];
  patient: PatientFactors;
  initialChoices: Record<string, string>;
  alreadyResponded: string | null;
  showJahresvergleich: boolean;
  tageBisStichtag: number;
  expiresAt: string;
  installments: Installments;
  lang: PatientLang;
};

export function PatientProposalView(props: Props) {
  const { items, patient, lang } = props;
  const t = UI[lang];
  const fmt = (n: number) => euro(n, lang);
  const [choices, setChoices] = useState<Record<string, string>>(props.initialChoices);
  const [note, setNote] = useState("");
  const [wantsInstallments, setWantsInstallments] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(props.alreadyResponded ? "sent" : "idle");
  const [error, setError] = useState("");

  const sum = useMemo(() => summarize(items, choices, patient), [items, choices, patient]);
  const jahre = useMemo(() => vergleicheJahre(items, choices, patient), [items, choices, patient]);
  const gkv = patient.insurance === "GKV";
  const offer = installmentOffer(sum.netto, props.installments);
  const until = new Date(props.expiresAt).toLocaleDateString(lang === "en" ? "en-GB" : "de-DE");

  async function send(response: "INTERESSE" | "RUECKRUF") {
    setState("sending");
    setError("");
    const chosen = Object.fromEntries(items.map((i) => [i.key, chosenOption(i, choices)?.id ?? ""]).filter(([, v]) => v));
    const res = await fetch(`/api/p/${props.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response, choices: chosen, note: note || undefined, wantsInstallments }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(lang === "de" && data?.error ? data.error : t.sendFailed);
    setState("error");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-8 sm:pt-12" lang={lang}>
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-brand-700">{props.practiceName}</p>
          <nav aria-label="Sprache / Language" className="flex gap-1 text-xs">
            {(["de", "en"] as const).map((l) => (
              <a
                key={l}
                href={`?lang=${l}`}
                hrefLang={l}
                aria-current={l === lang ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 ${l === lang ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-600"}`}
              >
                {l === "de" ? "Deutsch" : "English"}
              </a>
            ))}
          </nav>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{t.hello(props.firstName)}</h1>
        <p className="text-slate-600">{t.intro}</p>
        {t.langNote && <p className="text-xs text-slate-500">{t.langNote}</p>}
      </header>

      {props.showJahresvergleich && jahre.betroffen && jahre.mehrkosten > 0.5 && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="note">
          <strong>{t.deadlineTitle}</strong> {t.deadline(props.tageBisStichtag)} <strong>{fmt(jahre.mehrkosten)}</strong>.
        </div>
      )}

      <div className="mt-8 space-y-6">
        {items.map((item) => {
          const current = chosenOption(item, choices);
          const title = tr(item.title, lang);
          const infos = item.notes.filter((n) => n.kind === "info");
          return (
            <section key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">{tr(item.where, lang)}</p>
              <fieldset className="mt-4 space-y-3">
                <legend className="sr-only">{t.optionsFor(title)}</legend>
                {item.options.map((o) => {
                  const m = money(o, patient);
                  const selected = current?.id === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`block cursor-pointer rounded-xl border p-4 transition ${
                        selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.key}
                        value={o.id}
                        checked={selected}
                        onChange={() => setChoices((c) => ({ ...c, [item.key]: o.id }))}
                        className="sr-only"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{tr(o.name, lang)}</span>
                            {item.recommended === o.id && (
                              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">{t.recommended}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{tr(optionTypeLabel(o.type, patient.insurance), lang)}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums text-slate-900">{fmt(m.netto)}</div>
                          <div className="text-xs text-slate-500">{t.yourShare}</div>
                        </div>
                      </div>
                      {o.benefits.length > 0 && (
                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                          {o.benefits.map((b) => (
                            <li key={b}>{tr(b, lang)}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        {t.total} {fmt(m.total)}
                        {m.kasse > 0 && (
                          <>
                            {" "}
                            · {gkv ? t.insurerGkv : t.insurerPkv} {fmt(m.kasse)}
                          </>
                        )}
                        {m.erstattet > 0 && (
                          <>
                            {" "}
                            · {t.supplementary} {fmt(m.erstattet)}
                          </>
                        )}
                        {props.showJahresvergleich && gkv && isZahnersatz(o) && !patient.haertefall && (
                          <>
                            {" "}
                            · {t.from2027} {fmt(money(o, patient, 2027).netto)}
                          </>
                        )}
                      </p>
                    </label>
                  );
                })}
              </fieldset>
              {/* Wie im Patientenschreiben nur "info"-Hinweise; "warn" richtet sich an die Praxis. */}
              {infos.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {infos.map((n) => (
                    <li key={n.text}>{tr(n.text, lang)}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="antwort">
        <h2 id="antwort" className="font-semibold text-slate-900">
          {t.nextTitle}
        </h2>
        {state === "sent" ? (
          <p className="mt-2 text-slate-700" role="status">
            {t.thanks}
            <button type="button" className="ml-1 text-brand-700 underline" onClick={() => setState("idle")}>
              {t.change}
            </button>
          </p>
        ) : (
          <>
            <label className="label mt-3" htmlFor="note">
              {t.noteLabel}
            </label>
            <textarea
              id="note"
              className="input min-h-[80px]"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
            />
            {offer.kind !== "none" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={wantsInstallments} onChange={(e) => setWantsInstallments(e.target.checked)} />
                {t.installmentsInterest}
              </label>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn btn-primary py-3" disabled={state === "sending"} onClick={() => send("INTERESSE")}>
                {t.discuss}
              </button>
              <button type="button" className="btn btn-secondary py-3" disabled={state === "sending"} onClick={() => send("RUECKRUF")}>
                {t.callMe}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        {t.fine(gkv, until)}
        {offer.kind === "rate" && t.installmentsFine(props.installments.provider)}
      </p>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">{t.barLabel}</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900" aria-live="polite">
              {fmt(sum.netto)}
            </div>
            {offer.kind === "rate" && (
              <div className="text-xs text-emerald-700" data-testid="installment-rate">
                {t.rate(offer.months, fmt(offer.monthly))}
              </div>
            )}
            {offer.kind === "ask" && <div className="text-xs text-emerald-700">{t.ask}</div>}
          </div>
          {props.showJahresvergleich && jahre.betroffen && jahre.mehrkosten > 0.5 && (
            <div className="text-right text-xs text-amber-800">
              {t.bar2027}
              <br />
              <span className="font-semibold tabular-nums">{fmt(jahre.netto2027)}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
