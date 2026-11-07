"use client";

import { useState } from "react";
import type { ZweitmeinungEintrag } from "@/lib/zweitmeinung";

const eur = (cent: number) => `${Math.round(cent / 100).toLocaleString("de-DE")} €`;

export type ZweitmeinungProps = {
  apiUrl: string;
  eintraege: ZweitmeinungEintrag[];
  hinweis: { titel: string; text: string };
  anspruch: boolean;
  fragen: string[];
};

/**
 * Zweitmeinung im Patientenvorschlag: das Angebot einer anderen Praxis
 * eintragen und neben die Varianten dieser Praxis legen. Privat, bis es
 * ausdrücklich geteilt wird.
 */
export function ZweitmeinungVergleich({
  apiUrl,
  eintraege: start,
  hinweis,
  anspruch,
  fragen,
  hier,
}: ZweitmeinungProps & { hier: { label: string; cent: number | null }[] }) {
  const [eintraege, setEintraege] = useState(start);
  const [offen, setOffen] = useState(false);
  const [f, setF] = useState({ praxis: "", leistung: "", eigenanteil: "", gesamt: "", notiz: "" });
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const bezug = hier.find((h) => h.cent != null) ?? null;

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ praxis: f.praxis, leistung: f.leistung, eigenanteil: f.eigenanteil, gesamt: f.gesamt || null, notiz: f.notiz }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setLaeuft(false);
    if (!res?.ok) return setFehler(d?.error ?? "Speichern hat nicht geklappt.");
    setEintraege((x) => [...x, d.eintrag]);
    setF({ praxis: "", leistung: "", eigenanteil: "", gesamt: "", notiz: "" });
    setOffen(false);
  }

  async function teilen(id: string, geteilt: boolean) {
    const res = await fetch(`${apiUrl}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geteilt }) }).catch(() => null);
    if (res?.ok) setEintraege((x) => x.map((z) => (z.id === id ? { ...z, geteilt } : z)));
  }

  async function loeschen(id: string) {
    const res = await fetch(`${apiUrl}/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setEintraege((x) => x.filter((z) => z.id !== id));
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="zweitmeinung" data-testid="zweitmeinung">
      <h2 id="zweitmeinung" className="font-display text-2xl text-slate-900">
        Zweitmeinung vergleichen
      </h2>
      <div className={`mt-2 rounded-xl px-3 py-2 text-sm ${anspruch ? "bg-salbei-50 text-salbei-800" : "bg-slate-50 text-slate-700"}`} data-testid="zweitmeinung-hinweis">
        <b>{hinweis.titel}.</b> {hinweis.text}
      </div>

      {eintraege.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm" data-testid="zweitmeinung-tabelle">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-3 font-normal">Angebot</th>
                <th className="py-1 pr-3 text-right font-normal">Ihr Eigenanteil</th>
                <th className="py-1 text-right font-normal">Unterschied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hier.map((h) => (
                <tr key={h.label} className="bg-brand-50/40">
                  <td className="py-2 pr-3 text-slate-900">Hier: {h.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-900">{h.cent == null ? "noch offen" : eur(h.cent)}</td>
                  <td className="py-2 text-right text-xs text-slate-400">{h === bezug ? "Bezug" : ""}</td>
                </tr>
              ))}
              {eintraege.map((z) => {
                const diff = bezug?.cent != null ? z.eigenanteilCent - bezug.cent : null;
                return (
                  <tr key={z.id}>
                    <td className="py-2 pr-3 align-top">
                      <span className="block text-slate-900">{z.praxis || "Andere Praxis"}</span>
                      <span className="block text-xs text-slate-600">{z.leistung}</span>
                      {z.gesamtCent != null && <span className="block text-xs text-slate-500">Gesamt {eur(z.gesamtCent)}</span>}
                      {z.notiz && <span className="block text-xs italic text-slate-500">„{z.notiz}“</span>}
                      <span className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex items-center gap-1 text-slate-600">
                          <input type="checkbox" checked={z.geteilt} onChange={(e) => teilen(z.id, e.target.checked)} />
                          mit meiner Praxis teilen
                        </label>
                        <button type="button" className="text-slate-400 underline" onClick={() => loeschen(z.id)}>
                          löschen
                        </button>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right align-top tabular-nums text-slate-900">{eur(z.eigenanteilCent)}</td>
                    <td className="py-2 text-right align-top text-xs tabular-nums" data-testid="zweitmeinung-diff">
                      {diff == null ? "–" : Math.abs(diff) < 100 ? "etwa gleich" : diff > 0 ? <span className="text-brand-700">{eur(diff)} mehr</span> : <span className="text-salbei-700">{eur(-diff)} weniger</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {offen ? (
        <form onSubmit={speichern} className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="zweitmeinung-form">
          <input className="input" placeholder="Name der anderen Praxis (freiwillig)" value={f.praxis} onChange={(e) => setF({ ...f, praxis: e.target.value })} maxLength={80} aria-label="Name der anderen Praxis" />
          <input className="input" placeholder="Was schlägt sie vor?" value={f.leistung} onChange={(e) => setF({ ...f, leistung: e.target.value })} required maxLength={160} aria-label="Vorgeschlagene Behandlung" />
          <input className="input" inputMode="decimal" placeholder="Ihr Eigenanteil dort in €" value={f.eigenanteil} onChange={(e) => setF({ ...f, eigenanteil: e.target.value })} required aria-label="Eigenanteil in Euro" />
          <input className="input" inputMode="decimal" placeholder="Gesamtbetrag in € (freiwillig)" value={f.gesamt} onChange={(e) => setF({ ...f, gesamt: e.target.value })} aria-label="Gesamtbetrag in Euro" />
          <textarea className="input sm:col-span-2" rows={2} placeholder="Notiz, z. B. Material, Garantie, Eindruck (freiwillig)" value={f.notiz} onChange={(e) => setF({ ...f, notiz: e.target.value })} maxLength={500} aria-label="Notiz" />
          {fehler && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{fehler}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={laeuft}>Zum Vergleich hinzufügen</button>
            <button type="button" className="btn-secondary" onClick={() => setOffen(false)}>Abbrechen</button>
          </div>
        </form>
      ) : (
        eintraege.length < 3 && (
          <button type="button" className="mt-4 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setOffen(true)} data-testid="zweitmeinung-neu">
            + Angebot einer anderen Praxis eintragen
          </button>
        )
      )}

      <details className="mt-4 text-sm text-slate-600">
        <summary className="cursor-pointer text-slate-700">Worauf beim Vergleich achten?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {fragen.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </details>
      <p className="mt-3 text-xs text-slate-500">
        Ihre Einträge sind nur über diesen Link sichtbar. Ihre Praxis sieht einen Eintrag erst, wenn Sie „mit meiner Praxis teilen“ anhaken.
      </p>
    </section>
  );
}
