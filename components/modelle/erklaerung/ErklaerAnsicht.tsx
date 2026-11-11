"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ERKLAERUNG, type ErklaerThema } from "@/lib/modelle/erklaerung";
import { ERKLAER_BILDER, type BildPunkt } from "@/lib/modelle/erklaerBilder";

// Erklärungsansicht zum Zeigen am Bildschirm: Bild wie im Anatomie-Atlas, nummerierte Punkte mit
// Linien zu den Namen links und rechts. Ein Klick auf einen Namen oder Punkt fährt weich an die Stelle
// heran und zeigt die Erklärung. Pfeiltasten blättern, Esc geht zurück.

type Platz = BildPunkt & { nr: number; seite: "l" | "r"; labelY: number; was?: string; wofuer?: string; hinweis?: string };

const B = 1000; // Breite der Bühne in Einheiten; Bild belegt die Mitte
const BILD_X = 260, BILD_B = 480;

function verteilen(punkte: BildPunkt[], hoehe: number, top: number): Platz[] {
  const sortiert = [...punkte].sort((a, b) => a.y - b.y);
  const links = sortiert.filter((p) => p.x < 50), rechts = sortiert.filter((p) => p.x >= 50);
  // Etiketten je Seite gleichmäßig über die Bildhöhe verteilen, in der Reihenfolge ihrer Höhe im Bild.
  const lege = (liste: BildPunkt[], seite: "l" | "r") =>
    liste.map((p, i) => ({ ...p, seite, labelY: top + ((i + 0.5) / liste.length) * hoehe }));
  const alle = [...lege(links, "l"), ...lege(rechts, "r")].sort((a, b) => a.y - b.y);
  return alle.map((p, i) => ({ ...p, nr: i + 1 }));
}

