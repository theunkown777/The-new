"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RundgangKarte, fokusZurueck, useRundgangPlatz } from "@/components/RundgangKarte";
import { RUNDGANG_ANKER, RUNDGANG_HREF, RUNDGANG_SCHLUESSEL, RUNDGANG_ZU, rundgangWebsite } from "@/lib/rundgang";

// Rundgang auf der Startseite (lib/rundgang.ts, RUNDGANG_WEBSITE).
// Beim ersten Betreten lädt eine kleine Einladung ein; sie ist nicht modal und sofort schließbar. Am Handy steht sie als
// letzte Zeile im Auftakt; am PC schwebt sie unten rechts und nur, solange der Auftakt im Bild ist.
// Gespeichert wird nur, wenn jemand „Nein danke“ wählt oder den Rundgang beendet: „sorrida-rundgang“ = „zu“ im
// Sitzungsspeicher dieses Tabs (app/datenschutz, Abschnitt 3; lib/browserSpeicher.test.ts). Ohne diesen Klick nichts.
// Starten lässt er sich jederzeit über „/#rundgang“ (Kopf, Handy-Menü, Fuß).

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
  // Zuletzt gezeigter Abschnitt: Ersatz für den Fokus am Ende, wenn der Auslöser fehlt oder nicht im Blick ist.
  const letzterBereich = useRef<HTMLElement | null>(null);

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
    const roh = station.anker.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const ziele = roh.map(bereich);
    const breite = document.documentElement.clientWidth;
    for (const z of ziele) {
      z.classList.add(ZIEL);
      if (z.getBoundingClientRect().width >= breite - 2) z.classList.add(ZIEL_VOLL);
    }
    letzterBereich.current = ziele[0] ?? null;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const erstes = ziele[0];
    if (erstes) {
      const oben = erstes.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(erstes).scrollMarginTop) || 0);
      // Überschrift der Station: der Anker selbst oder die erste große Überschrift im Abschnitt.
      const kopf = /^H[1-6]$/.test(roh[0].tagName) ? roh[0] : roh[0].querySelector<HTMLElement>("h1, h2");
      // Eine klebende Überschrift (sticky) zeigt nicht ihre eigentliche Lage: Dann gilt nur der Anfang des Abschnitts.
      const klebt = (el: HTMLElement) => {
        for (let x: HTMLElement | null = el; x && x !== erstes; x = x.parentElement) if (getComputedStyle(x).position === "sticky") return true;
        return false;
      };
      const kopfOben = kopf && !klebt(kopf) ? kopf.getBoundingClientRect().top + window.scrollY : oben;
      // Ziele am Anfang der Seite (Auftakt): ganz nach oben, damit Kopf und Link „Rundgang“ im Blick bleiben.
      // Sonst an den Anfang des Abschnitts. Steht viel Luft über der Überschrift, davon höchstens 2rem, damit der Inhalt
      // über der Karte steht und nicht von ihr verdeckt wird.
      const ziel = oben < window.innerHeight * 0.3 ? 0 : Math.max(oben, kopfOben - 2 * parseFloat(getComputedStyle(document.documentElement).fontSize));
      window.scrollTo({ top: ziel, behavior: ruhig ? "auto" : "smooth" });
    }
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
    fokusZurueck(ausloeser.current, letzterBereich.current);
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
          // Der Fokus bleibt beim Auftakt, wo die Einladung stand.
          fokusZurueck(null, document.getElementById("auftakt"));
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
      seite={s.seite}
      onZurueck={() => setNr((n) => Math.max(1, n - 1))}
      onWeiter={() => setNr((n) => Math.min(stationen.length, n + 1))}
      onEnde={beenden}
    />
  );
}

/**
 * Ab dieser Breite (Tailwind „lg“) stehen Text und Handybild im Auftakt nebeneinander und die Einladung schwebt unten
 * rechts. Darunter, an Handy und Tablet, steht sie im Auftakt.
 */
const SCHWEBT_AB = "(min-width: 1024px)";

