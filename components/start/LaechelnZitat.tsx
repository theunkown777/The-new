"use client";

import { useEffect, useRef, useState } from "react";
import { LAECHELN_ABLAUF, LAECHELN_SCHLUSS, LAECHELN_SEITEN, type LaechelnPhase, type LaechelnSeite } from "@/lib/laecheln";

const SEITEN: LaechelnSeite[] = ["praxis", "patient"];
const BOGEN = "M16 16 Q128 76 240 76 Q352 76 464 16";

// Bedeutung des Namens: Sorrida heißt „lächeln“. Praxis und Patient zeichnen je eine Hälfte des Bogens aus dem Logo,
// erst zusammen wird daraus ein Lächeln. Der Ablauf läuft von selbst, einmal je Seitenaufruf, sobald das Feld im Bild ist:
// Praxis-Hälfte, Patient-Hälfte, dann laufen beide zur Mitte. Zu klicken gibt es nichts.
// Im HTML steht immer der Endzustand als ruhiger Text (ohne JavaScript, für Vorleseprogramme, bei „Bewegung reduzieren“).
// Nur data-phase steuert die Optik; bewegt werden stroke-dashoffset, opacity und transform (CSS in app/globals.css).
export function LaechelnZitat({ rahmen }: { rahmen: string }) {
  // null: kein Ablauf, der Endzustand steht einfach da
  const [phase, setPhase] = useState<LaechelnPhase | null>(null);
  const feld = useRef<HTMLDivElement>(null);
  const beobachter = useRef<IntersectionObserver | null>(null);
  const timer = useRef<number[]>([]);

  useEffect(() => {
    const el = feld.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (e) => {
        if (!e.some((x) => x.isIntersecting && x.intersectionRatio >= 0.39)) {
          // Noch nicht im Bild: Ausgangslage herstellen und weiter warten
          setPhase((p) => p ?? "wartet");
          return;
        }
        // Einmal gestartet, läuft der Ablauf über Zeitgeber bis zum Ende, auch wenn jemand schnell weiterscrollt
        io.disconnect();
        setPhase("wartet");
        timer.current = LAECHELN_ABLAUF.map((s) => window.setTimeout(() => setPhase(s.phase), s.abMs));
      },
      { threshold: [0, 0.4], rootMargin: "0px 0px -10% 0px" },
    );
    beobachter.current = io;
    io.observe(el);
    return () => {
      io.disconnect();
      timer.current.forEach(clearTimeout);
    };
  }, []);

  // Kommt der Tastaturfokus auf den Link, bevor der Ablauf fertig ist, steht der Endzustand sofort da
  const sofort = () => {
    if (phase === null || phase === "beide") return;
    beobachter.current?.disconnect();
    timer.current.forEach(clearTimeout);
    setPhase(null);
  };

  return (
    <section className="j-ein laecheln bg-brand-700 text-[#F5F2EE]" aria-labelledby="laecheln-titel" data-testid="laecheln-zitat" data-phase={phase ?? undefined}>
      <div className={`${rahmen} py-20 sm:py-32`}>
        <div className="lg:text-center">
          <h2 id="laecheln-titel" className="j-schau text-[clamp(2.8rem,6vw,5.2rem)] text-[#F5F2EE]">
            Damit beide Seiten{" "}
            <span className="relative inline-block">
              <em className="!text-brand-200">lächeln.</em>
              <svg viewBox="0 0 100 10" className="pointer-events-none absolute left-[2%] top-[88%] h-auto w-[90%] overflow-visible" aria-hidden="true" focusable="false">
                <path className="laecheln-wort" d="M3 3 Q48 11 93 3" pathLength={1} fill="none" stroke="#DFC2BC" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="mt-8 max-w-xl text-[19px] leading-relaxed text-[#F5F2EE]/80 lg:mx-auto">
            Sorrida ist italienisch und heißt „lächeln“. Der Bogen aus dem Logo zieht sich durch das ganze Produkt: als Weg, als Markierung, als
            Unterschriftslinie. Die Praxis hat weniger Arbeit, der Patient versteht, was er bekommt und was es kostet.
          </p>
        </div>

        <div ref={feld} className="laecheln-feld mt-14 border-t border-[#F5F2EE]/20 pt-12 lg:mt-16 lg:pt-14">
          <svg viewBox="0 0 480 94" className="laecheln-bogen" aria-hidden="true" focusable="false">
            <g className="laecheln-gruppe" fill="none" strokeLinecap="round">
              <path className="laecheln-spur" d={BOGEN} strokeWidth={3} />
              <path className="laecheln-haelfte" data-seite="praxis" d="M16 16 Q128 76 240 76" pathLength={1} stroke="#F5F2EE" strokeWidth={4} />
              <path className="laecheln-haelfte" data-seite="patient" d="M464 16 Q352 76 240 76" pathLength={1} stroke="#DFC2BC" strokeWidth={4} />
              {/* Der ganze Bogen in einer Farbe legt sich darüber, sobald sich die Hälften treffen */}
              <path className="laecheln-ganz" d={BOGEN} stroke="#F5F2EE" strokeWidth={4} />
            </g>
            <g className="laecheln-treff">
              <circle className="laecheln-ring" cx={240} cy={76} r={6} fill="none" stroke="#F5F2EE" strokeWidth={1.5} />
            </g>
          </svg>
          {SEITEN.map((s) => (
            <div key={s} className="laecheln-seite" data-seite={s} data-testid={`laecheln-${s}`}>
              <h3 className="laecheln-name">{LAECHELN_SEITEN[s].name}</h3>
              <p className="laecheln-text">{LAECHELN_SEITEN[s].text}</p>
            </div>
          ))}
          {/* Alle Fassungen liegen in derselben Zelle: Die Höhe ist reserviert, beim Wechsel springt nichts.
              Vorgelesen wird nur der Endzustand; die Zwischenzeilen sind reine Optik. */}
          <div className="laecheln-status-feld" data-testid="laecheln-status" onFocus={sofort}>
            <div className="laecheln-status" data-stand="beide">
              <p className="laecheln-titel j-titel">{LAECHELN_SCHLUSS.titel}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#F5F2EE]/80">{LAECHELN_SCHLUSS.text}</p>
              <a href={LAECHELN_SCHLUSS.link.href} className="laecheln-link mt-2" data-testid="laecheln-link">
                {LAECHELN_SCHLUSS.link.text} <span className="j-pfeil" aria-hidden="true">→</span>
              </a>
            </div>
            {SEITEN.map((s) => (
              <p key={s} className="laecheln-status laecheln-titel j-titel" data-stand={s} aria-hidden="true">
                {LAECHELN_SEITEN[s].status}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
