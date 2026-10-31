"use client";

import { useMemo, useState } from "react";
import {
  chosenOption,
  formatEuro,
  isZahnersatz,
  money,
  optionTypeLabel,
  summarize,
  vergleicheJahre,
  type PatientFactors,
  type ProposalItem,
} from "@/lib/proposals";
import { installmentOffer, type Installments } from "@/lib/installments";

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
};

export function PatientProposalView(props: Props) {
  const { items, patient } = props;
  const [choices, setChoices] = useState<Record<string, string>>(props.initialChoices);
  const [note, setNote] = useState("");
  const [wantsInstallments, setWantsInstallments] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(props.alreadyResponded ? "sent" : "idle");
  const [error, setError] = useState("");

  const sum = useMemo(() => summarize(items, choices, patient), [items, choices, patient]);
  const jahre = useMemo(() => vergleicheJahre(items, choices, patient), [items, choices, patient]);
  const gkv = patient.insurance === "GKV";
  const offer = installmentOffer(sum.netto, props.installments);

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
    setError(data?.error ?? "Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie die Praxis an.");
    setState("error");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-8 sm:pt-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-700">{props.practiceName}</p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Hallo {props.firstName}, hier ist Ihr Behandlungsvorschlag</h1>
        <p className="text-slate-600">
          Sie können sich in Ruhe ansehen, welche Möglichkeiten es gibt und was sie für Sie kosten. Tippen Sie eine Option an, um Ihren
          Eigenanteil zu sehen. Entschieden wird erst im Gespräch mit Ihrer Zahnärztin oder Ihrem Zahnarzt.
        </p>
      </header>

      {props.showJahresvergleich && jahre.betroffen && jahre.mehrkosten > 0.5 && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="note">
          <strong>Wichtig für Zahnersatz:</strong> Ab 2027 zahlen die Krankenkassen weniger zu. Wird der Heil- und Kostenplan noch bis
          31.12.2026 bewilligt (in {props.tageBisStichtag} Tagen), sparen Sie bei Ihrer Auswahl etwa{" "}
          <strong>{formatEuro(jahre.mehrkosten)}</strong>.
        </div>
      )}

      <div className="mt-8 space-y-6">
        {items.map((item) => {
          const current = chosenOption(item, choices);
          return (
            <section key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="text-sm text-slate-500">{item.where}</p>
              <fieldset className="mt-4 space-y-3">
                <legend className="sr-only">Optionen für {item.title}</legend>
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
                            <span className="font-medium text-slate-900">{o.name}</span>
                            {item.recommended === o.id && (
                              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">Empfehlung</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{optionTypeLabel(o.type, patient.insurance)}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums text-slate-900">{formatEuro(m.netto)}</div>
                          <div className="text-xs text-slate-500">Ihr Anteil</div>
                        </div>
                      </div>
                      {o.benefits.length > 0 && (
                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                          {o.benefits.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Gesamt {formatEuro(m.total)}
                        {m.kasse > 0 && <> · {gkv ? "Kasse" : "Versicherung"} {formatEuro(m.kasse)}</>}
                        {m.erstattet > 0 && <> · Zusatzversicherung ca. {formatEuro(m.erstattet)}</>}
                        {props.showJahresvergleich && gkv && isZahnersatz(o) && !patient.haertefall && (
                          <> · bei Bewilligung ab 2027: {formatEuro(money(o, patient, 2027).netto)}</>
                        )}
                      </p>
                    </label>
                  );
                })}
              </fieldset>
              {item.notes.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {item.notes.map((n) => (
                    <li key={n.text}>{n.text}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="antwort">
        <h2 id="antwort" className="font-semibold text-slate-900">
          Wie möchten Sie weitermachen?
        </h2>
        {state === "sent" ? (
          <p className="mt-2 text-slate-700" role="status">
            Danke, Ihre Praxis hat Ihre Rückmeldung erhalten und meldet sich bei Ihnen. Sie können Ihre Auswahl hier jederzeit erneut
            senden.
            <button type="button" className="ml-1 text-brand-700 underline" onClick={() => setState("idle")}>
              Auswahl ändern
            </button>
          </p>
        ) : (
          <>
            <label className="label mt-3" htmlFor="note">
              Frage oder Wunschtermin (optional)
            </label>
            <textarea
              id="note"
              className="input min-h-[80px]"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Ist eine Ratenzahlung möglich? Am besten erreichbar nachmittags."
            />
            {offer.kind !== "none" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={wantsInstallments} onChange={(e) => setWantsInstallments(e.target.checked)} />
                Ich interessiere mich für Ratenzahlung
              </label>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn btn-primary py-3" disabled={state === "sending"} onClick={() => send("INTERESSE")}>
                Diese Auswahl besprechen
              </button>
              <button type="button" className="btn btn-secondary py-3" disabled={state === "sending"} onClick={() => send("RUECKRUF")}>
                Bitte rufen Sie mich an
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
        Unverbindliche Kostenschätzung. Verbindlich sind der Heil- und Kostenplan bzw. die Vereinbarung mit Ihrer Praxis.
        {gkv && " Der Kassenanteil bei Zahnersatz richtet sich nach dem Datum der Bewilligung durch Ihre Krankenkasse."} Erstattungen
        Ihrer Zusatzversicherung sind geschätzt.
        {offer.kind === "rate" &&
          ` Ratenzahlung zinsfrei${props.installments.provider ? ` über ${props.installments.provider}` : ""}, Beispielrate aufgerundet; Einzelheiten regelt die Vereinbarung mit Ihrer Praxis.`} Dieser Link ist gültig bis{" "}
        {new Date(props.expiresAt).toLocaleDateString("de-DE")}.
      </p>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">Ihr Eigenanteil für diese Auswahl</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900" aria-live="polite">
              {formatEuro(sum.netto)}
            </div>
            {offer.kind === "rate" && (
              <div className="text-xs text-emerald-700" data-testid="installment-rate">
                oder {offer.months} × {formatEuro(offer.monthly)} zinsfrei
              </div>
            )}
            {offer.kind === "ask" && <div className="text-xs text-emerald-700">Ratenzahlung möglich, sprechen Sie uns an</div>}
          </div>
          {props.showJahresvergleich && jahre.betroffen && jahre.mehrkosten > 0.5 && (
            <div className="text-right text-xs text-amber-800">
              ab 2027 bewilligt:
              <br />
              <span className="font-semibold tabular-nums">{formatEuro(jahre.netto2027)}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
