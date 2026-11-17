"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HILFE_ZEIGEN, ZEIGER_MARKIERUNG_MS, ZEIGER_WARTEN_MS, ankerWaehlen, type ZeigAuftrag } from "@/lib/hilfeZeiger";
import { MENUE_UMSCHALTEN, MENUE_ZUSTAND } from "@/lib/menueEreignisse";

// „Zeig mir wo“: öffnet die Seite, wartet auf das Element mit data-hilfe (bzw. die id auf der Website), klappt
// umschließende <details> auf, scrollt dorthin, setzt den Fokus und markiert es (Klasse hilfe-ziel in app/globals.css).
// Die Markierung verschwindet bei Klick, Escape oder nach acht Sekunden. Nicht gefunden: Menüpfad als Hinweis.
// Einmal im Layout eingehängt (App und Website); ausgelöst über das Ereignis HILFE_ZEIGEN.

/** Auftrag an den Zeiger schicken (aus Frag Sorrida und der Seite „Frag Sorrida“). */
export function hilfeZeigen(a: ZeigAuftrag) {
  window.dispatchEvent(new CustomEvent<ZeigAuftrag>(HILFE_ZEIGEN, { detail: a }));
}

const pause = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function sichtbar(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const st = window.getComputedStyle(el);
  return st.visibility !== "hidden" && st.display !== "none";
}
/** Sichtbar, oder in einem zugeklappten <details>, dessen Kopf sichtbar ist (das klappt der Zeiger auf). */
function zeigbar(el: HTMLElement): boolean {
  if (sichtbar(el)) return true;
  const zu = el.closest("details:not([open])");
  return !!zu && sichtbar(zu);
}
function suchen(selektor: string): HTMLElement | null {
  let liste: HTMLElement[] = [];
  try {
    liste = Array.from(document.querySelectorAll<HTMLElement>(selektor)).filter((el) => !el.closest("[data-frag-sorrida]"));
  } catch {
    return null;
  }
  return ankerWaehlen(liste.map((el) => ({ el, sichtbar: zeigbar(el) })))?.el ?? null;
}

export function HilfeZeiger() {
  const router = useRouter();
  const [hinweis, setHinweis] = useState<string | null>(null);
  const menueOffen = useRef(false);
  const lauf = useRef(0);
  const aufraeumen = useRef<(() => void) | null>(null);
  const hinweisTimer = useRef<number | null>(null);

  useEffect(() => {
    const zustand = (e: Event) => {
      menueOffen.current = !!(e as CustomEvent<boolean>).detail;
    };
    window.addEventListener(MENUE_ZUSTAND, zustand);
    return () => window.removeEventListener(MENUE_ZUSTAND, zustand);
  }, []);

  useEffect(() => {
    function zeigeHinweis(text: string | null, dauer = ZEIGER_MARKIERUNG_MS) {
      if (hinweisTimer.current) window.clearTimeout(hinweisTimer.current);
      setHinweis(text);
      if (text) hinweisTimer.current = window.setTimeout(() => setHinweis(null), dauer);
    }

    async function warten(selektor: string, nr: number, bis: number): Promise<HTMLElement | null> {
      for (;;) {
        if (nr !== lauf.current) return null;
        const el = suchen(selektor);
        if (el || Date.now() > bis) return el;
        await pause(80);
      }
    }

    function markieren(el: HTMLElement, a: ZeigAuftrag) {
      for (let d = el.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
      const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: ruhig ? "auto" : "smooth" });
      const fokussierbar = el.matches("a[href], button, input, select, textarea, summary, [tabindex]");
      const tabAlt = el.getAttribute("tabindex");
      if (!fokussierbar) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      el.classList.add("hilfe-ziel");
      zeigeHinweis(`Hier: ${a.name}`);
      const ende = () => {
        el.classList.remove("hilfe-ziel");
        if (!fokussierbar) {
          if (tabAlt === null) el.removeAttribute("tabindex");
          else el.setAttribute("tabindex", tabAlt);
        }
        window.clearTimeout(timer);
        window.removeEventListener("keydown", taste, true);
        window.removeEventListener("pointerdown", ende, true);
        if (aufraeumen.current === ende) aufraeumen.current = null;
        zeigeHinweis(null);
      };
      const taste = (e: KeyboardEvent) => {
        if (e.key === "Escape") ende();
      };
      const timer = window.setTimeout(ende, ZEIGER_MARKIERUNG_MS);
      window.addEventListener("keydown", taste, true);
      window.addEventListener("pointerdown", ende, true);
      aufraeumen.current = ende;
    }

    async function ausfuehren(a: ZeigAuftrag, nr: number) {
      const ziel = a.href.split("#")[0];
      const start = Date.now();
      // Erst warten, bis die neue Seite da ist (die Adresse stimmt), dann auf das Element.
      while (!a.gleicheSeite && window.location.pathname + window.location.search !== ziel && Date.now() - start < ZEIGER_WARTEN_MS) {
        await pause(60);
        if (nr !== lauf.current) return;
      }
      await pause(80);
      let el = await warten(a.selektor, nr, Date.now() + ZEIGER_WARTEN_MS);
      // Menüpunkt am Handy: Steht er nicht in der unteren Leiste, erst das Menü öffnen.
      if (!el && a.menue && window.matchMedia("(max-width: 1023px)").matches && !menueOffen.current && nr === lauf.current) {
        window.dispatchEvent(new Event(MENUE_UMSCHALTEN));
        el = await warten(a.selektor, nr, Date.now() + 1500);
      }
      if (nr !== lauf.current) return;
      if (!el) return zeigeHinweis(`Hier nicht sichtbar. Menü: ${a.pfad}`);
      markieren(el, a);
    }

    const zeigen = (ev: Event) => {
      const a = (ev as CustomEvent<ZeigAuftrag>).detail;
      if (!a?.selektor) return;
      const nr = ++lauf.current;
      aufraeumen.current?.();
      zeigeHinweis(null);
      if (!a.gleicheSeite && a.href !== window.location.pathname + window.location.search) router.push(a.href);
      void ausfuehren(a, nr);
    };
    window.addEventListener(HILFE_ZEIGEN, zeigen);
    return () => {
      window.removeEventListener(HILFE_ZEIGEN, zeigen);
      aufraeumen.current?.();
      if (hinweisTimer.current) window.clearTimeout(hinweisTimer.current);
    };
  }, [router]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[75] flex justify-center px-4" aria-live="polite" role="status" data-testid="hilfe-zeiger">
      {hinweis && (
        <p className="auf-dunkel max-w-md rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-lg" data-testid="hilfe-zeiger-hinweis">
          {hinweis}
        </p>
      )}
    </div>
  );
}
