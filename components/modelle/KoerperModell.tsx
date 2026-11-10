"use client";

import { useMemo, useRef, useState } from "react";
import { rahmen } from "@/lib/modelle/formen";
import { DEKOR, EBENEN, KOERPER_BREITE, KOERPER_HOEHE, STRUKTUREN, UMRISS, seiteImBild, seitenName, strukturNach, teilKennung, teilLesen, teilName, type Ansicht, type Ebene, type Seite, type Struktur } from "@/lib/modelle/koerper";
import { useZoom } from "./useZoom";
import { FARBE_GEWAEHLT, FARBE_MARKIERT, FormPfad, GewaehltLeiste, MODELL_HINWEIS, MarkierFeld, MehrfachFeld, PraxisHinweis, Treffer, ZoomTasten, useMarkierungen, type Markierung } from "./ModellTeile";

const BASIS = { x: 0, y: 0, w: KOERPER_BREITE, h: KOERPER_HOEHE };
const FARBE: Record<Ebene, { flaeche: string; rand: string }> = {
  knochen: { flaeche: "#F3E9D4", rand: "#9A8763" },
  organe: { flaeche: "#D98C86", rand: "#8E4A46" },
  muskeln: { flaeche: "#C9706F", rand: "#8A3B3B" },
  sehnen: { flaeche: "#CFE3F0", rand: "#44779B" },
  nerven: { flaeche: "#F4D452", rand: "#9A7B10" },
};
const SPIEGELN = `matrix(-1 0 0 1 ${KOERPER_BREITE} 0)`;

type Auswahl = { id: string; seite: Seite };

/**
 * Körpermodell mit Knochen, Muskeln sowie Sehnen, Bändern und Gelenken, von vorn und hinten.
 * Antippen zeigt die Erklärung; mit patientId kann die Praxis Stellen für den Patienten markieren.
 */
