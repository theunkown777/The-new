"use client";

import { useState } from "react";
import { MODELL_IDS, MODELL_NAMEN, modelleFuerFach, type ModellId } from "@/lib/modelle/fach";
import { GebissModell } from "./GebissModell";
import { KoerperModell } from "./KoerperModell";
import { SchnittModellAnsicht } from "./SchnittModellAnsicht";

type Marke = { modell: string; teil: string; notiz: string; befund?: string | null };

/**
 * Die Modelle einer Praxis: zuerst das Modell des Fachs (Zahnarzt: Gebiss, Augenarzt: Auge,
 * Kardiologie: Körper mit Organen ...), daneben weitere passende. Modelle mit Markierungen
 * für den Patienten erscheinen immer.
 */
export function ModellWahl({ fach, markierungen = [], patientId, geschlecht, einspaltig = false, alle = false, start, befunde }: {
  /** Praxisansicht Gebiss: wählbare Befunde für den Behandlungsvorschlag */
  befunde?: Record<string, string>;
  fach: string | null | undefined; markierungen?: Marke[]; patientId?: string; geschlecht?: "W" | "M" | null; einspaltig?: boolean;
  /** Alle fünf Modelle anbieten (Menü „Modelle“), sonst nur die des Fachs */
  alle?: boolean; start?: ModellId;
}) {
  const f = modelleFuerFach(fach);
  const mitMarken = MODELL_IDS.filter((m) => markierungen.some((x) => x.modell === m));
  const liste = Array.from(new Set<ModellId>([...f.modelle, ...mitMarken, ...(alle ? MODELL_IDS : [])]));
  // Im Patientenportal zuerst das Modell zeigen, in dem die Praxis etwas markiert hat
  const [aktiv, setAktiv] = useState<ModellId>(start && liste.includes(start) ? start : !patientId && mitMarken.length && !mitMarken.includes(liste[0]) ? mitMarken[0] : liste[0]);
  const marken = markierungen.filter((x) => x.modell === aktiv).map((x) => ({ teil: x.teil, notiz: x.notiz, befund: x.befund ?? null }));
  return (
    <div data-testid="modellwahl" data-modell={aktiv}>
      {liste.length > 1 && (
        <div className="mb-3 inline-flex max-w-full flex-wrap rounded-2xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="Modell">
          {liste.map((m) => {
            const n = markierungen.filter((x) => x.modell === m).length;
            return (
              <button key={m} type="button" role="tab" aria-selected={aktiv === m} onClick={() => setAktiv(m)} data-testid={`modell-${m}`}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 ${aktiv === m ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>
                {MODELL_NAMEN[m]}
                {n > 0 && <span className="rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white" aria-label={`${n} markiert`}>{n}</span>}
              </button>
            );
          })}
        </div>
      )}
      {aktiv === "gebiss" ? <GebissModell key="gebiss" markierungen={marken} patientId={patientId} einspaltig={einspaltig} befunde={befunde} />
        : aktiv === "koerper" ? <KoerperModell key="koerper" markierungen={marken} patientId={patientId} einspaltig={einspaltig} startEbenen={f.ebenen} geschlecht={geschlecht ?? f.geschlecht} />
        : <SchnittModellAnsicht key={aktiv} modell={aktiv} markierungen={marken} patientId={patientId} einspaltig={einspaltig} />}
    </div>
  );
}
