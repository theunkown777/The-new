"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isZahnersatz,
  money,
  typeLabelOf,
  summarize,
  vergleicheJahre,
  type PatientFactors,
  type ProposalItem,
} from "@/lib/proposals";
import { installmentOffer, type Installments } from "@/lib/installments";
import { UI, euro, tr, type PatientLang } from "@/lib/patientI18n";

type Props = {
  token: string;
  /** Abweichende Adresse für die Rückmeldung (Patientenportal). */
  postUrl?: string;
  /** Zurück-Link, z. B. ins Patientenportal. */
  backHref?: string;
  practiceName: string;
  firstName: string;
  items: ProposalItem[];
  patient: PatientFactors;
  initialChoices: Record<string, string>;
  /** Empfehlung der Praxis je Position; erscheint erst auf Wunsch als Kontrolle. */
  empfehlung: Record<string, string>;
  alreadyResponded: string | null;
  showJahresvergleich: boolean;
  tageBisStichtag: number;
  expiresAt: string;
  installments: Installments;
  lang: PatientLang;
  /** "Ihrer Hautärztin oder Ihrem Hautarzt"; Zahnmedizin als Standard. */
  arztDativ?: string;
  dental?: boolean;
  /** Sprachumschalter nur, wenn alle Texte übersetzt sind. */
  translatable?: boolean;
};

