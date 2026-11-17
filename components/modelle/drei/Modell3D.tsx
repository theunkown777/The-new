"use client";

import { ModellQuelle } from "@/components/modelle/ModellQuelle";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type * as DREI from "three";
import { Buehne, webglDa, type Drei, type Treffer, type Zustand } from "./Buehne";
import { leichtesGeraet, luft } from "./echt";
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
  /** Sofort aufbauen, ohne Knopf „3D-Modell öffnen“ (z. B. im Hintergrund hinter einer flachen Figur) */
  sofort?: boolean;
  /** Modus „zeigen“: Antippen meldet Punkt und Richtung der Oberfläche (statt ein Teil zu wählen) */
  onPunkt?: (t: Treffer) => void;
  /** Antippbar ab dieser Deckkraft (Standard 0,4); niedriger, wenn halb durchsichtige Haut antippbar sein soll */
  mindestDeck?: number;
  /** Kennungen, die der Patient selbst angegeben hat (eigene Farbe) */
  patient?: string[];
  children?: React.ReactNode;
}>(function Modell3D({ plan, schluessel, gewaehlt, markiert, sichtbar, sichtbarSchluessel, onWahl, ohne3D, hoehe = "h-[min(70vh,40rem)]", beschriftung, dateien, onBereit, onGeladen, quelle, poster, sofort = false, onPunkt, mindestDeck, patient = [], children }, ref) {
  const t = useT();
  const behaelter = useRef<HTMLDivElement | null>(null);
  const buehne = useRef<Buehne | null>(null);
  const T3 = useRef<Drei | null>(null);
  const wahl = useRef(onWahl); wahl.current = onWahl;
  const punktRef = useRef(onPunkt); punktRef.current = onPunkt;
  const zeigen = !!onPunkt;
  const planRef = useRef(plan); planRef.current = plan;
  const rueck = useRef({ onBereit, onGeladen }); rueck.current = { onBereit, onGeladen };
  const dateienRef = useRef(dateien); dateienRef.current = dateien;
  const geladen = useRef(new Set<string>());
  const zustand = useRef({ gewaehlt, markiert, patient, sichtbar }); zustand.current = { gewaehlt, markiert, patient, sichtbar };
  const [fortschritt, setFortschritt] = useState(0);
  const [bereit, setBereit] = useState(false);
  const [laedt, setLaedt] = useState(false);
  // Erst nach Antippen öffnen: Bis dahin lädt die Seite weder three.js noch Modelldaten.
  // Wer einmal ein Modell geöffnet hat, bekommt weitere Modelle dieser Seite sofort.
  const [sichtbarImBild, setSichtbarImBild] = useState(geoeffnetAufSeite || sofort);
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
        b = new Buehne(T, OrbitControls, behaelter.current, (k) => wahl.current(k), { ruhig, selbstDrehen: p.selbstDrehen, mindestDeck, ...(zeigen ? { zeigen: (t: Treffer) => punktRef.current?.(t) } : {}) });
        buehne.current = b;
        // Spiegelumgebung erst nach dem ersten Bild und nur auf starken Geräten (umgebungImLeerlauf); schwache Grafik blockiert sie über eine Sekunde.
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
        umgebungImLeerlauf(b, () => weg);
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

  useEffect(() => { buehne.current?.setzen({ gewaehlt, markiert, patient, sichtbar }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [gewaehlt.join("|"), markiert.join("|"), patient.join("|"), sichtbarSchluessel, bereit]);

  // Der Lizenzvermerk steht unter der Bühne, nicht darüber gelegt: so bricht er um und wird nie abgeschnitten.
  // Ohne Vermerk trägt auch die Hülle die Höhe, damit „h-full“ in einem festen Rahmen (Fragebogen, Akte) greift.
  return (
    <div className={quelle ? "w-full" : `w-full ${hoehe}`}>
    <div className={`relative w-full ${hoehe}`}>
      <div ref={behaelter} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={beschriftung} data-testid="modell-3d-buehne" data-zeigen={zeigen ? "1" : undefined} />
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
    </div>
    {quelle && <ModellQuelle />}
    </div>
  );
});

/**
 * Umgebungslicht (heller Raum, vorberechnet und weichgezeichnet) für mehr Tiefe und echte Glanzlichter.
 * Nur auf starken Geräten, erst wenn das erste Bild steht und der Browser Zeit hat. Die Bühne rechnet es
 * klein (64er-Würfel) und schaltet es wieder ab, wenn die Bilder zu langsam werden.
 */
function umgebungImLeerlauf(b: Buehne, weg: () => boolean) {
  if (typeof window === "undefined" || leichtesGeraet()) return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const los = () => { if (!weg()) void b.umgebungBerechnen().catch(() => {}); };
  if (w.requestIdleCallback) w.requestIdleCallback(los, { timeout: 3000 }); else setTimeout(los, 800);
}
