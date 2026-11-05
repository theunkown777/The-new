"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Treffer = { rechnungId: string; nummer: string; patient: string; sollCent: number; istCent: number; datum: string; zweck: string; guete: "sicher" | "abweichend" | "vermutlich" };
type Ergebnis = { eingaenge: number; treffer: Treffer[]; ohneZuordnung: { datum: string; betragCent: number; zweck: string; name: string }[] };
const eur = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const GUETE = { sicher: ["Nummer und Betrag stimmen", "bg-emerald-50 text-emerald-800"], abweichend: ["Betrag weicht ab (Teilzahlung?)", "bg-amber-50 text-amber-900"], vermutlich: ["ohne Rechnungsnummer, Betrag und Name passen", "bg-sky-50 text-sky-900"] } as const;

export function Bankabgleich() {
  const router = useRouter();
  const [e, setE] = useState<Ergebnis | null>(null);
  const [wahl, setWahl] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true); setMsg(null); setE(null);
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/bankabgleich", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.error ?? "Datei konnte nicht gelesen werden.");
    setE(j);
    setWahl(Object.fromEntries((j.treffer as Treffer[]).map((t) => [t.rechnungId, t.guete === "sicher"])));
  }
  async function buchen() {
    if (!e) return;
    const zahlungen = e.treffer.filter((t) => wahl[t.rechnungId]).map((t) => ({ rechnungId: t.rechnungId, datum: t.datum }));
    setBusy(true);
    const res = await fetch("/api/bankabgleich/buchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zahlungen }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `${j.gebucht} ${j.gebucht === 1 ? "Rechnung" : "Rechnungen"} als bezahlt gebucht.` : j.error ?? "Buchen fehlgeschlagen.");
    if (res.ok) { setE(null); router.refresh(); }
  }
  const anzahl = e ? e.treffer.filter((t) => wahl[t.rechnungId]).length : 0;

  return (
    <section className="card space-y-3" data-testid="bankabgleich">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Kontoauszug abgleichen</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Kontoauszug aus dem Online-Banking als CAMT.053 (XML) oder CSV hochladen. Sorrida ordnet Zahlungseingänge den offenen Rechnungen zu; gebucht wird erst nach Ihrer Bestätigung. Die Datei wird nicht gespeichert.
          </p>
        </div>
        <label className="btn-secondary cursor-pointer whitespace-nowrap">
          {busy ? "Liest …" : "Kontoauszug wählen"}
          <input type="file" accept=".xml,.csv,.txt,text/csv,application/xml,text/xml" className="sr-only" onChange={(ev) => upload(ev.target.files?.[0])} data-testid="bank-upload" />
        </label>
      </div>
      {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800" data-testid="bank-meldung">{msg}</p>}
      {e && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{e.eingaenge} Zahlungseingänge, {e.treffer.length} zugeordnet, {e.ohneZuordnung.length} ohne passende Rechnung.</p>
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {e.treffer.map((t) => (
              <li key={t.rechnungId} className="flex flex-wrap items-start gap-3 p-3 text-sm" data-testid="bank-treffer">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={!!wahl[t.rechnungId]} onChange={(ev) => setWahl({ ...wahl, [t.rechnungId]: ev.target.checked })} aria-label={`Rechnung ${t.nummer} buchen`} />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-900">Rechnung {t.nummer} · {t.patient} · {eur(t.istCent)}{t.istCent !== t.sollCent && <span className="text-amber-800"> (offen {eur(t.sollCent)})</span>}</p>
                  <p className="truncate text-xs text-slate-500">{new Date(t.datum).toLocaleDateString("de-DE")} · {t.zweck || "ohne Verwendungszweck"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${GUETE[t.guete][1]}`}>{GUETE[t.guete][0]}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-primary" disabled={!anzahl || busy} onClick={buchen} data-testid="bank-buchen">{anzahl} als bezahlt buchen</button>
        </div>
      )}
    </section>
  );
}
