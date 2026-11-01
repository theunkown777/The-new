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

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-1.5 text-xs">
        {offen && (
          <>
            <button type="button" className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200 hover:ring-brand-300" onClick={() => kopieren(bestaetigung, "bestaetigung")} data-testid="termin-bestaetigung">
              {confirmedAt ? `Bestätigt ${confirmedAt}` : "Bestätigung kopieren"}
            </button>
            <button type="button" className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200 hover:ring-brand-300" onClick={() => kopieren(erinnerung, "erinnerung")}>
              {remindedAt ? `Erinnert ${remindedAt}` : "Erinnerung kopieren"}
            </button>
            {status === "GEPLANT" && <button type="button" className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200" onClick={() => patch({ status: "BESTAETIGT" })}>Patient hat zugesagt</button>}
            <button type="button" className="rounded-full bg-emerald-600 px-2.5 py-1 text-white" onClick={() => patch({ status: "ERSCHIENEN" })} data-testid="termin-erschienen">Erschienen</button>
            <button type="button" className="rounded-full bg-white px-2.5 py-1 text-red-700 ring-1 ring-red-200" onClick={() => patch({ status: "NICHT_ERSCHIENEN" })}>Nicht erschienen</button>
            <button type="button" className="rounded-full bg-white px-2.5 py-1 text-slate-500 ring-1 ring-slate-200" onClick={() => patch({ status: "ABGESAGT" })}>Abgesagt</button>
          </>
        )}
        {!offen && <button type="button" className="text-slate-500 underline" onClick={() => patch({ status: "GEPLANT" })}>zurücksetzen</button>}
      </div>
      {hinweis && <p className="max-w-sm text-xs text-slate-600">{hinweis}</p>}
    </div>
  );
}
