"use client";

// TODO (Koordination): Platzhalter. Die eigentliche Erklärungsansicht (beschriftete Abbildung mit
// Führungslinien, wie im Anatomie-Atlas) wird separat gebaut und ersetzt diese Datei mit derselben Signatur.

export type ErklaerThema = "auge" | "ohr" | "lunge" | "herz" | "muskeln" | "mund" | "haut" | "skelett" | "verdauung" | "niere" | "gehirn";

export default function ErklaerAnsicht({ thema, onSchliessen, fach }: { thema: ErklaerThema; onSchliessen: () => void; fach?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Erklärung" data-testid="erklaer-ansicht" data-thema={thema} data-fach={fach ?? ""}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm text-slate-600">Erklärungsansicht „{thema}“ (Platzhalter)</p>
        <button type="button" className="btn-secondary mt-4 text-sm" onClick={onSchliessen} data-testid="erklaer-schliessen">Schließen</button>
      </div>
    </div>
  );
}
