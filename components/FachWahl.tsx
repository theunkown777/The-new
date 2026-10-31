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
      <ul className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
