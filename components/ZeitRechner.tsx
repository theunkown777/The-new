"use client";

import { useState } from "react";

// Ehrlicher Zeitrechner: rechnet nur mit den Annahmen der Praxis, nichts ist gemessen.
export function ZeitRechner() {
  const [gespraeche, setGespraeche] = useState(25);
  const [rueckfragen, setRueckfragen] = useState(50);
  const [minuten, setMinuten] = useState(6);
  const [schreiben, setSchreiben] = useState(8);
  // Pro Woche: Rückfragen am Tresen/Telefon, die der Patienten-Link erspart, plus händisch geschriebene Kostenschätzungen.
  const minutenProMonat = Math.round(gespraeche * 4.3 * ((rueckfragen / 100) * minuten + schreiben));
  const stunden = Math.round((minutenProMonat / 60) * 10) / 10;
  const tage = Math.max(1, Math.round(stunden / 8));

  const feld = (label: string, value: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="block border-b border-linie py-4">
      <span className="flex items-baseline justify-between gap-4 text-[15px] text-tinte">
        {label}
        <b className="shrink-0 text-xl font-semibold tabular-nums text-brand-700">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-tinte-2">{unit}</span>}
        </b>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))}
        className="j-regler mt-2" style={{ ["--wert" as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </label>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-12" data-testid="zeitrechner">
      <div className="lg:col-span-6">
        <h2 className="j-schau text-[clamp(2.4rem,4.6vw,3.8rem)]">
          Wie viel Zeit bekommt <em>Ihr Team</em> zurück?
        </h2>
        <p className="j-text mt-5 max-w-md">Rechnen Sie mit Ihren eigenen Zahlen. Gemessen ist davon nichts; im Pilotbetrieb messen wir es mit Ihnen.</p>
        <div className="mt-8 border-t border-tinte">
          {feld("Gespräche pro Woche mit Kosten- oder Selbstzahlerfragen", gespraeche, setGespraeche, 5, 150, 5, "")}
          {feld("davon mit Rückfrage am Tresen oder Telefon", rueckfragen, setRueckfragen, 0, 100, 10, "%")}
          {feld("Minuten je Rückfrage", minuten, setMinuten, 2, 20, 1, "min")}
          {feld("Minuten für Kostenschätzung und Schreiben von Hand", schreiben, setSchreiben, 0, 20, 1, "min")}
        </div>
      </div>
      <div className="flex flex-col justify-center bg-papier-2 px-8 py-12 sm:px-12 lg:col-span-5 lg:col-start-8">
        <p className="j-marke">Gewonnene Zeit pro Monat, bis zu</p>
        <p className="j-zahl mt-4 text-[clamp(4.2rem,9vw,7.5rem)] leading-none text-brand-700" data-testid="zeitrechner-stunden">
          {stunden.toLocaleString("de-DE")}<span className="ml-2 text-[0.35em] text-tinte"> h</span>
        </p>
        <p className="j-text mt-6 max-w-sm">
          Das sind etwa {tage} {tage === 1 ? "Arbeitstag" : "Arbeitstage"} einer Fachkraft, die wieder für Patienten da {tage === 1 ? "ist" : "sind"}.
        </p>
      </div>
    </div>
  );
}
