"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

// Begleitkarte für den Rundgang (Website und App). Nicht modal: Die Seite dahinter bleibt lesbar und bedienbar,
// es gibt keine Abdunkelung und keine Fokusfalle. Bedienung: Zurück, Weiter, Beenden; in der Karte zusätzlich
// Pfeil links/rechts und Esc. Beim Start springt der Fokus auf die Überschrift, Wechsel meldet ein aria-live-Bereich.
// Solange eine Karte offen ist, bekommt die Seite unten so viel Platz, wie die Karte hoch ist (app/globals.css,
// html[data-rundgang]); so verdeckt sie am Ende der Seite nichts.

export type RundgangVariante = "website" | "app";

const STIL: Record<RundgangVariante, { karte: string; stand: string; titel: string; text: string; link: string; zu: string; zurueck: string; weiter: string }> = {
  website: {
    karte:
      "fixed inset-x-3 bottom-3 z-40 flex max-h-[45dvh] flex-col rounded-[10px] border border-linie-stark bg-papier text-tinte shadow-[0_24px_48px_-24px_rgba(60,40,30,.55)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-h-[min(36rem,70dvh)] sm:w-[27rem]",
    stand: "j-marke",
    titel: "j-titel text-[1.65rem] leading-tight text-tinte focus:outline-none",
    text: "text-[15px] leading-relaxed text-[#5E5650]",
    link: "j-link font-semibold text-brand-700",
    zu: "grid h-10 w-10 shrink-0 place-items-center rounded-[6px] text-tinte-2 hover:bg-papier-2 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1D1D]",
    zurueck: "j-knopf j-knopf-linie !min-h-[42px] !px-4 text-sm aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:border-[#C4B6A6] aria-disabled:hover:text-tinte",
    weiter: "j-knopf j-knopf-voll !min-h-[42px] !px-4 text-sm",
  },
  app: {
    karte:
      "card fixed inset-x-3 bottom-4 z-40 flex max-h-[45dvh] flex-col !p-0 shadow-lg lg:inset-x-auto lg:bottom-6 lg:left-[18rem] lg:max-h-[min(34rem,70dvh)] lg:w-[26rem]",
    stand: "text-xs font-semibold uppercase tracking-wide text-slate-500",
    titel: "font-display text-2xl leading-tight text-slate-900 focus:outline-none",
    text: "text-sm leading-relaxed text-slate-700",
    link: "font-medium text-brand-700 underline",
    zu: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-700",
    zurueck: "btn btn-secondary aria-disabled:cursor-default aria-disabled:opacity-50",
    weiter: "btn btn-primary",
  },
};

/** Solange eine Karte offen ist: ihre Höhe als CSS-Variable, damit die Seite unten Platz macht. */
export function useRundgangPlatz(ref: React.RefObject<HTMLElement | null>, an: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!an || !el) return;
    const html = document.documentElement;
    const setzen = () => html.style.setProperty("--rundgang-hoehe", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    setzen();
    html.setAttribute("data-rundgang", "an");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setzen) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      html.removeAttribute("data-rundgang");
      html.style.removeProperty("--rundgang-hoehe");
    };
  }, [ref, an]);
}

/** Fokus nach dem Ende zurückgeben: an den Auslöser, sonst an den Knopf seines Menüs, sonst an den Start-Link, sonst an den Inhalt. */
export function fokusZurueck(ausloeser: HTMLElement | null) {
  // Sichtbar heißt: im Dokument, mit Fläche und nicht im Inhalt eines zugeklappten <details> (dessen <summary> zählt).
  const sichtbar = (x: Element | null | undefined): x is HTMLElement => {
    if (!x || !document.contains(x) || (x as HTMLElement).getClientRects().length === 0) return false;
    const details = x.closest("details");
    if (details && !details.open && !x.closest("summary")) return false;
    const pruefen = (x as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility;
    return pruefen ? pruefen.call(x) : true;
  };
  let ziel: HTMLElement | null = sichtbar(ausloeser) && !ausloeser.closest(".rundgang-karte") ? ausloeser : null;
  if (!ziel && ausloeser) {
    const summary = ausloeser.closest("details")?.querySelector("summary");
    if (sichtbar(summary)) ziel = summary;
  }
  if (!ziel) {
    const start = document.querySelector("[data-rundgang-ausloeser]");
    if (sichtbar(start)) ziel = start;
  }
  if (!ziel) {
    const inhalt = document.getElementById("inhalt");
    if (inhalt) {
      if (!inhalt.hasAttribute("tabindex")) inhalt.setAttribute("tabindex", "-1");
      ziel = inhalt;
    }
  }
  window.setTimeout(() => ziel?.focus({ preventScroll: true }), 0);
}

const istFeld = (el: EventTarget | null) => el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable='true']");

