"use client";

import { useCallback, useRef, useState } from "react";
import { fokusFuerFach, hauptModell } from "@/lib/modelle/fach";
import { ANATOMIE_PFAD, ANATOMIE_QUELLE } from "@/lib/modelle/drei/anatomie";
import { KoerperModell } from "./KoerperModell";
import { Modell3D, type Modell3DGriff } from "./drei/Modell3D";
import { inDenMund, mundBauplan, vorDasGesicht } from "./drei/mundBau";
import type { Drei } from "./drei/Buehne";

/** Fachrichtungen der Gruppe „Versorgung“ zeigen hier kein Modell. */
const OHNE_MODELL = ["sanitaetshaus", "apotheke", "pflege", "klinik", "hoerakustik", "optik"];

/**
 * Vorschau auf der Fachseite der Website: immer nur das Nötigste. Zahnmedizin: die Fahrt vom Gesicht
 * in den Mund; Fächer mit eigenem Organ: nur dieses Organ; sonst der Mensch mit den Punkten des Fachs.
 * Das Modell wird erst geladen, wenn es ins Bild kommt.
 */
export function FachVorschau({ fach }: { fach: string }) {
  if (OHNE_MODELL.includes(fach)) return null;
  if (hauptModell(fach) === "gebiss") return <MundVorschau />;
  return <KoerperModell kompakt fokus={fokusFuerFach(fach)} fach={fach} />;
}

function MundVorschau() {
  const griff = useRef<Modell3DGriff | null>(null);
  const [gesicht, setGesicht] = useState(true);
  const plan = useCallback((T: Drei) => mundBauplan(T), []);
  const immer = useCallback(() => true, []);
  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-[#E9E2DA] modell-buehne" data-testid="fach-vorschau-mund">
      <Modell3D ref={griff} plan={plan} schluessel="mund-vorschau" beschriftung="Mund, Kiefer und Zähne" hoehe="h-[min(60vh,28rem)]"
        gewaehlt={[]} markiert={[]} sichtbar={immer} sichtbarSchluessel="alle" onWahl={() => {}} ohne3D={() => {}} quelle={ANATOMIE_QUELLE} poster={`${ANATOMIE_PFAD}/vorschau/gesicht.webp`}
        onBereit={(b) => inDenMund(b, () => setGesicht(false))} />
      <button type="button" className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-slate-700 shadow ring-1 ring-slate-200"
        onClick={() => { const b = griff.current?.buehne(); if (!b) return; if (gesicht) inDenMund(b, () => setGesicht(false)); else { vorDasGesicht(b); setGesicht(true); } }} data-testid="gebiss-gesicht">
        {gesicht ? "In den Mund fahren" : "Gesicht zeigen"}
      </button>
    </div>
  );
}
