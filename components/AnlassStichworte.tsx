"use client";

import { useId, useMemo, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { useKiHilfen } from "@/components/useKiHilfen";
import type { Specialty } from "@/lib/specialties";
import type { CustomOffer } from "@/lib/proposals";
import { CUSTOM_PREFIX } from "@/lib/medicalProposals";
import { passtZuPerson } from "@/lib/fachprofile";
import { anlassEintraege, erkenneAnlaesse } from "@/lib/anlassErkennung";

/**
 * Stichworte aus dem Gespräch tippen oder diktieren; Sorrida schlägt dazu passende Anlässe vor.
 * Die Erkennung läuft ohne KI im Browser. Angekreuzt wird ein Anlass erst mit „Übernehmen“.
 * „Mit KI zuordnen“ gibt es nur, wenn die Praxisleitung die KI-Hilfen eingeschaltet hat.
 */
export function AnlassStichworte({
  spec,
  custom,
  fach,
  value,
  onChange,
  person,
  patientId,
}: {
  spec: Specialty | null;
  custom: CustomOffer[];
  fach?: string | null;
  value: string[];
  onChange: (v: string[]) => void;
  person?: { geschlecht?: string | null; alter?: number | null };
  patientId?: string | null;
}) {
  const feldId = useId();
  const ki = useKiHilfen();
  const [text, setText] = useState("");
  const [abgewaehlt, setAbgewaehlt] = useState<string[]>([]);
  const [kiIds, setKiIds] = useState<string[] | null>(null);
  const [kiGewaehlt, setKiGewaehlt] = useState<string[]>([]);
  const [kiLaeuft, setKiLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const liste = useMemo(
    () => anlassEintraege((spec?.anlaesse ?? []).filter((a) => !person || passtZuPerson(a, person)), custom, CUSTOM_PREFIX),
    [spec, custom, person?.geschlecht, person?.alter], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ergebnis = useMemo(() => erkenneAnlaesse(text, liste, { fach }), [text, liste, fach]);
  if (liste.length === 0) return null;

  const labelVon = new Map(liste.map((a) => [a.id, a.label]));
  const erkannt = ergebnis.erkannt;
  const erkanntIds = new Set(erkannt.map((e) => e.id));
  // Entwurf der KI: nur Anlässe aus der sichtbaren Liste, die die Erkennung ohne KI nicht schon zeigt.
  const nurKi = (kiIds ?? []).filter((id) => labelVon.has(id) && !erkanntIds.has(id));
  const gewaehlt = [...erkannt.filter((e) => !abgewaehlt.includes(e.id)).map((e) => e.id), ...nurKi.filter((id) => kiGewaehlt.includes(id))].filter((id) => !value.includes(id));

  const leeren = () => { setText(""); setAbgewaehlt([]); setKiIds(null); setKiGewaehlt([]); setFehler(null); };
  const uebernehmen = () => {
    onChange([...new Set([...value, ...gewaehlt])]);
    setMeldung(gewaehlt.length === 1 ? "1 Anlass übernommen. Sie können ihn unten wieder abwählen." : `${gewaehlt.length} Anlässe übernommen. Sie können sie unten wieder abwählen.`);
    leeren();
  };
  const mitKi = async () => {
    setKiLaeuft(true);
    setFehler(null);
    const res = await fetch("/api/ki/anlass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, patientId: patientId || null }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setKiLaeuft(false);
    if (!res?.ok || !Array.isArray(d?.ids)) return setFehler(d?.error ?? "Die Zuordnung mit KI hat nicht geklappt. Die Erkennung ohne KI steht weiter bereit.");
    setKiIds(d.ids.filter((x: unknown): x is string => typeof x === "string"));
    setKiGewaehlt([]);
  };

  return (
    <div className="card space-y-2" data-testid="anlass-stichworte" data-hilfe="vorschlag-stichworte">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={feldId} className="font-medium text-slate-900">Stichworte aus dem Gespräch</label>
        <MicButton onTranscript={(t) => { setMeldung(null); setText((prev) => (prev ? `${prev}, ${t}` : t)); }} />
      </div>
      <textarea
        id={feldId}
        className="input min-h-[64px] text-sm"
        placeholder={`z. B. ${spec?.anlaesse[0]?.label ?? custom[0]?.name ?? "worum es im Gespräch ging"}`}
        value={text}
        maxLength={2000}
        onChange={(e) => { setMeldung(null); setText(e.target.value); setKiIds(null); }}
        data-testid="anlass-stichworte-text"
      />
      {text.trim() && (
        <div className="space-y-2 text-sm" aria-live="polite">
          {erkannt.length > 0 ? (
            <fieldset data-testid="anlass-stichworte-erkannt">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Erkannt</legend>
              <ul className="mt-1 space-y-1">
                {erkannt.map((e) => {
                  const schon = value.includes(e.id);
                  return (
                    <li key={e.id}>
                      <label className="flex items-start gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1"
                          disabled={schon}
                          checked={schon || !abgewaehlt.includes(e.id)}
                          onChange={(ev) => setAbgewaehlt((a) => (ev.target.checked ? a.filter((x) => x !== e.id) : [...a, e.id]))}
                          data-testid={`anlass-vorschlag-${e.id}`}
                        />
                        <span>
                          {e.label}
                          <span className="block text-xs text-slate-500">{schon ? "ist schon angekreuzt" : `wegen „${e.treffer.join("“, „")}“`}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : (
            <p className="text-xs text-slate-500" data-testid="anlass-stichworte-leer">Noch nichts erkannt. Nennen Sie den Anlass mit einem Wort aus der Liste unten.</p>
          )}
          {ergebnis.verneint.length > 0 && (
            <p className="text-xs text-slate-500" data-testid="anlass-stichworte-verneint">Nicht vorgeschlagen, weil verneint: {ergebnis.verneint.map((v) => v.label).join(", ")}</p>
          )}
          {kiIds && (
            <fieldset className="rounded-lg border border-amber-200 bg-amber-50 p-2" data-testid="anlass-stichworte-ki-entwurf">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Entwurf der KI, bitte prüfen</legend>
              {nurKi.length === 0 ? (
                <p className="text-xs text-amber-900">Die KI hat keinen weiteren Anlass zugeordnet.</p>
              ) : (
                <ul className="space-y-1">
                  {nurKi.map((id) => {
                    const schon = value.includes(id);
                    return (
                      <li key={id}>
                        <label className="flex items-start gap-2 text-slate-800">
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={schon}
                            checked={schon || kiGewaehlt.includes(id)}
                            onChange={(ev) => setKiGewaehlt((a) => (ev.target.checked ? [...a, id] : a.filter((x) => x !== id)))}
                            data-testid={`anlass-ki-vorschlag-${id}`}
                          />
                          <span>{labelVon.get(id)}{schon && <span className="block text-xs text-slate-500">ist schon angekreuzt</span>}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          )}
          {fehler && <p className="text-xs text-red-700" role="alert">{fehler}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={gewaehlt.length === 0} onClick={uebernehmen} data-testid="anlass-stichworte-uebernehmen">
              Übernehmen{gewaehlt.length > 0 ? ` (${gewaehlt.length})` : ""}
            </button>
            {ki.aktiv && (
              <button type="button" className="btn btn-secondary" disabled={kiLaeuft || text.trim().length < 3} onClick={mitKi} data-testid="anlass-stichworte-ki">
                {kiLaeuft ? "KI ordnet zu …" : "Mit KI zuordnen"}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={leeren} data-testid="anlass-stichworte-leeren">Leeren</button>
          </div>
        </div>
      )}
      {meldung && <p className="text-sm text-slate-700" role="status" data-testid="anlass-stichworte-meldung">{meldung}</p>}
      <p className="text-xs text-slate-500">
        Sorrida liest die Stichworte ohne KI aus dem Text. Angekreuzt wird ein Anlass erst, wenn Sie ihn übernehmen. Verneintes wie „kein …“ oder „ohne …“ wird nicht vorgeschlagen. Bitte keine Namen und keine Geburtsdaten eintragen.
        {ki.aktiv && " „Mit KI zuordnen“ schickt nur diesen Text und die Bezeichnungen Ihrer Anlässe an den KI-Dienst. Das Ergebnis ist ein Entwurf."}
      </p>
    </div>
  );
}
