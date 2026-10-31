"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";

export type FachKachel = { id: string; name: string; href: string; teaser: string };

const KEY = "sorrida-fach";

// Fachauswahl auf der Startseite. Die letzte Wahl wird im Browser gemerkt,
// damit wiederkehrende Besucher direkt zu ihrer Version springen können.
export function FachWahl({ gruppen }: { gruppen: { titel: string; kacheln: FachKachel[] }[] }) {
  const kacheln = gruppen.flatMap((g) => g.kacheln);
  const [last, setLast] = useState<FachKachel | null>(null);

  useEffect(() => {
    try {
      const id = localStorage.getItem(KEY);
      setLast(kacheln.find((k) => k.id === id) ?? null);
    } catch {
      /* Speicher gesperrt: ohne Erinnerung weiter */
    }
  }, [kacheln]);

  const remember = (id: string) => {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* egal */
    }
  };

  return (
    <div>
      {last && (
        <p className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-slate-700" data-testid="fach-zuletzt">
          Zuletzt gewählt: <b>{last.name}</b> ·{" "}
          <Link href={last.href} className="font-medium text-brand-700 underline">
            weiter zu Ihrer Version
          </Link>
        </p>
      )}
      <div className="space-y-8" data-testid="fach-kacheln">
        {gruppen.map((g) => (
          <div key={g.titel}>
            <h3 className="mb-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">{g.titel}</h3>
      <ul className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {g.kacheln.map((k) => (
          <li key={k.id}>
            <Link
              href={k.href}
              onClick={() => remember(k.id)}
              className="group relative flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-[0_14px_30px_-22px_rgba(107,42,36,.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                <SpecialtyIcon id={k.id} />
              </span>
              <span className="min-w-0 pr-5">
                <span className="block font-semibold text-slate-900">{k.name}</span>
                <span className="mt-0.5 block text-sm leading-snug text-slate-500">{k.teaser}</span>
              </span>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
          </div>
        ))}
      </div>

      {/* Bewusst getrennt von den Fachkacheln: kein weiteres Fach, sondern der Weg zu uns. */}
      <Link
        href="/hilfe"
        className="group mt-10 flex flex-col gap-4 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/60 p-5 text-left transition hover:border-brand-600 hover:bg-brand-50 sm:flex-row sm:items-center sm:p-6"
        data-testid="fach-hilfe"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-sm group-hover:bg-brand-600 group-hover:text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-slate-900">Sie finden Ihre Fachrichtung nicht?</span>
          <span className="mt-0.5 block text-slate-600">Hier ist Hilfe: Schreiben Sie uns kurz, was Sie anbieten. Wir richten Sorrida mit Ihnen ein, persönlich und kostenlos.</span>
        </span>
        <span className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white group-hover:bg-brand-700">Zum Support →</span>
      </Link>
    </div>
  );
}
