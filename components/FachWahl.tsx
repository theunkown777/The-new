"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";

export type FachArt = "arzt" | "zahn" | "therapie";
export type FachKachel = { id: string; name: string; href: string; teaser: string; art?: FachArt };

const KEY = "sorrida-fach";
const ohneAkzent = (s: string) => s.toLocaleLowerCase("de-DE").normalize("NFD").replace(/[̀-ͯ]/g, "");

const FILTER: { id: "alle" | FachArt; name: string }[] = [
  { id: "alle", name: "Alle" },
  { id: "arzt", name: "Ärztlich" },
  { id: "zahn", name: "Zahnmedizin" },
  { id: "therapie", name: "Therapie" },
];

// Farbe je Art: ärztlich Rosé mit Bordeaux, Zahnmedizin Bordeaux, Therapie Salbei.
const TON: Record<FachArt, { feld: string; zeichen: string; hover: string }> = {
  arzt: { feld: "bg-[#F3E4DF]", zeichen: "text-brand-700", hover: "group-hover:bg-brand-700 group-hover:text-white" },
  zahn: { feld: "bg-brand-700", zeichen: "text-white", hover: "" },
  therapie: { feld: "bg-[#E4EDE2]", zeichen: "text-salbei-700", hover: "group-hover:bg-salbei-700 group-hover:text-white" },
};

