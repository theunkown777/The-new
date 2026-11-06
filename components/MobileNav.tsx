"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

// Gleiche Bereiche wie die Seitenleiste am Desktop, damit am Handy nichts fehlt.
const LINKS = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/mein-bereich", label: "Mein Bereich" },
  { href: "/termine", label: "Termine" },
  { href: "/praxismanager", label: "Praxismanager" },
  { href: "/vorsorge", label: "Vorsorge fällig" },
  { href: "/patients", label: "Patienten" },
  { href: "/abschluss/new", label: "Behandlung abschließen" },
  { href: "/proposals", label: "Vorschläge" },
  { href: "/reports", label: "Berichte" },
  { href: "/zahlungen", label: "Zahlungen" },
  { href: "/abrechnung", label: "Abrechnung" },
  { href: "/abrechnungspruefung", label: "Abrechnungsprüfung" },
  { href: "/analyse", label: "Analyse" },
];

export function MobileNav({ userName, dental = true, team = false, analyse = false, personPl = "Patienten", abschluss = "Behandlung" }: { userName?: string | null; dental?: boolean; team?: boolean; analyse?: boolean; personPl?: string; abschluss?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-brand-700 hover:text-white"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-t border-brand-800 bg-brand-600 px-4 py-3 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm">
            {LINKS.filter((l) => (dental || l.href !== "/reports") && (analyse || l.href !== "/analyse")).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white"
              >
                {link.href === "/patients" ? personPl : link.href === "/abschluss/new" ? `${abschluss} abschließen` : link.label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white"
            >
              Einstellungen
            </Link>
            {team && (
              <Link href="/anfragen" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white">
                Anfragen (Team)
              </Link>
            )}
          </nav>
          <div className="mt-2 flex items-center justify-between border-t border-brand-700 px-2 pt-3 text-sm text-brand-100">
            <span>{userName}</span>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
