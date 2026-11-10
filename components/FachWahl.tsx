"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type FachKachel = { id: string; name: string; href: string; teaser: string };

const KEY = "sorrida-fach";
const ohneAkzent = (s: string) => s.toLocaleLowerCase("de-DE").normalize("NFD").replace(/[̀-ͯ]/g, "");

// Fachauswahl als Register (wie das Verzeichnis eines Fachbuchs): Suchfeld, darunter die Fächer in
// Gruppen, je Zeile Name und Schwerpunkte, getrennt durch Haarlinien. Die letzte Wahl wird im Browser
// gemerkt, damit wiederkehrende Besucher direkt zu ihrer Version springen können.
export function FachWahl({ gruppen }: { gruppen: { titel: string; kacheln: FachKachel[] }[] }) {
  const kacheln = useMemo(() => gruppen.flatMap((g) => g.kacheln), [gruppen]);
  const [last, setLast] = useState<FachKachel | null>(null);
  const [q, setQ] = useState("");

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

  const such = ohneAkzent(q.trim());
  const treffer = (k: FachKachel) => !such || ohneAkzent(`${k.name} ${k.teaser}`).includes(such);
  const gefiltert = gruppen.map((g) => ({ ...g, kacheln: g.kacheln.filter(treffer) })).filter((g) => g.kacheln.length);
  const anzahl = gefiltert.reduce((a, g) => a + g.kacheln.length, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Fach suchen</span>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-tinte-2" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Fach suchen, z. B. Physiotherapie oder Ultraschall"
            className="w-full border-0 border-b border-linie-stark bg-transparent py-3 pl-8 pr-2 text-[17px] text-tinte placeholder:text-tinte-2/70 focus:border-brand-700 focus:outline-none focus:ring-0"
            data-testid="fach-suche"
          />
        </label>
        {last && (
          <p className="text-[15px] text-tinte-2" data-testid="fach-zuletzt">
            Zuletzt gewählt: <b className="font-semibold text-tinte">{last.name}</b> ·{" "}
            <Link href={last.href} className="j-link font-semibold text-brand-700">
              weiter zu Ihrer Version
            </Link>
          </p>
        )}
      </div>

      <div className="mt-10 space-y-12" data-testid="fach-kacheln" aria-live="polite">
        {gefiltert.map((g) => (
          <section key={g.titel} aria-label={g.titel}>
            <p className="j-marke border-b border-tinte pb-3">{g.titel}</p>
            <ul className="grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
              {g.kacheln.map((k) => (
                <li key={k.id} className="border-b border-linie">
                  <Link href={k.href} onClick={() => remember(k.id)} className="group flex items-baseline justify-between gap-4 py-3 sm:py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
                    <span className="min-w-0">
                      <span className="j-titel block text-[1.3rem] sm:text-[1.45rem] text-tinte transition-colors group-hover:text-brand-700">{k.name}</span>
                      <span className="mt-1 hidden text-[14px] leading-snug text-tinte-2 sm:block">{k.teaser}</span>
                    </span>
                    <span className="j-pfeil shrink-0 text-tinte-2 group-hover:translate-x-1 group-hover:text-brand-700" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {anzahl === 0 && (
          <p className="text-tinte-2" data-testid="fach-keins">
            Kein Fach gefunden für „{q}“. Schreiben Sie uns, wir richten Sorrida auch für Ihr Angebot ein.
          </p>
        )}
      </div>

      {/* Bewusst getrennt von den Fächern: kein weiteres Fach, sondern der Weg zu uns. */}
      <Link
        href="/hilfe"
        className="group mt-12 flex flex-col gap-3 border-y border-tinte py-6 sm:flex-row sm:items-center sm:justify-between"
        data-testid="fach-hilfe"
      >
        <span>
          <span className="j-titel block text-2xl text-tinte">Sie finden Ihre Fachrichtung nicht?</span>
          <span className="mt-1 block text-tinte-2">Schreiben Sie uns kurz, was Sie anbieten. Wir richten Sorrida mit Ihnen ein, persönlich und kostenlos.</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-semibold text-brand-700">
          Zum Support <span className="j-pfeil" aria-hidden="true">→</span>
        </span>
      </Link>
    </div>
  );
}
