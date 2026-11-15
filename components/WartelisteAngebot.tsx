"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type WarteKandidat = { id: string; name: string; anlass: string; wunsch: string; seit: string; angeboten: string | null };
type Angebot = { text: string; whatsapp: string | null; onlineBuchbar: boolean; keinWhatsapp: string | null };

// Bei einem abgesagten Termin: bis zu zwei passende Personen von der Warteliste. Ein Klick erzeugt
// nur den Text mit persönlichem Link. Verschickt wird nichts von allein; die Praxis kopiert den
// Text oder öffnet WhatsApp und tippt dort selbst auf „Senden“.
export function WartelisteAngebot({ terminId, kandidaten }: { terminId: string; kandidaten: WarteKandidat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [angebot, setAngebot] = useState<Record<string, Angebot>>({});
  const [kopiert, setKopiert] = useState<string | null>(null);

  async function anbieten(id: string) {
    setBusy(id); setFehler(null);
    const res = await fetch(`/api/warteliste/${id}/angebot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terminId }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok || !d?.text) return setFehler(d?.error ?? "Der Text konnte nicht erzeugt werden.");
    setAngebot((a) => ({ ...a, [id]: d as Angebot }));
    router.refresh();
  }
  async function kopieren(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setKopiert(id); } catch { setKopiert(null); }
  }

  if (kandidaten.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl bg-salbei-50 p-3 text-sm" data-testid="warteliste-vorschlag">
      <p className="font-medium text-salbei-900">Diese Zeit ist frei geworden. Von der Warteliste passt:</p>
      <ul className="mt-2 space-y-3">
        {kandidaten.map((k) => {
          const a = angebot[k.id];
          return (
            <li key={k.id} data-testid="warteliste-kandidat">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-slate-900">
                  <span className="font-medium">{k.name}</span>
                  <span className="block text-xs text-slate-600">{k.anlass} · {k.wunsch} · wartet seit {k.seit}{k.angeboten ? ` · zuletzt angeboten ${k.angeboten}` : ""}</span>
                </p>
                {!a && <button type="button" className="btn btn-secondary text-sm" disabled={busy === k.id} onClick={() => anbieten(k.id)} data-testid="warteliste-anbieten">{busy === k.id ? "Erzeugt …" : "Diese Zeit anbieten"}</button>}
              </div>
              {a && (
                <div className="mt-2 rounded-lg bg-white p-3" data-testid="warteliste-angebot">
                  <p className="whitespace-pre-wrap break-words text-slate-800" data-testid="warteliste-text">{a.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-primary text-sm" onClick={() => kopieren(k.id, a.text)} data-testid="warteliste-kopieren">{kopiert === k.id ? "Kopiert" : "Text kopieren"}</button>
                    {a.whatsapp && <a className="btn btn-secondary text-sm" href={a.whatsapp} target="_blank" rel="noreferrer" data-testid="warteliste-whatsapp">WhatsApp öffnen</a>}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Es wurde nichts verschickt. Fügen Sie den Text in SMS, Messenger oder Mail ein{a.whatsapp ? " oder öffnen Sie WhatsApp und tippen dort auf „Senden“" : ""}.
                    {a.onlineBuchbar ? " Über den Link kann die Person die Zeit selbst buchen." : " Diese Zeit lässt sich nicht online buchen; die Person meldet sich bei Ihnen, und Sie tragen den Termin ein."}
                    {" "}Der Link ersetzt den bisherigen persönlichen Link dieser Person.
                    {!a.whatsapp && a.keinWhatsapp ? ` WhatsApp: ${a.keinWhatsapp}` : ""}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {fehler && <p className="mt-2 text-sm text-red-700" role="alert" data-testid="warteliste-fehler">{fehler}</p>}
    </div>
  );
}
