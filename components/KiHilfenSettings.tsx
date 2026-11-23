"use client";

import { useState } from "react";

import { useAppText } from "@/components/FachKontext";
/** Schalter „KI-Hilfen“ der Praxis (nur Praxisleitung). Standard: aus. */
export function KiHilfenSettings({ ein: start, verfuegbar, darfAendern }: { ein: boolean; verfuegbar: boolean; darfAendern: boolean }) {
  const ft = useAppText();
  const [ein, setEin] = useState(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function speichern(naechster: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/praxis/ki-hilfen", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ein: naechster }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg(d?.error ?? "Speichern hat nicht geklappt.");
    setEin(naechster);
    setMsg(naechster ? "Eingeschaltet. Gilt nach dem nächsten Laden der Seite." : "Ausgeschaltet. Gilt nach dem nächsten Laden der Seite.");
  }

  return (
    <section id="ki-hilfen" className="card mt-6 scroll-mt-6 text-sm" data-testid="ki-hilfen-einstellung" data-hilfe="ki-hilfen-schalter" aria-labelledby="ki-hilfen-titel">
      <h2 id="ki-hilfen-titel" className="font-semibold text-slate-900">KI-Hilfen</h2>
      <p className="mt-1 text-slate-600">
        Sorrida arbeitet ohne KI vollständig. Mit diesem Schalter erlauben Sie zusätzliche Hilfen, bei denen ein KI-Dienst (Anthropic, Unternehmen
        mit Sitz in den USA) Texte verarbeitet. Der Schalter ist aus, bis Sie ihn einschalten.
      </p>

      <h3 className="mt-3 font-medium text-slate-900">Das geht an den KI-Dienst, wenn jemand aus dem Team den KI-Knopf drückt</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
        <li>Stichworte aus dem Gespräch, die Sie im Vorschlag eingeben, und die Bezeichnungen Ihrer Anlässe.</li>
        <li>Ein Foto oder eine PDF-Seite Ihrer Preisliste, die Sie selbst hochladen. Die Datei wird nicht gespeichert.</li>
        <li>Bei „Frag Sorrida“: Frage, Seitentitel und Hilfetexte. Das sind Ihre Frage zur Bedienung, bis zu drei Fragen davor (ohne Antworten), der Titel der geöffneten Seite (zum Beispiel „Zahlungen“, ohne Kennungen) und die Hilfetexte von Sorrida.</li>
        <li>Name und Kurzbeschreibung einer eigenen Leistung, wenn Sie sie übersetzen lassen.</li>
      </ul>

      <h3 className="mt-3 font-medium text-slate-900">Das schicken die KI-Hilfen von sich aus nicht mit</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
        <li>{ft("Namen, Geburtsdaten, Versichertennummern und Kontaktdaten aus den Patientendaten in Sorrida.")}</li>
        <li>Akten, Befunde, Vorschläge, Rechnungen und Nachrichten.</li>
      </ul>
      <p className="mt-2 text-slate-600" data-testid="ki-hilfen-preisliste-hinweis">
        {ft("Eine hochgeladene Preisliste (Foto oder PDF) geht unverändert an den KI-Dienst, mit allem, was darauf steht. Laden Sie nur die Preisliste hoch, ohne Briefkopf mit Personennamen und ohne Patientendaten.")}
      </p>
      <p className="mt-2 text-slate-600">
        Vor dem Senden entfernt Sorrida aus Ihren Texten bekannte Namen, Telefonnummern, E-Mail-Adressen, Datumsangaben und Versichertennummern.
        Das erkennt nicht jede Schreibweise. Bitte tragen Sie in diese Felder deshalb selbst keine Namen und keine Geburtsdaten ein.
      </p>
      <p className="mt-2 text-slate-600">
        {ft("Jedes Ergebnis ist ein Entwurf. Übernommen wird nur, was jemand aus Ihrem Team prüft und bestätigt. Die KI-Hilfen schreiben keine Nachrichten an Patienten und wählen keine Leistung aus.")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ein ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`} data-testid="ki-hilfen-stand">
          {ein ? "KI-Hilfen: eingeschaltet" : "KI-Hilfen: aus"}
        </span>
        {darfAendern ? (
          <button type="button" className={ein ? "btn btn-primary" : "btn btn-secondary"} disabled={busy} onClick={() => speichern(!ein)} data-testid="ki-hilfen-schalter" aria-pressed={ein}>
            {ein ? "Ausschalten" : "Einschalten"}
          </button>
        ) : (
          <span className="text-xs text-slate-500">{ft("Nur die Praxisleitung kann das ändern.")}</span>
        )}
      </div>
      {!verfuegbar && (
        <p className="mt-2 text-xs text-slate-500" data-testid="ki-hilfen-ohne-zugang">
          Auf diesem System ist kein KI-Zugang hinterlegt. Der Schalter hat dann keine Wirkung: Alle Funktionen laufen auf dem festen Weg ohne KI.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">Die Berichte mit KI (Menü Berichte) sind davon unabhängig und bleiben, wie sie sind. Jede Änderung dieses Schalters steht im Protokoll.</p>
      {msg && <p className="mt-2 text-slate-700" role="status">{msg}</p>}
    </section>
  );
}
