"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type * as DREI from "three";
import { Buehne, webglDa, type Drei, type Zustand } from "./Buehne";
import { luft } from "./echt";
import { useT } from "../Sprache";

type Auftrag = () => DREI.Mesh[] | Promise<DREI.Mesh[]>;
export interface Bauplan { kugel: { mitte: [number, number, number]; radius: number }; boden?: number; winkel?: number; hoehe?: number; selbstDrehen?: boolean; klappe?: { achse: [number, number, number]; winkel: number }; auftraege: Auftrag[] }
export interface Modell3DGriff { fliegeZu: (kennung: string) => boolean; blick: (theta: number) => void; zoom: (faktor: number) => void; zuruecksetzen: () => void; klappen: (winkel: number) => void; buehne: () => Buehne | null }

/**
 * Räumliches Modell: lädt die 3D-Bibliothek erst, wenn das Modell ins Bild kommt, baut die Teile
 * nach und nach auf (sie zerfließen ins Bild) und meldet angetippte Teile. Weitere Dateien (Ebenen)
 * werden erst geladen, wenn sie gebraucht werden. Ohne WebGL ruft es `ohne3D`.
 */
let geoeffnetAufSeite = false;

export const Modell3D = forwardRef<Modell3DGriff, {
  /** Baut den Plan des Modells; `schluessel` ändern, um neu aufzubauen */
  plan: (T: Drei, hilfen: { verbinde: (g: DREI.BufferGeometry[]) => DREI.BufferGeometry }) => Bauplan; schluessel: string;
  gewaehlt: string[]; markiert: string[]; sichtbar: Zustand["sichtbar"]; sichtbarSchluessel: string;
  onWahl: (kennung: string) => void; ohne3D: () => void; hoehe?: string; beschriftung: string;
  /** Dateien, die zusätzlich geladen sein sollen (z. B. die Ebene, die gerade gezeigt wird) */
  dateien?: { liste: string[]; laden: (T: Drei, datei: string) => Promise<DREI.Mesh[]> };
  /** Nach dem ersten Aufbau (Bühne steht, Teile da) */
  onBereit?: (b: Buehne) => void;
  /** Nach jedem Nachladen von Dateien */
  onGeladen?: (b: Buehne, dateien: string[]) => void;
  /** Quellenangabe der Daten (Lizenz) */
  quelle?: string;
  /** Vorschaubild, solange das Modell noch nicht geöffnet ist */
  poster?: string;
  children?: React.ReactNode;
}>(function Modell3D({ plan, schluessel, gewaehlt, markiert, sichtbar, sichtbarSchluessel, onWahl, ohne3D, hoehe = "h-[min(70vh,40rem)]", beschriftung, dateien, onBereit, onGeladen, quelle, poster, children }, ref) {
  const t = useT();
  const behaelter = useRef<HTMLDivElement | null>(null);
  const buehne = useRef<Buehne | null>(null);
  const T3 = useRef<Drei | null>(null);
  const wahl = useRef(onWahl); wahl.current = onWahl;
  const planRef = useRef(plan); planRef.current = plan;
  const rueck = useRef({ onBereit, onGeladen }); rueck.current = { onBereit, onGeladen };
  const dateienRef = useRef(dateien); dateienRef.current = dateien;
  const geladen = useRef(new Set<string>());
  const zustand = useRef({ gewaehlt, markiert, sichtbar }); zustand.current = { gewaehlt, markiert, sichtbar };
  const [fortschritt, setFortschritt] = useState(0);
  const [bereit, setBereit] = useState(false);
  const [laedt, setLaedt] = useState(false);
  // Erst nach Antippen öffnen: Bis dahin lädt die Seite weder three.js noch Modelldaten.
  // Wer einmal ein Modell geöffnet hat, bekommt weitere Modelle dieser Seite sofort.
  const [sichtbarImBild, setSichtbarImBild] = useState(geoeffnetAufSeite);
  const oeffnen = () => { geoeffnetAufSeite = true; setSichtbarImBild(true); };

  useImperativeHandle(ref, () => ({
    fliegeZu: (k) => buehne.current?.fliegeZu(k) ?? false, blick: (w) => buehne.current?.blick(w),
    zoom: (f) => buehne.current?.zoom(f), zuruecksetzen: () => buehne.current?.zuruecksetzen(), klappen: (w) => buehne.current?.klappen(w),
    buehne: () => buehne.current,
  }), []);


  useEffect(() => {
    if (!sichtbarImBild) return;
    let weg = false, b: Buehne | null = null;
    if (!webglDa()) { ohne3D(); return; }
    setBereit(false); setFortschritt(0); geladen.current = new Set();
    (async () => {
      try {
        const [T, { OrbitControls }, { mergeGeometries }] = await Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js"), import("three/examples/jsm/utils/BufferGeometryUtils.js")]);
        if (weg || !behaelter.current) return;
        T3.current = T;
        const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const p = planRef.current(T, { verbinde: (g) => mergeGeometries(g, false) });
        b = new Buehne(T, OrbitControls, behaelter.current, (k) => wahl.current(k), { ruhig, selbstDrehen: p.selbstDrehen });
        buehne.current = b;
        // Keine vorberechnete Spiegelumgebung: Sie blockiert schwache Grafik über eine Sekunde. Das Licht der Bühne reicht.
        b.rahmenSetzen(p.kugel.mitte, p.kugel.radius, p.winkel ?? 0.35, p.hoehe ?? 0.12);
        if (p.boden !== undefined) b.schatten(p.kugel.mitte[0], p.boden, p.kugel.mitte[2], p.kugel.radius * 0.55);
        if (p.klappe) b.klappen(p.klappe.winkel, p.klappe.achse);
        b.setzen(zustand.current);
        // In kleinen Portionen bauen, dazwischen bekommt der Browser Luft
        let i = 0;
        while (i < p.auftraege.length) {
          const ende = performance.now() + 12, neu: DREI.Mesh[] = [];
          while (i < p.auftraege.length && performance.now() < ende) {
            const r = p.auftraege[i++]();
            if (r instanceof Promise) { neu.push(...(await r)); break; }
            neu.push(...r);
          }
          if (weg) return;
          if (neu.length) b.hinzu(neu);
          setFortschritt(i / p.auftraege.length);
          await luft();
          if (weg) return;
        }
        await nachladen();
        await b.vorbereiten();
        if (weg) return;
        setBereit(true);
        if (behaelter.current) behaelter.current.dataset.bereit = "1";
        rueck.current.onBereit?.(b);
      } catch (e) {
        console.error("3D-Modell konnte nicht aufgebaut werden", e);
        if (!weg) ohne3D();
      }
    })();
    return () => { weg = true; b?.entfernen(); buehne.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, sichtbarImBild]);

  async function nachladen() {
    const d = dateienRef.current, b = buehne.current, T = T3.current;
    if (!d || !b || !T) return;
    const fehlt = d.liste.filter((x) => !geladen.current.has(x));
    if (!fehlt.length) return;
    setLaedt(true);
    for (const x of fehlt) geladen.current.add(x);
    try {
      for (const x of fehlt) {
        const meshes = await d.laden(T, x);
        if (buehne.current !== b) return;
        b.setzen(zustand.current);
        b.hinzu(meshes);
        await luft();
      }
      await b.vorbereiten();
      rueck.current.onGeladen?.(b, fehlt);
    } catch (e) {
      console.error("Teil des 3D-Modells konnte nicht geladen werden", e);
      for (const x of fehlt) geladen.current.delete(x);
    } finally { if (buehne.current === b) setLaedt(false); }
  }
  const dateiSchluessel = dateien?.liste.join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (bereit) void nachladen(); }, [dateiSchluessel, bereit]);

  useEffect(() => { buehne.current?.setzen({ gewaehlt, markiert, sichtbar }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [gewaehlt.join("|"), markiert.join("|"), sichtbarSchluessel, bereit]);

  return (
    <div className={`relative w-full ${hoehe}`}>
      <div ref={behaelter} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={beschriftung} data-testid="modell-3d-buehne" />
      {sichtbarImBild && children}
      {!sichtbarImBild && (
        <button type="button" onClick={oeffnen} className="group absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden" data-testid="modell-3d-start" aria-label={t("3D-Modell öffnen")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-contain opacity-90 transition-opacity group-hover:opacity-100" loading="lazy" decoding="async" />}
          <span className="relative rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg ring-4 ring-white/70 transition group-hover:bg-brand-700">{t("3D-Modell öffnen")}</span>
        </button>
      )}
      {sichtbarImBild && (!bereit || laedt) && (
        <div className="pointer-events-none absolute inset-x-6 bottom-7 text-center" aria-live="polite">
          {!bereit && <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${Math.round(fortschritt * 100)}%` }} /></div>}
          <p className="mt-1.5 text-xs text-slate-500">{bereit ? t("Ebene wird geladen …") : t("Modell wird aufgebaut …")}</p>
        </div>
      )}
      {quelle && <p className="pointer-events-none absolute bottom-1.5 left-2 right-2 truncate text-[10px] leading-tight text-slate-500/90" title={quelle} data-testid="modell-quelle">{quelle}</p>}
    </div>
  );
});
