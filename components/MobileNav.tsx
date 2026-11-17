"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

// Gleiche Bereiche wie die Seitenleiste am Desktop, damit am Handy nichts fehlt.
const LINKS = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/eingang", label: "Eingang" },
  { href: "/mein-bereich", label: "Mein Bereich" },
  { href: "/leistungsverzeichnis", label: "Leistungsverzeichnis" },
  { href: "/termine", label: "Termine" },
  { href: "/praxismanager", label: "Praxismanager" },
  { href: "/vorsorge", label: "Vorsorge fällig" },
  { href: "/empfang", label: "Empfang" },
  { href: "/patients", label: "Patienten" },
  { href: "/abschluss/new", label: "Behandlung abschließen" },
  { href: "/proposals", label: "Vorschläge" },
  { href: "/reports", label: "Berichte" },
  { href: "/zahlungen", label: "Zahlungen" },
  { href: "/abrechnung", label: "Abrechnung" },
  { href: "/abrechnungspruefung", label: "Abrechnungsprüfung" },
  { href: "/analyse", label: "Analyse" },
];

// Die untere Leiste (components/UntereLeiste.tsx) öffnet dieses Menü über „Mehr“, „Zeig mir wo“ ebenso.
import { MENUE_UMSCHALTEN, MENUE_ZUSTAND } from "@/lib/menueEreignisse";
export { MENUE_UMSCHALTEN, MENUE_ZUSTAND };

export function MobileNav({ userName, dental, berichte = dental, team = false, analyse = false, zahlungen = true, einstellungen = true, personPl = "Patienten", abschluss = "Behandlung", eingang = 0 }: { eingang?: number; userName?: string | null; dental: boolean; berichte?: boolean; team?: boolean; analyse?: boolean; zahlungen?: boolean; einstellungen?: boolean; personPl?: string; abschluss?: string }) {
  // "kopf": aufgeklappt unter der Kopfzeile (drei Striche). "leiste": als Blatt über der unteren Leiste („Mehr“).
  const [offen, setOffen] = useState<false | "kopf" | "leiste">(false);
  const open = offen !== false;
  const zu = () => setOffen(false);
  const pfad = usePathname();
  // Gleiche Regel wie in der Seitenleiste: Unterseiten zählen zum Bereich.
  const aktiv = (href: string) => pfad === href || (href !== "/dashboard" && pfad.startsWith(href.replace("/new", "")));

  useEffect(() => {
    const umschalten = () => setOffen((v) => (v ? false : "leiste"));
    window.addEventListener(MENUE_UMSCHALTEN, umschalten);
    return () => window.removeEventListener(MENUE_UMSCHALTEN, umschalten);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(MENUE_ZUSTAND, { detail: open }));
    if (!open) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [open]);

  // Blatt über „Mehr“: Der Fokus geht beim Öffnen ins Blatt, bleibt mit Tab darin und kehrt beim Schließen zurück.
  const blatt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (offen !== "leiste") return;
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const ziele = () => Array.from(blatt.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    ziele()[0]?.focus();
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const z = ziele();
      if (z.length === 0) return;
      const jetzt = document.activeElement;
      if (!blatt.current?.contains(jetzt)) { e.preventDefault(); z[0].focus(); }
      else if (e.shiftKey && jetzt === z[0]) { e.preventDefault(); z[z.length - 1].focus(); }
      else if (!e.shiftKey && jetzt === z[z.length - 1]) { e.preventDefault(); z[0].focus(); }
    };
    window.addEventListener("keydown", taste);
    return () => {
      window.removeEventListener("keydown", taste);
      vorher?.focus();
    };
  }, [offen]);

  const inhalt = (
    <>
      <nav className="flex flex-col gap-1 text-sm" aria-label="Alle Bereiche">
        {LINKS.filter((l) => (berichte || l.href !== "/reports") && (analyse || l.href !== "/analyse") && (zahlungen || l.href !== "/zahlungen")).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            data-hilfe={`menue:${link.href}`}
            onClick={zu}
            aria-current={aktiv(link.href) ? "page" : undefined}
            className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white"
          >
            {link.href === "/patients" ? personPl : link.href === "/abschluss/new" ? `${abschluss} abschließen` : link.label}
            {link.href === "/eingang" && eingang > 0 && <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-700">{eingang}</span>}
          </Link>
        ))}
        <Link
          href="/settings"
          data-hilfe="menue:/settings"
          onClick={zu}
          aria-current={aktiv("/settings") ? "page" : undefined}
          className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white"
        >
          {einstellungen ? "Einstellungen" : "Mein Konto"}
        </Link>
        <Link
          href="/hilfe-praxis"
          data-hilfe="menue:/hilfe-praxis"
          onClick={zu}
          aria-current={aktiv("/hilfe-praxis") ? "page" : undefined}
          className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white"
          data-testid="menue-frag-sorrida"
        >
          Frag Sorrida
        </Link>
        {team && (
          <>
            <Link href="/anfragen" onClick={zu} aria-current={aktiv("/anfragen") ? "page" : undefined} className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white">
              Anfragen (Team)
            </Link>
            <Link href="/betrieb" onClick={zu} aria-current={aktiv("/betrieb") ? "page" : undefined} className="rounded-md px-2 py-2 text-brand-100 hover:bg-brand-700 hover:text-white aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white">
              Betrieb (Team)
            </Link>
          </>
        )}
      </nav>
      <div className="mt-2 flex items-center justify-between border-t border-brand-700 px-2 pt-3 text-sm text-brand-100">
        <span>{userName}</span>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <>
      <div className="sm:hidden">
        <button
          type="button"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          onClick={() => setOffen((v) => (v ? false : "kopf"))}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-brand-700 hover:text-white"
        >
          {eingang > 0 && !open && <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-[11px] font-semibold leading-4 text-brand-700" data-testid="eingang-zahl-handy">{eingang > 99 ? "99+" : eingang}</span>}
          {open ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        {offen === "kopf" && (
          <div className="absolute inset-x-0 top-full z-40 border-t border-brand-800 bg-brand-600 px-4 py-3 shadow-lg">{inhalt}</div>
        )}
      </div>

      {/* Über „Mehr“ in der unteren Leiste: dasselbe Menü als Blatt von unten, auch am Tablet. */}
      {offen === "leiste" && (
        <div className="lg:hidden">
          <button type="button" aria-label="Menü schließen" onClick={zu} className="ein-schleier fixed inset-0 z-40 cursor-default bg-slate-900/40" data-testid="menue-schleier" />
          <div
            ref={blatt}
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            className="ein-dialog auf-dunkel fixed inset-x-0 z-40 overflow-y-auto rounded-t-xl bg-brand-600 px-4 py-3 shadow-2xl"
            style={{ bottom: "var(--leiste-unten)", maxHeight: "calc(100dvh - var(--leiste-unten) - 3rem)" }}
            data-testid="menue-blatt"
          >
            {inhalt}
          </div>
        </div>
      )}
    </>
  );
}
