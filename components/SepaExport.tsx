"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Lastschriften als pain.008-Datei erzeugen. Die Datei lädt die Praxis im
// Online-Banking hoch; danach sind die Posten als exportiert markiert.
export function SepaExport({ anzahl, summe, bereit }: { anzahl: number; summe: string; bereit: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function exportieren() {
    setBusy(true);
    const res = await fetch("/api/sepa", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setMsg((await res.json().catch(() => ({}))).error ?? "Export fehlgeschlagen.");
    const blob = await res.blob();
    const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "lastschriften.xml";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setMsg(`Datei ${name} erstellt. Im Online-Banking unter „SEPA-Datei hochladen“ einreichen.`);
    router.refresh();
  }
  return (
    <section className="card" data-testid="sepa">
      <h2 className="font-semibold text-slate-900">SEPA-Lastschrift</h2>
      {!bereit ? (
        <p className="mt-1 text-sm text-slate-600">
          Patienten können im Portal eine Lastschrift erteilen, sobald IBAN und Gläubiger-ID der Praxis hinterlegt sind (Bankverbindung unten). Das Geld kommt ohne Zahlungsdienstleister direkt aufs Praxiskonto.
        </p>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{anzahl ? `${anzahl} ${anzahl === 1 ? "Lastschrift" : "Lastschriften"} über ${summe} bereit zum Einzug.` : "Keine neuen Lastschriftmandate."}</p>
          <button type="button" className="btn-primary" disabled={!anzahl || busy} onClick={exportieren} data-testid="sepa-export">{busy ? "Erstellt …" : "SEPA-Datei erstellen"}</button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-slate-700" data-testid="sepa-meldung">{msg}</p>}
    </section>
  );
}
