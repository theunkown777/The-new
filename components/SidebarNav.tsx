"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Seitenleiste der App auf dem Desktop (Aufbau angelehnt an übliche Praxisportale,
// Farben und Formen im Sorrida-Stil).
const ICONS: Record<string, string> = {
  dashboard: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  patients: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  proposals: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  wrapup: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6",
  reports: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  start: "M4 6h16M4 12h16M4 18h10",
  anfragen: "M4 4h16v12H8l-4 4zM8 9h8M8 12h5",
  zahlungen: "M3 6h18v12H3zM3 10h18M7 15h3",
  analyse: "M4 20V10M10 20V4M16 20v-7M22 20H2",
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function SidebarNav({ dental, team = false, analyse = false }: { dental: boolean; team?: boolean; analyse?: boolean }) {
  const path = usePathname();
  const links: [string, string, string][] = [
    ["/dashboard", "Übersicht", "dashboard"],
    ["/patients", "Patienten", "patients"],
    ["/proposals", "Vorschläge", "proposals"],
    ["/abschluss/new", "Behandlung abschließen", "wrapup"],
    ["/zahlungen", "Zahlungen", "zahlungen"],
    ...(analyse ? ([["/analyse", "Analyse", "analyse"]] as [string, string, string][]) : []),
    ...(dental ? ([["/reports", "Berichte", "reports"]] as [string, string, string][]) : []),
  ];
  const item = (href: string, label: string, icon: string) => {
    const base = href.replace("/new", "");
    const active = path === href || (href !== "/" && href !== "/dashboard" && path.startsWith(base));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? "bg-brand-600 font-medium text-white" : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"}`}
      >
        <Icon name={icon} />
        {label}
      </Link>
    );
  };
  return (
    <nav className="space-y-1" aria-label="Hauptnavigation">
      {links.map(([h, l, i]) => item(h, l, i))}
      <div className="my-3 border-t border-slate-100" />
      {item("/settings", "Einstellungen", "settings")}
      {team && item("/anfragen", "Anfragen (Team)", "anfragen")}
      {item("/", "Fachauswahl und Website", "start")}
    </nav>
  );
}
