"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";

export type FachArt = "arzt" | "zahn" | "therapie";
export type FachKachel = { id: string; name: string; href: string; teaser: string; art?: FachArt };

const ohneAkzent = (s: string) => s.toLocaleLowerCase("de-DE").normalize("NFD").replace(/[̀-ͯ]/g, "");

const FILTER: { id: "alle" | FachArt; name: string }[] = [
  { id: "alle", name: "Alle" },
  { id: "arzt", name: "Ärztlich" },
  { id: "zahn", name: "Zahnärztlich" },
  { id: "therapie", name: "Therapie" },
];

// Farbe je Art: ärztlich und zahnärztlich Rosé mit Bordeaux, Therapie Salbei.
const TON: Record<FachArt, { feld: string; zeichen: string; hover: string }> = {
  arzt: { feld: "bg-[#F3E4DF]", zeichen: "text-brand-700", hover: "group-hover:bg-brand-700 group-hover:text-white" },
  zahn: { feld: "bg-[#F3E4DF]", zeichen: "text-brand-700", hover: "group-hover:bg-brand-700 group-hover:text-white" },
  therapie: { feld: "bg-[#E4EDE2]", zeichen: "text-salbei-700", hover: "group-hover:bg-salbei-700 group-hover:text-white" },
};

// Eine Zeile der Liste (Kachel oder Gruppentitel). Wie sie einblendet, steht beim Einhängen fest: nach einem
// Filterwechsel gestaffelt, sonst ohne Wartezeit. Spätere Wechsel ändern das nicht mehr, sonst liefe das Einblenden
// bei Kacheln, die stehen bleiben, noch einmal ein Stück nach.
function Zeile({ staffel, stelle, className = "", children }: { staffel: boolean; stelle: number; className?: string; children: ReactNode }) {
  const [start] = useState({ staffel, stelle });
  return (
    <li className={`fach-ein ${start.staffel ? "fach-staffel " : ""}${className}`} style={start.staffel ? { ["--i" as string]: Math.min(start.stelle, 8) } : undefined}>
      {children}
    </li>
  );
}