export function PatientProposalView(props: Props) {
  const { items, patient, lang } = props;
  const t = UI[lang];
  const fmt = (n: number) => euro(n, lang);
  // Nichts ist vorausgewählt: Die Patientin oder der Patient entscheidet selbst.
  // Nur Positionen mit einer einzigen Option sind automatisch gesetzt.
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const i of items) {
      const own = props.initialChoices[i.key];
      if (own && i.options.some((o) => o.id === own)) c[i.key] = own;
      else if (i.options.length === 1) c[i.key] = i.options[0].id;
    }
    return c;
  });
  const [recOpen, setRecOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (recOpen && !d.open) d.showModal?.();
    if (!recOpen && d.open) d.close();
  }, [recOpen]);
  const [note, setNote] = useState("");
  const [wantsInstallments, setWantsInstallments] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(props.alreadyResponded ? "sent" : "idle");
  const [error, setError] = useState("");

  const gewaehlt = (item: ProposalItem) => item.options.find((o) => o.id === choices[item.key]) ?? null;
  const chosenItems = useMemo(() => items.filter((i) => i.options.some((o) => o.id === choices[i.key])), [items, choices]);
  const offen = items.filter((i) => !choices[i.key]);
  const sum = useMemo(() => summarize(chosenItems, choices, patient), [chosenItems, choices, patient]);
  const jahre = useMemo(() => vergleicheJahre(chosenItems, choices, patient), [chosenItems, choices, patient]);
  // Varianten für die Kontrolle: Empfehlung und geringster Eigenanteil je Position.
  const lowChoices = useMemo(
    () =>
      Object.fromEntries(
        items.map((i) => [i.key, [...i.options].sort((a, b) => money(a, patient).netto - money(b, patient).netto)[0]?.id ?? ""]),
      ),
    [items, patient],
  );
  const recSum = useMemo(() => summarize(items, props.empfehlung, patient).netto, [items, props.empfehlung, patient]);
  const lowSum = useMemo(() => summarize(items, lowChoices, patient).netto, [items, lowChoices, patient]);
  const gkv = patient.insurance === "GKV";
  const offer = installmentOffer(sum.netto, props.installments);
  const until = new Date(props.expiresAt).toLocaleDateString(lang === "en" ? "en-GB" : "de-DE");

  async function send(response: "INTERESSE" | "RUECKRUF") {
    if (response === "INTERESSE" && offen.length > 0) {
      setError(t.missing(offen.map((i) => tr(i.title, lang)).join(", ")));
      setState("error");
      document.getElementById(`pos-${offen[0].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setState("sending");
    setError("");
    const chosen = Object.fromEntries(items.map((i) => [i.key, choices[i.key] ?? ""]).filter(([, v]) => v));
    const res = await fetch(props.postUrl ?? `/api/p/${props.token}`, {
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
      {props.backHref && (
        <a href={props.backHref} className="mb-4 inline-block text-sm text-brand-700 underline" data-testid="zurueck-portal">
          {lang === "en" ? "← Back to your treatment path" : "← Zurück zu Ihrem Behandlungsweg"}
        </a>
      )}
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-brand-700">{props.practiceName}</p>
          {props.translatable !== false && <nav aria-label="Sprache / Language" className="flex gap-1 text-xs">
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
          </nav>}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{t.hello(props.firstName)}</h1>
        <p className="text-slate-600">{t.intro(props.arztDativ ?? "Ihrer Zahnärztin oder Ihrem Zahnarzt")}</p>
        {t.langNote && <p className="text-xs text-slate-500">{t.langNote}</p>}
      </header>

      {props.showJahresvergleich && jahre.betroffen && jahre.mehrkosten > 0.5 && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="note">
          <strong>{t.deadlineTitle}</strong> {t.deadline(props.tageBisStichtag)} <strong>{fmt(jahre.mehrkosten)}</strong>.
        </div>
      )}

      <div className="mt-8 space-y-6">
        {items.map((item) => {
          const current = gewaehlt(item);
          const title = tr(item.title, lang);
          const infos = item.notes.filter((n) => n.kind === "info");
          return (
            <section key={item.key} id={`pos-${item.key}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">{tr(item.where, lang)}</p>
              {!current && <p className="mt-1 text-xs text-brand-700">{t.pick}</p>}
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
                          </div>
                          <span className="text-xs text-slate-500">{tr(typeLabelOf(o, patient.insurance), lang)}</span>
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
                      {o.hinweis && (
                        <p className="mt-2 text-xs text-emerald-800">
                          {t.kasseWenn} {o.hinweis}
                        </p>
                      )}
                      {o.nutzen && (
                        <p className="mt-1 text-xs text-amber-800">
                          {t.nutzen} {o.nutzen}
                        </p>
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
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-salbei-300 bg-salbei-50 px-3 py-1.5 text-sm text-salbei-800 hover:bg-salbei-100"
              onClick={() => setRecOpen(true)}
              data-testid="empfehlung-oeffnen"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M2 9c2 3 10 3 12 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              {t.seeRec}
            </button>
            <button type="button" className="btn btn-primary mt-4 w-full py-3" disabled={state === "sending"} onClick={() => send("INTERESSE")}>
              {t.discuss}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-500" data-testid="rueckruf">
              {t.callMeLead}{" "}
              <button type="button" className="text-brand-700 underline underline-offset-2" disabled={state === "sending"} onClick={() => send("RUECKRUF")}>
                {t.callMe}
              </button>
            </p>
          </>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        {props.dental === false ? t.fineMed(until) : t.fine(gkv, until)}
        {offer.kind === "rate" && t.installmentsFine(props.installments.provider)}
      </p>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">{t.barLabel}</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900" aria-live="polite">
              {fmt(sum.netto)}
            </div>
            {offen.length > 0 && <div className="text-xs text-brand-700">{t.open(offen.length)}</div>}
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

      <dialog
        ref={dialogRef}
        onClose={() => setRecOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setRecOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40"
        aria-labelledby="empfehlung-titel"
        data-testid="empfehlung-dialog"
      >
        {recOpen && (
          <div className="max-h-[85vh] overflow-y-auto p-5">
            <h2 id="empfehlung-titel" className="font-display text-2xl text-slate-900">{t.recTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.recIntro}</p>
            <ul className="mt-4 space-y-3">
              {items.map((item) => {
                const mine = gewaehlt(item);
                const rec = item.options.find((o) => o.id === props.empfehlung[item.key]) ?? null;
                const gleich = !!mine && mine.id === rec?.id;
                return (
                  <li key={item.key} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{tr(item.title, lang)}</p>
                    <dl className="mt-1 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 text-sm">
                      <dt className="text-slate-500">{t.yourChoice}</dt>
                      <dd className={mine ? "text-slate-900" : "text-brand-700"}>{mine ? tr(mine.name, lang) : t.notChosen}</dd>
                      <dd className="text-right tabular-nums text-slate-700">{mine ? fmt(money(mine, patient).netto) : ""}</dd>
                      {rec && (
                        <>
                          <dt className="text-salbei-700">{t.ourRec}</dt>
                          <dd className="text-slate-900">{tr(rec.name, lang)}</dd>
                          <dd className="text-right tabular-nums text-slate-700">{fmt(money(rec, patient).netto)}</dd>
                        </>
                      )}
                    </dl>
                    {gleich ? (
                      <p className="mt-1 text-xs text-salbei-700">✓ {t.same}</p>
                    ) : (
                      rec?.benefits[0] && (
                        <p className="mt-1 text-xs text-slate-600">
                          {t.why} {tr(rec.benefits[0], lang)}
                        </p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
            <h3 className="mt-5 text-sm font-medium text-slate-700">{t.variants}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center" data-testid="varianten">
              {[
                { label: t.vYours, value: offen.length ? null : sum.netto, cls: "border-brand-200 bg-brand-50" },
                { label: t.vRec, value: recSum, cls: "border-salbei-200 bg-salbei-50" },
                { label: t.vLow, value: lowSum, cls: "border-slate-200 bg-slate-50" },
              ].map((v) => (
                <div key={v.label} className={`rounded-xl border p-2 ${v.cls}`}>
                  <div className="text-[11px] leading-tight text-slate-600">{v.label}</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-slate-900">{v.value == null ? "–" : fmt(v.value)}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn btn-secondary py-2.5"
                onClick={() => {
                  setChoices((c) => ({ ...c, ...Object.fromEntries(Object.entries(props.empfehlung).filter(([, v]) => v)) }));
                  setRecOpen(false);
                }}
              >
                {t.takeRec}
              </button>
              <button type="button" className="btn btn-primary py-2.5" onClick={() => setRecOpen(false)}>
                {offen.length ? t.close : t.keepMine}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
