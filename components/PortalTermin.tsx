"use client";

import { useCallback, useEffect, useState } from "react";

type Tag = { tag: string; zeiten: string[] };
type Meiner = { id: string; start: string; minutes: number; reason: string; quelle: string; status: string };
const tagName = (tag: string) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const tagKurz = (tag: string) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
const uhr = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const termin = (iso: string) => `${new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" })}, ${uhr(iso)} Uhr`;

/** Patientenportal: freien Termin wählen und buchen. Angeboten wird nur, was wirklich frei ist. */
export function PortalTermin({ token, praxis }: { token: string; praxis: string }) {
  const [tage, setTage] = useState<Tag[] | null>(null);
  const [meine, setMeine] = useState<Meiner[]>([]);
  const [aktiv, setAktiv] = useState(true);
  const [minuten, setMinuten] = useState(20);
  const [tag, setTag] = useState<string | null>(null);
  const [zeit, setZeit] = useState<string | null>(null);
  const [anlass, setAnlass] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gebucht, setGebucht] = useState<string | null>(null);

  const laden = useCallback(async () => {
    const res = await fetch(`/api/portal/${token}/termin`, { cache: "no-store" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok || !d) { setFehler(d?.error ?? "Die Termine konnten nicht geladen werden."); setTage([]); return; }
    setTage(d.tage); setMeine(d.meine); setAktiv(d.aktiv); setMinuten(d.minuten);
    setTag((t) => (t && d.tage.some((x: Tag) => x.tag === t) ? t : d.tage[0]?.tag ?? null));
  }, [token]);
  useEffect(() => { laden(); }, [laden]);

  async function buchen() {
    if (!zeit) return;
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/portal/${token}/termin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start: zeit, anlass }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) { setFehler(d?.error ?? "Die Buchung hat nicht geklappt."); setZeit(null); await laden(); return; }
    setGebucht(zeit); setZeit(null); setAnlass(""); await laden();
  }
  async function absagen(id: string) {
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/portal/${token}/termin?id=${id}`, { method: "DELETE" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) { setFehler(d?.error ?? "Die Absage hat nicht geklappt."); return; }
    setGebucht(null); await laden();
  }

  const aktuell = tage?.find((t) => t.tag === tag) ?? null;
  return (
    <div className="space-y-4" data-testid="portal-termin">
      {gebucht && (
        <div className="rounded-2xl bg-salbei-50 p-4 text-salbei-900" role="status" data-testid="termin-gebucht">
          <p className="font-semibold">Ihr Termin ist eingetragen.</p>
          <p className="mt-1 text-sm">{termin(gebucht)} bei {praxis}. Wenn Sie nicht kommen können, sagen Sie bitte rechtzeitig ab.</p>
        </div>
      )}
      {fehler && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800" role="alert" data-testid="termin-fehler">{fehler}</p>}

      {meine.length > 0 && (
        <section className="rounded-2xl bg-white p-4" aria-labelledby="meine-termine">
          <h2 id="meine-termine" className="text-sm font-semibold text-slate-900">Ihre nächsten Termine</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {meine.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" data-testid="mein-termin">
                <span className="min-w-0"><span className="font-medium text-slate-900">{termin(m.start)}</span><span className="block text-xs text-slate-500">{m.minutes} Minuten{m.status === "BESTAETIGT" ? " · von der Praxis bestätigt" : ""}</span></span>
                {m.quelle === "PATIENT" && new Date(m.start).getTime() - Date.now() > 24 * 3600e3 && <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => absagen(m.id)}>Absagen</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4" aria-labelledby="freie-termine">
        <h2 id="freie-termine" className="text-sm font-semibold text-slate-900">Freien Termin wählen</h2>
        {tage === null ? <p className="mt-2 text-sm text-slate-500">Freie Termine werden geladen …</p>
          : !aktiv ? <p className="mt-2 text-sm text-slate-600">{praxis} bietet zurzeit keine Online-Termine an. Bitte rufen Sie in der Praxis an.</p>
          : tage.length === 0 ? <p className="mt-2 text-sm text-slate-600" data-testid="termin-keine">In den nächsten Wochen ist online kein Termin frei. Bitte rufen Sie in der Praxis an.</p>
          : (
            <>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Tag">
                {tage.map((t) => (
                  <button key={t.tag} type="button" role="tab" aria-selected={tag === t.tag} onClick={() => { setTag(t.tag); setZeit(null); }} data-testid="termin-tag"
                    className={`shrink-0 rounded-xl px-3 py-2 text-center text-sm ring-1 ${tag === t.tag ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>
                    <span className="block font-medium">{tagKurz(t.tag)}</span><span className={`block text-xs ${tag === t.tag ? "text-brand-100" : "text-slate-500"}`}>{t.zeiten.length} frei</span>
                  </button>
                ))}
              </div>
              {aktuell && (
                <>
                  <p className="mt-2 text-sm font-medium text-slate-900">{tagName(aktuell.tag)}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Uhrzeit">
                    {aktuell.zeiten.map((z) => (
                      <button key={z} type="button" role="radio" aria-checked={zeit === z} onClick={() => setZeit(z)} data-testid="termin-zeit"
                        className={`rounded-xl py-2.5 text-sm font-medium ring-1 ${zeit === z ? "bg-salbei-600 text-white ring-salbei-600" : "bg-salbei-50 text-salbei-900 ring-salbei-200"}`}>{uhr(z)}</button>
                    ))}
                  </div>
                </>
              )}
              {zeit && (
                <div className="mt-4 rounded-xl bg-[#F5F2EE] p-3" data-testid="termin-bestaetigen">
                  <p className="text-sm text-slate-900"><b>{termin(zeit)}</b>, {minuten} Minuten</p>
                  <label className="mt-2 block text-sm"><span className="text-slate-700">Worum geht es? (freiwillig)</span>
                    <input className="input mt-1" maxLength={80} value={anlass} onChange={(e) => setAnlass(e.target.value)} placeholder="z. B. Kontrolle, Beratung" /></label>
                  <p className="mt-1 text-xs text-slate-500">Bitte keine ausführlichen Krankheitsangaben; die besprechen Sie in der Praxis.</p>
                  <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={buchen} data-testid="termin-buchen">{busy ? "Bucht …" : "Termin verbindlich buchen"}</button>
                </div>
              )}
            </>
          )}
      </section>
      <p className="text-center text-xs text-slate-500">Es werden nur freie Zeiten angezeigt. Absagen sind hier bis 24 Stunden vorher möglich, danach bitte telefonisch.</p>
    </div>
  );
}
