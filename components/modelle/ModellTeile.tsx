"use client";

import { useState } from "react";
import type { Form } from "@/lib/modelle/formen";
import { useT } from "./Sprache";

export type Markierung = { teil: string; notiz: string; befund?: string | null };

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

  /** Eine oder mehrere Stellen mit demselben Hinweis markieren. befund: undefined = unverändert lassen, null = entfernen. */
  async function speichernViele(teile: string[], notiz: string, befund?: string | null): Promise<boolean> {
    if (!patientId || !teile.length) return false;
    setLaeuft(true); setFehler(null);
    const res = await fetch(`/api/patients/${patientId}/modell`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modell, teile, notiz, ...(befund !== undefined ? { befund } : {}) }) }).catch(() => null);
    setLaeuft(false);
    const d = await res?.json().catch(() => null);
    if (!res?.ok) { setFehler(d?.error ?? "Speichern fehlgeschlagen."); return false; }
    const neu: Markierung[] = d?.markierungen ?? teile.map((teil) => ({ teil, notiz: notiz.trim(), befund: befund ?? null }));
    setListe((l) => [...l.filter((m) => !teile.includes(m.teil)), ...neu]);
    return true;
  }
  const speichern = (teil: string, notiz: string, befund?: string | null) => speichernViele([teil], notiz, befund);
  const befundVon = (teil: string) => liste.find((m) => m.teil === teil)?.befund ?? null;
  async function entfernen(teil: string) {
    if (!patientId) return;
    setLaeuft(true); setFehler(null);
    const res = await fetch(`/api/patients/${patientId}/modell?modell=${modell}&teil=${encodeURIComponent(teil)}`, { method: "DELETE" }).catch(() => null);
    setLaeuft(false);
    if (!res?.ok) { setFehler("Entfernen fehlgeschlagen."); return; }
    setListe((l) => l.filter((m) => m.teil !== teil));
  }
  return { liste, notizVon, befundVon, istMarkiert, speichern, speichernViele, entfernen, laeuft, fehler, bearbeitbar: !!patientId };
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
  const t = useT();
  const taste = "flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-slate-700 shadow ring-1 ring-slate-200 hover:text-brand-700 disabled:opacity-40";
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5" data-testid="modell-zoom">
      <button type="button" className={taste} onClick={zoom.vergroessern} aria-label={t("Vergrößern")}>+</button>
      <button type="button" className={taste} onClick={zoom.verkleinern} disabled={!zoom.gezoomt} aria-label={t("Verkleinern")}>−</button>
      <button type="button" className={`${taste} text-sm`} onClick={zoom.zuruecksetzen} disabled={!zoom.gezoomt} aria-label={t("Ganz zeigen")} title={t("Ganz zeigen")}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
    </div>
  );
}

