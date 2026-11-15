"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type P = { id: string; firstName: string; lastName: string; birthDate: string | null };
export type WarteZeile = { id: string; patientId: string; name: string; anlass: string; wunsch: string; notiz: string | null; seit: string; angeboten: string | null };

// Warteliste auf der Terminseite: hinzufügen, ansehen, entfernen.
export function WartelisteKarte({ eintraege, anlaesse = [] }: { eintraege: WarteZeile[]; anlaesse?: string[] }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<P[]>([]);
  const [patient, setPatient] = useState<P | null>(null);
  const [anlass, setAnlass] = useState("");
  const [vonTag, setVonTag] = useState("");
  const [bisTag, setBisTag] = useState("");
  const [zeit, setZeit] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (patient || q.trim().length < 2) return setTreffer([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/patients?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      if (r?.ok) setTreffer(((await r.json()).patients as P[]).slice(0, 8));
    }, 200);
    return () => clearTimeout(t);
  }, [q, patient]);

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return setFehler("Bitte zuerst eine Person auswählen.");
    setBusy(true); setFehler(null);
    const res = await fetch("/api/warteliste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, anlass, vonTag, bisTag, zeit, notiz: notiz || null }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFehler((await res?.json().catch(() => null))?.error ?? "Speichern fehlgeschlagen.");
    setPatient(null); setQ(""); setAnlass(""); setVonTag(""); setBisTag(""); setZeit(""); setNotiz(""); setOffen(false);
    router.refresh();
  }
  async function entfernen(id: string) {
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/warteliste/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFehler("Entfernen fehlgeschlagen.");
    router.refresh();
  }

  return (
    <section className="card space-y-3" id="warteliste" data-testid="warteliste" aria-labelledby="warteliste-titel">
      <div className="flex items-center justify-between gap-2">
        <h2 id="warteliste-titel" className="font-semibold text-slate-900">Warteliste <span className="font-normal text-slate-500" data-testid="warteliste-anzahl">({eintraege.length})</span></h2>
        {!offen && <button type="button" className="btn btn-secondary text-sm" onClick={() => setOffen(true)} data-testid="warteliste-neu">Hinzufügen</button>}
      </div>
      <p className="text-xs text-slate-500">Wer früher kommen möchte, steht hier. Wird ein Termin abgesagt, schlägt Sorrida beim abgesagten Termin bis zu zwei passende Personen vor. Verschickt wird nichts von allein.</p>

      {offen && (
        <form onSubmit={speichern} className="space-y-2 rounded-xl bg-slate-50 p-3" data-testid="warteliste-formular">
          <div className="relative">
            {patient ? (
              <p className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span>{patient.lastName}, {patient.firstName}</span>
                <button type="button" className="text-xs underline" onClick={() => { setPatient(null); setQ(""); }}>ändern</button>
              </p>
            ) : (
              <input className="input" placeholder="Name suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Name suchen" data-testid="warteliste-patient" />
            )}
            {treffer.length > 0 && !patient && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
                {treffer.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setPatient(p); setTreffer([]); }} data-testid="warteliste-treffer">
                      {p.lastName}, {p.firstName}{p.birthDate ? <span className="text-slate-500"> · {new Date(p.birthDate).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input className="input" placeholder="Anlass, z. B. Kontrolle" value={anlass} onChange={(e) => setAnlass(e.target.value)} maxLength={120} aria-label="Anlass" list="warteliste-anlaesse" data-testid="warteliste-anlass" />
          <datalist id="warteliste-anlaesse">{anlaesse.map((a) => <option key={a} value={a} />)}</datalist>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">Ab (freiwillig)<input type="date" className="input mt-1" value={vonTag} onChange={(e) => setVonTag(e.target.value)} data-testid="warteliste-von" /></label>
            <label className="text-xs text-slate-500">Bis (freiwillig)<input type="date" className="input mt-1" value={bisTag} onChange={(e) => setBisTag(e.target.value)} data-testid="warteliste-bis" /></label>
          </div>
          <label className="block text-xs text-slate-500">Tageszeit
            <select className="input mt-1" value={zeit} onChange={(e) => setZeit(e.target.value)} data-testid="warteliste-zeit">
              <option value="">egal</option>
              <option value="VORMITTAG">vormittags (bis 12 Uhr)</option>
              <option value="NACHMITTAG">nachmittags (ab 12 Uhr)</option>
            </select>
          </label>
          <input className="input" placeholder="Notiz (freiwillig), z. B. nur montags" value={notiz} onChange={(e) => setNotiz(e.target.value)} maxLength={300} aria-label="Notiz" data-testid="warteliste-notiz" />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={busy || !patient || anlass.trim().length < 2} data-testid="warteliste-speichern">Auf die Warteliste</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setOffen(false); setFehler(null); }}>Abbrechen</button>
          </div>
        </form>
      )}
      {fehler && <p className="text-sm text-red-700" role="alert" data-testid="warteliste-meldung">{fehler}</p>}

      {eintraege.length === 0 ? (
        <p className="text-sm text-slate-600" data-testid="warteliste-leer">Noch niemand auf der Warteliste.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {eintraege.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 py-2 text-sm" data-testid="warteliste-eintrag">
              <span className="min-w-0">
                <a href={`/patients/${e.patientId}`} className="font-medium text-slate-900 hover:text-brand-700">{e.name}</a>
                <span className="block text-xs text-slate-600">{e.anlass} · {e.wunsch}</span>
                <span className="block text-xs text-slate-500">seit {e.seit}{e.angeboten ? ` · angeboten ${e.angeboten}` : ""}{e.notiz ? ` · ${e.notiz}` : ""}</span>
              </span>
              <button type="button" className="ziel shrink-0 text-xs text-slate-500 underline hover:text-red-700" disabled={busy} onClick={() => entfernen(e.id)} data-testid="warteliste-entfernen">Entfernen</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
