"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ERKLAERUNG, THEMA_KURZ, themenFuerFach, type ErklaerThema } from "@/lib/modelle/erklaerung";
import { ERKLAER_BILDER, MENSCH_BILD } from "@/lib/modelle/erklaerBilder";

// Einstieg in die Erklärungen: der ganze Mensch mit Punkten. Ein Klick fährt weich an die Stelle
// heran, danach öffnet sich die Erklärungsansicht. Für ein Fach erscheinen nur seine Punkte.
const ErklaerAnsicht = dynamic(() => import("./ErklaerAnsicht"), { ssr: false });

const ZOOM_MS = 650;

export function MenschKarte({ fach, ueberschrift = true }: { fach?: string | null; ueberschrift?: boolean }) {
  const themen = themenFuerFach(fach).filter((t) => ERKLAER_BILDER[t] || !MENSCH_BILD);
  const [ziel, setZiel] = useState<ErklaerThema | null>(null);
  const [offen, setOffen] = useState<ErklaerThema | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Erklärungsbild schon vorladen, wenn der Mauszeiger über einem Punkt steht.
  const vorladen = (t: ErklaerThema) => {
    const b = ERKLAER_BILDER[t];
    if (b) {
      const img = new Image();
      img.src = b.datei;
    }
    void import("./ErklaerAnsicht");
  };
  const waehlen = (t: ErklaerThema) => {
    vorladen(t);
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (ruhig || !MENSCH_BILD?.punkte[t]) return setOffen(t);
    setZiel(t);
    timer.current = window.setTimeout(() => setOffen(t), ZOOM_MS);
  };
  const schliessen = () => {
    setOffen(null);
    setZiel(null);
  };

  const p = ziel && MENSCH_BILD?.punkte[ziel];
  return (
    <section data-testid="mensch-karte">
      {ueberschrift && (
        <div className="max-w-2xl">
          <h2 className="j-schau text-[clamp(2rem,3.6vw,3rem)]">
            Zeigen, <em>wo es sitzt.</em>
          </h2>
          <p className="j-text mt-3">
            Tippen Sie auf einen Punkt am Körper. Das Bild fährt heran und öffnet die Erklärung mit allen Teilen, so wie Sie sie dem Patienten am
            Bildschirm zeigen.
          </p>
        </div>
      )}
      <div className={`grid items-center gap-8 ${MENSCH_BILD ? "md:grid-cols-[auto_minmax(0,1fr)]" : ""} ${ueberschrift ? "mt-8" : ""}`}>
        {MENSCH_BILD && (
          <div
            className="relative mx-auto overflow-hidden rounded-[10px] bg-[#FBF9F6]"
            style={{ width: `min(100%, 20rem, calc(72vh * ${MENSCH_BILD.breite / MENSCH_BILD.hoehe}))` }}
          >
            <div className="mensch-zoom relative" style={p ? { transform: "scale(2.6)", transformOrigin: `${p.x}% ${p.y}%` } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MENSCH_BILD.datei} alt="Menschlicher Körper" width={MENSCH_BILD.breite} height={MENSCH_BILD.hoehe} className="block h-auto w-full" />
              {themen.map((t, i) => {
                const q = MENSCH_BILD!.punkte[t];
                if (!q) return null;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => waehlen(t)}
                    onPointerEnter={() => vorladen(t)}
                    aria-label={`${THEMA_KURZ[t]} erklären`}
                    className={`mensch-punkt group absolute -translate-x-1/2 -translate-y-1/2 ${ziel && ziel !== t ? "opacity-0" : ""}`}
                    style={{ left: `${q.x}%`, top: `${q.y}%`, ["--i" as string]: i }}
                    data-testid={`punkt-${t}`}
                  >
                    <span className="absolute -inset-1 rounded-full bg-white/60 ring-1 ring-brand-700/30" aria-hidden="true" />
                    <span className="mensch-puls absolute inset-0 rounded-full bg-brand-600" aria-hidden="true" />
                    <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-700 shadow-[0_2px_6px_rgba(0,0,0,.35)]" />
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-tinte px-1.5 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                      {THEMA_KURZ[t]}
                    </span>
                  </button>
                );
              })}
            </div>
            {MENSCH_BILD && (
              <p className="absolute bottom-1 right-2 text-[10px] text-tinte-2/80">
                Bild:{" "}
                <a href={MENSCH_BILD.quelleUrl} className="underline" target="_blank" rel="noopener">
                  {MENSCH_BILD.autor}
                </a>
                , {MENSCH_BILD.lizenz}
              </p>
            )}
          </div>
        )}
        <ul className={`grid gap-3 ${themen.length > 3 ? "sm:grid-cols-2" : ""}`}>
          {themen.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => waehlen(t)}
                onPointerEnter={() => vorladen(t)}
                className="j-kachel group flex w-full items-center gap-4 rounded-[8px] bg-[#F3E4DF] p-4 text-left"
                data-testid={`thema-${t}`}
              >
                {ERKLAER_BILDER[t] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ERKLAER_BILDER[t]!.datei} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[6px] bg-white object-contain p-1" />
                )}
                <span className="min-w-0">
                  <span className="j-titel block text-[1.45rem] leading-tight text-tinte group-hover:text-brand-700">{ERKLAERUNG[t].titel}</span>
                  <span className="mt-0.5 block text-[13.5px] text-tinte-2">{ERKLAERUNG[t].teile.length} Teile mit Erklärung</span>
                </span>
                <span className="j-pfeil ml-auto text-tinte-2 group-hover:text-brand-700" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {offen && <ErklaerAnsicht thema={offen} fach={fach ?? undefined} onSchliessen={schliessen} />}
    </section>
  );
}
