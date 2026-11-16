"use client";

import { useId, useState } from "react";
import { waLink } from "@/lib/whatsapp";

type Weg = { ok: true; nummer?: string | null; adresse?: string | null } | { ok: false; grund: string };
interface Entwurf { text: string; betreff: string; whatsapp: Weg; email: Weg }

/**
 * „Antwort vorbereiten“ bei Rückmeldungen zum Vorschlag: Text aus festen Bausteinen, ohne KI.
 * Die Praxis ändert den Text und schickt ihn selbst ab. Sorrida verschickt nichts.
 */
export function EingangAntwort({ id }: { id: string }) {
  const feldId = useId();
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);
  const [text, setText] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);

  async function oeffnen() {
    setLaedt(true);
    setFehler(null);
    const res = await fetch(`/api/eingang/${id}/antwort`, { cache: "no-store" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setLaedt(false);
    if (!res?.ok || typeof d?.text !== "string") return setFehler(d?.error ?? "Der Antwortentwurf konnte nicht geladen werden.");
    setEntwurf(d);
    setText(d.text);
    setMeldung(null);
  }
  // Vermerk im Protokoll (ohne Inhalt). Scheitert er, bleibt der Weg trotzdem offen.
  const vermerken = (weg: "kopiert" | "whatsapp" | "email") => void fetch(`/api/eingang/${id}/antwort`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weg }) }).catch(() => null);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setMeldung("Text kopiert.");
      vermerken("kopiert");
    } catch {
      setMeldung("Kopieren hat nicht geklappt. Bitte den Text markieren und selbst kopieren.");
    }
  }

  if (!entwurf) {
    return (
      <span className="mt-1 inline-flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary !py-1 text-xs" disabled={laedt} onClick={oeffnen} data-testid="eingang-antwort-knopf" aria-expanded={false}>
          {laedt ? "Lädt …" : "Antwort vorbereiten"}
        </button>
        {fehler && <span className="text-xs text-red-700" role="alert">{fehler}</span>}
      </span>
    );
  }

  const leer = text.trim().length === 0;
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="eingang-antwort">
      <label htmlFor={feldId} className="text-xs font-semibold text-slate-800">Antwort an die Patientin oder den Patienten</label>
      <textarea id={feldId} className="input mt-1 min-h-[180px] w-full text-sm" value={text} maxLength={2000} onChange={(e) => { setText(e.target.value); setMeldung(null); }} data-testid="eingang-antwort-text" />
      <p className="mt-1 text-xs text-slate-500">
        Der Text kommt aus festen Bausteinen und enthält keinen Befund und keine Beträge. Bitte ergänzen Sie auch keine. Sorrida verschickt nichts: Sie senden die Nachricht selbst.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !py-1 text-xs" disabled={leer} onClick={kopieren} data-testid="eingang-antwort-kopieren">Text kopieren</button>
        {entwurf.whatsapp.ok && (
          <a className={`btn btn-secondary !py-1 text-xs ${leer ? "pointer-events-none opacity-50" : ""}`} aria-disabled={leer} href={waLink(entwurf.whatsapp.nummer ?? null, text)} target="_blank" rel="noopener noreferrer" onClick={() => vermerken("whatsapp")} data-testid="eingang-antwort-whatsapp">
            In WhatsApp öffnen
          </a>
        )}
        {entwurf.email.ok && (
          <a className={`btn btn-secondary !py-1 text-xs ${leer ? "pointer-events-none opacity-50" : ""}`} aria-disabled={leer} href={`mailto:${encodeURIComponent(entwurf.email.adresse ?? "")}?subject=${encodeURIComponent(entwurf.betreff)}&body=${encodeURIComponent(text)}`} onClick={() => vermerken("email")} data-testid="eingang-antwort-email">
            E-Mail-Programm öffnen
          </a>
        )}
        <button type="button" className="text-xs text-slate-600 underline" onClick={() => { setEntwurf(null); setMeldung(null); }} data-testid="eingang-antwort-schliessen">Schließen</button>
      </div>
      {(!entwurf.whatsapp.ok || !entwurf.email.ok) && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500" data-testid="eingang-antwort-ohne-weg">
          {!entwurf.whatsapp.ok && <li>WhatsApp: {entwurf.whatsapp.grund}</li>}
          {!entwurf.email.ok && <li>E-Mail: {entwurf.email.grund}</li>}
        </ul>
      )}
      {meldung && <p className="mt-2 text-xs text-slate-700" role="status">{meldung}</p>}
    </div>
  );
}
