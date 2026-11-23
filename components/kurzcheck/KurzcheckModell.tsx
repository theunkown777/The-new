"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ortName, type KurzArt } from "@/lib/kurzcheck";
import { ModellQuelle } from "@/components/modelle/ModellQuelle";
import { useAppText } from "@/components/FachKontext";

const OrtModell3D = dynamic(() => import("./OrtModell3D"), { ssr: false });

/**
 * Akte: die Angaben des Patienten am echten 3D-Modell ansehen. Nur lesend, in Bordeaux
 * (lib/modelle/stelleFarbe.ts), mit dem Namen der Stelle. Texte in den Wörtern des Fachs (ft). Es wird nichts markiert und nichts an den Patienten geschickt.
 */
export function KurzcheckModell({ art, orte, alt }: { art: KurzArt; orte: string[]; alt: boolean }) {
  const [offen, setOffen] = useState(false);
  const [ohne, setOhne] = useState(false);
  const zahn = art === "zahn";
  const ft = useAppText();
  return (
    <div className="mt-3">
      <button type="button" className="btn-secondary text-sm" aria-expanded={offen} onClick={() => setOffen((o) => !o)} data-testid="kurzcheck-modell-knopf">
        {offen ? "Modell schließen" : "Am Modell ansehen"}
      </button>
      {offen && (
        <div className="mt-2" data-testid="kurzcheck-modell">
          {ohne ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Dieses Gerät kann das 3D-Modell nicht zeigen. Die Stellen stehen in der Zeichnung und im Text.</p>
          ) : (
            <>
              <div className={`modell-buehne relative overflow-hidden rounded-2xl ring-1 ring-[#E9E2DA] ${zahn ? "h-[min(52vh,24rem)]" : "h-[min(64vh,30rem)]"}`}>
                <OrtModell3D art={art} orte={orte} patient beschriftung={ft("Angaben des Patienten am Modell")} namen={(o) => ortName(o, alt)} onFehler={() => setOhne(true)} />
              </div>
              <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                {ft("Punkt: Angaben des Patienten, keine Diagnose.")} {zahn ? "Die angegebenen Zähne leuchten." : ft("Der Fleck zeigt die Stelle, die der Patient angetippt oder gewählt hat.")}
              </p>
              <ModellQuelle />
            </>
          )}
        </div>
      )}
    </div>
  );
}