// Fachauswahl wie ein Wegweiser: links Suche und Filter, rechts die Fächer als Kacheln mit eigenem
// Zeichen. Keins ist hervorgehoben. Ohne Filter und Suche stehen sie in ihren Gruppen mit kleiner
// Zwischenüberschrift, sonst als einfache Liste. Die Wahl wird nicht
// im Browser gespeichert: Das wäre bequem, aber nicht erforderlich (§ 25 TDDDG), und bräuchte eine Einwilligung.
export function FachWahl({ gruppen }: { gruppen: { titel: string; kacheln: FachKachel[] }[] }) {
  const mitArt = useMemo(() => gruppen.map((g) => ({ titel: g.titel, kacheln: g.kacheln.map((k) => ({ ...k, art: k.art ?? ("arzt" as FachArt) })) })), [gruppen]);
  const kacheln = useMemo(() => mitArt.flatMap((g) => g.kacheln), [mitArt]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"alle" | FachArt>("alle");
  const [runde, setRunde] = useState(0); // zählt beim Filterwechsel hoch: Die Liste wird neu aufgebaut und blendet gestaffelt ein
  // Was die Liste zuletzt geändert hat. Nach dem Tippen bleiben passende Kacheln stehen, nur neue blenden ein.
  const [anlass, setAnlass] = useState<"start" | "filter" | "suche">("start");

  const such = ohneAkzent(q.trim());
  const sichtbar = kacheln.filter((k) => (filter === "alle" || k.art === filter) && (!such || ohneAkzent(`${k.name} ${k.teaser}`).includes(such)));
  const zahl = (f: "alle" | FachArt) => kacheln.filter((k) => f === "alle" || k.art === f).length;
  const waehle = (f: "alle" | FachArt) => {
    if (f === filter) return;
    setFilter(f);
    setAnlass("filter");
    setRunde((r) => r + 1);
  };

  // Ohne Filter und Suche: Gruppen mit Zwischenüberschrift. Eine Gruppe, die in drei Spalten keine vollen Reihen
  // ergibt, in zwei aber schon (vier Fächer), steht in zwei Spalten.
  const gruppiert = filter === "alle" && !such;
  const zeilen: ({ titel: string; id: string } | { kachel: (typeof kacheln)[number]; halb: boolean })[] = gruppiert
    ? mitArt.flatMap((g, gi) => {
        const halb = g.kacheln.length % 3 !== 0 && g.kacheln.length % 2 === 0;
        return [{ titel: g.titel, id: `gruppe-${gi}` }, ...g.kacheln.map((kachel) => ({ kachel, halb }))];
      })
    : sichtbar.map((kachel) => ({ kachel, halb: false }));
  const staffel = anlass !== "suche";
  // Für Vorleseprogramme: nur die Zahl der Treffer, nicht die ganze Liste. Vor der ersten Eingabe bleibt die Ansage leer.
  const ansage = anlass === "start" ? "" : sichtbar.length === 0 ? "Kein Fach gefunden" : sichtbar.length === 1 ? "1 Fach gefunden" : `${sichtbar.length} Fächer gefunden`;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
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
                setAnlass("suche");
              }}
              placeholder="Fach oder Leistung suchen"
              className="w-full rounded-[8px] border border-linie-stark bg-[#FBF9F6] py-3.5 pl-11 pr-3 text-[17px] text-tinte placeholder:text-tinte-2/70 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15"
              data-testid="fach-suche"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Art der Praxis">
            {FILTER.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => waehle(f.id)}
                className={`fach-filter rounded-full border px-3.5 py-1.5 text-[15px] ${
                  filter === f.id ? "border-tinte bg-tinte text-[#F5F2EE]" : "border-linie-stark text-tinte hover:border-tinte"
                }`}
                data-testid={`fach-filter-${f.id}`}
              >
                {f.name} <span className={`ml-0.5 tabular-nums ${filter === f.id ? "text-[#F5F2EE]/70" : "text-tinte-2"}`}>{zahl(f.id)}</span>
              </button>
            ))}
          </div>
          <p className="sr-only" role="status" data-testid="fach-ansage">
            {ansage}
          </p>
          <Link prefetch={false} href="/hilfe" className="group mt-6 hidden items-start gap-3 border-t border-linie pt-5 text-[15px] text-tinte-2 lg:flex" data-testid="fach-hilfe">
            <span>
              <span className="block font-semibold text-tinte">Ihr Fach ist nicht dabei?</span>
              Schreiben Sie uns, was Sie anbieten. Wir richten Sorrida mit Ihnen ein.
              <span className="mt-1 block font-semibold text-brand-700">
                Zum Support <span className="j-pfeil inline-block" aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        </div>
      </div>

      {/* Die Fächer */}
      <div className="lg:col-span-8" data-testid="fach-kacheln">
        <ul key={runde} className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:grid-cols-6 sm:gap-3">
          {zeilen.map((z, i) => {
            if ("titel" in z) {
              return (
                <Zeile key={z.id} staffel={staffel} stelle={i} className={`col-span-full ${i > 0 ? "mt-6 sm:mt-8" : ""}`}>
                  <h3 className="j-marke" data-testid="fach-gruppe">
                    {z.titel}
                  </h3>
                </Zeile>
              );
            }
            const k = z.kachel;
            const ton = TON[k.art ?? "arzt"];
            return (
              <Zeile key={k.id} staffel={staffel} stelle={i} className={z.halb ? "sm:col-span-3" : "sm:col-span-2"}>
                <Link prefetch={false}
                  href={k.href}
                  className="j-kachel group flex h-full items-center gap-3 rounded-[10px] border border-linie bg-[#FBF9F6] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
                  data-testid="fach-kachel"
                >
                  <span className="flex shrink-0 items-start justify-between">
                    <span className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-200 sm:h-11 sm:w-11 ${ton.feld} ${ton.zeichen} ${ton.hover}`}>
                      <SpecialtyIcon id={k.id} className="h-[19px] w-[19px] sm:h-[22px] sm:w-[22px]" />
                    </span>
                    <span className="fach-pfeil hidden text-brand-700 sm:inline" aria-hidden="true">
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
              </Zeile>
            );
          })}
        </ul>
        {sichtbar.length === 0 && (
          <p className="rounded-[10px] bg-papier-2 p-6 text-tinte-2" data-testid="fach-keins">
            Kein Fach gefunden für „{q}“. Schreiben Sie uns, wir richten Sorrida auch für Ihr Angebot ein.
          </p>
        )}
        <Link prefetch={false} href="/hilfe" className="mt-6 flex items-center justify-between gap-3 rounded-[10px] bg-papier-2 p-4 text-[15px] lg:hidden">
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
