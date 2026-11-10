"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Ausschnitt = { x: number; y: number; w: number; h: number };

/**
 * Zoomen und Verschieben einer SVG-Zeichnung: zwei Finger oder Strg + Mausrad zum Zoomen,
 * Ziehen zum Verschieben (sobald hineingezoomt ist), Doppelklick vergrößert. Ohne Zoom bleibt
 * das senkrechte Wischen frei, damit die Seite am Handy weiter scrollt.
 */
export function useZoom(basis: Ausschnitt, maxZoom = 9) {
  const [ausschnitt, setAusschnitt] = useState<Ausschnitt>(basis);
  // Element als Zustand: Die Zeichnung kann später erscheinen (Reiter), dann muss das Mausrad neu angemeldet werden.
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  svgRef.current = svgElement;
  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const gezogen = useRef(0);
  const aktuell = useRef(ausschnitt);
  aktuell.current = ausschnitt;
  const verhaeltnis = basis.h / basis.w;

  const begrenzen = useCallback((a: Ausschnitt): Ausschnitt => {
    const w = Math.min(basis.w, Math.max(basis.w / maxZoom, a.w));
    const h = w * verhaeltnis;
    const x = Math.min(basis.x + basis.w - w, Math.max(basis.x, a.x));
    const y = Math.min(basis.y + basis.h - h, Math.max(basis.y, a.y));
    return { x, y, w, h };
  }, [basis.x, basis.y, basis.w, basis.h, maxZoom, verhaeltnis]);

  /** Bildschirmpunkt in Zeichnungskoordinaten */
  const punkt = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: aktuell.current.x + aktuell.current.w / 2, y: aktuell.current.y + aktuell.current.h / 2, massstab: 1 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y, massstab: ctm.a || 1 };
  }, []);

  const zoomUm = useCallback((faktor: number, um?: { x: number; y: number }) => {
    setAusschnitt((a) => {
      const m = um ?? { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const w = a.w / faktor;
      const f = w / a.w;
      return begrenzen({ x: m.x - (m.x - a.x) * f, y: m.y - (m.y - a.y) * f, w, h: w * verhaeltnis });
    });
  }, [begrenzen, verhaeltnis]);

  /** Auf ein Rechteck der Zeichnung zoomen (mit Rand), z. B. auf die gewählte Struktur. */
  const zoomAuf = useCallback((r: { x: number; y: number; b: number; h: number }, rand = 2.6) => {
    const w = Math.max(r.b * rand, (r.h * rand) / verhaeltnis, basis.w / maxZoom, basis.w / 4.5);
    setAusschnitt(begrenzen({ x: r.x + r.b / 2 - w / 2, y: r.y + r.h / 2 - (w * verhaeltnis) / 2, w, h: w * verhaeltnis }));
  }, [basis.w, begrenzen, maxZoom, verhaeltnis]);

  const zuruecksetzen = useCallback(() => setAusschnitt(basis), [basis.x, basis.y, basis.w, basis.h]); // eslint-disable-line react-hooks/exhaustive-deps
  const gezoomt = ausschnitt.w < basis.w - 0.5;

  // Strg + Mausrad (auch Zwei-Finger-Zoom am Trackpad); ohne Strg nur, wenn schon hineingezoomt ist.
  useEffect(() => {
    const svg = svgElement;
    if (!svg) return;
    const rad = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && aktuell.current.w >= basis.w - 0.5) return;
      e.preventDefault();
      const p = punkt(e.clientX, e.clientY);
      zoomUm(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)), p);
    };
    svg.addEventListener("wheel", rad, { passive: false });
    return () => svg.removeEventListener("wheel", rad);
  }, [svgElement, basis.w, punkt, zoomUm]);

  const ereignisse = {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (zeiger.current.size === 1) gezogen.current = 0;
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      const vorher = zeiger.current.get(e.pointerId);
      if (!vorher) return;
      const alle = Array.from(zeiger.current.entries());
      if (alle.length >= 2) {
        const anderer = alle.find(([id]) => id !== e.pointerId)![1];
        const dAlt = Math.hypot(vorher.x - anderer.x, vorher.y - anderer.y) || 1;
        const dNeu = Math.hypot(e.clientX - anderer.x, e.clientY - anderer.y) || 1;
        gezogen.current += 10;
        zoomUm(dNeu / dAlt, punkt((e.clientX + anderer.x) / 2, (e.clientY + anderer.y) / 2));
      } else {
        const dx = e.clientX - vorher.x, dy = e.clientY - vorher.y;
        gezogen.current += Math.abs(dx) + Math.abs(dy);
        if (aktuell.current.w < basis.w - 0.5 && gezogen.current > 6) {
          // Erst beim echten Ziehen festhalten, damit ein Antippen weiter die Struktur darunter trifft.
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
          const { massstab } = punkt(e.clientX, e.clientY);
          setAusschnitt((a) => begrenzen({ ...a, x: a.x - dx / massstab, y: a.y - dy / massstab }));
        }
      }
      zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => { zeiger.current.delete(e.pointerId); },
    onPointerCancel: (e: React.PointerEvent<SVGSVGElement>) => { zeiger.current.delete(e.pointerId); },
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) zeiger.current.delete(e.pointerId); },
    onDoubleClick: (e: React.MouseEvent<SVGSVGElement>) => { zoomUm(2, punkt(e.clientX, e.clientY)); },
  };

  return {
    svgRef: setSvgElement, ereignisse, gezoomt,
    viewBox: `${ausschnitt.x} ${ausschnitt.y} ${ausschnitt.w} ${ausschnitt.h}`,
    stufe: basis.w / ausschnitt.w,
    /** War die letzte Zeigerbewegung ein Antippen (kein Ziehen)? */
    warKlick: () => gezogen.current <= 6,
    vergroessern: () => zoomUm(1.6),
    verkleinern: () => zoomUm(1 / 1.6),
    zuruecksetzen, zoomAuf,
    touchAction: gezoomt ? ("none" as const) : ("pan-y" as const),
  };
}
