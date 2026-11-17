"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RundgangKarte, fokusZurueck, useRundgangPlatz } from "@/components/RundgangKarte";
import { RUNDGANG_ANKER, RUNDGANG_HREF, RUNDGANG_SCHLUESSEL, RUNDGANG_ZU, rundgangWebsite } from "@/lib/rundgang";

// Rundgang auf der Startseite (lib/rundgang.ts, RUNDGANG_WEBSITE).
// Beim ersten Betreten lädt unten eine kleine Karte ein; sie ist nicht modal und sofort schließbar.
// Gespeichert wird nur, wenn jemand „Nein danke“ wählt oder den Rundgang beendet: „sorrida-rundgang“ = „zu“ im
// Sitzungsspeicher dieses Tabs (app/datenschutz, Abschnitt 3; lib/browserSpeicher.test.ts). Ohne diesen Klick nichts.
// Starten lässt er sich jederzeit über „/#rundgang“ (Kopf, Handy-Menü, Fuß, Link neben „Ihr Fach wählen“).

type Modus = "aus" | "einladung" | "lauf";

const ZIEL = "rundgang-ziel";
const ZIEL_VOLL = "rundgang-ziel-voll";

/** Zu markierender Bereich: zu einer Überschrift der ganze Abschnitt, sonst das Element selbst. */
const bereich = (el: HTMLElement): HTMLElement => (/^H[1-6]$/.test(el.tagName) ? (el.closest("section") as HTMLElement | null) ?? el : el);

export function Rundgang({ gastzugang }: { gastzugang: boolean }) {
  const stationen = useMemo(() => rundgangWebsite(gastzugang), [gastzugang]);
  const [modus, setModus] = useState<Modus>("aus");
  const [nr, setNr] = useState(1);
  // Zählt die Starts: Ein neuer Start setzt die Karte neu auf, damit der Fokus wieder auf die Überschrift springt.
  const [lauf, setLauf] = useState(0);
  const ausloeser = useRef<HTMLElement | null>(null);

  const starten = useCallback((von: HTMLElement | null) => {
    ausloeser.current = von;
    setNr(1);
    setLauf((n) => n + 1);
    setModus("lauf");
  }, []);

  // Anker „#rundgang“ aus der Adresse entfernen, damit ein weiterer Klick auf den Link wieder wirkt.
  const ankerWeg = () => window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);

  // Beim Laden: „/#rundgang“ startet sofort. Sonst die Einladung, außer sie wurde in diesem Tab abgelehnt.
  // Nur einmal je Seitenaufruf (auch wenn React den Effekt im Entwicklungsmodus doppelt ausführt).
  const geladen = useRef(false);
  useEffect(() => {
    if (geladen.current) return;
    geladen.current = true;
    if (window.location.hash === `#${RUNDGANG_ANKER}`) {
      ankerWeg();
      starten(null);
      return;
    }
    let abgelehnt = false;
    try {
      abgelehnt = window.sessionStorage.getItem(RUNDGANG_SCHLUESSEL) === RUNDGANG_ZU;
    } catch {
      // Speicher gesperrt: Die Einladung erscheint, gespeichert wird nichts.
    }
    if (!abgelehnt) setModus("einladung");
  }, [starten]);

  // Links „Rundgang“ auf dieser Seite starten ohne Neuladen.
  useEffect(() => {
    const klick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || (href !== RUNDGANG_HREF && href !== `#${RUNDGANG_ANKER}`)) return;
      e.preventDefault();
      a.closest("details")?.removeAttribute("open");
      starten(a);
    };
    const anker = () => {
      if (window.location.hash !== `#${RUNDGANG_ANKER}`) return;
      ankerWeg();
      starten(null);
    };
    document.addEventListener("click", klick);
    window.addEventListener("hashchange", anker);
    return () => {
      document.removeEventListener("click", klick);
      window.removeEventListener("hashchange", anker);
    };
  }, [starten]);

  // Zielabschnitt markieren und in den Blick holen.
  useEffect(() => {
    if (modus !== "lauf") return;
    const station = stationen[nr - 1];
    const ziele = station.anker.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el).map(bereich);
    const breite = document.documentElement.clientWidth;
    for (const z of ziele) {
      z.classList.add(ZIEL);
      if (z.getBoundingClientRect().width >= breite - 2) z.classList.add(ZIEL_VOLL);
    }
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ziele[0]?.scrollIntoView({ block: "start", behavior: ruhig ? "auto" : "smooth" });
    return () => {
      for (const z of ziele) z.classList.remove(ZIEL, ZIEL_VOLL);
    };
  }, [modus, nr, stationen]);

  // Ausdrücklicher Wunsch „nicht mehr anbieten“: nur dann wird gespeichert.
  const merkenZu = () => {
    try {
      window.sessionStorage.setItem(RUNDGANG_SCHLUESSEL, RUNDGANG_ZU);
    } catch {
      // Ohne Speicher kommt die Einladung beim nächsten Laden wieder.
    }
  };

  const beenden = () => {
    merkenZu();
    setModus("aus");
    fokusZurueck(ausloeser.current);
    ausloeser.current = null;
  };

  if (modus === "einladung") {
    return (
      <Einladung
        anzahl={stationen.length}
        onStart={() => starten(null)}
        onNein={() => {
          merkenZu();
          setModus("aus");
          fokusZurueck(null);
        }}
      />
    );
  }
  if (modus !== "lauf") return null;
  const s = stationen[nr - 1];
  return (
    <RundgangKarte
      key={lauf}
      variante="website"
      nr={nr}
      anzahl={stationen.length}
      titel={s.titel}
      text={s.text}
      punkte={s.punkte}
      links={s.links}
      onZurueck={() => setNr((n) => Math.max(1, n - 1))}
      onWeiter={() => setNr((n) => Math.min(stationen.length, n + 1))}
      onEnde={beenden}
    />
  );
}

/**
 * Einladung beim ersten Betreten: klein, unten, nicht modal. Sie nimmt den Fokus nicht an sich. Ab Tablet steht sie
 * rechts unten über dem Handybild, damit Text und Links des Auftakts links frei bleiben.
 */
function Einladung({ anzahl, onStart, onNein }: { anzahl: number; onStart: () => void; onNein: () => void }) {
  const karte = useRef<HTMLElement>(null);
  useRundgangPlatz(karte, true);
  return (
    <section
      ref={karte}
      aria-labelledby="rundgang-einladung-titel"
      className="rundgang-karte ein-dialog fixed inset-x-3 bottom-3 z-40 rounded-[10px] border border-linie-stark bg-papier px-4 pb-3 pt-3 text-tinte shadow-[0_24px_48px_-24px_rgba(60,40,30,.55)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem] sm:px-5 sm:pb-4"
      data-testid="rundgang-einladung"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onNein();
        }
      }}
    >
      <h2 id="rundgang-einladung-titel" className="text-[15px] leading-snug text-tinte">
        <span className="font-semibold">Neu hier?</span> Rundgang durch Sorrida in {anzahl} Stationen.
      </h2>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onStart} className="j-knopf j-knopf-voll !min-h-[40px] !px-4 text-sm" data-testid="rundgang-einladung-start">
          Rundgang starten
        </button>
        <button type="button" onClick={onNein} className="j-knopf j-knopf-linie !min-h-[40px] !px-4 text-sm" data-testid="rundgang-einladung-nein">
          Nein danke
        </button>
      </div>
    </section>
  );
}
