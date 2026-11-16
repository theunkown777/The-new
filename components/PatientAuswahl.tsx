"use client";

import { useState } from "react";
import { AUSWAHL_GRENZE, patientenFiltern } from "@/lib/patientAuswahl";

type Person = { id: string; firstName: string; lastName: string };

/**
 * Auswahlliste für einen Patienten. Bei langen Listen steht ein Suchfeld darüber, und die Liste zeigt nur die Treffer.
 * Kurze Listen sehen aus wie bisher.
 */
export function PatientAuswahl<T extends Person>({ id, patients, value, onChange, disabled = false, leer, nachnameZuerst = true }: {
  id: string;
  patients: readonly T[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Text der leeren ersten Zeile; ohne Angabe gibt es keine. */
  leer?: string;
  nachnameZuerst?: boolean;
}) {
  const [suche, setSuche] = useState("");
  const lang = patients.length > AUSWAHL_GRENZE && !disabled;
  const { liste, weitere } = lang ? patientenFiltern(patients, suche, value) : { liste: patients as T[], weitere: 0 };
  return (
    <>
      {lang && (
        <input
          type="search"
          className="input mb-2"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Name eingeben, um die Liste zu kürzen"
          aria-label="Liste nach Namen durchsuchen"
          autoComplete="off"
          data-testid={`${id}-suche`}
        />
      )}
      <select id={id} className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {leer && <option value="">{leer}</option>}
        {liste.map((p) => (
          <option key={p.id} value={p.id}>
            {nachnameZuerst ? `${p.lastName}, ${p.firstName}` : `${p.firstName} ${p.lastName}`}
          </option>
        ))}
      </select>
      {lang && (weitere > 0 || liste.length === 0) && (
        <p className="mt-1 text-xs text-slate-600" data-testid={`${id}-hinweis`}>
          {liste.length === 0 ? "Kein Treffer. Bitte den Namen anders schreiben." : `Die Liste zeigt ${liste.length} von ${patients.length}. Bitte einen Namen eingeben.`}
        </p>
      )}
    </>
  );
}
