"use client";

import { useState } from "react";
import { rahmen } from "@/lib/modelle/formen";
import { SCHNITTMODELLE, type SchnittId } from "@/lib/modelle/schnitt";
import { useZoom } from "./useZoom";
import { FARBE_GEWAEHLT, FARBE_MARKIERT, FormPfad, GewaehltLeiste, MODELL_HINWEIS, MarkierFeld, PraxisHinweis, Treffer, ZoomTasten, useMarkierungen, type Markierung } from "./ModellTeile";

/** Auge, Ohr oder Haut im Querschnitt: Teil antippen, Erklärung lesen, als Praxis für den Patienten markieren. */
export function SchnittModellAnsicht({ modell, markierungen = [], patientId, einspaltig = false }: { modell: SchnittId; markierungen?: Markierung[]; patientId?: string; einspaltig?: boolean }) {
  const m = SCHNITTMODELLE[modell];
  const marken = useMarkierungen(modell, markierungen, patientId);
  const [gewaehlt, setGewaehlt] = useState<string | null>(markierungen[0]?.teil ?? null);
  const [basis] = useState(() => ({ x: 0, y: 0, w: m.breite, h: m.hoehe }));
  const zoom = useZoom(basis, 6);
  const teil = m.teile.find((t) => t.id === gewaehlt) ?? null;
  const waehlen = (id: string, hinzoomen = false) => {
    setGewaehlt(id);
    const t = m.teile.find((x) => x.id === id);
    if (hinzoomen && t) zoom.zoomAuf(rahmen(t.formen), 2.2);
  };

  return (
    <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`} data-testid={`schnittmodell-${modell}`}>
      <div>
        <div className="relative overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA]">
          <ZoomTasten zoom={zoom} />
          {teil && <GewaehltLeiste titel={teil.name} zielId={`${modell}-erklaerung`} />}
          <svg ref={zoom.svgRef} viewBox={zoom.viewBox} {...zoom.ereignisse} className="mx-auto block h-[min(60vh,32rem)] w-full select-none" style={{ touchAction: zoom.touchAction }} role="group" aria-label={`${m.titel}: ${m.ansicht}`} data-testid="schnitt-svg">
            {m.teile.map((t) => {
              const an = gewaehlt === t.id, markiert = marken.istMarkiert(t.id);
              const c = markiert ? { flaeche: FARBE_MARKIERT.flaeche, rand: an ? "#5A1D1D" : FARBE_MARKIERT.rand } : an ? { flaeche: FARBE_GEWAEHLT.flaeche, rand: FARBE_GEWAEHLT.rand } : { flaeche: t.farbe, rand: t.rand };
              return (
                <g key={t.id} role="button" tabIndex={0} aria-label={`${t.name}${markiert ? ", markiert" : ""}`} aria-pressed={an} className="cursor-pointer outline-none focus-visible:[&_path]:stroke-[#1d4ed8]" data-teil={t.id} data-markiert={markiert || undefined}
                  onClick={() => { if (zoom.warKlick()) waehlen(t.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(t.id, true); } }}>
                  {t.formen.map((f, i) => <FormPfad key={i} form={f} flaeche={c.flaeche} rand={c.rand} randStaerke={an && markiert ? 2.6 : an || markiert ? 1.8 : 1} />)}
                  <Treffer formen={t.formen} mindest={14} />
                </g>
              );
            })}
            <g aria-hidden="true" fontSize={11} fill="#8b8378" textAnchor="middle" pointerEvents="none">
              {m.hinweise.map((h) => <text key={h.text} x={h.bei[0]} y={h.bei[1]}>{h.text}</text>)}
            </g>
          </svg>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{m.ansicht}. Antippen für die Erklärung, vergrößern mit + und − oder zwei Fingern.</p>
      </div>
      <div className="min-w-0">
        {marken.liste.length > 0 && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="modell-markierte">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{marken.bearbeitbar ? "Für diesen Patienten markiert" : "Von Ihrer Praxis markiert"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {marken.liste.map((x) => <button key={x.teil} type="button" onClick={() => waehlen(x.teil, true)} className="rounded-full bg-white px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300 hover:bg-orange-100" data-testid="modell-marke">{m.teile.find((t) => t.id === x.teil)?.name ?? x.teil}</button>)}
            </div>
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={`Teile: ${m.titel}`}>
          {[...m.teile].reverse().map((t) => (
            <button key={t.id} type="button" aria-pressed={gewaehlt === t.id} onClick={() => waehlen(t.id)} data-testid="schnitt-teil"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${gewaehlt === t.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: t.farbe }} />{t.name}
            </button>
          ))}
        </div>
        {teil ? (
          <section id={`${modell}-erklaerung`} className="card scroll-mt-4" aria-live="polite" data-testid="modell-erklaerung">
            <h3 className="text-lg font-semibold text-slate-900">{teil.name}</h3>
            {teil.latein && <p className="text-sm italic text-slate-500">{teil.latein}</p>}
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Was ist das?</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{teil.was}</p>
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Häufige Beschwerden</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{teil.beschwerden}</p>
            {!marken.bearbeitbar && <PraxisHinweis notiz={marken.notizVon(teil.id)} />}
            <MarkierFeld key={teil.id} teil={teil.id} marken={marken} platzhalter="Hinweis, z. B. „Rechtes Auge. Hier setzt die Behandlung an.“" />
          </section>
        ) : (
          <section className="card text-sm text-slate-600" data-testid="modell-erklaerung-leer">
            <h3 className="text-base font-semibold text-slate-900">So funktioniert das Modell</h3>
            <p className="mt-1">Tippen Sie im Bild oder in der Liste auf einen Teil. Sie sehen dann, was das ist und welche Beschwerden dort häufig vorkommen.</p>
          </section>
        )}
        <p className="mt-3 text-xs text-slate-500">{MODELL_HINWEIS}</p>
      </div>
    </div>
  );
}
