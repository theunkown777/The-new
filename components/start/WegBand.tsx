"use client";

import { useEffect, useRef } from "react";
import { bogen, laeuferBilder, zeitplan } from "@/lib/wegBahn";

// Der Behandlungsweg über die volle Breite: fünf Stationen genau über der Mitte ihrer Spalte.
// Ein Punkt läuft den Lächelbogen ab, hält an jeder Station mittig kurz an, und die Spalte darunter
// leuchtet so lange auf. Läuft nur, solange das Band zu sehen ist; bei "Bewegung reduzieren" steht alles still.

const B = 1000, H = 120, Y0 = 26, YM = 98; // Bogen von (100,Y0) über die Mitte nach (900,Y0)
// Quadratische Kurve mit gleich verteilten Stützpunkten in x: x(t) ist linear, Station i liegt bei t = i/4
// und damit genau über der Mitte von Spalte i (Spaltenmitten bei 10 %, 30 %, 50 %, 70 %, 90 %).
const P0: [number, number] = [100, Y0], P1: [number, number] = [500, 2 * YM - Y0], P2: [number, number] = [900, Y0];
const KURVE = bogen(P0, P1, P2);
const PFAD = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;
const STATIONEN = [0, 1, 2, 3, 4].map((i) => KURVE(i / 4));
const PLAN = zeitplan(1100, 900, 900);

export function WegBand({ stationen }: { stationen: [string, string, string][] }) {
  const flaeche = useRef<HTMLDivElement>(null);
  const laeufer = useRef<HTMLSpanElement>(null);
  const spalten = useRef<(HTMLLIElement | null)[]>([]);
  const ringe = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const f = flaeche.current, dot = laeufer.current;
    if (!f || !dot || typeof dot.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { dauer, halte } = PLAN;
    let anims: Animation[] = [];
    let sichtbar = false;
    const opt: KeyframeAnimationOptions = { duration: dauer, iterations: Infinity };

    const bauen = () => {
      const { width, height } = f.getBoundingClientRect();
      if (!width) return;
      const zeit = anims[0]?.currentTime ?? 0;
      anims.forEach((a) => a.cancel());
      anims = [
        dot.animate(laeuferBilder(KURVE, B, H, width, height, PLAN), opt),
        dot.animate([{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.03 }, { opacity: 1, offset: 0.96 }, { opacity: 0, offset: 1 }], opt),
      ];
      // Spalten und Ringe leuchten, solange der Punkt an ihrer Station steht (nur Deckkraft und transform).
      halte.forEach((h, i) => {
        const an = Math.min(h.von + 0.02, h.bis), aus = h.bis;
        const licht: Keyframe[] = [
          { offset: 0, opacity: 0 },
          ...(h.von > 0 ? [{ offset: Math.max(0, h.von - 0.001), opacity: 0 }] : []),
          { offset: an, opacity: 1 },
          { offset: aus, opacity: 1 },
          { offset: Math.min(1, aus + 0.04), opacity: 0 },
          ...(aus + 0.04 < 1 ? [{ offset: 1, opacity: 0 }] : []),
        ];
        const sp = spalten.current[i]?.querySelector<HTMLElement>("[data-licht]");
        if (sp) anims.push(sp.animate(licht, { ...opt, easing: "linear" }));
        const ring = ringe.current[i];
        if (ring)
          anims.push(
            ring.animate(
              [
                { offset: 0, opacity: 0, transform: "scale(0.6)" },
                ...(h.von > 0 ? [{ offset: Math.max(0, h.von - 0.001), opacity: 0, transform: "scale(0.6)" }] : []),
                { offset: an, opacity: 0.9, transform: "scale(1)" },
                { offset: Math.min(1, an + 0.08), opacity: 0, transform: "scale(2.2)" },
                { offset: 1, opacity: 0, transform: "scale(2.2)" },
              ],
              opt,
            ),
          );
      });
      const start = document.timeline.currentTime;
      anims.forEach((a) => {
        a.startTime = start;
        a.currentTime = zeit;
        if (!sichtbar) a.pause();
      });
    };
    bauen();
    let warte = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(warte);
      warte = requestAnimationFrame(bauen);
    });
    ro.observe(f);
    const io = new IntersectionObserver(
      ([e]) => {
        sichtbar = e.isIntersecting;
        anims.forEach((a) => (sichtbar ? a.play() : a.pause()));
      },
      { threshold: 0.3 },
    );
    io.observe(f);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(warte);
      anims.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div data-testid="weg-band">
      <div ref={flaeche} className="relative hidden md:block">
        <svg viewBox={`0 0 ${B} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden="true">
          <path d={PFAD} fill="none" stroke="#DCD2C6" strokeWidth={3} strokeLinecap="round" />
          <path d={PFAD} fill="none" stroke="#5A1D1D" strokeWidth={3} strokeLinecap="round" pathLength={1} className="weg-band-strich" />
          {STATIONEN.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={13} fill={i === 4 ? "#5E7D5A" : "#5A1D1D"} />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={600} fill="#F5F2EE" fontFamily="var(--font-open-sans), sans-serif">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        {/* Ringe und Läufer als HTML-Ebene: bewegt per transform, ohne die Zeichnung neu zu malen */}
        {STATIONEN.map(([x, y], i) => (
          <span
            key={i}
            ref={(r) => {
              ringe.current[i] = r;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute block h-10 w-10 rounded-full border-2 opacity-0"
            style={{ left: `calc(${(x / B) * 100}% - 20px)`, top: `calc(${(y / H) * 100}% - 20px)`, borderColor: i === 4 ? "#5E7D5A" : "#5A1D1D" }}
          />
        ))}
        <span ref={laeufer} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 block h-0 w-0 opacity-0" style={{ willChange: "transform" }}>
          <span className="absolute -left-[8px] -top-[8px] block h-4 w-4 rounded-full border-[3px] border-[#5E7D5A] bg-[#F5F2EE]" />
        </span>
      </div>
      <ol className="grid border-t border-tinte md:mt-6 md:grid-cols-5 md:border-t-0">
        {stationen.map(([name, praxis, patient], i) => (
          <li
            key={name}
            ref={(r) => {
              spalten.current[i] = r;
            }}
            className="relative border-b border-linie py-6 md:border-b-0 md:px-4 md:text-center"
          >
            <span data-licht aria-hidden="true" className="pointer-events-none absolute inset-x-1 inset-y-0 hidden rounded-[6px] bg-[#EFE3DA] opacity-0 md:block" />
            <div className="relative">
              <p className="flex items-baseline gap-3 md:block">
                <span className="j-ziffer text-3xl md:hidden">{i + 1}</span>
                <span className="j-titel text-[1.6rem] text-tinte">{name}</span>
              </p>
              <p className="mt-3 text-[15px] text-tinte">
                <span className="font-semibold text-brand-700">Praxis</span>
                <span className="md:block"> {praxis}</span>
              </p>
              <p className="mt-2 text-[15px] text-tinte">
                <span className="font-semibold text-salbei-700">Patient</span>
                <span className="md:block"> {patient}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
