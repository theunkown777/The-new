"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AnfrageZeile = {
  id: string; name: string; geboren: string; phone: string | null; email: string | null; anlass: string; zeit: string; tag: string; eingegangen: string;
  reserviert: boolean; vergangen: boolean; belegt: boolean; beispiel: boolean;
  /** Weitere offene Anfragen mit derselben Mobilnummer oder E-Mail-Adresse */
  gleicherKontakt: number;
  /** neuerKontakt: Kontaktdaten der Anfrage, die in der Akte dieses Patienten noch fehlen */
  kandidaten: { id: string; name: string; neuerKontakt: string[] }[];
};
type Erledigt = { id: string; name: string; status: "BESTAETIGT" | "ABGELEHNT"; text: string; phone: string | null; email: string | null; tag?: string; patientId?: string; neuAngelegt?: boolean };

// Karte „Online-Anfragen neuer Patienten“ auf der Terminseite: bestätigen (Patient neu anlegen oder
// einem vorhandenen zuordnen) oder ablehnen. Danach steht ein Text zum Kopieren bereit;
// Sorrida verschickt nichts von allein.
export function TerminAnfragen({ anfragen }: { anfragen: AnfrageZeile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erledigt, setErledigt] = useState<Erledigt[]>([]);
  const [kopiert, setKopiert] = useState<string | null>(null);
  // Je Anfrage und Patient: Sollen die ungeprüften Kontaktdaten aus dem Formular in die Akte? Standard: nein.
  const [uebernehmen, setUebernehmen] = useState<Record<string, boolean>>({});

  async function sende(a: AnfrageZeile, body: Record<string, unknown>) {
    setBusy(a.id); setFehler(null);
    const res = await fetch(`/api/terminanfragen/${a.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok) { setFehler(d?.error ?? "Das hat nicht geklappt."); router.refresh(); return; }
    setErledigt((e) => [{ id: a.id, name: a.name, status: d.status, text: d.text, phone: d.kontakt?.phone ?? null, email: d.kontakt?.email ?? null, tag: d.tag, patientId: d.patientId, neuAngelegt: d.neuAngelegt }, ...e]);
    router.refresh();
  }
  async function kopieren(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setKopiert(id); } catch { setKopiert(null); }
  }

  const offen = anfragen.filter((a) => !erledigt.some((e) => e.id === a.id));
  if (offen.length === 0 && erledigt.length === 0) return null;
  return (
    <section className="card space-y-3" id="anfragen" data-testid="terminanfragen" data-hilfe="terminanfragen" aria-labelledby="anfragen-titel">
      <h2 id="anfragen-titel" className="font-semibold text-slate-900">Online-Anfragen neuer Patienten <span className="font-normal text-slate-500" data-testid="terminanfragen-anzahl">({offen.length})</span></h2>
      <p className="text-xs text-slate-500">Erst mit Ihrer Bestätigung entstehen Patient und Termin. Die gewünschte Zeit ist 24 Stunden reserviert.</p>
      {fehler && <p className="text-sm text-red-700" role="alert" data-testid="terminanfrage-fehler">{fehler}</p>}

      {erledigt.map((e) => (
        <div key={e.id} className={`rounded-xl p-3 text-sm ${e.status === "BESTAETIGT" ? "bg-salbei-50" : "bg-slate-50"}`} data-testid="terminanfrage-erledigt">
          <p className="font-medium text-slate-900">{e.name}: {e.status === "BESTAETIGT" ? `bestätigt${e.neuAngelegt ? ", Patient neu angelegt" : ", vorhandenem Patienten zugeordnet"}` : "abgelehnt"}</p>
          <p className="mt-1 text-xs text-slate-600">Bitte geben Sie Bescheid{e.phone ? ` · ${e.phone}` : ""}{e.email ? ` · ${e.email}` : ""}. Sorrida hat nichts verschickt.</p>
          <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-2 text-slate-800" data-testid="terminanfrage-text">{e.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary text-sm" onClick={() => kopieren(e.id, e.text)} data-testid="terminanfrage-kopieren">{kopiert === e.id ? "Kopiert" : "Text kopieren"}</button>
            {e.status === "BESTAETIGT" && e.tag && <a className="ziel text-xs text-brand-700 underline" href={`/termine?tag=${e.tag}`} data-testid="terminanfrage-zum-termin">Zum Termin</a>}
            {e.patientId && <a className="ziel text-xs text-brand-700 underline" href={`/patients/${e.patientId}`}>Zur Akte</a>}
          </div>
        </div>
      ))}

      {offen.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {offen.map((a) => (
            <li key={a.id} className="space-y-2 py-3 text-sm" data-testid="terminanfrage">
              <div>
                <p className="font-medium text-slate-900">
                  {a.name} <span className="font-normal text-slate-500">· geb. {a.geboren}</span>
                  {a.beispiel && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-800" data-testid="terminanfrage-beispiel">Beispiel</span>}
                </p>
                <p className="text-slate-700"><a href={`/termine?tag=${a.tag}`} className="font-medium hover:text-brand-700">{a.zeit}</a> · {a.anlass}</p>
                <p className="break-words text-xs text-slate-500">{[a.phone, a.email].filter(Boolean).join(" · ")} · eingegangen {a.eingegangen}</p>
                {a.vergangen ? <p className="mt-1 text-xs text-red-700">Die gewünschte Zeit ist vorbei. Bitte ablehnen und einen neuen Termin vereinbaren.</p>
                  : a.belegt ? <p className="mt-1 text-xs text-amber-800" data-testid="terminanfrage-belegt">Zu dieser Zeit ist inzwischen ein anderer Termin eingetragen.</p>
                  : !a.reserviert ? <p className="mt-1 text-xs text-amber-800">Die Reservierung ist abgelaufen. Die Zeit kann inzwischen anders vergeben werden.</p> : null}
                {a.gleicherKontakt >= 2 && (
                  <p className="mt-1 text-xs text-amber-800" data-testid="terminanfrage-gleicher-kontakt">Mit diesen Kontaktdaten sind {a.gleicherKontakt} weitere Anfragen offen. Bitte prüfen Sie, ob alle von derselben Person stammen.</p>
                )}
              </div>
              {a.kandidaten.length > 0 && (
                <div className="rounded-lg bg-brand-50 p-2 text-xs text-brand-800" data-testid="terminanfrage-vorschlag">
                  <p>Gleicher Name und gleiches Geburtsdatum wie in Ihrem Bestand:</p>
                  <div className="mt-1.5 space-y-2">
                    {a.kandidaten.map((k) => {
                      const schluessel = `${a.id}:${k.id}`;
                      return (
                        <div key={k.id} className="space-y-1.5">
                          <button type="button" className="btn btn-secondary text-xs" disabled={busy === a.id || a.vergangen} onClick={() => sende(a, { aktion: "bestaetigen", patientId: k.id, kontaktUebernehmen: k.neuerKontakt.length > 0 && !!uebernehmen[schluessel] })} data-testid="terminanfrage-zuordnen">Bestätigen für {k.name}</button>
                          {k.neuerKontakt.length > 0 && (
                            <label className="flex items-start gap-2 text-xs text-slate-700">
                              <input type="checkbox" className="mt-0.5" checked={!!uebernehmen[schluessel]} onChange={(e) => setUebernehmen((u) => ({ ...u, [schluessel]: e.target.checked }))} data-testid="terminanfrage-kontakt-uebernehmen" />
                              <span>
                                In der Akte fehlt: <span className="break-all font-medium">{k.neuerKontakt.join(" · ")}</span>. Aus der Anfrage in die Akte übernehmen.
                                <span className="block text-slate-500">Die Angabe stammt aus dem Online-Formular und ist nicht geprüft. Ohne Häkchen bleibt die Akte unverändert.</span>
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary text-sm" disabled={busy === a.id || a.vergangen} onClick={() => sende(a, { aktion: "bestaetigen" })} data-testid="terminanfrage-bestaetigen">{a.kandidaten.length ? "Bestätigen und neu anlegen" : "Bestätigen"}</button>
                <button type="button" className="btn btn-secondary text-sm" disabled={busy === a.id} onClick={() => sende(a, { aktion: "ablehnen" })} data-testid="terminanfrage-ablehnen">Ablehnen</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
