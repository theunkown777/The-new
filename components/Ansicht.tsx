"use client";

import { useEffect, useState } from "react";
import { ANSICHT_SCHLUESSEL, ansichtAus, ansichtSpeicherwert, type Ansicht } from "@/lib/ansicht";

import { useAppText } from "@/components/FachKontext";
const lesen = (): Ansicht => {
  try {
    return ansichtAus(window.localStorage.getItem(ANSICHT_SCHLUESSEL));
  } catch {
    return "hell";
  }
};
const anwenden = (a: Ansicht) => document.documentElement.classList.toggle("dunkel", a === "dunkel");

/** Setzt die gewählte Ansicht auch dann, wenn die App ohne neues Laden der Seite betreten wird. */
export function AnsichtWaechter() {
  useEffect(() => {
    anwenden(lesen());
  }, []);
  return null;
}

/** Schalter „Dunkle Ansicht (Beta)“: gilt für diesen Browser, gespeichert nur auf ausdrückliche Wahl. */
export function AnsichtSchalter() {
  const ft = useAppText();
  const [ansicht, setAnsicht] = useState<Ansicht>("hell");
  useEffect(() => {
    setAnsicht(lesen());
  }, []);
  const an = ansicht === "dunkel";
  const umschalten = () => {
    const neu: Ansicht = an ? "hell" : "dunkel";
    try {
      const wert = ansichtSpeicherwert(neu);
      if (wert) window.localStorage.setItem(ANSICHT_SCHLUESSEL, wert);
      else window.localStorage.removeItem(ANSICHT_SCHLUESSEL);
    } catch {
      // Ohne Speicher gilt die Wahl bis zum nächsten Laden der Seite.
    }
    anwenden(neu);
    setAnsicht(neu);
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-testid="ansicht-schalter" data-hilfe="ansicht-schalter">
      <div className="min-w-0">
        <p id="ansicht-titel" className="font-medium text-slate-900">
          Dunkle Ansicht <span className="ml-1 rounded-full border border-slate-300 px-2 py-0.5 text-xs font-normal text-slate-600">Beta</span>
        </p>
        <p className="mt-0.5 text-sm text-slate-600">{ft("Dunkler Hintergrund für die App, zum Beispiel am Abend. Gilt nur in diesem Browser. Website und Patientenseiten bleiben hell.")}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={an}
        aria-labelledby="ansicht-titel"
        onClick={umschalten}
        data-testid="ansicht-dunkel"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${an ? "border-brand-700 bg-brand-700" : "border-slate-400 bg-slate-100"}`}
      >
        <span aria-hidden="true" className={`absolute top-0.5 h-[1.375rem] w-[1.375rem] rounded-full bg-white shadow transition-[left] ${an ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
