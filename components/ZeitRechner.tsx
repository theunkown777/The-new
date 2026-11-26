"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Immer eine Nachkommastelle („20,0“), damit die Zahl beim Laufen nicht zwischen zwei Schreibweisen springt.
const EINE_STELLE = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const LAUFZEIT_MS = 180;

/**
 * Die angezeigte Zahl läuft in 0,18 s zum Ziel. Jede neue Eingabe bricht den laufenden Weg ab und startet vom gerade
 * gezeigten Wert, so hängt die Zahl beim schnellen Ziehen nicht nach. Bei „Bewegung reduzieren“ springt sie direkt.
 */
function useLaufzahl(ziel: number): number {
  const [wert, setWert] = useState(ziel);
  const stand = useRef(ziel);
  useEffect(() => {
    const von = stand.current;
    if (von === ziel) return;
    const dauer = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LAUFZEIT_MS;
    const start = performance.now();
    let bild = requestAnimationFrame(function schritt(jetzt: number) {
      const t = dauer ? Math.min(1, Math.max(0, (jetzt - start) / dauer)) : 1;
      // Auslaufen wie --ease-out (cubic-bezier(0.23, 1, 0.32, 1)): schnell los, weich ankommen
      stand.current = t === 1 ? ziel : von + (ziel - von) * (1 - (1 - t) ** 5);
      setWert(stand.current);
      if (t < 1) bild = requestAnimationFrame(schritt);
    });
    return () => cancelAnimationFrame(bild);
  }, [ziel]);
  return wert;
}

