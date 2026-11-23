"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { einbettung } from "@/lib/terminEinbettung";

import { useAppText } from "@/components/FachKontext";
// Einstellungen: Terminbuchung für neue Patienten. Schalter, Anlässe, Link und Einbettungs-Code
// für die Website der Praxis (Knopf oder Rahmen).
export function NeupatientenBuchung({ admin, demo, buchungAktiv, start, vorschlaege, stammdatenFehlt = [], personPl = "Patienten" }: {
  admin: boolean; demo: boolean; buchungAktiv: boolean;
  /** Personenwort des Fachs in der Mehrzahl (lib/fachprofile.ts), z. B. Patienten, Kunden, Frauen */
  personPl?: string;
  /** Angaben der Praxis, die die Buchungsseite zeigen muss und die noch fehlen (lib/praxisStammdaten.ts buchungsseiteFehlt) */
  stammdatenFehlt?: string[];
  start: { aktiv: boolean; url: string | null; anlaesse: string[] };
  /** Übliche Terminanlässe des Fachs, zum schnellen Übernehmen */
  vorschlaege: string[];
}) {
  const ft = useAppText();
  const router = useRouter();
  const [aktiv, setAktiv] = useState(start.aktiv);
  const [anlaesse, setAnlaesse] = useState(start.anlaesse.join("\n"));
  const [url, setUrl] = useState(start.url);
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);

  const liste = () => anlaesse.split("\n").map((a) => a.trim()).filter(Boolean);
  async function sende(body: Record<string, unknown>, erfolg: string) {
    setBusy(true); setMeldung(null);
    const res = await fetch("/api/settings/buchung/neupatienten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMeldung({ art: "fehler", text: d?.error ?? "Das hat nicht geklappt." });
    setUrl(d.url ?? null);
    setMeldung({ art: "ok", text: erfolg });
    router.refresh();
  }
  async function kopieren(was: string, text: string) {
    try { await navigator.clipboard.writeText(text); setKopiert(was); } catch { setKopiert(null); }
  }
  const code = url ? einbettung(url) : null;
  const dazu = vorschlaege.filter((v) => !liste().includes(v)).slice(0, 8);

  return (
    <section className="card space-y-4" aria-labelledby="b-neu" data-testid="neupatienten" data-hilfe="neupatienten-buchung">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="b-neu" className="font-semibold text-slate-900">Termine für neue {personPl}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Wer noch keinen persönlichen Link hat, fragt über eine eigene Seite einen Termin an. Sie sehen die Anfrage unter Termine und im Eingang und bestätigen sie mit einem Klick.
            Erst dann entstehen Akte und Termin. Die gewünschte Zeit ist 24 Stunden reserviert.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-900">
          <input type="checkbox" className="h-5 w-5" checked={aktiv} disabled={!admin} onChange={(e) => setAktiv(e.target.checked)} data-testid="neupatienten-aktiv" />
          Für neue {personPl} anbieten
        </label>
      </div>
      {meldung && <p role={meldung.art === "fehler" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${meldung.art === "fehler" ? "bg-red-50 text-red-800" : "bg-salbei-50 text-salbei-900"}`} data-testid="neupatienten-meldung">{meldung.text}</p>}
      {!buchungAktiv && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Dafür müssen oben „Online-Termine anbieten“ eingeschaltet und Sprechzeiten gespeichert sein.</p>}
      {stammdatenFehlt.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="neupatienten-stammdaten-fehlen">
          Die Buchungsseite zeigt neuen {personPl}{ft(", wer Ihre Praxis ist und wo Ihre Datenschutzhinweise stehen. Es fehlt noch: ")}{stammdatenFehlt.join(" und ")}.{" "}
          {demo ? "Im Gastzugang lässt sich die Seite trotzdem ausprobieren." : "Vorher lässt sich die Seite nicht einschalten."}{" "}
          <a href="/settings/praxis" className="font-medium underline">{ft("Angaben der Praxis eintragen")}</a>
        </p>
      )}

      <label className="block text-sm"><span className="label">Anlässe zur Auswahl (einer je Zeile, höchstens 12)</span>
        <textarea className="input min-h-[7rem]" value={anlaesse} disabled={!admin} onChange={(e) => setAnlaesse(e.target.value)} data-testid="neupatienten-anlaesse" />
      </label>
      {admin && dazu.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>Übernehmen:</span>
          {dazu.map((v) => <button key={v} type="button" className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200 hover:ring-brand-300" onClick={() => setAnlaesse((a) => [...a.split("\n").map((x) => x.trim()).filter(Boolean), v].join("\n"))}>+ {v}</button>)}
        </p>
      )}
      <p className="text-xs text-slate-500">Bitte allgemeine Anlässe wählen. Neue {personPl} sollen hier keine Krankheitsangaben machen müssen.</p>
      {admin && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => sende({ aktion: "speichern", aktiv, anlaesse: liste() }, "Gespeichert.")} data-testid="neupatienten-speichern">{busy ? "Speichert …" : "Speichern"}</button>}

      {url && code && (
        <div className="space-y-3 border-t border-slate-100 pt-4" data-testid="neupatienten-einbettung">
          {!start.aktiv && <p className="text-sm text-amber-800">Die Seite ist ausgeschaltet. Der Link zeigt zurzeit nur einen Hinweis.</p>}
          {demo && <p className="text-sm text-amber-800">Gastzugang: Die Seite funktioniert, ist aber als Beispiel gekennzeichnet.</p>}
          <div>
            <p className="label">Link zur Buchungsseite</p>
            <div className="flex flex-wrap items-center gap-2">
              <a href={url} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-xs text-brand-700 underline" data-testid="neupatienten-link">{url}</a>
              <button type="button" className="btn btn-secondary text-sm" onClick={() => kopieren("link", url)} data-testid="neupatienten-link-kopieren">{kopiert === "link" ? "Kopiert" : "Link kopieren"}</button>
            </div>
          </div>
          <div>
            <p className="label">Für Ihre Website: Knopf</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-800" data-testid="neupatienten-knopf">{code.knopf}</pre>
            <button type="button" className="btn btn-secondary mt-2 text-sm" onClick={() => kopieren("knopf", code.knopf)} data-testid="neupatienten-knopf-kopieren">{kopiert === "knopf" ? "Kopiert" : "Knopf-Code kopieren"}</button>
          </div>
          <div>
            <p className="label">Für Ihre Website: Buchung direkt auf der Seite (Rahmen)</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-800" data-testid="neupatienten-rahmen">{code.rahmen}</pre>
            <button type="button" className="btn btn-secondary mt-2 text-sm" onClick={() => kopieren("rahmen", code.rahmen)} data-testid="neupatienten-rahmen-kopieren">{kopiert === "rahmen" ? "Kopiert" : "Rahmen-Code kopieren"}</button>
          </div>
          <p className="text-xs text-slate-500">
            {ft("Den Code fügt ein, wer Ihre Website betreut. Die Seite steht nicht in Suchmaschinen und lädt nichts von fremden Diensten. Schutz vor Missbrauch: höchstens 5 Anfragen je Stunde von einem Anschluss und 40 am Tag für Ihre Praxis.")}
          </p>
          {admin && <button type="button" className="ziel text-xs text-slate-500 underline" disabled={busy} onClick={() => { if (confirm("Neuen Link erzeugen? Der bisherige Link und eingebauter Code funktionieren dann nicht mehr.")) sende({ aktion: "neue-kennung" }, "Neuer Link erzeugt. Bitte den Code auf Ihrer Website ersetzen."); }} data-testid="neupatienten-neuer-link">Neuen Link erzeugen (alter wird ungültig)</button>}
        </div>
      )}
    </section>
  );
}
