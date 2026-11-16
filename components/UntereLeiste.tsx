"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/SidebarNav";
import { MENUE_UMSCHALTEN, MENUE_ZUSTAND } from "@/components/MobileNav";

// Handy und Tablet: feste Leiste am unteren Rand mit den vier häufigsten Zielen.
// „Mehr“ öffnet das vorhandene Menü (components/MobileNav.tsx); dort greifen die Rechte je Rolle.
// Die drei festen Ziele sieht jede Rolle auch in der Seitenleiste.
function Symbol({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={NAV_ICONS[name]} />
    </svg>
  );
}

const KLASSE = "relative flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight";

export function UntereLeiste({ eingang = 0, personPl = "Patienten" }: { eingang?: number; personPl?: string }) {
  const pfad = usePathname();
  const [menueOffen, setMenueOffen] = useState(false);
  useEffect(() => {
    const zustand = (e: Event) => setMenueOffen(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(MENUE_ZUSTAND, zustand);
    return () => window.removeEventListener(MENUE_ZUSTAND, zustand);
  }, []);

  const ziele: [string, string, string, string][] = [
    ["/dashboard", "Heute", "dashboard", "leiste-heute"],
    ["/patients", personPl, "patients", "leiste-patienten"],
    ["/eingang", "Eingang", "eingang", "leiste-eingang"],
  ];
  return (
    <nav className="leiste-unten" aria-label="Schnellzugriff" data-testid="leiste-unten">
      <div className="mx-auto flex max-w-xl items-stretch">
        {ziele.map(([href, name, symbol, testid]) => {
          const aktiv = !menueOffen && (pfad === href || (href !== "/dashboard" && pfad.startsWith(href)));
          return (
            <Link key={href} href={href} aria-current={aktiv ? "page" : undefined} data-testid={testid} className={`${KLASSE} ${aktiv ? "font-semibold text-brand-700" : "text-slate-600 hover:text-brand-700"}`}>
              {aktiv && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand-700" aria-hidden="true" />}
              <span className="relative">
                <Symbol name={symbol} />
                {href === "/eingang" && eingang > 0 && (
                  <span className="absolute -right-3 -top-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold leading-4 text-white" data-testid="eingang-zahl-leiste">
                    {eingang > 99 ? "99+" : eingang}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{name}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={menueOffen}
          aria-haspopup="dialog"
          onClick={() => window.dispatchEvent(new Event(MENUE_UMSCHALTEN))}
          data-testid="leiste-mehr"
          className={`${KLASSE} ${menueOffen ? "font-semibold text-brand-700" : "text-slate-600 hover:text-brand-700"}`}
        >
          {menueOffen && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand-700" aria-hidden="true" />}
          <Symbol name="start" />
          <span>Mehr</span>
        </button>
      </div>
    </nav>
  );
}
