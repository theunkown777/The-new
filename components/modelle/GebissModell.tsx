"use client";

import { useState } from "react";
import { rahmen } from "@/lib/modelle/formen";
import { GEBISS_BREITE, GEBISS_HOEHE, INSTRUMENTE, MILCHZAEHNE, MILCHZAHN_HINWEIS, SCHICHTEN, SCHNITT, ZAEHNE, ZAHNARTEN, zahnKennung, zahnNach, zahnTitel, type Material } from "@/lib/modelle/gebiss";
import { useZoom } from "./useZoom";
import { FARBE_GEWAEHLT, FARBE_MARKIERT, FormPfad, GewaehltLeiste, MODELL_HINWEIS, MarkierFeld, PraxisHinweis, Treffer, ZoomTasten, useMarkierungen, type Markierung } from "./ModellTeile";

const BASIS_BOGEN = { x: 0, y: 0, w: GEBISS_BREITE, h: GEBISS_HOEHE };
const BASIS_SCHNITT = { x: SCHNITT.x, y: SCHNITT.y, w: SCHNITT.b, h: SCHNITT.h };
const MATERIAL: Record<Material, { flaeche: string; rand: string }> = {
  metall: { flaeche: "#D3DADF", rand: "#6F7C84" },
  griff: { flaeche: "#8F9AA1", rand: "#4F5A61" },
  glas: { flaeche: "#E8F4F8", rand: "#7FA6B6" },
  licht: { flaeche: "#74B4F2", rand: "#3F86CC" },
  gummi: { flaeche: "#5E9C8F", rand: "#3A6E63" },
  schlauch: { flaeche: "#E4ECEF", rand: "#8798A0" },
  marke: { flaeche: "#39434A", rand: "#39434A" },
};
type Reiter = "zaehne" | "aufbau" | "instrumente";

/**
 * Gebiss-Modell: alle Zähne im Bogen, der Aufbau eines Zahns und die Instrumente der Praxis.
 * Mit patientId kann die Praxis Zähne für den Patienten markieren.
 */
