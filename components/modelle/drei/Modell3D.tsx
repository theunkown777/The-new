"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type * as DREI from "three";
import { Buehne, webglDa, type Drei, type Zustand } from "./Buehne";
import { useT } from "../Sprache";

export interface Bauplan { kugel: { mitte: [number, number, number]; radius: number }; boden?: number; winkel?: number; klappe?: { achse: [number, number, number]; winkel: number }; auftraege: (() => DREI.Mesh[])[] }
export interface Modell3DGriff { fliegeZu: (kennung: string) => void; blick: (theta: number) => void; zoom: (faktor: number) => void; zuruecksetzen: () => void; klappen: (winkel: number) => void }

/**
 * Räumliches Modell: lädt die 3D-Bibliothek erst bei Bedarf, baut die Teile nach und nach auf
 * (sie wachsen ins Bild) und meldet angetippte Teile. Ohne WebGL ruft es `ohne3D`.
 */
export const Modell3D = forwardRef<Modell3DGriff, {
  /** Baut den Plan des Modells; `schluessel` ändern, um neu aufzubauen */
  plan: (T: Drei, hilfen: { verbinde: (g: DREI.BufferGeometry[]) => DREI.BufferGeometry }) => Bauplan; schluessel: string;
  gewaehlt: string[]; markiert: string[]; sichtbar: Zustand["sichtbar"]; sichtbarSchluessel: string;
  onWahl: (kennung: string) => void; ohne3D: () => void; hoehe?: string; beschriftung: string;
}>(function Modell3D({ plan, schluessel, gewaehlt, markiert, sichtbar, sichtbarSchluessel, onWahl, ohne3D, hoehe = "h-[min(70vh,40rem)]", beschriftung }, ref) {
  const t = useT();
  const behaelter = useRef<HTMLDivElement | null>(null);
  const buehne = useRef<Buehne | null>(null);
  const wahl = useRef(onWahl); wahl.current = onWahl;
  const planRef = useRef(plan); planRef.current = plan;
  const zustand = useRef({ gewaehlt, markiert, sichtbar }); zustand.current = { gewaehlt, markiert, sichtbar };
  const [fortschritt, setFortschritt] = useState(0);
  const [bereit, setBereit] = useState(false);

  useImperativeHandle(ref, () => ({
    fliegeZu: (k) => buehne.current?.fliegeZu(k), blick: (w) => buehne.current?.blick(w),
    zoom: (f) => buehne.current?.zoom(f), zuruecksetzen: () => buehne.current?.zuruecksetzen(), klappen: (w) => buehne.current?.klappen(w),
  }), []);

  useEffect(() => {
    let weg = false, b: Buehne | null = null, zeit = 0;
    if (!webglDa()) { ohne3D(); return; }
    setBereit(false); setFortschritt(0);
    (async () => {
      try {
        const [T, { OrbitControls }, { RoomEnvironment }, { mergeGeometries }] = await Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js"), import("three/examples/jsm/environments/RoomEnvironment.js"), import("three/examples/jsm/utils/BufferGeometryUtils.js")]);
        if (weg || !behaelter.current) return;
        const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        b = new Buehne(T, OrbitControls, behaelter.current, (k) => wahl.current(k), { ruhig });
        buehne.current = b;
        // Weiche Umgebung für Spiegelungen auf Zahnschmelz, Knochen und feuchtem Gewebe
        try { const renderer = (b as unknown as { renderer: DREI.WebGLRenderer }).renderer, szene = (b as unknown as { szene: DREI.Scene }).szene; const pm = new T.PMREMGenerator(renderer); szene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; szene.environmentIntensity = 0.32; pm.dispose(); } catch { /* ohne Umgebung */ }
        const p = planRef.current(T, { verbinde: (g) => mergeGeometries(g, false) });
        b.rahmenSetzen(p.kugel.mitte, p.kugel.radius, p.winkel ?? 0.35);
        if (p.boden !== undefined) b.schatten(p.kugel.mitte[0], p.boden, p.kugel.mitte[2], p.kugel.radius * 0.55);
        if (p.klappe) b.klappen(p.klappe.winkel, p.klappe.achse);
        b.setzen(zustand.current);
        // In kleinen Portionen bauen, damit die Seite bedienbar bleibt
        let i = 0;
        const weiter = () => {
          if (weg || !b) return;
          const ende = performance.now() + 14, neu: DREI.Mesh[] = [];
          while (i < p.auftraege.length && performance.now() < ende) neu.push(...p.auftraege[i++]());
          if (neu.length) b.hinzu(neu);
          setFortschritt(i / p.auftraege.length);
          if (i < p.auftraege.length) zeit = window.setTimeout(weiter, 0);
          else { setBereit(true); if (behaelter.current) behaelter.current.dataset.bereit = "1"; }
        };
        weiter();
      } catch (e) {
        console.error("3D-Modell konnte nicht aufgebaut werden", e);
        if (!weg) ohne3D();
      }
    })();
    return () => { weg = true; window.clearTimeout(zeit); b?.entfernen(); buehne.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  useEffect(() => { buehne.current?.setzen({ gewaehlt, markiert, sichtbar }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [gewaehlt.join("|"), markiert.join("|"), sichtbarSchluessel, bereit]);

  return (
    <div className={`relative w-full ${hoehe}`}>
      <div ref={behaelter} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={beschriftung} data-testid="modell-3d-buehne" />
      {!bereit && (
        <div className="pointer-events-none absolute inset-x-6 bottom-4 text-center" aria-live="polite">
          <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${Math.round(fortschritt * 100)}%` }} /></div>
          <p className="mt-1.5 text-xs text-slate-500">{t("Modell wird aufgebaut …")}</p>
        </div>
      )}
    </div>
  );
});
