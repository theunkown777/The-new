"use client";

import { useState } from "react";
import type { Form } from "@/lib/modelle/formen";

export type Markierung = { teil: string; notiz: string };

/** Farben für gewählte und von der Praxis markierte Teile (in beiden Modellen gleich). */
export const FARBE_GEWAEHLT = { flaeche: "#F9D56B", rand: "#8A6410" };
export const FARBE_MARKIERT = { flaeche: "#F28B45", rand: "#A8470E" };

/** Markierungen eines Patienten laden, speichern und entfernen (nur in der Praxisansicht mit patientId). */
export function useMarkierungen(modell: "gebiss" | "koerper" | "auge" | "ohr" | "haut", start: Markierung[], patientId?: string) {
  const [liste, setListe] = useState<Markierung[]>(start);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const notizVon = (teil: string) => liste.find((m) => m.teil === teil)?.notiz;
  const istMarkiert = (teil: string) => liste.some((m) => m.teil === teil);

  async function speichern(teil: string, notiz: string) {
    if (!patientId) return;
    setLaeuft(true); setFehler(null);
    const res = await fetch(`/api/patients/${patientId}/modell`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modell, teil, notiz }) }).catch(() => null);
    setLaeuft(false);
    if (!res?.ok) { setFehler((await res?.json().catch(() => null))?.error ?? "Speichern fehlgeschlagen."); return; }
    setListe((l) => [...l.filter((m) => m.teil !== teil), { teil, notiz: notiz.trim() }]);
  }
  async function entfernen(teil: string) {
    if (!patientId) return;
    setLaeuft(true); setFehler(null);
    const res = await fetch(`/api/patients/${patientId}/modell?modell=${modell}&teil=${encodeURIComponent(teil)}`, { method: "DELETE" }).catch(() => null);
    setLaeuft(false);
    if (!res?.ok) { setFehler("Entfernen fehlgeschlagen."); return; }
    setListe((l) => l.filter((m) => m.teil !== teil));
  }
  return { liste, notizVon, istMarkiert, speichern, entfernen, laeuft, fehler, bearbeitbar: !!patientId };
}

/** Eine Form zeichnen: Fläche oder Strich. Striche bekommen einen dunkleren Rand darunter, damit sie sich abheben. */
export function FormPfad({ form, flaeche, rand, randStaerke = 1, deckkraft = 1, gestrichelt = false }: { form: Form; flaeche: string; rand: string; randStaerke?: number; deckkraft?: number; gestrichelt?: boolean }) {
  if (form.strich) {
    return (
      <>
        <path d={form.d} fill="none" stroke={rand} strokeWidth={form.strich + randStaerke * 1.6} strokeLinecap="round" strokeLinejoin="round" opacity={deckkraft} strokeDasharray={gestrichelt ? "4 5" : undefined} />
        <path d={form.d} fill="none" stroke={flaeche} strokeWidth={Math.max(0.8, form.strich - randStaerke * 0.4)} strokeLinecap="round" strokeLinejoin="round" opacity={deckkraft} strokeDasharray={gestrichelt ? "4 5" : undefined} />
      </>
    );
  }
  return <path d={form.d} fill={flaeche} fillOpacity={deckkraft} stroke={rand} strokeWidth={randStaerke} strokeLinejoin="round" strokeDasharray={gestrichelt ? "3 2.5" : undefined} />;
}

/** Unsichtbare, breitere Trefferfläche: dünne Sehnen und kleine Zähne lassen sich so auch mit dem Finger treffen. */
export function Treffer({ formen, mindest = 14 }: { formen: Form[]; mindest?: number }) {
  return (
    <>
      {formen.map((f, i) => f.strich
        ? <path key={i} d={f.d} fill="none" stroke="transparent" strokeWidth={Math.max(mindest, f.strich + 8)} strokeLinecap="round" pointerEvents="stroke" />
        : <path key={i} d={f.d} fill="transparent" stroke="transparent" strokeWidth={6} pointerEvents="all" />)}
    </>
  );
}

export function ZoomTasten({ zoom }: { zoom: { vergroessern: () => void; verkleinern: () => void; zuruecksetzen: () => void; gezoomt: boolean } }) {
  const taste = "flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-slate-700 shadow ring-1 ring-slate-200 hover:text-brand-700 disabled:opacity-40";
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5" data-testid="modell-zoom">
      <button type="button" className={taste} onClick={zoom.vergroessern} aria-label="Vergrößern">+</button>
      <button type="button" className={taste} onClick={zoom.verkleinern} disabled={!zoom.gezoomt} aria-label="Verkleinern">−</button>
      <button type="button" className={`${taste} text-sm`} onClick={zoom.zuruecksetzen} disabled={!zoom.gezoomt} aria-label="Ganz zeigen" title="Ganz zeigen">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
    </div>
  );
}

/** Praxisansicht: Teil für den Patienten markieren, mit kurzem Hinweis. */
export function MarkierFeld({ teil, marken, platzhalter }: { teil: string; marken: ReturnType<typeof useMarkierungen>; platzhalter: string }) {
  const vorhanden = marken.notizVon(teil);
  const [notiz, setNotiz] = useState(vorhanden ?? "");
  if (!marken.bearbeitbar) return null;
  return (
    <div className="mt-3 rounded-xl bg-brand-50 p-3" data-testid="modell-markieren">
      <label className="block text-xs font-medium text-brand-800" htmlFor={`notiz-${teil}`}>Für die Patientin oder den Patienten markieren</label>
      <textarea id={`notiz-${teil}`} className="input mt-1.5 text-sm" rows={2} maxLength={300} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder={platzhalter} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-sm" disabled={marken.laeuft} onClick={() => marken.speichern(teil, notiz)} data-testid="modell-markieren-speichern">
          {vorhanden !== undefined ? "Hinweis ändern" : "Markieren"}
        </button>
        {vorhanden !== undefined && (
          <button type="button" className="btn-secondary text-sm" disabled={marken.laeuft} onClick={() => { marken.entfernen(teil); setNotiz(""); }} data-testid="modell-markierung-entfernen">Markierung entfernen</button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Markierung und Hinweis erscheinen im Patientenlink (Patientenportal).</p>
      {marken.fehler && <p className="mt-1 text-xs text-red-700" role="alert">{marken.fehler}</p>}
    </div>
  );
}

/** Patientenansicht: Hinweis der Praxis zu einem markierten Teil. */
export function PraxisHinweis({ notiz }: { notiz: string | undefined }) {
  if (notiz === undefined) return null;
  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950" data-testid="modell-praxishinweis">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Von Ihrer Praxis markiert</p>
      <p className="mt-1">{notiz || "Ihre Praxis hat diese Stelle für Sie markiert. Fragen Sie beim nächsten Termin gern nach."}</p>
    </div>
  );
}

export const MODELL_HINWEIS = "Vereinfachte Darstellung zur Erklärung. Sie ersetzt keine Untersuchung und ist keine Diagnose.";

/** Am Handy steht die Erklärung unter dem Modell: Name des gewählten Teils im Bild einblenden, mit Sprung zur Erklärung. */
export function GewaehltLeiste({ titel, zielId }: { titel: string; zielId: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center lg:hidden" data-testid="modell-gewaehlt-leiste">
      <button type="button" onClick={() => document.getElementById(zielId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-white/95 py-2 pl-4 pr-3 text-sm shadow-lg ring-1 ring-slate-200">
        <span className="truncate font-medium text-slate-900">{titel}</span>
        <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">Erklärung ↓</span>
      </button>
    </div>
  );
}