export default function ErklaerAnsicht({ thema, onSchliessen, start }: { thema: ErklaerThema; onSchliessen: () => void; fach?: string; start?: string }) {
  const inhalt = ERKLAERUNG[thema];
  const bild = ERKLAER_BILDER[thema];
  const H = bild ? Math.round((BILD_B * bild.hoehe) / bild.breite) : 0;
  const plaetze = useMemo<Platz[]>(() => {
    if (!bild) return [];
    const texte = new Map(inhalt.teile.map((t) => [t.name.toLowerCase(), t]));
    return verteilen(bild.punkte, H * 0.96, H * 0.02).map((p) => {
      const t = texte.get((p.teil ?? p.name).toLowerCase());
      return { ...p, was: t?.was, wofuer: t?.wofuer, hinweis: t?.hinweis };
    });
  }, [bild, inhalt, H]);
  // Teile mit Erklärung, die im Bild keinen Punkt haben (z. B. die Linse in der Seitenansicht des Auges)
  const weitere = useMemo(() => {
    const belegt = new Set((bild?.punkte ?? []).map((p) => (p.teil ?? p.name).toLowerCase()));
    return inhalt.teile.filter((t) => !belegt.has(t.name.toLowerCase()));
  }, [bild, inhalt]);
  const [extra, setExtra] = useState<string | null>(null);
  // Heranfahren nur so weit, wie die Bildauflösung scharf bleibt
  const zoomStufe = bild ? Math.max(1.4, Math.min(2.2, (1.7 * bild.breite) / 480)) : 2;
  const [aktiv, setAktiv] = useState<number | null>(() => {
    const i = start ? plaetze.findIndex((p) => p.name.toLowerCase() === start.toLowerCase()) : -1;
    return i >= 0 ? i : null;
  });
  const schliessenRef = useRef<HTMLButtonElement>(null);
  const huelle = useRef<HTMLDivElement>(null);
  const handyBild = useRef<HTMLDivElement>(null);
  const zurueck = useCallback(() => {
    if (extra) return setExtra(null);
    if (aktiv === null) return onSchliessen();
    setAktiv(null);
  }, [aktiv, extra, onSchliessen]);

  useEffect(() => {
    schliessenRef.current?.focus();
    const alt = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = alt;
    };
  }, []);
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") zurueck();
      if (!plaetze.length) return;
      if (e.key === "ArrowRight") setAktiv((a) => (a === null ? 0 : (a + 1) % plaetze.length));
      if (e.key === "ArrowLeft") setAktiv((a) => (a === null ? plaetze.length - 1 : (a - 1 + plaetze.length) % plaetze.length));
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [zurueck, plaetze.length]);

  // Am Handy liegt die Erklärung als Blatt unten: das Bild nach oben holen, damit es sichtbar bleibt.
  useEffect(() => {
    if (aktiv === null || !huelle.current || !handyBild.current || window.innerWidth >= 1024) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const h = huelle.current;
    const oben = handyBild.current.getBoundingClientRect().top - h.getBoundingClientRect().top + h.scrollTop;
    h.scrollTo({ top: Math.max(0, oben - 12), behavior: ruhig ? "auto" : "smooth" });
  }, [aktiv]);

  const p = aktiv === null ? null : plaetze[aktiv];
  const ex = extra ? inhalt.teile.find((t) => t.name === extra) ?? null : null;
  // Heranfahren: Bild skalieren, Ursprung am gewählten Punkt.
  const zoom = p
    ? { transform: `translate(${50 - p.x}%, ${50 - p.y}%) scale(${zoomStufe})`, transformOrigin: `${p.x}% ${p.y}%` }
    : { transform: "translate(0, 0) scale(1)", transformOrigin: "50% 50%" };
  const waehle = (i: number | null) => {
    setExtra(null);
    setAktiv(i);
  };

  return (
    <div ref={huelle} className="journal fixed inset-0 z-[80] flex flex-col overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="erklaer-titel" data-testid="erklaeransicht">
      <div className="erklaer-ein mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-4 pb-8 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-6 border-b border-linie pb-5">
          <div className="max-w-3xl">
            <p className="j-marke text-brand-700">Erklärung für Patienten</p>
            <h2 id="erklaer-titel" className="j-schau mt-2 text-[clamp(2.2rem,4vw,3.4rem)]">
              {inhalt.titel}
            </h2>
            <p className="j-text mt-3 text-[15.5px]">{inhalt.einleitung}</p>
          </div>
          <button ref={schliessenRef} type="button" onClick={onSchliessen} className="j-knopf j-knopf-linie shrink-0 !px-4" aria-label="Erklärung schließen" data-testid="erklaer-schliessen">
            Schließen ✕
          </button>
        </div>

        {!bild ? (
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {inhalt.teile.map((t) => (
              <li key={t.name} className="rounded-[6px] bg-papier-2 p-5">
                <p className="j-titel text-xl text-tinte">{t.name}</p>
                <p className="mt-1 text-[15px] text-tinte">{t.was}</p>
                <p className="mt-1 text-[15px] text-tinte-2">{t.wofuer}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Bühne: Bild mit Punkten; auf großen Bildschirmen Namen und Linien links und rechts */}
            <div className="relative">
              <div className="relative mx-auto hidden lg:block" style={{ width: `min(100%, calc(74vh * ${B / Math.max(H, 1)}))` }} data-testid="erklaer-buehne">
                <svg viewBox={`0 0 ${B} ${H}`} className="block h-auto w-full" aria-hidden="true">
                  <defs>
                    <clipPath id={`clip-${thema}`}>
                      <rect x={BILD_X} y={0} width={BILD_B} height={H} rx={8} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#clip-${thema})`}>
                    <g className="erklaer-zoom" style={{ ...zoom, transformBox: "fill-box" }}>
                      <image href={bild.datei} x={BILD_X} y={0} width={BILD_B} height={H} preserveAspectRatio="xMidYMid meet" />
                      {plaetze.map((q, i) => (
                        <g key={q.name} className={`erklaer-punkt ${aktiv === i ? "ist-aktiv" : ""}`} style={{ ["--i" as string]: i, opacity: p && aktiv !== i ? 0 : 1, transition: "opacity .2s ease" }}>
                          <circle cx={BILD_X + (q.x / 100) * BILD_B} cy={(q.y / 100) * H} r={aktiv === i ? 6.5 / zoomStufe : 6.5} fill="#5A1D1D" stroke="#fff" strokeWidth={aktiv === i ? 2 / zoomStufe : 2} />
                        </g>
                      ))}
                    </g>
                  </g>
                  <g className={`erklaer-linien ${p ? "ist-weg" : ""}`}>
                    {plaetze.map((q, i) => {
                      const px = BILD_X + (q.x / 100) * BILD_B, py = (q.y / 100) * H;
                      const lx = q.seite === "l" ? 236 : 764;
                      return (
                        <g key={q.name} className="erklaer-linie" style={{ ["--i" as string]: i }}>
                          <path d={`M${lx} ${q.labelY} L${q.seite === "l" ? lx + 14 : lx - 14} ${q.labelY} L${px} ${py}`} fill="none" stroke="#5A1D1D" strokeOpacity={0.55} strokeWidth={1.2} />
                        </g>
                      );
                    })}
                  </g>
                </svg>
                {/* Namen als echte Knöpfe über der Bühne */}
                <div className={`erklaer-namen absolute inset-0 ${p ? "ist-weg" : ""}`}>
                  {plaetze.map((q, i) => (
                    <button
                      key={q.name}
                      type="button"
                      onClick={() => waehle(i)}
                      className={`erklaer-name absolute flex -translate-y-1/2 items-center gap-2 rounded-[6px] px-2 py-1 text-[14px] leading-tight text-tinte hover:bg-papier-2 ${q.seite === "l" ? "flex-row-reverse text-right" : ""}`}
                      style={{
                        top: `${(q.labelY / H) * 100}%`,
                        ...(q.seite === "l" ? { right: `${100 - (236 / B) * 100}%` } : { left: `${(764 / B) * 100}%` }),
                        maxWidth: "23%",
                        ["--i" as string]: i,
                      }}
                      data-testid="erklaer-name"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">{q.nr}</span>
                      <span>{q.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Handy und Tablet: Bild mit nummerierten Punkten, darunter die Liste */}
              <div className="lg:hidden">
                <div ref={handyBild} className="relative overflow-hidden rounded-[8px] bg-[#FBF9F6]">
                  <div className="erklaer-zoom relative" style={zoom}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bild.datei} alt={inhalt.titel} width={bild.breite} height={bild.hoehe} className="block h-auto w-full" />
                    {plaetze.map((q, i) => (
                      <button
                        key={q.name}
                        type="button"
                        onClick={() => waehle(i)}
                        aria-label={q.name}
                        className="absolute grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white shadow ring-2 ring-white"
                        style={{
                          left: `${q.x}%`,
                          top: `${q.y}%`,
                          transform: `translate(-50%, -50%) scale(${p ? 1 / zoomStufe : 1})`,
                          opacity: p && aktiv !== i ? 0 : 1,
                          transition: "opacity .2s ease, transform .7s var(--ease-in-out)",
                        }}
                      >
                        {q.nr}
                      </button>
                    ))}
                  </div>
                </div>
                <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                  {plaetze.map((q, i) => (
                    <li key={q.name}>
                      <button type="button" onClick={() => waehle(i)} className={`flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1.5 text-left text-[14px] ${aktiv === i ? "bg-papier-2 font-semibold text-brand-700" : "text-tinte"}`}>
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[10px] font-semibold text-white">{q.nr}</span>
                        {q.name}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Erklärung des gewählten Teils */}
            <aside
              className={`lg:sticky lg:top-6 lg:self-start ${p || ex ? "erklaer-blatt max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[90] max-lg:max-h-[52vh] max-lg:overflow-y-auto max-lg:rounded-t-[16px] max-lg:bg-[#F3E4DF] max-lg:shadow-[0_-16px_40px_-16px_rgba(36,32,31,.45)]" : ""}`}
              aria-live="polite"
            >
              {ex ? (
                <div key={ex.name} className="erklaer-tafel rounded-[8px] bg-[#F3E4DF] p-6" data-testid="erklaer-tafel">
                  <p className="j-marke text-tinte-2">Im Bild nicht zu sehen</p>
                  <p className="j-titel mt-1 text-[1.9rem] leading-tight text-tinte">{ex.name}</p>
                  <div className="mt-5">
                    <p className="j-marke">Was ist das?</p>
                    <p className="mt-1.5 text-[16px] leading-relaxed text-tinte">{ex.was}</p>
                  </div>
                  <div className="mt-4">
                    <p className="j-marke">Wozu dient es?</p>
                    <p className="mt-1.5 text-[16px] leading-relaxed text-tinte">{ex.wofuer}</p>
                  </div>
                  {ex.hinweis && (
                    <div className="mt-4 rounded-[6px] bg-white/70 p-4">
                      <p className="j-marke text-brand-700">Gut zu wissen</p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-tinte">{ex.hinweis}</p>
                    </div>
                  )}
                  <button type="button" onClick={() => setExtra(null)} className="j-link mt-6 text-[15px] text-tinte-2">
                    Zurück zum Bild
                  </button>
                </div>
              ) : p ? (
                <div key={p.name} className="erklaer-tafel rounded-[8px] bg-[#F3E4DF] p-6" data-testid="erklaer-tafel">
                  <p className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">{p.nr}</span>
                    <span className="j-titel text-[1.9rem] leading-tight text-tinte">{p.name}</span>
                  </p>
                  {p.was && (
                    <div className="mt-5">
                      <p className="j-marke">Was ist das?</p>
                      <p className="mt-1.5 text-[16px] leading-relaxed text-tinte">{p.was}</p>
                    </div>
                  )}
                  {p.wofuer && (
                    <div className="mt-4">
                      <p className="j-marke">Wozu dient es?</p>
                      <p className="mt-1.5 text-[16px] leading-relaxed text-tinte">{p.wofuer}</p>
                    </div>
                  )}
                  {p.hinweis && (
                    <div className="mt-4 rounded-[6px] bg-white/70 p-4">
                      <p className="j-marke text-brand-700">Gut zu wissen</p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-tinte">{p.hinweis}</p>
                    </div>
                  )}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setAktiv((a) => ((a ?? 0) - 1 + plaetze.length) % plaetze.length)} className="j-knopf j-knopf-linie !min-h-[42px] !px-3" aria-label="Vorheriges Teil">
                      ←
                    </button>
                    <button type="button" onClick={() => waehle(null)} className="j-link text-[15px] text-tinte-2" data-testid="erklaer-uebersicht">
                      Ganzes Bild
                    </button>
                    <button type="button" onClick={() => setAktiv((a) => ((a ?? -1) + 1) % plaetze.length)} className="j-knopf j-knopf-voll !min-h-[42px] !px-3" aria-label="Nächstes Teil">
                      →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[8px] bg-papier-2 p-6">
                  <p className="j-titel text-2xl text-tinte">Tippen Sie auf einen Namen oder Punkt.</p>
                  <p className="mt-2 text-[15px] text-tinte-2">Das Bild fährt an die Stelle heran und erklärt sie. Mit den Pfeiltasten blättern Sie durch alle {plaetze.length} Teile.</p>
                </div>
              )}
              {weitere.length > 0 && (
                <div className="mt-5">
                  <p className="j-marke">Weitere Teile, im Bild nicht zu sehen</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {weitere.map((w) => (
                      <li key={w.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setAktiv(null);
                            setExtra(w.name);
                          }}
                          className={`rounded-full border px-3 py-1 text-[13.5px] ${extra === w.name ? "border-brand-700 bg-brand-700 text-white" : "border-linie-stark text-tinte hover:border-brand-700"}`}
                        >
                          {w.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-4 text-[11.5px] leading-snug text-tinte-2">
                Bild: {bild.autor}, {bild.titel ? `„${bild.titel}“, ` : ""}
                <a href={bild.quelleUrl} className="underline" target="_blank" rel="noopener">
                  Quelle
                </a>
                , Lizenz{" "}
                <a href={bild.lizenzUrl} className="underline" target="_blank" rel="noopener">
                  {bild.lizenz}
                </a>
                {bild.geaendert ? "; zugeschnitten und mit deutschen Beschriftungen versehen" : ""}.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
