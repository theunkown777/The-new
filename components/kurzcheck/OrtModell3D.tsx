"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { KurzArt } from "@/lib/kurzcheck";
import { ortAusKennung, ortZiele, regionAusPunkt, type V3 } from "@/lib/kurzcheck3d";
import { Modell3D, type Modell3DGriff } from "@/components/modelle/drei/Modell3D";
import { PATIENT_FARBE, type Drei, type Treffer } from "@/components/modelle/drei/Buehne";
import { ladeDatei } from "@/components/modelle/drei/echt";
import { ortBauplan } from "./ortBau";

/** Farbe der eigenen Auswahl im Fragebogen (wie die Knöpfe); in der Akte Violett für Angaben des Patienten */
const AUSWAHL_FARBE = 0xc2410c;

export interface OrtPunkt { punkt: V3; normale: V3 }
export interface OrtModellGriff {
  /** Ansicht drehen: 0 = von vorn, π = von hinten */
  blick: (theta: number) => void;
  /** Modell so drehen, dass die Stelle zu sehen ist */
  zeige: (ort: string) => void;
}

/** Kennung im Mund-Modell zu einer Stelle („zahn:36“ → „36“). */
const kennungVon = (ort: string) => (ort.startsWith("zahn:") ? ort.slice(5) : ort.startsWith("mund:") ? ort : null);

/**
 * Das echte 3D-Modell zur Frage „Wo?“. Antippen meldet die Stelle (Regeln in lib/kurzcheck3d.ts, ohne KI).
 * Gewählte Stellen erscheinen als Fleck auf der Haut, Zähne leuchten selbst. Ohne onOrt nur zum Ansehen
 * (Akte der Praxis); dann tragen die Flecken auf Wunsch Namen.
 */
const OrtModell3D = forwardRef<OrtModellGriff, {
  art: KurzArt;
  orte: string[];
  /** Genau angetippte Punkte je Stelle (sonst: Mitte der Stelle aus den Landmarken) */
  punkte?: Record<string, OrtPunkt>;
  /** Skelett unter halb durchsichtiger Haut zeigen (Bewegungsapparat) */
  gelenke?: boolean;
  /** Angaben des Patienten in der Akte: eigene Farbe */
  patient?: boolean;
  onOrt?: (ort: string | null, t: Treffer) => void;
  onBereit?: () => void;
  onFehler: () => void;
  beschriftung: string;
  /** Namen an den Flecken (nur zum Ansehen) */
  namen?: (ort: string) => string;
  hoehe?: string;
}>(function OrtModell3D({ art, orte, punkte = {}, gelenke = false, patient = false, onOrt, onBereit, onFehler, beschriftung, namen, hoehe = "h-full" }, ref) {
  const griff = useRef<Modell3DGriff | null>(null);
  const [bereit, setBereit] = useState(false);
  const zahn = art === "zahn";
  const plan = useCallback((T: Drei) => ortBauplan(T, art), [art]);
  const ortRef = useRef(onOrt); ortRef.current = onOrt;
  const tippen = useCallback((t: Treffer) => {
    const ort = zahn ? ortAusKennung(t.kennung) : regionAusPunkt(t.punkt, t.normale, art);
    ortRef.current?.(ort, t);
  }, [art, zahn]);
  const sichtbar = useCallback((d: Record<string, unknown>) => {
    if (d.datei === "skelett") return gelenke;
    if (d.datei === "haut") return gelenke ? 0.22 : true;
    return true;
  }, [gelenke]);
  const kennungen = useMemo(() => (zahn ? orte.map(kennungVon).filter((k): k is string => !!k) : []), [zahn, orte]);
  const leer = useMemo<string[]>(() => [], []);
  const laden = useCallback((T: Drei, d: string) => ladeDatei(T, d as "skelett"), []);

  useImperativeHandle(ref, () => ({
    blick: (theta) => griff.current?.blick(theta),
    zeige: (ort) => {
      const z = ortZiele(ort, art)[0];
      if (!z) return;
      const [nx, , nz] = z.normale;
      if (Math.abs(nx) + Math.abs(nz) > 0.2) griff.current?.blick(Math.atan2(nx, nz));
    },
  }), [art]);

  // Flecken und Namen an den gewählten Stellen; ohne genauen Punkt auf die Haut über der Mitte der Stelle
  const ankerEl = useRef(new Map<string, HTMLSpanElement>());
  const punkteSchluessel = Object.entries(punkte).map(([k, v]) => `${k}@${v.punkt.map(Math.round).join(",")}`).join("|");
  useEffect(() => {
    const b = griff.current?.buehne();
    if (!b || !bereit) return;
    if (zahn) { b.flecken([]); b.anker([]); return; }
    const kopf = art === "auge" || art === "hno";
    const liste = orte.flatMap((o) => (punkte[o] ? [{ o, ...punkte[o] }] : ortZiele(o, art).map((z) => {
      const h = b.aufFlaeche(z.punkt, z.normale);
      return { o, punkt: h?.punkt ?? z.punkt, normale: h?.normale ?? z.normale };
    })));
    b.flecken(liste.map((x) => ({ pos: x.punkt, farbe: patient ? PATIENT_FARBE : AUSWAHL_FARBE, radius: kopf ? 8 : 22 })));
    if (namen) b.anker(liste.map((x, i) => ({ el: ankerEl.current.get(`${x.o}-${i}`)!, pos: x.punkt, normal: x.normale })).filter((a) => !!a.el));
  }, [bereit, orte.join("|"), punkteSchluessel, gelenke, patient, art, zahn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eine Beschriftung je Fleck (gleiche Reihenfolge wie oben)
  const beschriftungen = !zahn && namen ? orte.flatMap((o) => (punkte[o] ? [o] : ortZiele(o, art).map(() => o))) : [];
  return (
    <Modell3D ref={griff} plan={plan} schluessel={`ort-${art}`} beschriftung={beschriftung} hoehe={hoehe} sofort
      gewaehlt={patient ? leer : kennungen} markiert={leer} patient={patient ? kennungen : leer}
      sichtbar={sichtbar} sichtbarSchluessel={String(gelenke)} mindestDeck={0.15}
      dateien={{ liste: gelenke ? ["skelett"] : [], laden }}
      onPunkt={onOrt ? tippen : undefined} onWahl={() => {}} ohne3D={onFehler}
      onBereit={() => { setBereit(true); onBereit?.(); }}>
      {beschriftungen.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {beschriftungen.map((o, i) => (
            <span key={`${o}-${i}`} ref={(el) => { if (el) ankerEl.current.set(`${o}-${i}`, el); else ankerEl.current.delete(`${o}-${i}`); }}
              className="absolute left-0 top-0 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-xs font-medium text-[#4C3594] opacity-0 shadow ring-1 ring-[#7B5CD6]/40 transition-opacity" style={{ marginTop: -22 }}>
              {namen!(o)}
            </span>
          ))}
        </div>
      )}
    </Modell3D>
  );
});
export default OrtModell3D;