// Ehrlicher Zeitrechner: rechnet nur mit den Annahmen der Praxis, nichts ist gemessen.
export function ZeitRechner() {
  const [gespraeche, setGespraeche] = useState(25);
  const [rueckfragen, setRueckfragen] = useState(50);
  const [minuten, setMinuten] = useState(6);
  const [schreiben, setSchreiben] = useState(8);
  // Pro Woche: Rückfragen am Tresen/Telefon, die der Patienten-Link erspart, plus händisch geschriebene Kostenschätzungen.
  const minutenProMonat = Math.round(gespraeche * 4.3 * ((rueckfragen / 100) * minuten + schreiben));
  const stunden = Math.round((minutenProMonat / 60) * 10) / 10;
  const tage = Math.max(1, Math.round(stunden / 8));
  const anzeige = EINE_STELLE.format(useLaufzahl(stunden));

  // Ergebniszeile für Handy und Tablet (Regler und Kasten stehen dort untereinander): Sie steht, solange Regler im
  // Bild sind und die große Zahl nicht. Läge sie über dem zuletzt angefassten Regler, wechselt sie an den oberen Rand.
  const regler = useRef<HTMLDivElement>(null);
  const grosseZahl = useRef<HTMLParagraphElement>(null);
  const zeileUnten = useRef<HTMLParagraphElement>(null);
  const angefasst = useRef<HTMLElement | null>(null);
  const [reglerImBild, setReglerImBild] = useState(false);
  const [zahlImBild, setZahlImBild] = useState(false);
  const [oben, setOben] = useState(false);
  const zeigen = reglerImBild && !zahlImBild;

  useEffect(() => {
    const r = regler.current;
    const z = grosseZahl.current;
    if (!r || !z || typeof IntersectionObserver === "undefined") return;
    // Regler zählen erst, wenn mindestens einer wirklich zu bedienen ist; die Zahl zählt, wenn sie über der Zeile lesbar ist.
    const ioRegler = new IntersectionObserver(([e]) => setReglerImBild(e.isIntersecting), { rootMargin: "-96px 0px -96px 0px" });
    ioRegler.observe(r);
    // Ist der Rundgang offen, verdeckt seine Karte den unteren Rand: Die Zahl zählt erst über der Karte als lesbar.
    const html = document.documentElement;
    let ioZahl: IntersectionObserver | null = null;
    let rand = "";
    const zahlBeobachten = () => {
      const karte = html.hasAttribute("data-rundgang") ? parseFloat(html.style.getPropertyValue("--rundgang-oben")) || 0 : 0;
      const neu = `0px 0px -${Math.max(72, Math.ceil(karte) + 8)}px 0px`;
      if (neu === rand && ioZahl) return;
      rand = neu;
      ioZahl?.disconnect();
      ioZahl = new IntersectionObserver(([e]) => setZahlImBild(e.isIntersecting), { rootMargin: neu, threshold: 0.5 });
      ioZahl.observe(z);
    };
    zahlBeobachten();
    const karteBeobachten = new MutationObserver(zahlBeobachten);
    karteBeobachten.observe(html, { attributes: true, attributeFilter: ["data-rundgang", "style"] });
    return () => {
      ioRegler.disconnect();
      ioZahl?.disconnect();
      karteBeobachten.disconnect();
    };
  }, []);

  const lagePruefen = useCallback(() => {
    const r = angefasst.current;
    const z = zeileUnten.current;
    // Ab lg gibt es die Zeile nicht (keine Höhe). offsetTop: Lage ohne die Einblend-Bewegung.
    if (!r || !z || !z.offsetHeight) return setOben(false);
    setOben(r.getBoundingClientRect().bottom > z.offsetTop - 8);
  }, []);
  const anfassen = (e: { target: EventTarget }) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    angefasst.current = e.target;
    lagePruefen();
  };
  // Beim Scrollen wandert der Regler; die Lage höchstens einmal pro Bild neu prüfen, und nur solange die Zeile steht.
  useEffect(() => {
    if (!zeigen) return;
    let bild = 0;
    const rollen = () => {
      if (bild) return;
      bild = requestAnimationFrame(() => {
        bild = 0;
        lagePruefen();
      });
    };
    rollen();
    window.addEventListener("scroll", rollen, { passive: true });
    window.addEventListener("resize", rollen);
    return () => {
      window.removeEventListener("scroll", rollen);
      window.removeEventListener("resize", rollen);
      cancelAnimationFrame(bild);
    };
  }, [zeigen, lagePruefen]);

  const feld = (label: string, value: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="block border-b border-linie py-4">
      <span className="flex items-baseline justify-between gap-4 text-[15px] text-tinte">
        {label}
        <b className="shrink-0 text-[19px] font-semibold tabular-nums text-brand-700">
          {value}
          {unit && <span className="ml-1 text-[13px] font-normal text-tinte-2">{unit}</span>}
        </b>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))}
        className="j-regler" style={{ ["--wert" as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </label>
  );

  // Die Zeile wiederholt nur den großen Kasten; Vorleseprogramme bekommen den Wert dort (role="status").
  const zeile = (wo: "unten" | "oben") => (
    <p
      ref={wo === "unten" ? zeileUnten : undefined}
      aria-hidden="true"
      data-da={zeigen && oben === (wo === "oben") ? "1" : "0"}
      className={wo === "unten" ? "zeit-zeile rundgang-ausweichen" : "zeit-zeile zeit-zeile-oben"}
      data-testid={`zeitrechner-zeile-${wo}`}
    >
      <span className="j-marke">Pro Monat, bis zu</span>
      <b className="text-[19px] font-semibold tabular-nums text-brand-700">
        {anzeige}
        <span className="ml-1 text-[13px] font-normal text-tinte-2">h</span>
      </b>
    </p>
  );

  return (
    <div id="zeitrechner" className="grid scroll-mt-6 gap-12 lg:grid-cols-12" data-testid="zeitrechner">
      <div className="j-ein lg:col-span-6">
        <h2 className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)]">
          Wie viel Zeit bekommt <em>Ihr Team</em> zurück?
        </h2>
        <p className="j-text mt-5 max-w-md">Rechnen Sie mit Ihren eigenen Zahlen. Gemessen ist davon nichts; im Pilotbetrieb messen wir es mit Ihnen.</p>
        <div ref={regler} className="mt-8 border-t border-tinte" onPointerDown={anfassen} onFocus={anfassen}>
          {feld("Gespräche pro Woche mit Kosten- oder Selbstzahlerfragen", gespraeche, setGespraeche, 5, 150, 5, "")}
          {feld("davon mit Rückfrage am Tresen oder Telefon", rueckfragen, setRueckfragen, 0, 100, 10, "%")}
          {feld("Minuten je Rückfrage", minuten, setMinuten, 2, 20, 1, "min")}
          {feld("Minuten für Kostenschätzung und Schreiben von Hand", schreiben, setSchreiben, 0, 20, 1, "min")}
        </div>
      </div>
      <div className="j-ein flex flex-col justify-center bg-papier-2 px-8 py-12 sm:px-12 lg:col-span-5 lg:col-start-8 lg:[--verzug:100ms]">
        <p className="j-marke">Gewonnene Zeit pro Monat, bis zu</p>
        {/* Die sichtbare Zahl läuft; vorgelesen wird nur der Endwert aus der Zeile darunter. */}
        <p ref={grosseZahl} aria-hidden="true" className="j-zahl mt-4 text-[clamp(4.2rem,9vw,7.5rem)] leading-none text-brand-700" data-testid="zeitrechner-stunden">
          {anzeige}<span className="ml-2 text-[0.35em] text-tinte"> h</span>
        </p>
        <p className="sr-only" role="status">{EINE_STELLE.format(stunden)} Stunden pro Monat</p>
        <p className="j-text mt-6 max-w-sm">
          Das sind etwa {tage} {tage === 1 ? "Arbeitstag" : "Arbeitstage"} einer Fachkraft, die wieder für Patienten da {tage === 1 ? "ist" : "sind"}.
        </p>
      </div>
      {/* Außerhalb der Spalten: Dort bewegt .j-ein kurz, und eine feste Lage braucht einen Vorfahren ohne transform. */}
      {zeile("unten")}
      {zeile("oben")}
    </div>
  );
}
