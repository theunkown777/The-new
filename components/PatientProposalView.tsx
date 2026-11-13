"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ABGEWAEHLT,
  istFreiwillig,
  isZahnersatz,
  money,
  typeLabelOf,
  summarize,
  vergleicheJahre,
  type PatientFactors,
  type ProposalItem,
} from "@/lib/proposals";
import { installmentOffer, type Installments } from "@/lib/installments";
import { PATIENT_LANGS, UI, datum, euro, langDir, langName, tr, uebersetzung, type PatientLang } from "@/lib/patientI18n";
import { ZweitmeinungVergleich, type ZweitmeinungProps } from "@/components/ZweitmeinungVergleich";

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
  /** Therapiepraxis (Heilmittel): eigener Hinweistext statt GOÄ/IGeL. */
  therapie?: boolean;
  /** Sprachwahl ausblenden (false). Ohne Angabe wird sie gezeigt. */
  translatable?: boolean;
  /** Zweitmeinung zum Vergleich (Patienten-Link und Portal). */
  zweitmeinung?: ZweitmeinungProps;
};

/**
 * Regeltext in der gewählten Sprache. Was es nur auf Deutsch gibt, wird als Deutsch ausgezeichnet:
 * richtige Schreibrichtung in der arabischen Ansicht und richtige Aussprache in Vorleseprogrammen.
 */
function Rt({ text, lang }: { text: string; lang: PatientLang }) {
  const u = uebersetzung(text, lang);
  return u.stand === "deutsch" ? (
    <span lang="de" dir="ltr">
      {u.text}
    </span>
  ) : (
    <>{u.text}</>
  );
}

