"use client";

import { useEffect, useState } from "react";

export interface KiHilfenStand { schalter: boolean; verfuegbar: boolean; aktiv: boolean }
const AUS: KiHilfenStand = { schalter: false, verfuegbar: false, aktiv: false };

// Der Schalter der Praxis wird je Seitenaufruf einmal geholt und von allen KI-Knöpfen geteilt.
let abfrage: Promise<KiHilfenStand> | null = null;
function stand(): Promise<KiHilfenStand> {
  abfrage ??= fetch("/api/praxis/ki-hilfen", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && typeof d.aktiv === "boolean" ? { schalter: d.schalter === true, verfuegbar: d.verfuegbar === true, aktiv: d.aktiv === true } : AUS))
    .catch(() => AUS);
  return abfrage;
}

/**
 * Sind die KI-Hilfen nutzbar (KI-Zugang hinterlegt UND von der Praxisleitung eingeschaltet)?
 * Bis die Antwort da ist und bei jedem Fehler: aus. Dann gilt überall der feste Weg ohne KI.
 */
export function useKiHilfen(): KiHilfenStand {
  const [s, setS] = useState<KiHilfenStand>(AUS);
  useEffect(() => {
    let aktiv = true;
    stand().then((x) => aktiv && setS(x));
    return () => { aktiv = false; };
  }, []);
  return s;
}