export function KoerperModell({ markierungen = [], patientId, startEbenen = ["knochen", "muskeln"], einspaltig = false, geschlecht: startGeschlecht }: { markierungen?: Markierung[]; patientId?: string; startEbenen?: Ebene[]; einspaltig?: boolean; geschlecht?: "W" | "M" | null }) {
  const marken = useMarkierungen("koerper", markierungen, patientId);
  const ersteMarke = markierungen[0] ? teilLesen(markierungen[0].teil) : null;
  const [ansicht, setAnsicht] = useState<Ansicht>(ersteMarke && !ersteMarke.struktur.vorn ? "hinten" : "vorn");
  const [ebenen, setEbenen] = useState<Ebene[]>(() => Array.from(new Set([...startEbenen, ...markierungen.map((m) => teilLesen(m.teil)?.struktur.ebene).filter((e): e is Ebene => !!e)])));
  const [auswahl, setAuswahl] = useState<Auswahl | null>(ersteMarke ? { id: ersteMarke.struktur.id, seite: ersteMarke.seite } : null);
  // Gebärmutter oder Prostata: nach dem Geschlecht des Patienten, sonst wählbar
  const [geschlecht, setGeschlecht] = useState<"W" | "M">(() => (startGeschlecht === "M" || markierungen.some((m) => m.teil.startsWith("prostata")) ? "M" : "W"));
  const passt = (s: Struktur) => !s.geschlecht || s.geschlecht === geschlecht;
  const zoom = useZoom(BASIS);
  const svgBereich = useRef<HTMLDivElement | null>(null);
  const gewaehlt = auswahl ? strukturNach(auswahl.id) : null;
  const kennung = auswahl ? teilKennung(auswahl.id, auswahl.seite) : null;

  const sichtbar = useMemo(() => STRUKTUREN.filter((s) => ebenen.includes(s.ebene) && s[ansicht] && (!s.geschlecht || s.geschlecht === geschlecht)), [ebenen, ansicht, geschlecht]);

  // Mehrere Stellen auf einmal markieren (nur Praxisansicht)
  const [mehrfach, setMehrfach] = useState(false);
  const [mehrere, setMehrere] = useState<string[]>([]);

  function waehlen(s: Struktur, seite: Seite, hinzoomen = false, ziel: Ansicht = ansicht) {
    if (mehrfach && !hinzoomen) { const k = teilKennung(s.id, seite); setMehrere((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k])); return; }
    setAuswahl({ id: s.id, seite });
    if (s.geschlecht && s.geschlecht !== geschlecht) setGeschlecht(s.geschlecht);
    if (!ebenen.includes(s.ebene)) setEbenen((e) => [...e, s.ebene]);
    const a: Ansicht = s[ziel] ? ziel : s.vorn ? "vorn" : "hinten";
    if (a !== ansicht) setAnsicht(a);
    if (hinzoomen) {
      svgBereich.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const r = rahmen(s[a] ?? []);
      // paarige Struktur auf der rechten Bildhälfte: Rahmen spiegeln
      const rechts = s.lage === "paarig" && seiteImBild(a, "rechts") === seite;
      zoom.zoomAuf(s.lage === "mitteGespiegelt" ? { x: r.x, y: r.y, b: KOERPER_BREITE - 2 * r.x, h: r.h } : rechts ? { ...r, x: KOERPER_BREITE - r.x - r.b } : r);
    }
  }

  // Tief liegende Strukturen (gestrichelt) sollen keine Klicks abfangen, die dem Organ davor gelten:
  // Ihre Trefferfläche liegt deshalb unter allem anderen, ihr Bild obenauf (ohne Klick).
  const zeichne = (s: Struktur, tief: boolean, teil: "alles" | "treffer" | "bild" = "alles") => {
    const formen = s[ansicht]!;
    const haelften: { seite: Seite; gespiegelt: boolean }[] = s.lage === "paarig"
      ? [{ seite: seiteImBild(ansicht, "links"), gespiegelt: false }, { seite: seiteImBild(ansicht, "rechts"), gespiegelt: true }]
      : [{ seite: "M", gespiegelt: false }];
    return haelften.map(({ seite, gespiegelt }) => {
      const k = teilKennung(s.id, seite);
      const istGewaehlt = mehrfach ? mehrere.includes(k) : kennung === k;
      const istMarkiert = marken.istMarkiert(k);
      // Markiertes bleibt orange, auch wenn es gerade gewählt ist (dann mit kräftigem Rand)
      const c = istMarkiert ? { ...FARBE_MARKIERT, rand: istGewaehlt ? "#5A1D1D" : FARBE_MARKIERT.rand } : istGewaehlt ? FARBE_GEWAEHLT : s.farbe ?? FARBE[s.ebene];
      const inhalt = (
        <>
          {teil !== "treffer" && formen.map((f, i) => <FormPfad key={i} form={f} flaeche={c.flaeche} rand={c.rand} randStaerke={istGewaehlt && istMarkiert ? 2.8 : istGewaehlt || istMarkiert ? 1.8 : s.ebene === "sehnen" ? 1.3 : 0.9}
            deckkraft={istGewaehlt || istMarkiert ? 1 : tief ? 0.5 : s.ebene === "muskeln" ? 0.92 : s.ebene === "sehnen" ? 0.9 : 1} gestrichelt={tief && !istGewaehlt && !istMarkiert} />)}
          {teil !== "bild" && <Treffer formen={formen} mindest={tief ? 9 : s.ebene === "sehnen" || s.ebene === "nerven" ? 16 : 12} />}
        </>
      );
      if (teil === "bild") {
        return (
          <g key={`${k}-bild`} aria-hidden="true" pointerEvents="none" data-markiert={istMarkiert || undefined}>
            {s.lage === "paarig" ? <g transform={gespiegelt ? SPIEGELN : undefined}>{inhalt}</g> : <>{inhalt}{s.lage === "mitteGespiegelt" && <g transform={SPIEGELN}>{inhalt}</g>}</>}
          </g>
        );
      }
      return (
        <g key={k} role="button" tabIndex={0} aria-label={teilName(k)} aria-pressed={istGewaehlt} className="cursor-pointer outline-none focus-visible:[&_path]:stroke-[#1d4ed8]"
          data-teil={k} data-markiert={teil === "alles" ? istMarkiert || undefined : undefined}
          onClick={() => { if (zoom.warKlick()) waehlen(s, seite); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(s, seite, true); } }}>
          {s.lage === "paarig" ? <g transform={gespiegelt ? SPIEGELN : undefined}>{inhalt}</g> : (
            <>
              {inhalt}
              {s.lage === "mitteGespiegelt" && <g transform={SPIEGELN}>{inhalt}</g>}
            </>
          )}
        </g>
      );
    });
  };

  // Reihenfolge: Knochen, Muskeln, Sehnen; tiefe Strukturen gestrichelt obenauf; Gewähltes und Markiertes zuletzt.
  const geordnet = [...sichtbar.filter((s) => !s.tief), ...sichtbar.filter((s) => s.tief)].sort((a, b) => EBENEN.findIndex((e) => e.id === a.ebene) - EBENEN.findIndex((e) => e.id === b.ebene) || Number(!!a.tief) - Number(!!b.tief));

  return (
    <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`} data-testid="koerpermodell">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm" role="tablist" aria-label="Ansicht">
            {(["vorn", "hinten"] as Ansicht[]).map((a) => (
              <button key={a} type="button" role="tab" aria-selected={ansicht === a} onClick={() => setAnsicht(a)} data-testid={`koerper-ansicht-${a}`}
                className={`rounded-full px-3.5 py-1.5 ${ansicht === a ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>
                {a === "vorn" ? "Von vorn" : "Von hinten"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ebenen">
            {EBENEN.map((e) => {
              const an = ebenen.includes(e.id);
              return (
                <button key={e.id} type="button" aria-pressed={an} onClick={() => setEbenen((l) => (an ? l.filter((x) => x !== e.id) : [...l, e.id]))} data-testid={`koerper-ebene-${e.id}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${an ? "bg-white text-slate-900 ring-slate-300" : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: an ? FARBE[e.id].flaeche : "#e5e7eb" }} />
                  {e.kurz}
                </button>
              );
            })}
          </div>
          {ebenen.includes("organe") && (
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm" role="group" aria-label="Körper">
              {([["W", "weiblich"], ["M", "männlich"]] as const).map(([g, name]) => (
                <button key={g} type="button" aria-pressed={geschlecht === g} onClick={() => setGeschlecht(g)} data-testid={`koerper-geschlecht-${g}`}
                  className={`rounded-full px-3 py-1.5 ${geschlecht === g ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{name}</button>
              ))}
            </div>
          )}
        </div>
        <div ref={svgBereich} className="relative scroll-mt-4 overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA]">
          <ZoomTasten zoom={zoom} />
          {kennung && !mehrfach && <GewaehltLeiste titel={teilName(kennung)} zielId="koerper-erklaerung" />}
          <svg ref={zoom.svgRef} viewBox={zoom.viewBox} {...zoom.ereignisse} className="mx-auto block h-[min(72vh,46rem)] w-full select-none" style={{ touchAction: zoom.touchAction }}
            role="group" aria-label={`Körpermodell ${ansicht === "vorn" ? "von vorn" : "von hinten"}`} data-testid="koerper-svg">
            <g aria-hidden="true">
              {UMRISS.map((u, i) => <path key={i} d={u.d} stroke="#F0E5DA" strokeWidth={u.breite} strokeLinecap="round" fill="none" />)}
            </g>
            {geordnet.filter((s) => s.ebene === "knochen").flatMap((s) => zeichne(s, !!s.tief))}
            {ebenen.includes("knochen") && <g aria-hidden="true" pointerEvents="none">{DEKOR[ansicht].map((f, i) => <FormPfad key={i} form={f} flaeche="#B9A888" rand="#B9A888" randStaerke={0.4} />)}</g>}
            {geordnet.filter((s) => s.ebene !== "knochen" && s.tief).flatMap((s) => zeichne(s, true, "treffer"))}
            {geordnet.filter((s) => s.ebene !== "knochen" && !s.tief).flatMap((s) => zeichne(s, false))}
            {geordnet.filter((s) => s.ebene !== "knochen" && s.tief).flatMap((s) => zeichne(s, true, "bild"))}
            <text x={18} y={KOERPER_HOEHE - 14} fontSize={11} fill="#8b8378" aria-hidden="true">{ansicht === "vorn" ? "rechts" : "links"}</text>
            <text x={KOERPER_BREITE - 18} y={KOERPER_HOEHE - 14} fontSize={11} fill="#8b8378" textAnchor="end" aria-hidden="true">{ansicht === "vorn" ? "links" : "rechts"}</text>
          </svg>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Antippen für die Erklärung. Vergrößern mit + und −, mit zwei Fingern oder per Doppelklick.</p>
      </div>

      <div className="min-w-0">
        {marken.liste.length > 0 && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="modell-markierte">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{marken.bearbeitbar ? "Für diesen Patienten markiert" : "Von Ihrer Praxis markiert"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {marken.liste.map((m) => {
                const t = teilLesen(m.teil);
                if (!t) return null;
                return <button key={m.teil} type="button" onClick={() => waehlen(t.struktur, t.seite, true)} className="rounded-full bg-white px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300 hover:bg-orange-100" data-testid="modell-marke">{teilName(m.teil)}</button>;
              })}
            </div>
          </div>
        )}

        {marken.bearbeitbar && !mehrfach && (
          <div className="mb-3">
            <button type="button" className="btn-secondary text-sm" onClick={() => { setMehrfach(true); setMehrere([]); }} data-testid="modell-mehrfach-start">Mehrere Stellen auf einmal markieren</button>
          </div>
        )}
        {mehrfach ? (
          <MehrfachFeld
            gewaehlt={mehrere.map((k) => ({ teil: k, name: teilName(k) }))}
            marken={marken}
            platzhalter="Hinweis, z. B. „Diese Muskeln bitte täglich dehnen.“"
            onEntfernen={(teil) => setMehrere((a) => a.filter((x) => x !== teil))}
            onFertig={() => { setMehrfach(false); setMehrere([]); }}
          />
        ) : gewaehlt && auswahl && kennung ? (
          <section id="koerper-erklaerung" className="card scroll-mt-4" aria-live="polite" data-testid="modell-erklaerung">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">{gewaehlt.name}{auswahl.seite !== "M" && <span className="font-normal text-slate-500"> {seitenName(auswahl.seite)}</span>}</h3>
                {gewaehlt.latein && <p className="text-sm italic text-slate-500">{gewaehlt.latein}</p>}
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs ring-1 ring-black/10" style={{ background: FARBE[gewaehlt.ebene].flaeche, color: gewaehlt.ebene === "muskeln" || gewaehlt.ebene === "organe" ? "#fff" : "#3f3a33" }}>{EBENEN.find((e) => e.id === gewaehlt.ebene)!.name}</span>
            </div>
            {gewaehlt.lage === "paarig" && (
              <div className="mt-2 inline-flex rounded-full bg-slate-100 p-0.5 text-xs" role="group" aria-label="Körperseite">
                {(["R", "L"] as Seite[]).map((s) => (
                  <button key={s} type="button" aria-pressed={auswahl.seite === s} onClick={() => waehlen(gewaehlt, s, true)} className={`rounded-full px-3 py-1 ${auswahl.seite === s ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{seitenName(s)}</button>
                ))}
              </div>
            )}
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Was ist das?</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehlt.was}</p>
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Häufige Beschwerden</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{gewaehlt.beschwerden}</p>
            {!marken.bearbeitbar && <PraxisHinweis notiz={marken.notizVon(kennung)} />}
            <MarkierFeld key={kennung} teil={kennung} marken={marken} platzhalter="Hinweis, z. B. „Hier sitzt die Reizung. Bitte zweimal täglich dehnen.“" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => waehlen(gewaehlt, auswahl.seite, true)}>Im Modell zeigen</button>
              {gewaehlt.vorn && gewaehlt.hinten && <button type="button" className="btn-secondary text-sm" onClick={() => waehlen(gewaehlt, auswahl.seite, true, ansicht === "vorn" ? "hinten" : "vorn")}>{ansicht === "vorn" ? "Von hinten ansehen" : "Von vorn ansehen"}</button>}
            </div>
          </section>
        ) : (
          <section className="card text-sm text-slate-600" data-testid="modell-erklaerung-leer">
            <h3 className="text-base font-semibold text-slate-900">So funktioniert das Modell</h3>
            <p className="mt-1">Tippen Sie auf ein Organ, einen Knochen, einen Muskel, eine Sehne oder einen Nerv. Sie sehen dann, was das ist und welche Beschwerden dort häufig vorkommen. Über die Tasten oben blenden Sie Ebenen ein und aus.</p>
          </section>
        )}

        <details className="mt-3 rounded-2xl bg-white ring-1 ring-slate-200" data-testid="modell-liste">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900">Alle {STRUKTUREN.length} Strukturen als Liste</summary>
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            {EBENEN.map((e) => (
              <div key={e.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{e.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {STRUKTUREN.filter((s) => s.ebene === e.id && passt(s)).map((s) => (
                    <button key={s.id} type="button" onClick={() => waehlen(s, s.lage === "paarig" ? (auswahl?.seite && auswahl.seite !== "M" ? auswahl.seite : "R") : "M", true)}
                      className={`rounded-full px-3 py-2 text-sm ring-1 sm:px-2.5 sm:py-1 sm:text-xs ${auswahl?.id === s.id ? "bg-brand-600 text-white ring-brand-600" : "bg-slate-50 text-slate-700 ring-slate-200 hover:text-brand-700"}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
        <p className="mt-3 text-xs text-slate-500">{MODELL_HINWEIS}</p>
      </div>
    </div>
  );
}
