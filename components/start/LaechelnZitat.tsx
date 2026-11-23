"use client";

import { useEffect, useRef, useState } from "react";
import { LAECHELN_HINWEIS, LAECHELN_SEITEN, LAECHELN_STAENDE, LAECHELN_STATUS, laechelnStand, type LaechelnSeite } from "@/lib/laecheln";

// Bedeutung des Namens: Sorrida heißt „lächeln“. Praxis und Patient zeichnen je eine Hälfte des Bogens aus dem Logo,
// erst zusammen wird daraus ein Lächeln. Jede Seite lässt sich aus- und wieder einschalten.
// Der Server liefert den vollständigen Endzustand (auch ohne JavaScript). Der Einstieg ist nur Optik (data-intro):
// Er zeichnet Bogen, Mundwinkel, Treffpunkt und Status ein; die Schalter zeigen ab dem ersten Bild ihren echten Zustand. Bewegt werden nur stroke-dashoffset, opacity und transform (CSS in app/globals.css).
export function LaechelnZitat({ rahmen }: { rahmen: string }) {
  const [an, setAn] = useState({ praxis: true, patient: true });
  const [intro, setIntro] = useState<"wartet" | "laeuft" | "fertig">("wartet");
  const [benutzt, setBenutzt] = useState(false);
  const bogen = useRef<SVGSVGElement>(null);
  const timer = useRef(0);
  const stand = laechelnStand(an.praxis, an.patient);

  useEffect(() => {
    const el = bogen.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      // Kein Einstieg: sofort der Endzustand (in einer Mikroaufgabe, nicht synchron im Effekt)
      queueMicrotask(() => setIntro("fertig"));
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (!e.some((x) => x.isIntersecting)) return;
        io.disconnect();
        setIntro((i) => (i === "wartet" ? "laeuft" : i));
        timer.current = window.setTimeout(() => setIntro("fertig"), 2900);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer.current);
    };
  }, []);

  const fertig = () => {
    clearTimeout(timer.current);
    setIntro("fertig");
  };

  const umschalten = (s: LaechelnSeite) => {
    fertig();
    setBenutzt(true);
    setAn((a) => ({ ...a, [s]: !a[s] }));
  };

  const knopf = (s: LaechelnSeite) => (
    <button
      type="button"
      className={`laecheln-knopf ${s === "praxis" ? "[grid-area:kpraxis]" : "[grid-area:kpatient]"}`}
      data-seite={s}
      aria-pressed={an[s]}
      aria-describedby={`laecheln-${s}-text`}
      data-testid={`laecheln-${s}`}
      onClick={() => umschalten(s)}
    >
      <span className="laecheln-punkt" aria-hidden="true" />
      {LAECHELN_SEITEN[s].name}
    </button>
  );

  const seitenText = (s: LaechelnSeite) => (
    <p id={`laecheln-${s}-text`} className={`laecheln-text ${s === "praxis" ? "[grid-area:tpraxis]" : "[grid-area:tpatient]"}`} data-seite={s}>
      {LAECHELN_SEITEN[s].text}
    </p>
  );

  return (
    <section
      className="j-ein laecheln bg-brand-700 text-[#F5F2EE]"
      aria-labelledby="laecheln-titel"
      data-testid="laecheln-zitat"
      data-praxis={an.praxis ? "an" : "aus"}
      data-patient={an.patient ? "an" : "aus"}
      data-voll={stand === "beide" ? "" : undefined}
      data-intro={intro}
    >
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
          <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-[#F5F2EE]/80 lg:mx-auto">
            Sorrida ist italienisch und heißt „lächeln“. Der Bogen aus dem Logo zieht sich durch das ganze Produkt: als Weg, als Markierung, als
            Unterschriftslinie. Die Praxis hat weniger Arbeit, der Patient versteht, was er bekommt und was es kostet.
          </p>
        </div>

        <div role="group" aria-labelledby="laecheln-frage" className="mt-14 border-t border-[#F5F2EE]/20 pt-10 lg:mt-16 lg:pt-12">
          <div className="lg:text-center">
            <p id="laecheln-frage" className="laecheln-frage">
              Wer soll lächeln?
            </p>
            <p className="mt-1 text-[14px] text-[#F5F2EE]/75">{LAECHELN_HINWEIS}</p>
          </div>
          <div className="laecheln-feld mt-8">
            {knopf("praxis")}
            {knopf("patient")}
            <svg
              ref={bogen}
              viewBox="0 0 480 112"
              className="laecheln-bogen block h-auto w-full overflow-visible [grid-area:bogen] lg:mx-auto lg:max-w-[35rem]"
              aria-hidden="true"
              focusable="false"
            >
              <g className="laecheln-gruppe" fill="none" strokeLinecap="round">
                <path className="laecheln-spur" data-seite="praxis" d="M16 16 Q128 76 240 76" strokeWidth={3} />
                <path className="laecheln-spur" data-seite="patient" d="M464 16 Q352 76 240 76" strokeWidth={3} />
                <path className="laecheln-haelfte" data-seite="praxis" d="M16 16 Q128 76 240 76" pathLength={1} stroke="#F5F2EE" strokeWidth={4} />
                <path className="laecheln-haelfte" data-seite="patient" d="M464 16 Q352 76 240 76" pathLength={1} stroke="#DFC2BC" strokeWidth={4} />
              </g>
              <circle className="laecheln-ecke" data-seite="praxis" cx={16} cy={16} r={5} stroke="#F5F2EE" strokeWidth={2} />
              <circle className="laecheln-ecke" data-seite="patient" cx={464} cy={16} r={5} stroke="#DFC2BC" strokeWidth={2} />
              <circle className="laecheln-ring" cx={240} cy={76} r={6} fill="none" stroke="#F5F2EE" strokeWidth={1.5} />
              <circle className="laecheln-mitte" cx={240} cy={76} r={5} fill="#F5F2EE" />
            </svg>
            {/* Kommt der Fokus in den Status, bevor der Einstieg ihn eingeblendet hat, steht er sofort da */}
            <div className="grid [grid-area:status]" data-testid="laecheln-status" data-stand={stand} onFocus={() => intro !== "fertig" && fertig()}>
              {LAECHELN_STAENDE.map((k) => {
                const v = LAECHELN_STATUS[k];
                const ist = k === stand;
                return (
                  <div key={k} className={`laecheln-status [grid-area:1/1] ${ist ? (benutzt ? "kurz-ein" : "") : "invisible"}`} aria-hidden={!ist} inert={!ist}>
                    <p className="j-titel text-[1.55rem] italic text-[#F5F2EE] lg:text-[1.75rem]">{v.titel}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#F5F2EE]/80">{v.text}</p>
                    {v.link && (
                      <a href={v.link.href} className="laecheln-link mt-2" data-testid={ist ? "laecheln-link" : undefined}>
                        {v.link.text} <span className="j-pfeil" aria-hidden="true">→</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {seitenText("praxis")}
            {seitenText("patient")}
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="laecheln-ansage">
            {benutzt ? `${LAECHELN_STATUS[stand].titel} ${LAECHELN_STATUS[stand].text}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