export function GebissModell({ markierungen = [], patientId, start = "zaehne", einspaltig = false }: { markierungen?: Markierung[]; patientId?: string; start?: Reiter; einspaltig?: boolean }) {
  const marken = useMarkierungen("gebiss", markierungen, patientId);
  const [reiter, setReiter] = useState<Reiter>(start);
  const [fdi, setFdi] = useState<number | null>(markierungen[0] ? Number(markierungen[0].teil) : null);
  // Milchgebiss zeigen, wenn nur Milchzähne markiert sind
  const [milch, setMilch] = useState(() => markierungen.length > 0 && markierungen.every((x) => Number(x.teil) > 50));
  const zaehne = milch ? MILCHZAEHNE : ZAEHNE;
  const [schicht, setSchicht] = useState<string>("schmelz");
  const [instrument, setInstrument] = useState<string>(INSTRUMENTE[0].id);
  const zoomBogen = useZoom(BASIS_BOGEN, 6);
  const zoomSchnitt = useZoom(BASIS_SCHNITT, 5);
  const zahn = fdi ? zahnNach(fdi) : null;
  const gewaehlteSchicht = SCHICHTEN.find((s) => s.id === schicht) ?? SCHICHTEN[0];
  const gewaehltesInstrument = INSTRUMENTE.find((i) => i.id === instrument) ?? INSTRUMENTE[0];

  function zahnWaehlen(nr: number, hinzoomen = false) {
    setFdi(nr);
    const z = zahnNach(nr);
    if (z && !!z.milch !== milch) setMilch(!!z.milch);
    if (hinzoomen && z) zoomBogen.zoomAuf(rahmen([z.form]), 4);
  }

  const querschnitt = (mitInstrument: boolean) => {
    const hervor = mitInstrument ? gewaehltesInstrument.schicht : schicht;
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA]">
        <ZoomTasten zoom={zoomSchnitt} />
        <svg ref={zoomSchnitt.svgRef} viewBox={zoomSchnitt.viewBox} {...zoomSchnitt.ereignisse} className="mx-auto block h-[min(64vh,34rem)] w-full select-none" style={{ touchAction: zoomSchnitt.touchAction }}
          role="group" aria-label="Zahn im Querschnitt" data-testid="gebiss-schnitt">
          {SCHICHTEN.map((s) => {
            const an = hervor === s.id;
            return (
              <g key={s.id} role="button" tabIndex={mitInstrument ? -1 : 0} aria-label={s.name} aria-pressed={!mitInstrument && an} className="cursor-pointer outline-none" data-schicht={s.id}
                onClick={() => { if (zoomSchnitt.warKlick() && !mitInstrument) setSchicht(s.id); }}
                onKeyDown={(e) => { if (!mitInstrument && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSchicht(s.id); } }}>
                {s.formen.map((f, i) => <FormPfad key={i} form={f} flaeche={an && !mitInstrument ? FARBE_GEWAEHLT.flaeche : s.farbe} rand={an && !mitInstrument ? FARBE_GEWAEHLT.rand : s.rand} randStaerke={an ? 2 : 1.1} />)}
                {!mitInstrument && <Treffer formen={s.formen} mindest={14} />}
              </g>
            );
          })}
          {mitInstrument && (
            <g key={gewaehltesInstrument.id} transform={`translate(${gewaehltesInstrument.ziel[0]} ${gewaehltesInstrument.ziel[1]}) rotate(${gewaehltesInstrument.winkel})`} data-testid="gebiss-instrument" data-instrument={gewaehltesInstrument.id} pointerEvents="none">
              <g className="modell-instrument">
                {gewaehltesInstrument.formen.map((f, i) => <FormPfad key={i} form={f} flaeche={MATERIAL[f.material].flaeche} rand={MATERIAL[f.material].rand} randStaerke={1.1} deckkraft={f.material === "licht" ? 0.75 : 1} />)}
              </g>
            </g>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div data-testid="gebissmodell">
      <div className="mb-3 inline-flex max-w-full flex-wrap rounded-2xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="Ansicht des Gebiss-Modells">
        {([["zaehne", "Alle Zähne"], ["aufbau", "Aufbau eines Zahns"], ["instrumente", "Instrumente"]] as [Reiter, string][]).map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={reiter === id} onClick={() => setReiter(id)} data-testid={`gebiss-reiter-${id}`}
            className={`rounded-xl px-3.5 py-2 ${reiter === id ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{name}</button>
        ))}
      </div>

      {reiter === "zaehne" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            <div className="mb-2 inline-flex rounded-full bg-slate-100 p-1 text-sm" role="group" aria-label="Gebiss">
              {([[false, "Bleibende Zähne (32)"], [true, "Milchzähne (20)"]] as const).map(([wert, name]) => (
                <button key={name} type="button" aria-pressed={milch === wert} onClick={() => { setMilch(wert); setFdi(null); zoomBogen.zuruecksetzen(); }} data-testid={wert ? "gebiss-milch" : "gebiss-bleibend"}
                  className={`rounded-full px-3.5 py-1.5 ${milch === wert ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{name}</button>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA]">
              <ZoomTasten zoom={zoomBogen} />
              {zahn && <GewaehltLeiste titel={`Zahn ${zahn.fdi}: ${zahn.name}`} zielId="gebiss-erklaerung" />}
              <svg ref={zoomBogen.svgRef} viewBox={zoomBogen.viewBox} {...zoomBogen.ereignisse} className="mx-auto block h-[min(70vh,40rem)] w-full select-none" style={{ touchAction: zoomBogen.touchAction }}
                role="group" aria-label="Gebiss von oben gesehen, Oberkiefer oben, Unterkiefer unten" data-testid="gebiss-svg">
                <g aria-hidden="true" fontSize={12} fill="#8b8378" textAnchor="middle">
                  <text x={200} y={236}>Oberkiefer</text>
                  <text x={200} y={338}>Unterkiefer</text>
                  <text x={30} y={290} fontSize={11}>rechts</text>
                  <text x={370} y={290} fontSize={11}>links</text>
                </g>
                {zaehne.map((z) => {
                  const k = zahnKennung(z.fdi);
                  const an = fdi === z.fdi, markiert = marken.istMarkiert(k);
                  const c = markiert ? { ...FARBE_MARKIERT, rand: an ? "#5A1D1D" : FARBE_MARKIERT.rand } : an ? FARBE_GEWAEHLT : { flaeche: "#FFFDF6", rand: "#A2946F" };
                  return (
                    <g key={z.fdi} role="button" tabIndex={0} aria-label={`Zahn ${z.fdi}, ${z.name}${markiert ? ", markiert" : ""}`} aria-pressed={an} className="cursor-pointer outline-none focus-visible:[&_path]:stroke-[#1d4ed8]"
                      data-zahn={z.fdi} data-markiert={markiert || undefined}
                      onClick={() => { if (zoomBogen.warKlick()) zahnWaehlen(z.fdi); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zahnWaehlen(z.fdi, true); } }}>
                      <FormPfad form={z.form} flaeche={c.flaeche} rand={c.rand} randStaerke={an && markiert ? 3 : an || markiert ? 2 : 1.2} />
                      <g pointerEvents="none">{z.relief.map((r, i) => <FormPfad key={i} form={r} flaeche={an || markiert ? c.rand : "#CFC3A2"} rand={an || markiert ? c.rand : "#CFC3A2"} randStaerke={0.2} />)}</g>
                      <text x={z.nummerBei[0]} y={z.nummerBei[1] + 3.5} fontSize={10} textAnchor="middle" fill={an || markiert ? c.rand : "#6b6457"} fontWeight={an || markiert ? 700 : 400} pointerEvents="none">{z.fdi}</text>
                      <Treffer formen={[z.form]} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Zahn antippen für die Erklärung. Die Nummern folgen dem Zahnschema der Praxis: Wie beim Blick in den Mund liegt Ihre rechte Seite links im Bild.</p>
          </div>
          <div className="min-w-0">
            {marken.liste.length > 0 && (
              <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="modell-markierte">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{marken.bearbeitbar ? "Für diesen Patienten markiert" : "Von Ihrer Praxis markiert"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...marken.liste].sort((a, b) => Number(a.teil) - Number(b.teil)).map((m) => (
                    <button key={m.teil} type="button" onClick={() => zahnWaehlen(Number(m.teil), true)} className="rounded-full bg-white px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300 hover:bg-orange-100" data-testid="modell-marke">Zahn {m.teil}</button>
                  ))}
                </div>
              </div>
            )}
            {zahn ? (
              <section id="gebiss-erklaerung" className="card scroll-mt-4" aria-live="polite" data-testid="modell-erklaerung">
                <h3 className="text-lg font-semibold text-slate-900">Zahn {zahn.fdi}</h3>
                <p className="text-sm text-slate-600">{zahn.name}</p>
                <span className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-800">{zahn.milch ? "Milchzahn" : ZAHNARTEN[zahn.art].name}</span>
                <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Aufgabe</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{ZAHNARTEN[zahn.art].aufgabe}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{zahn.milch ? "Kommt und geht" : "Bricht durch"}</dt><dd className="mt-0.5 text-slate-800">{zahn.durchbruch}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wurzeln</dt><dd className="mt-0.5 text-slate-800">{zahn.wurzeln}</dd></div>
                </dl>
                <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{zahn.milch ? "Gut zu wissen" : "Häufige Probleme und Behandlungen"}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{zahn.milch ? MILCHZAHN_HINWEIS : ZAHNARTEN[zahn.art].typisch}</p>
                {!marken.bearbeitbar && <PraxisHinweis notiz={marken.notizVon(zahnKennung(zahn.fdi))} />}
                <MarkierFeld key={zahn.fdi} teil={zahnKennung(zahn.fdi)} marken={marken} platzhalter="Hinweis, z. B. „Hier ist die Füllung geplant.“" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={() => zahnWaehlen(zahn.fdi, true)}>Im Modell zeigen</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => setReiter("aufbau")}>Aufbau eines Zahns ansehen</button>
                </div>
              </section>
            ) : (
              <section className="card text-sm text-slate-600" data-testid="modell-erklaerung-leer">
                <h3 className="text-base font-semibold text-slate-900">So funktioniert das Modell</h3>
                <p className="mt-1">Tippen Sie auf einen Zahn. Sie sehen dann, wie er heißt, wozu er dient und welche Behandlungen dort häufig sind. Unter „Instrumente“ sehen Sie, womit in der Praxis gearbeitet wird.</p>
              </section>
            )}
            <p className="mt-3 text-xs text-slate-500">{MODELL_HINWEIS}</p>
          </div>
        </div>
      )}

      {reiter === "aufbau" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            {querschnitt(false)}
            <p className="mt-1.5 text-xs text-slate-500">Backenzahn im Längsschnitt. Schicht antippen für die Erklärung.</p>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Schichten des Zahns">
              {[...SCHICHTEN].reverse().map((s) => (
                <button key={s.id} type="button" aria-pressed={schicht === s.id} onClick={() => setSchicht(s.id)} data-testid="gebiss-schicht"
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${schicht === s.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: s.farbe }} />{s.name}
                </button>
              ))}
            </div>
            <section className="card" aria-live="polite" data-testid="modell-erklaerung">
              <h3 className="text-lg font-semibold text-slate-900">{gewaehlteSchicht.name}</h3>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Was ist das?</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehlteSchicht.was}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Wenn hier etwas nicht stimmt</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehlteSchicht.wennKrank}</p>
            </section>
            <p className="mt-3 text-xs text-slate-500">{MODELL_HINWEIS}</p>
          </div>
        </div>
      )}

      {reiter === "instrumente" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            {querschnitt(true)}
            <p className="mt-1.5 text-xs text-slate-500">Das gewählte Instrument ist dort eingezeichnet, wo es am Zahn arbeitet.</p>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Instrumente">
              {INSTRUMENTE.map((i) => (
                <button key={i.id} type="button" aria-pressed={instrument === i.id} onClick={() => setInstrument(i.id)} data-testid="gebiss-instrument-wahl"
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 ${instrument === i.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>{i.name}</button>
              ))}
            </div>
            <section className="card" aria-live="polite" data-testid="modell-erklaerung">
              <h3 className="text-lg font-semibold text-slate-900">{gewaehltesInstrument.name}</h3>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Wofür ist es da?</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehltesInstrument.wofuer}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">So fühlt es sich an</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehltesInstrument.gefuehl}</p>
            </section>
            <p className="mt-3 text-xs text-slate-500">{MODELL_HINWEIS}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { zahnTitel };
