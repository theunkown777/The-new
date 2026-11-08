"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DENTAL_ID, SPECIALTY_LABELS, specialty } from "@/lib/specialties";
import type { CustomOffer } from "@/lib/proposals";

type Value = { specialty: string; medPrices: Record<string, number>; customOffers: CustomOffer[] };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "leistung";

export type KatalogVorschlag = { name: string; kategorie: string; kasse: boolean; kasseWenn?: string };

export function SpecialtySettings({ initial, readOnly = false, katalog = [] }: { initial: Value; readOnly?: boolean; katalog?: KatalogVorschlag[] }) {
  const [kq, setKq] = useState("");
  const router = useRouter();
  const [v, setV] = useState<Value>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spec = specialty(v.specialty);

  function setOffer(i: number, patch: Partial<CustomOffer>) {
    setV((s) => ({ ...s, customOffers: s.customOffers.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  }
  function addOffer() {
    const n = v.customOffers.length + 1;
    setV((s) => ({ ...s, customOffers: [...s.customOffers, { id: `l${Date.now().toString(36)}${n}`, anlass: "", name: "", price: 0 }] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const customOffers = v.customOffers
      .filter((c) => c.name.trim() && c.anlass.trim())
      .map((c) => ({
        ...c,
        id: c.id || slug(c.name),
        kasseWenn: c.kasseWenn?.trim() || undefined,
        nutzen: c.nutzen?.trim() || undefined,
        benefits: c.benefits?.filter(Boolean),
      }));
    const res = await fetch("/api/settings/specialty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialty: v.specialty, medPrices: v.medPrices, customOffers }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "Speichern fehlgeschlagen.");
    setMessage("Gespeichert. Neue Vorschläge nutzen ab sofort diese Einstellungen.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6" data-testid="specialty-settings">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      <fieldset disabled={readOnly} className="space-y-6">
        <div className="card space-y-2">
          <label className="label" htmlFor="fach">Fachgebiet der Praxis</label>
          <select id="fach" className="input" value={v.specialty} onChange={(e) => setV({ ...v, specialty: e.target.value })}>
            {Object.entries(SPECIALTY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {v.specialty === DENTAL_ID
              ? "Zahnschema, Festzuschuss, Mehrkostenvereinbarung und Befund-Diktat."
              : "Anlässe Ihres Fachs mit Kassenleistung zuerst und Selbstzahlerleistungen (IGeL) mit Hinweis, wann die Kasse zahlt, und ehrlicher Angabe zum Nutzen."}
          </p>
        </div>

        {spec && (
          <div className="card space-y-3">
            <h2 className="font-medium text-slate-900">Preise für {spec.kurz}</h2>
            <p className="text-sm text-slate-500">Beispielwerte im üblichen GOÄ-Rahmen. Tragen Sie Ihre Preise ein, so wie Sie sie Patienten nennen.</p>
            {spec.anlaesse.map((a) => (
              <div key={a.id} className="space-y-2">
                <h3 className="text-sm font-medium text-slate-700">{a.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {a.options.map((o) => (
                    <label key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        {o.name}
                        <span className="block text-xs text-slate-400">{o.type === "kasse" ? "Kassenleistung (Wert für Privatversicherte)" : "Selbstzahlerleistung"}</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="input w-24 text-right"
                        aria-label={`Preis ${o.name}`}
                        value={v.medPrices[o.id] ?? o.price}
                        onChange={(e) => setV({ ...v, medPrices: { ...v.medPrices, [o.id]: Number(e.target.value) } })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {v.specialty !== DENTAL_ID && (
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-slate-900">Eigene Leistungen</h2>
              <button type="button" className="btn btn-secondary" onClick={addOffer}>
                Leistung hinzufügen
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Für alles, was Ihr Fach anbietet und oben fehlt. Gleicher Anlass fasst Leistungen zu einer Auswahl zusammen, die Kassenleistung
              steht dabei immer oben.
            </p>
            {katalog.length > 0 && v.specialty === initial.specialty && (
              <details className="rounded-lg border border-salbei-200 bg-salbei-50 p-3" data-testid="katalog-uebernehmen">
                <summary className="cursor-pointer text-sm font-medium text-salbei-800">
                  Aus dem Leistungskatalog übernehmen ({katalog.filter((k) => !v.customOffers.some((c) => c.name === k.name)).length} Leistungen für Ihr Fach)
                </summary>
                <input className="input mt-2" placeholder="Leistung suchen" aria-label="Katalog durchsuchen" value={kq} onChange={(e) => setKq(e.target.value)} />
                <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
                  {katalog
                    .filter((k) => !v.customOffers.some((c) => c.name === k.name))
                    .filter((k) => !kq || `${k.name} ${k.kategorie}`.toLowerCase().includes(kq.toLowerCase()))
                    .map((k) => (
                      <li key={k.name} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1">
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {k.name} <span className="text-xs text-slate-500">· {k.kategorie} · {k.kasse ? "Kasse" : "Selbstzahler/Indikation"}</span>
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-brand-700 underline"
                          disabled={readOnly}
                          onClick={() =>
                            setV((s) => ({
                              ...s,
                              customOffers: [
                                ...s.customOffers,
                                { id: `k${Date.now().toString(36)}${s.customOffers.length}`, anlass: k.kategorie.slice(0, 80), name: k.name.slice(0, 120), price: 0, kasse: k.kasse, ...(k.kasseWenn ? { kasseWenn: k.kasseWenn.slice(0, 300) } : {}) },
                              ],
                            }))
                          }
                        >
                          übernehmen
                        </button>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">Übernommene Leistungen erscheinen unten; bitte Preis prüfen und speichern.</p>
              </details>
            )}
            {v.customOffers.length === 0 && <p className="text-sm text-slate-400">Noch keine eigenen Leistungen.</p>}
            {v.customOffers.map((c, i) => (
              <div key={c.id} className="space-y-2 rounded-lg border border-slate-200 p-3" data-testid="custom-offer">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem]">
                  <input className="input" placeholder="Anlass, z. B. Trockenes Auge" aria-label="Anlass" value={c.anlass} onChange={(e) => setOffer(i, { anlass: e.target.value })} />
                  <input className="input" placeholder="Leistung, z. B. Lidrandpflege" aria-label="Leistung" value={c.name} onChange={(e) => setOffer(i, { name: e.target.value })} />
                  <input className="input text-right" type="number" min={0} aria-label="Preis in Euro" value={c.price} onChange={(e) => setOffer(i, { price: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input" placeholder="Kasse zahlt, wenn … (optional)" aria-label="Kasse zahlt wenn" value={c.kasseWenn ?? ""} onChange={(e) => setOffer(i, { kasseWenn: e.target.value })} />
                  <input className="input" placeholder="Hinweis zum Nutzen (optional)" aria-label="Hinweis zum Nutzen" value={c.nutzen ?? ""} onChange={(e) => setOffer(i, { nutzen: e.target.value })} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!c.kasse} onChange={(e) => setOffer(i, { kasse: e.target.checked })} />
                    Kassenleistung
                  </label>
                  <button type="button" className="text-red-700 hover:underline" onClick={() => setV((s) => ({ ...s, customOffers: s.customOffers.filter((_, j) => j !== i) }))}>
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
      {!readOnly && (
        <button className="btn-primary" disabled={saving}>
          {saving ? "Speichern …" : "Speichern"}
        </button>
      )}
    </form>
  );
}