export function RundgangKarte({
  variante,
  nr,
  anzahl,
  titel,
  text,
  punkte,
  links,
  fokusBeimStart = true,
  onZurueck,
  onWeiter,
  onEnde,
}: {
  variante: RundgangVariante;
  nr: number;
  anzahl: number;
  titel: string;
  text: string[];
  punkte?: string[];
  links?: { href: string; name: string }[];
  fokusBeimStart?: boolean;
  onZurueck: () => void;
  onWeiter: () => void;
  onEnde: () => void;
}) {
  const s = STIL[variante];
  const uid = useId();
  const karte = useRef<HTMLElement>(null);
  const kopf = useRef<HTMLHeadingElement>(null);
  const inhalt = useRef<HTMLDivElement>(null);
  const [ansage, setAnsage] = useState("");
  const [rollbar, setRollbar] = useState(false);
  const gemeldet = useRef(nr);
  const letzte = nr >= anzahl;
  useRundgangPlatz(karte, true);

  // Beim Start: Fokus auf die Überschrift (sie liest Station und Titel vor).
  useEffect(() => {
    if (fokusBeimStart) kopf.current?.focus({ preventScroll: true });
  }, [fokusBeimStart]);

  // Wechsel der Station melden (nicht beim Start, da liest die Überschrift) und den Text nach oben rollen.
  useEffect(() => {
    if (gemeldet.current === nr) return;
    gemeldet.current = nr;
    setAnsage(`Station ${nr} von ${anzahl}: ${titel}`);
    inhalt.current?.scrollTo({ top: 0 });
  }, [nr, anzahl, titel]);

  // Ragt der Text über die Karte hinaus, muss der Bereich mit der Tastatur erreichbar sein.
  useEffect(() => {
    const el = inhalt.current;
    if (!el) return;
    const pruefen = () => setRollbar(el.scrollHeight > el.clientHeight + 1);
    pruefen();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(pruefen) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [nr]);

  const taste = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onEnde();
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.altKey && !e.ctrlKey && !e.metaKey && !istFeld(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "ArrowRight" && !letzte) onWeiter();
      if (e.key === "ArrowLeft" && nr > 1) onZurueck();
    }
  };

  return (
    <section
      ref={karte}
      aria-labelledby={`${uid}-titel`}
      aria-describedby={`${uid}-stand`}
      className={`rundgang-karte ein-dialog ${s.karte}`}
      data-testid="rundgang-karte"
      data-station={nr}
      onKeyDown={taste}
    >
      <div className={`flex shrink-0 items-center justify-between gap-3 pl-5 pr-2 pt-2 ${variante === "app" ? "border-b border-slate-100 pb-1" : "pb-0"}`}>
        <p id={`${uid}-stand`} className={s.stand} data-testid="rundgang-stand">
          Station {nr} von {anzahl}
        </p>
        <button type="button" onClick={onEnde} aria-label="Rundgang beenden" className={s.zu} data-testid="rundgang-x">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div
        ref={inhalt}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-3 pt-2"
        tabIndex={rollbar ? 0 : undefined}
        role={rollbar ? "group" : undefined}
        aria-label={rollbar ? `Text zu Station ${nr}` : undefined}
      >
        <h2 ref={kopf} id={`${uid}-titel`} tabIndex={-1} className={s.titel} data-testid="rundgang-titel">
          {titel}
        </h2>
        {text.map((t) => (
          <p key={t} className={s.text}>
            {t}
          </p>
        ))}
        {punkte && punkte.length > 0 && (
          <ul className={`list-disc space-y-1 pl-5 ${s.text}`}>
            {punkte.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {links && links.length > 0 && (
          <ul className="space-y-1.5 text-[15px]" aria-label="Weiterführende Seiten" data-testid="rundgang-links">
            {links.map((l) => (
              <li key={l.href}>
                <Link prefetch={false} href={l.href} className={`ziel ${s.link}`}>
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={`flex shrink-0 flex-wrap items-center gap-2 px-5 pb-4 pt-3 ${variante === "app" ? "border-t border-slate-100" : "border-t border-linie"}`}>
        <button
          type="button"
          aria-disabled={nr <= 1 ? true : undefined}
          onClick={() => nr > 1 && onZurueck()}
          className={s.zurueck}
          data-testid="rundgang-zurueck"
        >
          Zurück
        </button>
        <button type="button" onClick={letzte ? onEnde : onWeiter} className={`ml-auto ${s.weiter}`} data-testid={letzte ? "rundgang-ende" : "rundgang-weiter"}>
          {letzte ? "Rundgang beenden" : "Weiter"}
        </button>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="rundgang-ansage">
        {ansage}
      </p>
    </section>
  );
}
