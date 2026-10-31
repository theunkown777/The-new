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

  const feld = (label: string, value: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="block text-sm">
      <span className="flex justify-between text-slate-700">
        {label}
        <b className="tabular-nums text-slate-900">
          {value} {unit}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full accent-brand-600" />
    </label>
  );

  return (
    <div className="grid gap-6 rounded-3xl bg-white p-6 sm:p-10 lg:grid-cols-2" data-testid="zeitrechner">
      <div className="space-y-4">
        <h2 className="font-display text-4xl">Wie viel Zeit bekommt Ihr Team zurück?</h2>
        <p className="text-sm text-slate-500">Rechnen Sie mit Ihren eigenen Zahlen. Gemessen ist davon nichts; im Pilotbetrieb messen wir es mit Ihnen.</p>
        {feld("Gespräche pro Woche mit Kosten- oder Selbstzahlerfragen", gespraeche, setGespraeche, 5, 150, 5, "")}
        {feld("davon mit Rückfrage am Tresen oder Telefon", rueckfragen, setRueckfragen, 0, 100, 10, "%")}
        {feld("Minuten je Rückfrage", minuten, setMinuten, 2, 20, 1, "min")}
        {feld("Minuten für Kostenschätzung und Schreiben von Hand", schreiben, setSchreiben, 0, 20, 1, "min")}
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-brand-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">Zeit für Ihr Team pro Monat, bis zu</p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-brand-700" data-testid="zeitrechner-stunden">
          {stunden.toLocaleString("de-DE")} h
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Das entspricht etwa {Math.max(1, Math.round(stunden / 8))} {Math.round(stunden / 8) === 1 ? "Arbeitstag" : "Arbeitstagen"} einer Fachkraft, die für Patienten frei werden.
        </p>
      </div>
    </div>
  );
}
