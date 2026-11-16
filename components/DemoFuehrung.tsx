"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Haken } from "@/components/Haken";
import { FUEHRUNG_LEER, FUEHRUNG_SCHLUESSEL, FUEHRUNG_SCHRITTE, fuehrungAktuell, fuehrungErledigt, fuehrungFertig, fuehrungLesen, fuehrungNachSeite, type FuehrungZustand } from "@/lib/demoFuehrung";

// Nur im Gastzugang: schmale Leiste über dem Inhalt mit drei Schritten zum Mitklicken.
// Der Stand liegt im sessionStorage dieses Tabs. Wegklicken blendet die Leiste für diesen Tab aus.
export function DemoFuehrung() {
  const pfad = usePathname();
  const [z, setZ] = useState<FuehrungZustand>(FUEHRUNG_LEER);
  const [bereit, setBereit] = useState(false);
  const [busy, setBusy] = useState(false);

  const merken = (neu: FuehrungZustand) => {
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
    else setZ(alt);
    setBereit(true);
  }, [pfad]);

  if (bereit && z.zu) return null;
  const fertig = fuehrungFertig(z);
  const aktuell = fuehrungAktuell(z, pfad);

  const patientenansicht = async () => {
    setBusy(true);
    const tab = window.open("", "_blank");
    const res = await fetch("/api/demo/patientenansicht", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.url) {
      if (tab) tab.location.href = data.url;
      else window.location.assign(data.url);
      merken(fuehrungErledigt(z, 2));
    } else tab?.close();
  };

  return (
    <div className="demo-fuehrung border-b border-slate-200 bg-white" data-testid="demo-fuehrung">
      <div className="flex items-center gap-3 px-4 py-1.5 text-sm sm:px-6 lg:px-10">
        {/* Sind alle Schritte erledigt, macht der Vorspann Platz: So bleibt die Leiste mit dem Knopf eine Zeile. */}
        {!fertig && <p className="hidden shrink-0 text-slate-500 md:block">In drei Schritten ausprobieren</p>}
        <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1">
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
        <button type="button" onClick={() => merken({ ...z, zu: true })} aria-label="Führung ausblenden" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-700" data-testid="demo-fuehrung-zu">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
