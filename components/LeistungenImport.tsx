"use client";

import { useState } from "react";

const SYSTEME: [string, string][] = [
  ["EBM", "Kasse (EBM, regionale KV-Ziffern)"],
  ["SONSTIGES", "Sonder- und Selektivverträge (HZV, DMP …)"],
  ["GOAE", "GOÄ (privat)"],
  ["UVGOAE", "UV-GOÄ (Berufsgenossenschaft)"],
  ["GOZ", "GOZ"],
  ["BEMA", "BEMA"],
  ["HEILMITTEL", "Heilmittel"],
  ["PFLEGE", "Pflege"],
  ["HILFSMITTEL", "Hilfsmittel"],
  ["APO", "Apotheke"],
  ["SELBST", "Selbstzahler"],
];

type Antwort = { gelesen: number; uebernommen: number; neu: number; schonVorhanden: number; fehler: { zeile: number; grund: string }[]; fehlerGesamt: number; error?: string };

/** Leistungslisten der eigenen KV oder aus Verträgen als CSV in den Praxiskatalog übernehmen. */
export function LeistungenImport() {
  const [csv, setCsv] = useState("");
  const [system, setSystem] = useState("EBM");
  const [kategorie, setKategorie] = useState("Regionale KV-Ziffern");
  const [laeuft, setLaeuft] = useState(false);
  const [antwort, setAntwort] = useState<Antwort | null>(null);

  const senden = async (nurPruefen: boolean) => {
    setLaeuft(true);
    const res = await fetch("/api/catalog-items/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv, system, kategorie, nurPruefen }) }).catch(() => null);
    setAntwort((await res?.json().catch(() => null)) ?? { error: "Keine Verbindung" });
    setLaeuft(false);
  };

  return (
    <details className="card p-5" data-testid="leistungen-import">
      <summary className="cursor-pointer text-sm font-medium text-slate-900">Regionale KV-Ziffern, Sonderverträge oder eigene Liste importieren</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-slate-600">
          Regionale Gebührenordnungspositionen und Vertragsziffern veröffentlicht jede KV bzw. jeder Vertrag selbst (Rundschreiben, Abrechnungsseite der KV, Praxissoftware). Fügen Sie die Liste hier ein oder laden Sie eine CSV-Datei:
          eine Zeile je Leistung, <span className="font-mono text-xs">Ziffer;Bezeichnung;Betrag in Euro</span> (Betrag, Punkte und Hinweis optional, Kopfzeile erlaubt).
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-slate-600">
            Verzeichnis
            <select className="input mt-1 block" value={system} onChange={(e) => setSystem(e.target.value)} aria-label="Verzeichnis">
              {SYSTEME.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Kategorie im Katalog
            <input className="input mt-1 block" value={kategorie} maxLength={80} onChange={(e) => setKategorie(e.target.value)} aria-label="Kategorie" />
          </label>
          <label className="text-xs text-slate-600">
            CSV-Datei
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="mt-1 block text-xs" aria-label="CSV-Datei"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
          </label>
        </div>
        <textarea className="input h-32 w-full font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="Leistungsliste"
          placeholder={"Ziffer;Bezeichnung;Betrag\n99001;Beispiel: regionale Impfleistung;10,50"} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary py-1.5 text-sm" disabled={!csv.trim() || laeuft} onClick={() => senden(true)}>Prüfen</button>
          <button type="button" className="btn-primary py-1.5 text-sm" disabled={!csv.trim() || laeuft} onClick={() => senden(false)}>In den Katalog übernehmen</button>
        </div>
        {antwort && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700" data-testid="import-ergebnis" role="status">
            {antwort.error ? <p className="text-red-700">{antwort.error}</p> : (
              <>
                <p>{antwort.gelesen} Leistungen gelesen · {antwort.uebernommen ? `${antwort.uebernommen} übernommen` : `${antwort.neu} neu`} · {antwort.schonVorhanden} schon im Katalog{antwort.fehlerGesamt ? ` · ${antwort.fehlerGesamt} Zeilen mit Fehler` : ""}</p>
                {antwort.fehler.length > 0 && <ul className="mt-1 list-disc pl-4 text-red-700">{antwort.fehler.slice(0, 10).map((f) => <li key={f.zeile}>Zeile {f.zeile}: {f.grund}</li>)}</ul>}
              </>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
