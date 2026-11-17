"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Haken } from "@/components/Haken";
import { patientenansichtOeffnen } from "@/components/DemoPatientButton";
import { FUEHRUNG_LEER, FUEHRUNG_SCHLUESSEL, FUEHRUNG_SCHRITTE, fuehrungAktuell, fuehrungErledigt, fuehrungFertig, fuehrungLesen, fuehrungNachSeite, type FuehrungZustand } from "@/lib/demoFuehrung";
import { APP_RUNDGANG_START, FUEHRUNG_SCHRITT_EREIGNIS, FUEHRUNG_WIEDER_EREIGNIS } from "@/lib/rundgang";

// Nur im Gastzugang: schmale Leiste über dem Inhalt mit drei Schritten zum Mitklicken und dem Weg zum Überblick
// (Rundgang durch alle Hauptseiten, components/AppRundgang.tsx). Der Stand liegt im sessionStorage dieses Tabs.
// Wegklicken blendet die Leiste für diesen Tab aus; „Führung wieder einblenden“ (im „Mehr“ des Hinweises oben und
// unter Frag Sorrida) holt sie über ein Ereignis zurück. Bis der Stand gelesen ist, zeigt sie nichts: So blitzt eine
// weggeklickte Leiste beim Laden nicht kurz auf.
export function DemoFuehrung({ ueberblick }: { ueberblick?: number }) {
  const pfad = usePathname();
  const [z, setZ] = useState<FuehrungZustand>(FUEHRUNG_LEER);
  const [bereit, setBereit] = useState(false);
  const [busy, setBusy] = useState(false);
  const aktuellRef = useRef(z);
  aktuellRef.current = z;
  const leiste = useRef<HTMLDivElement>(null);
  const fokusNachEinblenden = useRef(false);

  const merken = (neu: FuehrungZustand) => {
    aktuellRef.current = neu;
    setZ(neu);
    try {
      window.sessionStorage.setItem(FUEHRUNG_SCHLUESSEL, JSON.stringify(neu));
    } catch {
      // Ohne Speicher gilt der Stand bis zum nächsten Laden der Seite.
    }
  };

  // Stand lesen und mit der offenen Seite abgleichen (auch bei jedem Seitenwechsel).
  useEffect(() => {
    let alt = FUEHRUNG_LEER;
    try {
      alt = fuehrungLesen(window.sessionStorage.getItem(FUEHRUNG_SCHLUESSEL));
    } catch {
      // siehe oben
    }
    const neu = fuehrungNachSeite(alt, pfad);
    if (neu !== alt) merken(neu);
    else {
      aktuellRef.current = alt;
      setZ(alt);
    }
    setBereit(true);
  }, [pfad]);

  // Wieder einblenden und Schritt 2 abhaken, ausgelöst von Knöpfen an anderer Stelle.
  useEffect(() => {
    const wieder = () => {
      fokusNachEinblenden.current = true;
      merken({ ...aktuellRef.current, zu: false });
    };
    const schritt = (e: Event) => {
      if ((e as CustomEvent<number>).detail === 2) merken(fuehrungErledigt(aktuellRef.current, 2));
    };
    window.addEventListener(FUEHRUNG_WIEDER_EREIGNIS, wieder);
    window.addEventListener(FUEHRUNG_SCHRITT_EREIGNIS, schritt);
    return () => {
      window.removeEventListener(FUEHRUNG_WIEDER_EREIGNIS, wieder);
      window.removeEventListener(FUEHRUNG_SCHRITT_EREIGNIS, schritt);
    };
  }, []);

  // Nach „wieder einblenden“: Fokus auf den aktuellen Schritt, damit man weiß, wo die Leiste steht.
  useEffect(() => {
    if (!fokusNachEinblenden.current || z.zu || !bereit) return;
    fokusNachEinblenden.current = false;
    const ziel = leiste.current?.querySelector<HTMLElement>('[aria-current="step"] a, [aria-current="step"] button, a, button');
    ziel?.focus();
  }, [z.zu, bereit]);

  if (!bereit || z.zu) return null;
  const fertig = fuehrungFertig(z);
  const aktuell = fuehrungAktuell(z, pfad);

  const patientenansicht = async () => {
    setBusy(true);
    try {
      await patientenansichtOeffnen();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={leiste} className="demo-fuehrung border-b border-slate-200 bg-white" data-testid="demo-fuehrung">
      <div className="flex items-center gap-3 px-4 py-1.5 text-sm sm:px-6 lg:px-10">
        {/* Sind alle Schritte erledigt, macht der Vorspann Platz: So bleibt die Leiste mit dem Knopf eine Zeile. */}
        {!fertig && <p className="hidden shrink-0 text-slate-500 md:block" aria-hidden="true">In drei Schritten ausprobieren</p>}
        <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1" aria-label="Führung im Gastzugang: in drei Schritten ausprobieren">
          {FUEHRUNG_SCHRITTE.map((s) => {
            const erledigt = z.erledigt.includes(s.nr);
            const dran = aktuell === s.nr;
            const klasse = `ziel rounded-md px-2 py-1 ${dran ? "font-semibold text-brand-700" : erledigt ? "text-slate-600" : "text-slate-700"} hover:bg-slate-50 hover:text-brand-700`;
            const inhalt = (
              <>
                <span
                  className={`mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${erledigt ? "border-salbei-600 bg-salbei-50" : dran ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 text-slate-600"}`}
                >
                  {erledigt ? <Haken className="!mr-0 !h-3.5 !w-3.5" /> : <span aria-hidden="true">{s.nr}</span>}
                </span>
                <span className="sr-only">{erledigt ? `Schritt ${s.nr}, erledigt: ` : `Schritt ${s.nr}: `}</span>
                {s.text}
              </>
            );
            return (
              // Am Handy steht nur der aktuelle Schritt da, damit die Leiste eine Zeile bleibt.
              <li key={s.nr} className={`${dran ? "flex" : "hidden sm:flex"} items-center`} aria-current={dran ? "step" : undefined} data-testid={`demo-schritt-${s.nr}`} data-erledigt={erledigt ? "ja" : "nein"}>
                {s.nr > 1 && <span className="mr-1 hidden text-slate-400 sm:inline" aria-hidden="true">→</span>}
                {s.href ? (
                  <Link href={s.href} className={klasse}>{inhalt}</Link>
                ) : (
                  <button type="button" onClick={patientenansicht} disabled={busy} className={`${klasse} disabled:opacity-60`}>{inhalt}</button>
                )}
              </li>
            );
          })}
          {!fertig && aktuell && <li className="text-xs text-slate-500 sm:hidden" aria-hidden="true">{aktuell} von 3</li>}
          {fertig && <li className="text-slate-600 sm:hidden">Alle 3 Schritte erledigt</li>}
          {fertig && (
            <li className="flex items-center">
              <span className="mr-1 hidden text-slate-400 sm:inline" aria-hidden="true">→</span>
              <Link href="/hilfe#pilot" className="ziel rounded-md bg-brand-700 px-3 py-1 font-semibold text-white hover:bg-brand-800" data-testid="demo-fuehrung-pilot">Pilotplatz anfragen</Link>
            </li>
          )}
        </ol>
        {/* Überblick: Rundgang durch alle Hauptseiten der App, Stand in der Adresse (?rundgang=n). */}
        {ueberblick ? (
          <Link href={APP_RUNDGANG_START} className="ziel shrink-0 rounded-md px-2 py-1 font-medium text-brand-700 underline hover:bg-slate-50" data-testid="demo-fuehrung-ueberblick">
            <span className="sm:hidden">Überblick<span className="sr-only"> in {ueberblick} Stationen</span></span>
            <span className="hidden sm:inline">Überblick in {ueberblick} Stationen</span>
          </Link>
        ) : null}
        <button type="button" onClick={() => merken({ ...z, zu: true })} aria-label="Führung ausblenden" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-700" data-testid="demo-fuehrung-zu">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
