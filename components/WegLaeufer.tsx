"use client";

import { useEffect, useRef } from "react";
import { bogen, laeuferBilder, zeitplan } from "@/lib/wegBahn";

// Der laufende Punkt auf dem kleinen Lächelbogen (Behandlungsweg). Ein HTML-Punkt über der Zeichnung,
// bewegt per transform: läuft auf der Grafikkarte, hält an jeder Station mittig, macht drei Runden und
// blendet dann aus. Läuft nur, solange er zu sehen ist, und erst, wenn der Weg sich zeichnet (.im-blick,
// components/WegAnimationen.tsx); bei „Bewegung reduzieren“ gar nicht.
const KURVE = bogen([8, 8], [100, 46], [192, 8]);
const PLAN = zeitplan(700, 650, 500);
const RUNDEN = 3;

export function WegLaeufer() {
  const flaeche = useRef<HTMLDivElement>(null);
  const punkt = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const f = flaeche.current, p = punkt.current;
    if (!f || !p || typeof p.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let laufen: Animation[] = [];
    let sichtbar = false;
    let fertig = false;
    const weg = f.closest(".weg-anim");
    const frei = () => !weg || weg.classList.contains("im-blick");
    const schalten = () => {
      if (!fertig) laufen.forEach((a) => (sichtbar && frei() ? a.play() : a.pause()));
    };
    const bauen = () => {
      const { width, height } = f.getBoundingClientRect();
      if (!width) return;
      const zeit = laufen[0]?.currentTime ?? 0;
      laufen.forEach((a) => a.cancel());
      const opt: KeyframeAnimationOptions = { duration: PLAN.dauer, iterations: RUNDEN, fill: "forwards" };
      laufen = [
        p.animate(laeuferBilder(KURVE, 200, 40, width, height, PLAN), opt),
        p.animate([{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: 0.95 }, { opacity: 0 }], opt),
      ];
      laufen.forEach((a) => {
        a.currentTime = zeit;
        if (!sichtbar || !frei()) a.pause();
      });
      laufen[0].finished.then(() => (fertig = true)).catch(() => {});
    };
    bauen();
    const ro = new ResizeObserver(() => !fertig && bauen());
    ro.observe(f);
    const io = new IntersectionObserver(
      ([e]) => {
        sichtbar = e.isIntersecting;
        schalten();
      },
      { threshold: 0.4 },
    );
    io.observe(f);
    const mo = new MutationObserver(() => {
      if (!frei()) return;
      mo.disconnect();
      schalten();
    });
    if (weg && !frei()) mo.observe(weg, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      laufen.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div ref={flaeche} className="pointer-events-none absolute inset-x-0 top-0 aspect-[200/40]" aria-hidden="true">
      <span ref={punkt} className="absolute left-0 top-0 block h-0 w-0 opacity-0" style={{ willChange: "transform" }}>
        <span className="absolute -left-[4.5px] -top-[4.5px] block h-[9px] w-[9px] rounded-full bg-brand-500 ring-2 ring-white" />
      </span>
    </div>
  );
}