// Fachauswahl wie ein Wegweiser: links Suche und Filter, rechts die Fächer als Kacheln mit eigenem
// Zeichen. Zahnmedizin steht groß vorn (dort kommt Sorrida her). Die letzte Wahl wird im Browser
// gemerkt, damit wiederkehrende Besucher direkt zu ihrer Version springen können.
export function FachWahl({ gruppen }: { gruppen: { titel: string; kacheln: FachKachel[] }[] }) {
  const kacheln = useMemo(() => gruppen.flatMap((g) => g.kacheln.map((k) => ({ ...k, art: k.art ?? ("arzt" as FachArt) }))), [gruppen]);
  const [last, setLast] = useState<FachKachel | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"alle" | FachArt>("alle");
  const [runde, setRunde] = useState(0); // zählt hoch, damit die Kacheln beim Filtern neu einblenden

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
  const sichtbar = kacheln.filter((k) => (filter === "alle" || k.art === filter) && (!such || ohneAkzent(`${k.name} ${k.teaser}`).includes(such)));
  const zahl = (f: "alle" | FachArt) => kacheln.filter((k) => f === "alle" || k.art === f).length;
  const waehle = (f: "alle" | FachArt) => {
    setFilter(f);
    setRunde((r) => r + 1);
  };
  const gross = sichtbar[0]?.art === "zahn" && !such ? sichtbar[0] : null;
  const rest = gross ? sichtbar.slice(1) : sichtbar;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Suche und Filter */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-8">
          <label className="relative block">
            <span className="sr-only">Fach suchen</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinte-2" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setRunde((r) => r + 1);
              }}
              placeholder="Fach oder Leistung, z. B. Ultraschall"
              className="w-full rounded-[8px] border border-linie-stark bg-[#FBF9F6] py-3.5 pl-11 pr-3 text-[16px] text-tinte placeholder:text-tinte-2/70 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15"
              data-testid="fach-suche"
            />
          </label>
          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap" role="tablist" aria-label="Art der Praxis">
            {FILTER.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => waehle(f.id)}
                className={`fach-filter shrink-0 rounded-full border px-3.5 py-1.5 text-[14px] ${
                  filter === f.id ? "border-tinte bg-tinte text-[#F5F2EE]" : "border-linie-stark text-tinte hover:border-tinte"
                }`}
                data-testid={`fach-filter-${f.id}`}
              >
                {f.name} <span className={`ml-0.5 tabular-nums ${filter === f.id ? "text-[#F5F2EE]/70" : "text-tinte-2"}`}>{zahl(f.id)}</span>
              </button>
            ))}
          </div>
          {last && (
            <Link href={last.href} className="j-kachel group mt-6 flex items-center gap-3 rounded-[8px] bg-papier-2 p-3.5" data-testid="fach-zuletzt">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-700">
                <SpecialtyIcon id={last.id} className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-[14px] leading-snug text-tinte-2">
                Zuletzt gewählt
                <b className="block truncate font-semibold text-tinte">{last.name}</b>
              </span>
              <span className="j-pfeil ml-auto text-brand-700" aria-hidden="true">
                →
              </span>
            </Link>
          )}
          <Link href="/hilfe" className="group mt-6 hidden items-start gap-3 border-t border-linie pt-5 text-[14.5px] text-tinte-2 lg:flex" data-testid="fach-hilfe">
            <span>
              <span className="block font-semibold text-tinte">Ihr Fach ist nicht dabei?</span>
              Schreiben Sie uns, was Sie anbieten. Wir richten Sorrida mit Ihnen ein, persönlich und kostenlos.
              <span className="mt-1 block font-semibold text-brand-700">
                Zum Support <span className="j-pfeil inline-block" aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        </div>
      </div>

      {/* Die Fächer */}
      <div className="lg:col-span-8" data-testid="fach-kacheln" aria-live="polite">
        <ul key={runde} className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:grid-cols-3 sm:gap-3">
          {gross && (
            <li className="fach-ein col-span-full" style={{ ["--i" as string]: 0 }}>
              <Link
                href={gross.href}
                onClick={() => remember(gross.id)}
                className="j-kachel group relative flex min-h-[7.5rem] items-center gap-5 overflow-hidden rounded-[10px] bg-[#5A1D1D] p-5 text-[#F5EDE6] sm:min-h-[11rem] sm:p-7"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-2 text-white/15 transition-transform duration-300 group-hover:-translate-y-1 sm:right-10">
                  <SpecialtyIcon id="zahn" className="h-48 w-48 sm:h-56 sm:w-56" />
                </span>
                <span aria-hidden="true" className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-white group-hover:text-brand-700">
                  →
                </span>
                <span className="relative max-w-[62%]">
                  <span className="j-marke !text-[#E8C9A9]">Von hier kommt Sorrida</span>
                  <span className="j-titel mt-2 block text-[1.9rem] leading-tight text-white sm:text-[2.3rem]">{gross.name}</span>
                  <span className="mt-1 hidden text-[14px] leading-snug text-[#F5EDE6]/85 sm:block">{gross.teaser}</span>
                </span>
              </Link>
            </li>
          )}
          {rest.map((k, i) => {
            const ton = TON[k.art ?? "arzt"];
            return (
              <li key={k.id} className="fach-ein" style={{ ["--i" as string]: Math.min(i + (gross ? 1 : 0), 14) }}>
                <Link
                  href={k.href}
                  onClick={() => remember(k.id)}
                  className="j-kachel group flex h-full items-center gap-3 rounded-[10px] border border-linie bg-[#FBF9F6] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
                  data-testid="fach-kachel"
                >
                  <span className="flex shrink-0 items-start justify-between">
                    <span className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-200 sm:h-11 sm:w-11 ${ton.feld} ${ton.zeichen} ${ton.hover}`}>
                      <SpecialtyIcon id={k.id} className="h-[19px] w-[19px] sm:h-[22px] sm:w-[22px]" />
                    </span>
                    <span className="j-pfeil hidden translate-x-[-4px] text-brand-700 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:inline" aria-hidden="true">
                      →
                    </span>
                  </span>
                  <span className="j-titel block min-w-0 text-[1.15rem] leading-tight text-tinte sm:mt-3 sm:text-[1.35rem]">
                    {k.name}
                  </span>
                  <span className="mt-1 hidden text-[13px] leading-snug text-tinte-2 sm:line-clamp-2">{k.teaser}</span>
                  <span className="j-pfeil ml-auto text-tinte-2 sm:hidden" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {sichtbar.length === 0 && (
          <p className="rounded-[10px] bg-papier-2 p-6 text-tinte-2" data-testid="fach-keins">
            Kein Fach gefunden für „{q}“. Schreiben Sie uns, wir richten Sorrida auch für Ihr Angebot ein.
          </p>
        )}
        <Link href="/hilfe" className="mt-6 flex items-center justify-between gap-3 rounded-[10px] bg-papier-2 p-4 text-[14.5px] lg:hidden">
          <span>
            <span className="block font-semibold text-tinte">Ihr Fach ist nicht dabei?</span>
            <span className="text-tinte-2">Wir richten Sorrida mit Ihnen ein.</span>
          </span>
          <span className="j-pfeil text-brand-700" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
