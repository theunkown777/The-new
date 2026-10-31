"use client";

import { useMemo, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { describeDiktat, parseBefundDiktat, type DiktatResult } from "@/lib/befundDiktat";

// Befunde sprechen oder tippen statt Zahn für Zahn anzuklicken.
export function BefundDiktat({ onApply }: { onApply: (r: DiktatResult) => void }) {
  const [text, setText] = useState("");
  const result = useMemo(() => parseBefundDiktat(text), [text]);
  const preview = describeDiktat(result);

  return (
    <div className="card space-y-2" data-testid="befund-diktat">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-slate-900">Befund diktieren</h2>
        <MicButton onTranscript={(t) => setText((prev) => (prev ? `${prev}, ${t}` : t))} />
      </div>
      <textarea
        className="input min-h-[64px] text-sm"
        aria-label="Befund als Text"
        placeholder="z. B. 16 Karies MOD, 25 Karies klein, 36 fehlt, 46 Füllung insuffizient, Zahnstein"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim() && (
        <div className="space-y-2 text-sm">
          {preview.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {preview.map((p) => (
                <li key={p} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-800">
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Noch nichts erkannt. Sprechen Sie Zahn und Befund, z. B. „36 fehlt“.</p>
          )}
          {result.unassigned.length > 0 && (
            <p className="text-xs text-amber-700">Ohne Befund erkannt: {result.unassigned.join(", ")}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={preview.length === 0}
              onClick={() => {
                onApply(result);
                setText("");
              }}
            >
              Ins Zahnschema übernehmen
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setText("")}>
              Leeren
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400">Wird im Browser ausgewertet, ohne KI und ohne Übertragung.</p>
    </div>
  );
}
