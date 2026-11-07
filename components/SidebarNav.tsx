"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Seitenleiste der App auf dem Desktop. Sorrida-eigener Aufbau: Gruppen nach
// dem Arbeitsweg (Heute, Patienten, Geld, Praxis); der aktive Eintrag trägt
// den Lächelbogen aus dem Logo statt einer gefüllten Fläche.
const ICONS: Record<string, string> = {
  dashboard: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  patients: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  proposals: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  wrapup: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6",
  reports: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  start: "M4 6h16M4 12h16M4 18h10",
  vorsorge: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10ZM9 12h6M12 9v6",
  anfragen: "M4 4h16v12H8l-4 4zM8 9h8M8 12h5",
  zahlungen: "M3 6h18v12H3zM3 10h18M7 15h3",
  manager: "M4 5h16v10H9l-5 4zM8 9h8M8 12h4",
  abrechnung: "M7 3h10v18l-5-3-5 3zM9 8h6M9 12h6",
  termine: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  pruefung: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  analyse: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  mein: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function SidebarNav({ dental, team = false, analyse = false, personPl = "Patienten", abschluss = "Behandlung" }: { dental: boolean; team?: boolean; analyse?: boolean; personPl?: string; abschluss?: string }) {
  const path = usePathname();
  type L = [string, string, string];
  const gruppen: [string, L[]][] = [
    ["Heute", [["/dashboard", "Übersicht", "dashboard"], ["/mein-bereich", "Mein Bereich", "mein"], ["/termine", "Termine", "termine"], ["/praxismanager", "Praxismanager", "manager"], ["/vorsorge", "Vorsorge fällig", "vorsorge"]]],
    [
      personPl,
      [
        ["/patients", `${personPl} und Wege`, "patients"],
        ["/abschluss/new", `${abschluss} abschließen`, "wrapup"],
        ["/proposals", "Vorschläge", "proposals"],
        ...(dental ? ([["/reports", "Berichte", "reports"]] as L[]) : []),
      ],
    ],
    ["Geld", [["/zahlungen", "Zahlungen", "zahlungen"], ["/abrechnung", "Abrechnung", "abrechnung"], ["/abrechnungspruefung", "Abrechnungsprüfung", "pruefung"], ...(analyse ? ([["/analyse", "Analyse", "analyse"]] as L[]) : [])]],
    [
      "Praxis",
      [
        ["/leistungsverzeichnis", "Leistungsverzeichnis", "abrechnung"],
        ["/settings", "Einstellungen", "settings"],
        ...(team ? ([["/anfragen", "Anfragen (Team)", "anfragen"]] as L[]) : []),
        ["/", "Fachauswahl und Website", "start"],
      ],
    ],
  ];
  const item = ([href, label, icon]: L) => {
    const base = href.replace("/new", "");
    const active = path === href || (href !== "/" && href !== "/dashboard" && path.startsWith(base));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? "bg-white font-semibold text-brand-800 shadow-[0_6px_18px_-14px_rgba(107,42,36,.7)]" : "text-slate-700 hover:bg-white/70 hover:text-brand-700"}`}
      >
        <Icon name={icon} />
        {label}
        {active && (
          <svg viewBox="0 0 40 8" className="absolute bottom-1 left-10 h-1.5 w-8 text-brand-600" aria-hidden="true">
            <path d="M2 2 Q20 10 38 2" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        )}
      </Link>
    );
  };
  return (
    <nav className="space-y-4" aria-label="Hauptnavigation">
      {gruppen.map(([titel, links]) => (
        <div key={titel}>
          <p className="font-display px-3 pb-1 text-base text-slate-500">{titel}</p>
          <div className="space-y-0.5">{links.map(item)}</div>
        </div>
      ))}
    </nav>
  );
}
