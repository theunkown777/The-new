"use client";

import { useCallback, useRef, useState } from "react";
import { rahmen } from "@/lib/modelle/formen";
import { GEBISS_BREITE, GEBISS_HOEHE, INSTRUMENTE, MILCHZAEHNE, MILCHZAHN_HINWEIS, SCHICHTEN, SCHNITT, ZAEHNE, ZAHNARTEN, zahnKennung, zahnNach, zahnTitel, type Material } from "@/lib/modelle/gebiss";
import { useZoom } from "./useZoom";
import { useT } from "./Sprache";
import { Modell3D, type Modell3DGriff } from "./drei/Modell3D";
import { gebissBauplan } from "./drei/gebissBau";
import { scheibeBauplan } from "./drei/scheibeBau";
import { MUND_OFFEN, inDenMund, mundBauplan, vorDasGesicht } from "./drei/mundBau";
import { ANATOMIE_PFAD, ANATOMIE_QUELLE } from "@/lib/modelle/drei/anatomie";
import { MUND_HINWEIS, mundTeil } from "@/lib/modelle/mund";
import { DreiSchalter, DREI_HINWEIS } from "./drei/Schalter";
import { FARBE_GEWAEHLT, FARBE_MARKIERT, FormPfad, GewaehltLeiste, MODELL_HINWEIS, MarkierFeld, MehrfachFeld, PraxisHinweis, Treffer, ZoomTasten, useMarkierungen, type Markierung } from "./ModellTeile";

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
export function GebissModell({ markierungen = [], patientId, start = "zaehne", einspaltig = false, befunde }: { markierungen?: Markierung[]; patientId?: string; start?: Reiter; einspaltig?: boolean; befunde?: Record<string, string> }) {
  const marken = useMarkierungen("gebiss", markierungen, patientId);
  const t = useT();
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
  // Räumliches Gebiss (360 Grad drehbar, Mund öffnen und schließen); ohne WebGL die Schemazeichnung
  const [raum, setRaum] = useState(true);
  const [offen, setOffen] = useState(true);
  const [wurzeln, setWurzeln] = useState(false);
  const griff = useRef<Modell3DGriff | null>(null);
  // Bleibende Zähne: echter Mund mit Gesicht und Fahrt hinein; Milchzähne: nachgebildetes Gebiss
  const plan = useCallback((T: Parameters<typeof gebissBauplan>[0], h: { verbinde: Parameters<typeof gebissBauplan>[1] }) => (milch ? gebissBauplan(T, h.verbinde) : mundBauplan(T)), [milch]);
  const [mundTeilId, setMundTeilId] = useState<string | null>(null);
  const [gesicht, setGesicht] = useState(true);
  const [raumSchnitt, setRaumSchnitt] = useState(true);
  const griffSchnitt = useRef<Modell3DGriff | null>(null);
  const planSchnitt = useCallback((T: Parameters<typeof scheibeBauplan>[0]) => scheibeBauplan(T, SCHICHTEN.map((x) => ({ id: x.id, farbe: x.farbe, formen: x.formen })), SCHNITT.b, SCHNITT.h, [SCHNITT.x, SCHNITT.y]), []);
  const immer = useCallback(() => true, []);
  const sichtbar3D = useCallback((d: Record<string, unknown>) => (milch ? (d.gruppe !== "milch" ? false : d.fleisch && wurzeln ? 0.22 : true) : d.fleisch && wurzeln ? 0.22 : true), [milch, wurzeln]);

  // Mehrere Zähne auf einmal markieren (nur Praxisansicht)
  const [mehrfach, setMehrfach] = useState(false);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const bleibend = (nr: number) => nr < 50;
  const zumVorschlag = marken.liste.filter((m) => bleibend(Number(m.teil)));
  const gewaehlteSchicht = SCHICHTEN.find((s) => s.id === schicht) ?? SCHICHTEN[0];
  const gewaehltesInstrument = INSTRUMENTE.find((i) => i.id === instrument) ?? INSTRUMENTE[0];

  function zahnWaehlen(nr: number, hinzoomen = false) {
    if (mehrfach && !hinzoomen) { setAuswahl((a) => (a.includes(nr) ? a.filter((x) => x !== nr) : [...a, nr])); return; }
    setFdi(nr); setMundTeilId(null);
    const z = zahnNach(nr);
    if (z && !!z.milch !== milch) setMilch(!!z.milch);
    // Im echten Mund: Gesicht ausblenden und Mund öffnen, damit der Zahn zu sehen ist
    const b = griff.current?.buehne();
    if (b && !milch && hinzoomen) { b.gesicht(0); b.klappen(MUND_OFFEN); setGesicht(false); setOffen(true); }
    if (hinzoomen && z && raum) window.setTimeout(() => griff.current?.fliegeZu(zahnKennung(nr)), 80);
    else if (hinzoomen && z) zoomBogen.zoomAuf(rahmen([z.form]), 4);
  }

  const querschnitt = (mitInstrument: boolean) => {
    const hervor = mitInstrument ? gewaehltesInstrument.schicht : schicht;
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA]">
        <ZoomTasten zoom={zoomSchnitt} />
        <svg ref={zoomSchnitt.svgRef} viewBox={zoomSchnitt.viewBox} {...zoomSchnitt.ereignisse} className="mx-auto block h-[min(64vh,34rem)] w-full select-none" style={{ touchAction: zoomSchnitt.touchAction }}
          role="group" aria-label={t("Zahn im Querschnitt")} data-testid="gebiss-schnitt">
          {SCHICHTEN.map((s) => {
            const an = hervor === s.id;
            return (
              <g key={s.id} role="button" tabIndex={mitInstrument ? -1 : 0} aria-label={t(s.name)} aria-pressed={!mitInstrument && an} className="cursor-pointer outline-none" data-schicht={s.id}
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
      <div className="mb-3 inline-flex max-w-full flex-wrap rounded-2xl bg-slate-100 p-1 text-sm" role="tablist" aria-label={t("Ansicht")}>
        {([["zaehne", "Alle Zähne"], ["aufbau", "Aufbau eines Zahns"], ["instrumente", "Instrumente"]] as [Reiter, string][]).map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={reiter === id} onClick={() => setReiter(id)} data-testid={`gebiss-reiter-${id}`}
            className={`rounded-xl px-3.5 py-2 ${reiter === id ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{t(name)}</button>
        ))}
      </div>

      {reiter === "zaehne" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            <div className="mb-2 inline-flex rounded-full bg-slate-100 p-1 text-sm" role="group" aria-label={t("Gebiss")}>
              {([[false, "Bleibende Zähne (32)"], [true, "Milchzähne (20)"]] as const).map(([wert, name]) => (
                <button key={name} type="button" aria-pressed={milch === wert} onClick={() => { setMilch(wert); setFdi(null); setAuswahl([]); zoomBogen.zuruecksetzen(); }} data-testid={wert ? "gebiss-milch" : "gebiss-bleibend"}
                  className={`rounded-full px-3.5 py-1.5 ${milch === wert ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{t(name)}</button>
              ))}
            </div>
            <div className={`relative overflow-hidden rounded-2xl ring-1 ring-[#E9E2DA] ${raum ? "modell-buehne" : "bg-[#FBF7F1]"}`}>
              <DreiSchalter raum={raum} setRaum={setRaum} />
              <ZoomTasten zoom={raum ? { vergroessern: () => griff.current?.zoom(0.72), verkleinern: () => griff.current?.zoom(1.38), zuruecksetzen: () => griff.current?.zuruecksetzen(), gezoomt: true } : zoomBogen} />
              {zahn && !mehrfach && <GewaehltLeiste titel={`${t("Zahn {nr}", { nr: zahn.fdi })}: ${t(zahn.name)}`} zielId="gebiss-erklaerung" />}
              {raum && (
                <>
                  <Modell3D ref={griff} plan={plan} schluessel={milch ? "gebiss-milch" : "mund"} beschriftung={t("Gebiss")} hoehe="h-[min(70vh,40rem)]"
                    gewaehlt={mehrfach ? auswahl.map(zahnKennung) : fdi ? [zahnKennung(fdi)] : mundTeilId ? [mundTeilId] : []} markiert={marken.liste.map((m) => m.teil)}
                    sichtbar={sichtbar3D} sichtbarSchluessel={`${milch}|${wurzeln}`} quelle={milch ? undefined : ANATOMIE_QUELLE} poster={milch ? undefined : `${ANATOMIE_PFAD}/vorschau/gesicht.webp`}
                    onBereit={(b) => { if (!milch) { setGesicht(true); inDenMund(b, () => { setGesicht(false); setOffen(true); }); } }}
                    onWahl={(k) => { if (/^\d\d$/.test(k)) zahnWaehlen(Number(k)); else if (!mehrfach && mundTeil(k)) { setFdi(null); setMundTeilId(k); } }} ohne3D={() => setRaum(false)} />
                  <div className="absolute left-2 top-12 z-10 flex flex-col items-start gap-1.5 text-xs">
                    {!milch && <button type="button" className="rounded-full bg-white/90 px-3 py-1.5 text-slate-700 shadow ring-1 ring-slate-200" onClick={() => { const b = griff.current?.buehne(); if (!b) return; if (gesicht) { inDenMund(b, () => { setGesicht(false); setOffen(true); }); } else { vorDasGesicht(b); setGesicht(true); setOffen(false); } }} data-testid="gebiss-gesicht">{gesicht ? t("In den Mund fahren") : t("Gesicht zeigen")}</button>}
                    <button type="button" className="rounded-full bg-white/90 px-3 py-1.5 text-slate-700 shadow ring-1 ring-slate-200" aria-pressed={offen} onClick={() => { griff.current?.klappen(offen ? 0 : milch ? 0.3 : MUND_OFFEN); setOffen(!offen); }} data-testid="gebiss-mund">{offen ? t("Mund schließen") : t("Mund öffnen")}</button>
                    <button type="button" className="rounded-full bg-white/90 px-3 py-1.5 text-slate-700 shadow ring-1 ring-slate-200" aria-pressed={wurzeln} onClick={() => setWurzeln(!wurzeln)} data-testid="gebiss-wurzeln">{wurzeln ? t("Zahnfleisch zeigen") : t("Wurzeln zeigen")}</button>
                  </div>
                </>
              )}
              {!raum && <svg ref={zoomBogen.svgRef} viewBox={zoomBogen.viewBox} {...zoomBogen.ereignisse} className="mx-auto block h-[min(70vh,40rem)] w-full select-none" style={{ touchAction: zoomBogen.touchAction }}
                role="group" aria-label={t("Gebiss von oben gesehen, Oberkiefer oben, Unterkiefer unten")} data-testid="gebiss-svg">
                <g aria-hidden="true" fontSize={12} fill="#8b8378" textAnchor="middle">
                  <text x={200} y={236}>{t("Oberkiefer")}</text>
                  <text x={200} y={338}>{t("Unterkiefer")}</text>
                  <text x={30} y={290} fontSize={11}>{t("rechts")}</text>
                  <text x={370} y={290} fontSize={11}>{t("links")}</text>
                </g>
                {zaehne.map((z) => {
                  const k = zahnKennung(z.fdi);
                  const an = mehrfach ? auswahl.includes(z.fdi) : fdi === z.fdi, markiert = marken.istMarkiert(k);
                  const c = markiert ? { ...FARBE_MARKIERT, rand: an ? "#5A1D1D" : FARBE_MARKIERT.rand } : an ? FARBE_GEWAEHLT : { flaeche: "#FFFDF6", rand: "#A2946F" };
                  return (
                    <g key={z.fdi} role="button" tabIndex={0} aria-label={`${t("Zahn {nr}", { nr: z.fdi })}, ${t(z.name)}${markiert ? `, ${t("markiert")}` : ""}`} aria-pressed={an} className="cursor-pointer outline-none focus-visible:[&_path]:stroke-[#1d4ed8]"
                      data-zahn={z.fdi} data-markiert={markiert || undefined} data-gewaehlt={(mehrfach && an) || undefined}
                      onClick={() => { if (zoomBogen.warKlick()) zahnWaehlen(z.fdi); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zahnWaehlen(z.fdi, true); } }}>
                      <FormPfad form={z.form} flaeche={c.flaeche} rand={c.rand} randStaerke={an && markiert ? 3 : an || markiert ? 2 : 1.2} />
                      <g pointerEvents="none">{z.relief.map((r, i) => <FormPfad key={i} form={r} flaeche={an || markiert ? c.rand : "#CFC3A2"} rand={an || markiert ? c.rand : "#CFC3A2"} randStaerke={0.2} />)}</g>
                      <text x={z.nummerBei[0]} y={z.nummerBei[1] + 3.5} fontSize={10} textAnchor="middle" fill={an || markiert ? c.rand : "#6b6457"} fontWeight={an || markiert ? 700 : 400} pointerEvents="none">{z.fdi}</text>
                      <Treffer formen={[z.form]} />
                    </g>
                  );
                })}
              </svg>}
            </div>
            {raum && !milch && <p className="mt-1.5 text-xs text-slate-500">{t(MUND_HINWEIS)}</p>}
            <p className="mt-1.5 text-xs text-slate-500">{raum ? t(DREI_HINWEIS) : t("Zahn antippen für die Erklärung. Die Nummern folgen dem Zahnschema der Praxis: Wie beim Blick in den Mund liegt Ihre rechte Seite links im Bild.")}</p>
          </div>
          <div className="min-w-0">
            {marken.liste.length > 0 && (
              <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="modell-markierte">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{marken.bearbeitbar ? "Für diesen Patienten markiert" : t("Von Ihrer Praxis markiert")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...marken.liste].sort((a, b) => Number(a.teil) - Number(b.teil)).map((m) => (
                    <button key={m.teil} type="button" onClick={() => zahnWaehlen(Number(m.teil), true)} className="rounded-full bg-white px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300 hover:bg-orange-100" data-testid="modell-marke">{t("Zahn {nr}", { nr: m.teil })}</button>
                  ))}
                </div>
              </div>
            )}
            {marken.bearbeitbar && !mehrfach && (
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <button type="button" className="btn-secondary text-sm" onClick={() => { setMehrfach(true); setAuswahl([]); }} data-testid="modell-mehrfach-start">Mehrere Zähne auf einmal markieren</button>
                {zumVorschlag.length > 0 && (
                  <a href={`/proposals/new?patientId=${patientId}&modell=1`} className="font-medium text-brand-700 hover:underline" data-testid="modell-zum-vorschlag">
                    Behandlungsvorschlag aus {zumVorschlag.length === 1 ? "dem markierten Zahn" : `den ${zumVorschlag.length} markierten Zähnen`} →
                  </a>
                )}
              </div>
            )}
            {mehrfach ? (
              <MehrfachFeld
                wort="Zähne"
                gewaehlt={[...auswahl].sort((a, b) => a - b).map((nr) => ({ teil: zahnKennung(nr), name: `Zahn ${nr}` }))}
                marken={marken}
                befunde={befunde && auswahl.every(bleibend) ? befunde : undefined}
                platzhalter="Hinweis, z. B. „Hier sind die Füllungen geplant.“"
                onEntfernen={(teil) => setAuswahl((a) => a.filter((x) => zahnKennung(x) !== teil))}
                onFertig={() => { setMehrfach(false); setAuswahl([]); }}
              />
            ) : mundTeilId && mundTeil(mundTeilId) ? (
              <section className="card" aria-live="polite" data-testid="modell-erklaerung">
                <h3 className="text-lg font-semibold text-slate-900">{t(mundTeil(mundTeilId)!.name)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(mundTeil(mundTeilId)!.was)}</p>
                <p className="mt-2 text-xs text-slate-500">{t("Zum Markieren für den Patienten bitte einen Zahn antippen.")}</p>
              </section>
            ) : zahn ? (
              <section id="gebiss-erklaerung" className="card scroll-mt-4" aria-live="polite" data-testid="modell-erklaerung">
                <h3 className="text-lg font-semibold text-slate-900">{t("Zahn {nr}", { nr: zahn.fdi })}</h3>
                <p className="text-sm text-slate-600">{t(zahn.name)}</p>
                <span className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-800">{zahn.milch ? t("Milchzahn") : t(ZAHNARTEN[zahn.art].name)}</span>
                <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Aufgabe")}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(ZAHNARTEN[zahn.art].aufgabe)}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{zahn.milch ? t("Kommt und geht") : t("Bricht durch")}</dt><dd className="mt-0.5 text-slate-800">{t(zahn.durchbruch)}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Wurzeln")}</dt><dd className="mt-0.5 text-slate-800">{t(zahn.wurzeln)}</dd></div>
                </dl>
                <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{zahn.milch ? t("Gut zu wissen") : t("Häufige Probleme und Behandlungen")}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{zahn.milch ? t(MILCHZAHN_HINWEIS) : t(ZAHNARTEN[zahn.art].typisch)}</p>
                {!marken.bearbeitbar && <PraxisHinweis notiz={marken.notizVon(zahnKennung(zahn.fdi))} />}
                <MarkierFeld key={zahn.fdi} teil={zahnKennung(zahn.fdi)} marken={marken} befunde={bleibend(zahn.fdi) ? befunde : undefined} platzhalter="Hinweis, z. B. „Hier ist die Füllung geplant.“" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={() => zahnWaehlen(zahn.fdi, true)}>{t("Im Modell zeigen")}</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => setReiter("aufbau")}>{t("Aufbau eines Zahns ansehen")}</button>
                </div>
              </section>
            ) : (
              <section className="card text-sm text-slate-600" data-testid="modell-erklaerung-leer">
                <h3 className="text-base font-semibold text-slate-900">{t("So funktioniert das Modell")}</h3>
                <p className="mt-1">{t("Tippen Sie auf einen Zahn. Sie sehen dann, wie er heißt, wozu er dient und welche Behandlungen dort häufig sind. Unter „Instrumente“ sehen Sie, womit in der Praxis gearbeitet wird.")}</p>
              </section>
            )}
            <p className="mt-3 text-xs text-slate-500">{t(MODELL_HINWEIS)}</p>
          </div>
        </div>
      )}

      {reiter === "aufbau" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            {raumSchnitt ? (
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-[#E9E2DA] modell-buehne">
                <DreiSchalter raum={raumSchnitt} setRaum={setRaumSchnitt} />
                <ZoomTasten zoom={{ vergroessern: () => griffSchnitt.current?.zoom(0.72), verkleinern: () => griffSchnitt.current?.zoom(1.38), zuruecksetzen: () => griffSchnitt.current?.zuruecksetzen(), gezoomt: true }} />
                <Modell3D ref={griffSchnitt} plan={planSchnitt} schluessel="zahnschnitt" beschriftung={t("Zahn im Querschnitt")} hoehe="h-[min(64vh,34rem)]" gewaehlt={[schicht]} markiert={[]} sichtbar={immer} sichtbarSchluessel="alle" onWahl={(k) => setSchicht(k)} ohne3D={() => setRaumSchnitt(false)} />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-0 top-0 z-20"><DreiSchalter raum={raumSchnitt} setRaum={setRaumSchnitt} /></div>
                {querschnitt(false)}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-500">{t("Backenzahn im Längsschnitt. Schicht antippen für die Erklärung.")}</p>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("Schichten des Zahns")}>
              {[...SCHICHTEN].reverse().map((s) => (
                <button key={s.id} type="button" aria-pressed={schicht === s.id} onClick={() => setSchicht(s.id)} data-testid="gebiss-schicht"
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${schicht === s.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: s.farbe }} />{t(s.name)}
                </button>
              ))}
            </div>
            <section className="card" aria-live="polite" data-testid="modell-erklaerung">
              <h3 className="text-lg font-semibold text-slate-900">{t(gewaehlteSchicht.name)}</h3>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Was ist das?")}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehlteSchicht.was)}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Wenn hier etwas nicht stimmt")}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehlteSchicht.wennKrank)}</p>
            </section>
            <p className="mt-3 text-xs text-slate-500">{t(MODELL_HINWEIS)}</p>
          </div>
        </div>
      )}

      {reiter === "instrumente" && (
        <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`}>
          <div>
            {querschnitt(true)}
            <p className="mt-1.5 text-xs text-slate-500">{t("Das gewählte Instrument ist dort eingezeichnet, wo es am Zahn arbeitet.")}</p>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("Instrumente")}>
              {INSTRUMENTE.map((i) => (
                <button key={i.id} type="button" aria-pressed={instrument === i.id} onClick={() => setInstrument(i.id)} data-testid="gebiss-instrument-wahl"
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 ${instrument === i.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>{t(i.name)}</button>
              ))}
            </div>
            <section className="card" aria-live="polite" data-testid="modell-erklaerung">
              <h3 className="text-lg font-semibold text-slate-900">{t(gewaehltesInstrument.name)}</h3>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Wofür ist es da?")}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehltesInstrument.wofuer)}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("So fühlt es sich an")}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehltesInstrument.gefuehl)}</p>
            </section>
            <p className="mt-3 text-xs text-slate-500">{t(MODELL_HINWEIS)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { zahnTitel };
