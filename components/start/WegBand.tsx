"use client";

import { useEffect, useRef } from "react";

// Der Behandlungsweg über die volle Breite: fünf Stationen genau über der Mitte ihrer Spalte.
// Ein Punkt läuft den Lächelbogen ab, hält an jeder Station mittig kurz an, und die Spalte darunter
// leuchtet so lange auf. Läuft nur, solange das Band zu sehen ist; bei "Bewegung reduzieren" steht alles still.

const B = 1000, H = 120, Y0 = 26, YM = 98; // Bogen von (100,Y0) über die Mitte nach (900,Y0)
// Quadratische Kurve mit gleich verteilten Stützpunkten in x: x(t) ist linear, Station i liegt bei t = i/4
// und damit genau über der Mitte von Spalte i (Spaltenmitten bei 10 %, 30 %, 50 %, 70 %, 90 %).
const P0 = [100, Y0], P1 = [500, 2 * YM - Y0], P2 = [900, Y0];
const punkt = (t: number) => [
  (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0],
  (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1],
];
const PFAD = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;
const STATIONEN = [0, 1, 2, 3, 4].map((i) => punkt(i / 4));

// Zeitplan eines Umlaufs: an jeder Station halten, dazwischen weich weiterfahren.
const HALT = 1100, FAHRT = 900, PAUSE_ENDE = 900;
const DAUER = 5 * HALT + 4 * FAHRT + PAUSE_ENDE;
const einAus = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2); // weiches Anfahren und Abbremsen

function zeitplan() {
  const halte: { von: number; bis: number }[] = [];
  let t = 0;
  for (let i = 0; i < 5; i++) {
    halte.push({ von: t / DAUER, bis: (t + HALT + (i === 4 ? PAUSE_ENDE : 0)) / DAUER });
    t += HALT + (i === 4 ? PAUSE_ENDE : 0) + FAHRT;
  }
  return halte;
}

export function WegBand({ stationen }: { stationen: [string, string, string][] }) {
  const svg = useRef<SVGSVGElement>(null);
  const laeufer = useRef<SVGGElement>(null);
  const spalten = useRef<(HTMLLIElement | null)[]>([]);
  const ringe = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const el = svg.current, dot = laeufer.current;
    if (!el || !dot || typeof dot.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const halte = zeitplan();
    // Punkt: Schlüsselbilder entlang des Bogens. Halten = gleicher Ort, Fahrt = Zwischenpunkte mit weicher Kurve.
    const bilder: Keyframe[] = [];
    const pos = (t: number) => {
      const [x, y] = punkt(t);
      return `translate(${x}px, ${y}px)`;
    };
    halte.forEach((h, i) => {
      bilder.push({ offset: h.von, transform: pos(i / 4) });
      bilder.push({ offset: h.bis, transform: pos(i / 4) });
      if (i < 4) {
        const ende = halte[i + 1].von;
        for (let k = 1; k < 16; k++) bilder.push({ offset: h.bis + ((ende - h.bis) * k) / 16, transform: pos((i + einAus(k / 16)) / 4) });
      }
    });

    const anims: Animation[] = [];
    anims.push(dot.animate(bilder, { duration: DAUER, iterations: Infinity }));
    anims.push(
      dot.animate(
        [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.03 }, { opacity: 1, offset: 0.96 }, { opacity: 0, offset: 1 }],
        { duration: DAUER, iterations: Infinity },
      ),
    );
    // Spalten und Ringe leuchten, solange der Punkt an ihrer Station steht.
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
      if (sp) anims.push(sp.animate(licht, { duration: DAUER, iterations: Infinity, easing: "linear" }));
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
            { duration: DAUER, iterations: Infinity },
          ),
        );
    });
    // Alle auf denselben Takt legen, dann nur laufen lassen, wenn das Band zu sehen ist.
    const start = document.timeline.currentTime;
    anims.forEach((a) => {
      a.startTime = start;
      a.pause();
    });
    const io = new IntersectionObserver(([e]) => anims.forEach((a) => (e.isIntersecting ? a.play() : a.pause())), { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      anims.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div data-testid="weg-band">
      <svg ref={svg} viewBox={`0 0 ${B} ${H}`} className="hidden h-auto w-full overflow-visible md:block" aria-hidden="true">
        <path d={PFAD} fill="none" stroke="#DCD2C6" strokeWidth={3} strokeLinecap="round" />
        <path d={PFAD} fill="none" stroke="#5A1D1D" strokeWidth={3} strokeLinecap="round" pathLength={1} className="weg-band-strich" />
        {STATIONEN.map(([x, y], i) => (
          <g key={i}>
            <circle
              ref={(r) => {
                ringe.current[i] = r;
              }}
              cx={x}
              cy={y}
              r={20}
              fill="none"
              stroke={i === 4 ? "#5E7D5A" : "#5A1D1D"}
              strokeWidth={2}
              opacity={0}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <circle cx={x} cy={y} r={13} fill={i === 4 ? "#5E7D5A" : "#5A1D1D"} />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={600} fill="#F5F2EE" fontFamily="var(--font-open-sans), sans-serif">
              {i + 1}
            </text>
          </g>
        ))}
        <g ref={laeufer} opacity={0}>
          <circle r={7} fill="#F5F2EE" stroke="#5E7D5A" strokeWidth={3} />
        </g>
      </svg>
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
