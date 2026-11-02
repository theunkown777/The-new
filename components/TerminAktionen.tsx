"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TerminStatus } from "@/lib/termine";

// Status setzen und Bestätigung/Erinnerung als Text kopieren. Sorrida
// verschickt nichts selbst; „kopiert“ wird als „verschickt am“ gemerkt.
export function TerminAktionen({ id, status, bestaetigung, erinnerung, confirmedAt, remindedAt }: {
  id: string; status: TerminStatus; bestaetigung: string; erinnerung: string; confirmedAt: string | null; remindedAt: string | null;
}) {
  const router = useRouter();
  const [hinweis, setHinweis] = useState<string | null>(null);

  async function patch(body: object) {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  }
  async function kopieren(text: string, art: "bestaetigung" | "erinnerung") {
    try { await navigator.clipboard.writeText(text); setHinweis("Text kopiert. In SMS, Messenger oder Mail einfügen und senden."); }
    catch { setHinweis(text); }
    await patch({ gesendet: art });
  }
  const offen = status === "GEPLANT" || status === "BESTAETIGT";

  const chip = "rounded-full bg-white px-2.5 py-1.5 ring-1 ring-slate-200 hover:ring-brand-300";
  // Ein Hauptschritt je Status, der nächste sinnvolle Text, der Rest unter „Mehr“.
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {offen ? (
          <>
            <button type="button" className="rounded-full bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700" onClick={() => patch({ status: "ERSCHIENEN" })} data-testid="termin-erschienen">Erschienen</button>
            {!confirmedAt ? (
              <button type="button" className={chip} onClick={() => kopieren(bestaetigung, "bestaetigung")} data-testid="termin-bestaetigung">Bestätigung kopieren</button>
            ) : (
              <button type="button" className={chip} onClick={() => kopieren(erinnerung, "erinnerung")} data-testid="termin-erinnerung">
                {remindedAt ? `Erinnert ${remindedAt}` : "Erinnerung kopieren"}
              </button>
            )}
            <details className="w-full sm:relative sm:w-auto">
              <summary className={`${chip} inline-flex cursor-pointer list-none text-slate-600`} data-testid="termin-mehr">Mehr</summary>
              <div className="z-10 mt-1 flex w-full flex-col sm:absolute sm:left-0 sm:w-52 flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {confirmedAt && <button type="button" className="rounded-lg px-3 py-1.5 text-left hover:bg-slate-50" onClick={() => kopieren(bestaetigung, "bestaetigung")} data-testid="termin-bestaetigung">Bestätigung erneut kopieren</button>}
                {status === "GEPLANT" && <button type="button" className="rounded-lg px-3 py-1.5 text-left hover:bg-slate-50" onClick={() => patch({ status: "BESTAETIGT" })}>Patient hat zugesagt</button>}
                <button type="button" className="rounded-lg px-3 py-1.5 text-left text-red-700 hover:bg-red-50" onClick={() => patch({ status: "NICHT_ERSCHIENEN" })}>Nicht erschienen</button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50" onClick={() => patch({ status: "ABGESAGT" })}>Abgesagt</button>
              </div>
            </details>
            {confirmedAt && <span className="text-slate-500">bestätigt {confirmedAt}</span>}
          </>
        ) : (
          <button type="button" className="ziel text-slate-500 underline" onClick={() => patch({ status: "GEPLANT" })}>zurücksetzen</button>
        )}
      </div>
      {hinweis && <p className="max-w-sm text-xs text-slate-600">{hinweis}</p>}
    </div>
  );
}
