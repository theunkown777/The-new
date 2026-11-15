"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FELDER, FELD_LABEL, TRENNZEICHEN_NAME, bestandAus, dateiLesen, einordnen, inBloecke, zeilePruefen, zuordnungFehler, type DateiGelesen, type Feld, type ImportPatient, type Zuordnung,
} from "@/lib/patientenImport";

// Patientenliste einlesen: Die Datei wird im Browser gelesen und geprüft und
// verlässt ihn nicht. An den Server gehen erst für die Vorschau die geprüften
// Zeilen (in Blöcken), gespeichert wird erst nach dem Klick auf „Jetzt speichern“.

type Fehler = { zeile: number; grund: string };
type Vorschau = { neu: number; vorhanden: number; fehler: Fehler[]; uebersprungen: Fehler[]; hinweise: number; gueltig: ImportPatient[] };
type Antwort = { gespeichert: number; neu: number; vorhanden: number; fehler: number; ergebnis: { zeile: number; status: "neu" | "vorhanden" | "fehler"; grund?: string }[]; error?: string };

async function block(patienten: ImportPatient[], nurPruefen: boolean, teil: number, teile: number): Promise<Antwort> {
  const res = await fetch("/api/patients/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nurPruefen, patienten, teil, teile }),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as Antwort | null;
  if (!res || !res.ok || !data) throw new Error(data?.error ?? "Keine Verbindung zum Server. Bitte erneut versuchen.");
  return data;
}

export function PatientenImport({ personPl = "Patienten", personSg = "Patient", demo = false }: { personPl?: string; personSg?: string; demo?: boolean }) {
  const [datei, setDatei] = useState<{ name: string; gelesen: DateiGelesen } | null>(null);
  const [zu, setZu] = useState<Zuordnung | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);
  const [laeuft, setLaeuft] = useState<null | { was: "vorschau" | "speichern"; teil: number; teile: number }>(null);
  const [fertig, setFertig] = useState<{ gespeichert: number; vorhanden: number; fehler: number } | null>(null);
  const [alleFehler, setAlleFehler] = useState(false);
  const eingabe = useRef<HTMLInputElement>(null);

  const zuFehler = zu ? zuordnungFehler(zu) : null;
  const beispiel = useMemo(() => datei?.gelesen.zeilen.slice(0, 3) ?? [], [datei]);

  async function dateiGewaehlt(f: File | undefined) {
    setFehler(null);
    setVorschau(null);
    setFertig(null);
    setDatei(null);
    setZu(null);
    if (!f) return;
    try {
      const gelesen = dateiLesen(new Uint8Array(await f.arrayBuffer()));
      setDatei({ name: f.name, gelesen });
      setZu(gelesen.zuordnung);
    } catch (e) {
      setFehler((e as Error).message || "Die Datei konnte nicht gelesen werden.");
      if (eingabe.current) eingabe.current.value = "";
    }
  }

  function spalteWaehlen(feld: Feld, wert: string) {
    if (!zu) return;
    setZu({ ...zu, [feld]: wert === "" ? null : Number(wert) });
    setVorschau(null);
    setFertig(null);
  }

  async function vorschauErstellen() {
    if (!datei || !zu || zuFehler) return;
    setFehler(null);
    setFertig(null);
    setVorschau(null);
    const heute = new Date();
    const fehlerListe: Fehler[] = [];
    const gueltig: ImportPatient[] = [];
    let hinweise = 0;
    for (const z of datei.gelesen.zeilen) {
      const r = zeilePruefen(z, zu, heute);
      if (r.ok) {
        gueltig.push(r.daten);
        if (r.hinweise.length) hinweise++;
      } else fehlerListe.push({ zeile: r.zeile, grund: r.grund });
    }
    // Doppelte Zeilen in der Datei selbst gleich hier aussortieren (die erste zählt),
    // damit die Zahlen der Vorschau auch über Blockgrenzen hinweg stimmen.
    let neu = 0, vorhanden = 0;
    const uebersprungen: Fehler[] = [];
    const inDatei = einordnen(gueltig, bestandAus([]));
    const einmalig = gueltig.filter((_, i) => inDatei[i].status === "neu");
    for (const e of inDatei) {
      if (e.status === "vorhanden") {
        vorhanden++;
        if (uebersprungen.length < 200) uebersprungen.push({ zeile: e.zeile, grund: "steht doppelt in der Datei" });
      }
    }
    const bloecke = inBloecke(einmalig);
    const neueZeilen = new Set<number>();
    try {
      for (let i = 0; i < bloecke.length; i++) {
        setLaeuft({ was: "vorschau", teil: i + 1, teile: bloecke.length });
        const a = await block(bloecke[i], true, i + 1, bloecke.length);
        for (const e of a.ergebnis) {
          if (e.status === "neu") {
            neu++;
            neueZeilen.add(e.zeile);
          } else if (e.status === "vorhanden") {
            vorhanden++;
            if (uebersprungen.length < 200) uebersprungen.push({ zeile: e.zeile, grund: e.grund ?? "schon vorhanden" });
          } else fehlerListe.push({ zeile: e.zeile, grund: e.grund ?? "fehlerhaft" });
        }
      }
      fehlerListe.sort((a, b) => a.zeile - b.zeile);
      setVorschau({ neu, vorhanden, fehler: fehlerListe, uebersprungen, hinweise, gueltig: gueltig.filter((p) => neueZeilen.has(p.zeile)) });
    } catch (e) {
      setFehler((e as Error).message);
    }
    setLaeuft(null);
  }

  async function speichern() {
    if (!vorschau || vorschau.gueltig.length === 0) return;
    setFehler(null);
    const bloecke = inBloecke(vorschau.gueltig);
    let gespeichert = 0, vorhanden = vorschau.vorhanden, fehlerZahl = vorschau.fehler.length;
    try {
      for (let i = 0; i < bloecke.length; i++) {
        setLaeuft({ was: "speichern", teil: i + 1, teile: bloecke.length });
        const a = await block(bloecke[i], false, i + 1, bloecke.length);
        gespeichert += a.gespeichert;
        vorhanden += a.vorhanden;
        fehlerZahl += a.fehler;
      }
      setFertig({ gespeichert, vorhanden, fehler: fehlerZahl });
      setVorschau(null);
      setDatei(null);
      setZu(null);
      if (eingabe.current) eingabe.current.value = "";
    } catch (e) {
      setFehler(`${(e as Error).message} Bis hierhin wurden ${gespeichert.toLocaleString("de-DE")} ${personPl} gespeichert. Sie können die Vorschau neu erstellen und fortsetzen – schon Gespeicherte werden übersprungen.`);
      setVorschau(null);
    }
    setLaeuft(null);
  }

  const n = (x: number) => x.toLocaleString("de-DE");
  const gezeigteFehler = vorschau ? (alleFehler ? vorschau.fehler.slice(0, 500) : vorschau.fehler.slice(0, 10)) : [];

  return (
    <div className="space-y-5" data-testid="patienten-import">
      <section className="card space-y-3" aria-labelledby="imp-1">
        <h2 id="imp-1" className="font-semibold text-slate-900">1. Datei wählen</h2>
        <p className="text-sm text-slate-600">
          CSV-Datei mit Kopfzeile. Spalten getrennt mit Semikolon, Komma oder Tabulator. Die Datei wird in Ihrem Browser gelesen und von Sorrida nicht gespeichert.
        </p>
        <div>
          <label className="label" htmlFor="imp-datei">CSV-Datei</label>
          <input id="imp-datei" ref={eingabe} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values" className="block w-full max-w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            onChange={(e) => dateiGewaehlt(e.target.files?.[0])} disabled={!!laeuft} data-testid="import-datei" />
        </div>
        {datei && (
          <p className="text-sm text-slate-600" data-testid="import-erkannt" role="status">
            <b className="[overflow-wrap:anywhere]">{datei.name}</b>: {n(datei.gelesen.zeilen.length)} {datei.gelesen.zeilen.length === 1 ? "Zeile" : "Zeilen"} · {datei.gelesen.kopf.length} Spalten · Trennzeichen {TRENNZEICHEN_NAME[datei.gelesen.trennzeichen]} · Zeichensatz {datei.gelesen.zeichensatz}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Einwilligungen für Nachrichten per E-Mail oder WhatsApp werden nicht aus der Datei übernommen. Die holen Sie wie gewohnt bei jeder Person selbst ein.
        </p>
      </section>

      {fehler && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="import-fehler">{fehler}</p>}

      {datei && zu && (
        <section className="card space-y-4" aria-labelledby="imp-2">
          <div>
            <h2 id="imp-2" className="font-semibold text-slate-900">2. Spalten zuordnen</h2>
            <p className="mt-1 text-sm text-slate-600">Sorrida hat die Spalten anhand der Kopfzeile erkannt. Bitte prüfen und bei Bedarf ändern. Pflicht sind Nachname und Vorname.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FELDER.map((feld) => {
              const idx = zu[feld];
              const probe = idx != null ? beispiel.map((z) => z.felder[idx]).filter(Boolean).slice(0, 2).join(" · ") : "";
              return (
                <div key={feld}>
                  <label className="label" htmlFor={`imp-${feld}`}>{FELD_LABEL[feld]}</label>
                  <select id={`imp-${feld}`} className="input" value={idx ?? ""} onChange={(e) => spalteWaehlen(feld, e.target.value)} disabled={!!laeuft} data-testid={`import-spalte-${feld}`}>
                    <option value="">– nicht übernehmen –</option>
                    {datei.gelesen.kopf.map((k, i) => (
                      <option key={i} value={i}>{k || `Spalte ${i + 1}`}</option>
                    ))}
                  </select>
                  <p className="mt-1 min-h-[1rem] truncate text-xs text-slate-500">{probe ? `z. B. ${probe}` : idx != null ? "in den ersten Zeilen leer" : ""}</p>
                </div>
              );
            })}
          </div>
          {zuFehler && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert" data-testid="import-zuordnung-fehler">{zuFehler}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={vorschauErstellen} disabled={!!zuFehler || !!laeuft} data-testid="import-vorschau">
              {laeuft?.was === "vorschau" ? `Prüft … (${laeuft.teil} von ${laeuft.teile})` : "Vorschau erstellen"}
            </button>
            <span className="text-xs text-slate-500">Dabei wird noch nichts gespeichert.</span>
          </div>
        </section>
      )}

      {vorschau && (
        <section className="card space-y-4" aria-labelledby="imp-3" data-testid="import-vorschau-ergebnis">
          <h2 id="imp-3" className="font-semibold text-slate-900">3. Vorschau</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4" role="status">
            <div className="rounded-xl bg-salbei-50 p-3 sm:p-4">
              <p className="text-xs text-slate-600 sm:text-sm">Neu</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-salbei-800 sm:text-2xl" data-testid="import-zahl-neu">{n(vorschau.neu)}</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">werden angelegt</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
              <p className="text-xs text-slate-600 sm:text-sm">Schon vorhanden</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl" data-testid="import-zahl-vorhanden">{n(vorschau.vorhanden)}</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">werden übersprungen, nicht überschrieben</p>
            </div>
            <div className={`rounded-xl p-3 sm:p-4 ${vorschau.fehler.length ? "bg-red-50" : "bg-slate-50"}`}>
              <p className="text-xs text-slate-600 sm:text-sm">Fehlerhaft</p>
              <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${vorschau.fehler.length ? "text-red-700" : "text-slate-900"}`} data-testid="import-zahl-fehler">{n(vorschau.fehler.length)}</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">werden nicht eingelesen</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            „Schon vorhanden“ heißt: gleicher Nachname, Vorname und gleiches Geburtsdatum – oder gleiche Patientennummer. Das gilt auch für doppelte Zeilen in der Datei.
            {vorschau.hinweise > 0 ? ` Bei ${n(vorschau.hinweise)} ${vorschau.hinweise === 1 ? "Zeile wird ein nicht lesbarer Wert" : "Zeilen werden nicht lesbare Werte"} (E-Mail, Mobilnummer oder Versicherungsart) weggelassen.` : ""}
          </p>

          {vorschau.fehler.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Fehlerhafte Zeilen</h3>
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm" data-testid="import-fehlerliste">
                {gezeigteFehler.map((f, i) => (
                  <li key={`${f.zeile}-${i}`} className="flex gap-3 px-3 py-2">
                    <span className="w-20 shrink-0 tabular-nums text-slate-500">Zeile {f.zeile}</span>
                    <span className="min-w-0 text-red-700 [overflow-wrap:anywhere]">{f.grund}</span>
                  </li>
                ))}
              </ul>
              {vorschau.fehler.length > 10 && (
                <button type="button" className="ziel mt-2 text-sm text-brand-700 underline" onClick={() => setAlleFehler((v) => !v)} aria-expanded={alleFehler} data-testid="import-fehler-alle">
                  {alleFehler ? "Weniger zeigen" : `Alle ${n(Math.min(500, vorschau.fehler.length))} zeigen`}
                </button>
              )}
              <p className="mt-2 text-xs text-slate-500">Die Zeilennummer entspricht der Zeile in Ihrer Datei (Zeile 1 ist die Kopfzeile). Sie können die Datei berichtigen und später noch einmal einlesen – schon Gespeicherte werden dann übersprungen.</p>
            </div>
          )}

          {vorschau.gueltig.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Die ersten neuen Einträge</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm" data-testid="import-beispiele">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-2 font-semibold">Name</th><th className="px-3 py-2 font-semibold">Geboren</th><th className="px-3 py-2 font-semibold">Versicherung</th><th className="px-3 py-2 font-semibold">Kontakt</th></tr>
                  </thead>
                  <tbody>
                    {vorschau.gueltig.slice(0, 5).map((p) => (
                      <tr key={p.zeile} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-900">{p.lastName}, {p.firstName}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-600">{p.birthDate ? p.birthDate.split("-").reverse().join(".") : "–"}</td>
                        <td className="px-3 py-2 text-slate-600">{[p.insuranceName, p.insuranceType === "GKV" ? "gesetzlich" : p.insuranceType === "PKV" ? "privat" : null].filter(Boolean).join(" · ") || "–"}</td>
                        <td className="px-3 py-2 text-slate-600 [overflow-wrap:anywhere]">{[p.phone, p.email].filter(Boolean).join(" · ") || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {demo && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="note">Gastzugang: Bitte keine echten Daten in die Demo einlesen.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={speichern} disabled={!!laeuft || vorschau.neu === 0} data-testid="import-speichern">
              {laeuft?.was === "speichern" ? `Speichert … (${laeuft.teil} von ${laeuft.teile})` : vorschau.neu === 0 ? "Nichts Neues zu speichern" : `${n(vorschau.neu)} ${vorschau.neu === 1 ? personSg : personPl} jetzt speichern`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setVorschau(null); }} disabled={!!laeuft} data-testid="import-abbrechen">Abbrechen</button>
          </div>
        </section>
      )}

      {fertig && (
        <section className="card space-y-3 border-salbei-200 bg-salbei-50" role="status" data-testid="import-fertig">
          <h2 className="font-semibold text-slate-900">Fertig</h2>
          <p className="text-sm text-slate-700">
            {n(fertig.gespeichert)} {fertig.gespeichert === 1 ? personSg : personPl} neu angelegt · {n(fertig.vorhanden)} übersprungen (schon vorhanden) · {n(fertig.fehler)} fehlerhaft.
          </p>
          <p className="text-xs text-slate-600">Die Datei wurde nicht gespeichert. Im Protokoll steht nur, dass eine Liste eingelesen wurde und wie viele Einträge – keine Namen.</p>
          <Link href="/patients" className="btn btn-primary" data-testid="import-zur-liste">Zur Liste</Link>
        </section>
      )}
    </div>
  );
}