export function PatientProposalView(props: Props) {
  const { items, patient, lang } = props;
  const t = UI[lang];
  const dir = langDir(lang);
  const fmt = (n: number) => euro(n, lang);
  // Liegt ein gezeigter Regeltext nicht (ganz) in der gewählten Sprache vor, sagt die Ansicht das dazu.
  const teilsDeutsch = useMemo(
    () =>
      lang !== "de" &&
      items.some((i) =>
        [
          i.title,
          i.where,
          ...i.notes.filter((n) => n.kind === "info").map((n) => n.text),
          ...i.options.flatMap((o) => [o.name, typeLabelOf(o, patient.insurance), ...o.benefits, ...(o.hinweis ? [o.hinweis] : []), ...(o.nutzen ? [o.nutzen] : [])]),
        ].some((x) => uebersetzung(x, lang).stand !== "ganz"),
      ),
    [items, lang, patient.insurance],
  );
  // Nichts ist vorausgewählt: Die Patientin oder der Patient entscheidet selbst.
  // Automatisch gesetzt ist nur, wo es ohnehin nur die Kassenleistung gibt. Eine einzelne
  // Selbstzahlerleistung ist freiwillig: nicht vorausgewählt und wieder abwählbar.
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const i of items) {
      const own = props.initialChoices[i.key];
      if (own && i.options.some((o) => o.id === own)) c[i.key] = own;
      else if (i.options.length === 1 && !istFreiwillig(i)) c[i.key] = i.options[0].id;
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
  const offen = items.filter((i) => !choices[i.key] && !istFreiwillig(i));
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
  // Hinweis "Bitte wählen Sie noch" verschwindet, sobald alles gewählt ist.
  useEffect(() => {
    if (state === "error" && offen.length === 0) {
      setError("");
      setState("idle");
    }
  }, [choices]); // eslint-disable-line react-hooks/exhaustive-deps
  const recSum = useMemo(() => summarize(items, props.empfehlung, patient).netto, [items, props.empfehlung, patient]);
  const lowSum = useMemo(() => summarize(items, lowChoices, patient).netto, [items, lowChoices, patient]);
  const gkv = patient.insurance === "GKV";
  const offer = installmentOffer(sum.netto, props.installments);
  const until = datum(props.expiresAt, lang);

  async function send(response: "INTERESSE" | "RUECKRUF") {
    if (response === "INTERESSE" && offen.length > 0) {
      setError(t.missing(offen.map((i) => tr(i.title, lang)).join(", ")));
      setState("error");
      document.getElementById(`pos-${offen[0].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setState("sending");
    setError("");
    // Nicht angetippte freiwillige Leistungen gehen ausdrücklich als „nicht gewünscht“ an die Praxis.
    const chosen = Object.fromEntries(
      items.map((i) => [i.key, choices[i.key] ?? (response === "INTERESSE" && istFreiwillig(i) ? ABGEWAEHLT : "")]).filter(([, v]) => v),
    );
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
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-8 sm:pt-12" lang={lang} dir={dir}>
      {props.backHref && (
        // Die gewählte Sprache geht mit zurück ins Portal (dort gilt sie, soweit das Portal sie anbietet).
        <a href={`${props.backHref}${props.backHref.includes("?") ? "&" : "?"}lang=${lang}`} className="mb-4 inline-block text-sm text-brand-700 underline" data-testid="zurueck-portal">
          {dir === "rtl" ? "→" : "←"} {t.back}
        </a>
      )}
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-700">
          <bdi>{props.practiceName}</bdi>
        </p>
        {props.translatable !== false && (
          // Sprachwahl: jede Sprache in eigener Schreibweise, als Reihe gut antippbarer Schalter, die auf dem Handy umbricht.
          <nav aria-label={lang === "en" ? "Language" : `${t.langLabel} / Language`} className="flex flex-wrap gap-1.5" data-testid="sprachwahl">
            {PATIENT_LANGS.map((l) => (
              <a
                key={l}
                href={`?lang=${l}`}
                hrefLang={l}
                lang={l}
                dir={langDir(l)}
                aria-current={l === lang ? "true" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-sm ${l === lang ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
              >
                {langName(l)}
              </a>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{t.hello(props.firstName)}</h1>
        <p className="text-slate-600">{t.intro(props.arztDativ)}</p>
        {t.langNote && (
          // Rechtlicher Hinweis in jeder Fremdsprache: maßgeblich sind die deutsche Fassung und das Gespräch in der Praxis.
          <p className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="note" data-testid="sprachhinweis">
            {t.langNote}
            {teilsDeutsch && <> {t.contentNote}</>}
          </p>
        )}
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
              <h2 className="font-semibold text-slate-900">
                <Rt text={item.title} lang={lang} />
              </h2>
              <p className="text-sm text-slate-500">
                <Rt text={item.where} lang={lang} />
              </p>
              {!current && <p className="mt-1 text-xs text-brand-700">{istFreiwillig(item) ? t.optional : t.pick}</p>}
              <fieldset className="mt-4 space-y-3">
                <legend className="sr-only">{t.optionsFor(title)}</legend>
                {item.options.map((o) => {
                  const m = money(o, patient);
                  const selected = current?.id === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`block cursor-pointer rounded-xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-700 ${
                        selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.key}
                        value={o.id}
                        checked={selected}
                        onChange={() => setChoices((c) => ({ ...c, [item.key]: o.id }))}
                        onClick={() => {
                          // Freiwillige Leistung: zweites Antippen wählt sie wieder ab.
                          if (selected && istFreiwillig(item)) setChoices((c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== item.key)));
                        }}
                        className="sr-only"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">
                              <Rt text={o.name} lang={lang} />
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            <Rt text={typeLabelOf(o, patient.insurance)} lang={lang} />
                          </span>
                        </div>
                        <div className="text-end">
                          {o.type === "kasse" && o.total === 0 && o.zuzahlung ? (
                            // Kassenleistung auf Verordnung ohne hinterlegten Preis: Die Zuzahlung hängt von der Verordnung ab.
                            <div className="max-w-[9rem] text-sm font-medium text-slate-900">{t.coPayment}</div>
                          ) : (
                            <>
                              <div className="text-lg font-semibold tabular-nums text-slate-900">{fmt(m.netto)}</div>
                              <div className="text-xs text-slate-500">{t.yourShare}</div>
                            </>
                          )}
                        </div>
                      </div>
                      {o.benefits.length > 0 && (
                        <ul className="mt-2 list-disc space-y-0.5 ps-5 text-sm text-slate-700">
                          {o.benefits.map((b) => (
                            <li key={b}>
                              <Rt text={b} lang={lang} />
                            </li>
                          ))}
                        </ul>
                      )}
                      {o.hinweis && (
                        <p className="mt-2 text-xs text-emerald-800">
                          {t.kasseWenn} <Rt text={o.hinweis} lang={lang} />
                        </p>
                      )}
                      {o.nutzen && (
                        <p className="mt-1 text-xs text-amber-800">
                          {t.nutzen} <Rt text={o.nutzen} lang={lang} />
                        </p>
                      )}
                      <p className={`mt-2 text-xs text-slate-500 ${o.total === 0 ? "hidden" : ""}`}>
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
                    <li key={n.text}>
                      <Rt text={n.text} lang={lang} />
                    </li>
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
            <button type="button" className="ms-1 text-brand-700 underline" onClick={() => setState("idle")}>
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

      {props.zweitmeinung && (
        // Der Abschnitt „Zweitmeinung vergleichen“ (eigene Komponente) liegt nur auf Deutsch vor: in jeder
        // Fremdsprache steht ein kurzer Hinweis davor, der Abschnitt selbst ist als Deutsch ausgezeichnet.
        <>
          {t.germanOnlyNote && (
            <p className="mt-8 text-sm text-slate-600" role="note" data-testid="zweitmeinung-sprachhinweis">
              {t.germanOnlyNote}
            </p>
          )}
          <div lang="de" dir="ltr" className={t.germanOnlyNote ? "-mt-5" : undefined}>
            <ZweitmeinungVergleich
              {...props.zweitmeinung}
              hier={[
                { label: "Ihre Auswahl", cent: offen.length ? null : Math.round(sum.netto * 100) },
                { label: "wie empfohlen", cent: Math.round(recSum * 100) },
                { label: "geringster Eigenanteil", cent: Math.round(lowSum * 100) },
              ]}
            />
          </div>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        {props.dental === false ? (props.therapie ? t.fineTherapie(until) : t.fineMed(until)) : t.fine(gkv, until)}
        {offer.kind === "rate" && t.installmentsFine(props.installments.provider)}
        {t.langNote && <> {t.langNote}</>}
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
            <div className="text-end text-xs text-amber-800">
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
                    <p className="font-medium text-slate-900">
                      <Rt text={item.title} lang={lang} />
                    </p>
                    <dl className="mt-1 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 text-sm">
                      <dt className="text-slate-500">{t.yourChoice}</dt>
                      <dd className={mine ? "text-slate-900" : "text-brand-700"}>{mine ? <Rt text={mine.name} lang={lang} /> : t.notChosen}</dd>
                      <dd className="text-end tabular-nums text-slate-700">{mine ? fmt(money(mine, patient).netto) : ""}</dd>
                      {rec && (
                        <>
                          <dt className="text-salbei-700">{t.ourRec}</dt>
                          <dd className="text-slate-900">
                            <Rt text={rec.name} lang={lang} />
                          </dd>
                          <dd className="text-end tabular-nums text-slate-700">{fmt(money(rec, patient).netto)}</dd>
                        </>
                      )}
                    </dl>
                    {gleich ? (
                      <p className="mt-1 text-xs text-salbei-700">✓ {t.same}</p>
                    ) : (
                      rec?.benefits[0] && (
                        <p className="mt-1 text-xs text-slate-600">
                          {t.why} <Rt text={rec.benefits[0]} lang={lang} />
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
