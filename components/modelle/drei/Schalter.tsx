"use client";

import { useT } from "../Sprache";

export const DREI_HINWEIS = "Mit dem Finger oder der Maus drehen, mit zwei Fingern oder dem Mausrad vergrößern. Antippen für die Erklärung.";

/** Umschalter zwischen räumlichem Modell (drehbar) und flacher Schemazeichnung. */
export function DreiSchalter({ raum, setRaum }: { raum: boolean; setRaum: (r: boolean) => void }) {
  const t = useT();
  return (
    <div className="absolute left-2 top-2 z-10 inline-flex rounded-full bg-white/90 p-0.5 text-xs shadow ring-1 ring-slate-200" role="group" aria-label={t("Darstellung")}>
      {([[true, "3D"], [false, "Schema"]] as const).map(([wert, name]) => (
        <button key={name} type="button" aria-pressed={raum === wert} onClick={() => setRaum(wert)} data-testid={wert ? "modell-ansicht-3d" : "modell-ansicht-schema"}
          className={`rounded-full px-3 py-1.5 ${raum === wert ? "bg-brand-600 font-medium text-white" : "text-slate-600"}`}>{wert ? name : t(name)}</button>
      ))}
    </div>
  );
}