/** Praxisansicht: Teil für den Patienten markieren, mit kurzem Hinweis. Mit `befunde` (Gebiss) lässt sich der Befund für den Behandlungsvorschlag wählen. */
export function MarkierFeld({ teil, marken, platzhalter, befunde }: { teil: string; marken: ReturnType<typeof useMarkierungen>; platzhalter: string; befunde?: Record<string, string> }) {
  const vorhanden = marken.notizVon(teil);
  const [notiz, setNotiz] = useState(vorhanden ?? "");
  const [befund, setBefund] = useState(marken.befundVon(teil) ?? "");
  if (!marken.bearbeitbar) return null;
  return (
    <div className="mt-3 rounded-xl bg-brand-50 p-3" data-testid="modell-markieren">
      <label className="block text-xs font-medium text-brand-800" htmlFor={`notiz-${teil}`}>Für die Patientin oder den Patienten markieren</label>
      <textarea id={`notiz-${teil}`} className="input mt-1.5 text-sm" rows={2} maxLength={300} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder={platzhalter} />
      {befunde && (
        <label className="mt-2 block text-xs font-medium text-brand-800">
          Befund für den Behandlungsvorschlag (sieht nur die Praxis)
          <select className="input mt-1.5 text-sm" value={befund} onChange={(e) => setBefund(e.target.value)} data-testid="modell-befund">
            <option value="">kein Befund</option>
            {Object.entries(befunde).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select>
        </label>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-sm" disabled={marken.laeuft} onClick={() => marken.speichern(teil, notiz, befunde ? befund || null : undefined)} data-testid="modell-markieren-speichern">
          {vorhanden !== undefined ? (befunde ? "Änderung speichern" : "Hinweis ändern") : "Markieren"}
        </button>
        {vorhanden !== undefined && (
          <button type="button" className="btn-secondary text-sm" disabled={marken.laeuft} onClick={() => { marken.entfernen(teil); setNotiz(""); setBefund(""); }} data-testid="modell-markierung-entfernen">Markierung entfernen</button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Markierung und Hinweis erscheinen im Patientenlink (Patientenportal).</p>
      {marken.fehler && <p className="mt-1 text-xs text-red-700" role="alert">{marken.fehler}</p>}
    </div>
  );
}

/** Praxisansicht: mehrere Stellen auf einmal markieren. `gewaehlt` sind die im Modell angetippten Stellen. */
export function MehrfachFeld({ gewaehlt, marken, onFertig, onEntfernen, platzhalter, befunde, wort = "Stellen" }: {
  gewaehlt: { teil: string; name: string }[]; marken: ReturnType<typeof useMarkierungen>; onFertig: () => void; onEntfernen: (teil: string) => void; platzhalter: string;
  /** Befund-Auswahl, wenn sie für alle gewählten Stellen möglich ist (bleibende Zähne) */
  befunde?: Record<string, string>; wort?: string;
}) {
  const [notiz, setNotiz] = useState("");
  const [befund, setBefund] = useState("");
  return (
    <section className="card" data-testid="modell-mehrfach">
      <h3 className="text-lg font-semibold text-slate-900">Mehrere {wort} markieren</h3>
      <p className="mt-1 text-sm text-slate-600">Tippen Sie im Modell nacheinander alle {wort} an, die denselben Hinweis bekommen sollen. Noch einmal antippen nimmt eine Stelle wieder heraus.</p>
      <div className="mt-3 flex flex-wrap gap-1.5" data-testid="modell-mehrfach-auswahl">
        {gewaehlt.length === 0 && <span className="text-sm text-slate-500">Noch nichts gewählt.</span>}
        {gewaehlt.map((g) => (
          <button key={g.teil} type="button" onClick={() => onEntfernen(g.teil)} className="rounded-full bg-amber-100 px-3 py-1.5 text-sm text-amber-950 ring-1 ring-amber-300" aria-label={`${g.name} aus der Auswahl nehmen`}>{g.name} ✕</button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-medium text-brand-800" htmlFor="notiz-mehrfach">Hinweis für alle gewählten {wort}</label>
      <textarea id="notiz-mehrfach" className="input mt-1.5 text-sm" rows={2} maxLength={300} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder={platzhalter} />
      {befunde && (
        <label className="mt-2 block text-xs font-medium text-brand-800">
          Befund für den Behandlungsvorschlag (sieht nur die Praxis)
          <select className="input mt-1.5 text-sm" value={befund} onChange={(e) => setBefund(e.target.value)} data-testid="modell-mehrfach-befund">
            <option value="">kein Befund</option>
            {Object.entries(befunde).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select>
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-sm" disabled={marken.laeuft || gewaehlt.length === 0} data-testid="modell-mehrfach-speichern"
          onClick={async () => { if (await marken.speichernViele(gewaehlt.map((g) => g.teil), notiz, befunde ? befund || null : undefined)) onFertig(); }}>
          {gewaehlt.length > 1 ? `Alle ${gewaehlt.length} markieren` : "Markieren"}
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={onFertig}>Abbrechen</button>
      </div>
      {marken.fehler && <p className="mt-2 text-xs text-red-700" role="alert">{marken.fehler}</p>}
    </section>
  );
}

/** Patientenansicht: Hinweis der Praxis zu einem markierten Teil. */
export function PraxisHinweis({ notiz }: { notiz: string | undefined }) {
  const t = useT();
  if (notiz === undefined) return null;
  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950" data-testid="modell-praxishinweis">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{t("Von Ihrer Praxis markiert")}</p>
      <p className="mt-1">{notiz || t("Ihre Praxis hat diese Stelle für Sie markiert. Fragen Sie beim nächsten Termin gern nach.")}</p>
    </div>
  );
}

export const MODELL_HINWEIS = "Vereinfachte Darstellung zur Erklärung. Sie ersetzt keine Untersuchung und ist keine Diagnose.";

/** Am Handy steht die Erklärung unter dem Modell: Name des gewählten Teils im Bild einblenden, mit Sprung zur Erklärung. */
export function GewaehltLeiste({ titel, zielId }: { titel: string; zielId: string }) {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center lg:hidden" data-testid="modell-gewaehlt-leiste">
      <button type="button" onClick={() => document.getElementById(zielId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-white/95 py-2 pl-4 pr-3 text-sm shadow-lg ring-1 ring-slate-200">
        <span className="truncate font-medium text-slate-900">{titel}</span>
        <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">{t("Erklärung")} ↓</span>
      </button>
    </div>
  );
}