/**
 * Einladung beim ersten Betreten: klein, nicht modal. Sie nimmt den Fokus nicht an sich.
 * An Handy und Tablet steht sie fest als letzte Zeile im Auftakt und verdeckt nichts. Am PC schwebt sie rechts unten
 * über dem Handybild, aber nur, solange der Auftakt bis ins untere Drittel des Fensters reicht; danach blendet sie aus und gibt
 * den Platz unten wieder frei (app/globals.css, .rundgang-einladung). Der Rundgang bleibt über Kopf, Menü und
 * Fuß erreichbar.
 */
function Einladung({ anzahl, onStart, onNein }: { anzahl: number; onStart: () => void; onNein: () => void }) {
  const karte = useRef<HTMLElement>(null);
  // null: Breite noch nicht gelesen; bis dahin bleibt die Einladung unsichtbar.
  const [schwebt, setSchwebt] = useState<boolean | null>(null);
  const [auftaktImBild, setAuftaktImBild] = useState(false);
  // Liegt der Tastaturfokus in der Einladung, bleibt sie stehen, auch wenn der Auftakt aus dem Bild läuft.
  const [fokusDrin, setFokusDrin] = useState(false);
  useEffect(() => {
    const breite = window.matchMedia(SCHWEBT_AB);
    const lesen = () => setSchwebt(breite.matches);
    lesen();
    breite.addEventListener("change", lesen);
    return () => breite.removeEventListener("change", lesen);
  }, []);
  useEffect(() => {
    const auftakt = document.getElementById("auftakt");
    if (!auftakt || typeof IntersectionObserver === "undefined") {
      setAuftaktImBild(true);
      return;
    }
    // Im Bild heißt: Der Auftakt reicht noch ins untere Drittel des Fensters. So liegt die Einladung nur über dem
    // Auftakt, nie über dem Inhalt des nächsten Abschnitts. In einem sehr hohen Fenster endet der Auftakt schon am
    // Seitenanfang weiter oben; dort zählt, ob er überhaupt zu sehen ist.
    const ende = auftakt.getBoundingClientRect().bottom + window.scrollY;
    const rand = ende > window.innerHeight * 0.7 ? "-70% 0px 0px 0px" : "0px";
    const io = new IntersectionObserver((meldungen) => setAuftaktImBild(meldungen[meldungen.length - 1].isIntersecting), { rootMargin: rand });
    io.observe(auftakt);
    return () => io.disconnect();
  }, []);
  const da = schwebt === null ? false : schwebt ? auftaktImBild || fokusDrin : true;
  // Platz am unteren Rand nur, solange die Einladung dort wirklich steht.
  useRundgangPlatz(karte, schwebt === true && da);
  return (
    <section
      ref={karte}
      aria-labelledby="rundgang-einladung-titel"
      className="rundgang-karte rundgang-einladung mt-8 border-t border-linie pb-4 pt-5 text-tinte lg:fixed lg:bottom-6 lg:right-6 lg:z-40 lg:mt-0 lg:w-[24rem] lg:rounded-[10px] lg:border lg:border-linie-stark lg:bg-papier lg:px-5 lg:pb-4 lg:pt-3 lg:shadow-[0_24px_48px_-24px_rgba(60,40,30,.55)]"
      data-da={da ? "" : undefined}
      data-testid="rundgang-einladung"
      onFocus={() => setFokusDrin(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFokusDrin(false)}
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
      {/* Im Auftakt neben dem Hauptknopf zurückhaltend (Linie und Textknopf, 44 px Tippfläche), schwebend wie gewohnt. */}
      <div className={`flex flex-wrap items-center ${schwebt ? "mt-2.5 gap-2" : "mt-3 gap-x-5 gap-y-1"}`}>
        <button type="button" onClick={onStart} className={schwebt ? "j-knopf j-knopf-voll !min-h-[40px] !px-4 text-sm" : "j-knopf j-knopf-linie !min-h-[44px] !px-4"} data-testid="rundgang-einladung-start">
          Rundgang starten
        </button>
        <button
          type="button"
          onClick={onNein}
          className={schwebt ? "j-knopf j-knopf-linie !min-h-[40px] !px-4 text-sm" : "j-link inline-flex min-h-[44px] items-center px-1 text-[15px] font-semibold text-tinte-2"}
          data-testid="rundgang-einladung-nein"
        >
          Nein danke
        </button>
      </div>
    </section>
  );
}
