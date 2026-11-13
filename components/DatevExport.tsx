"use client";

import { useState } from "react";

type E = { beraternummer?: number; mandantennummer?: number; sachkontenlaenge?: number; erloeskonto?: number; bankkonto?: number; geldtransit?: number; debitor?: number; kontenrahmen?: "03" | "04" };

const monat = (d: Date, letzter = false) => {
  const x = letzter ? new Date(d.getFullYear(), d.getMonth() + 1, 0) : new Date(d.getFullYear(), d.getMonth(), 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** DATEV-Export auf der Zahlungsseite: Einstellungen und Download des Buchungsstapels. */
export function DatevExport({ einstellungen, istAdmin }: { einstellungen: E | null; istAdmin: boolean }) {
  const vormonat = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const [von, setVon] = useState(monat(vormonat));
  const [bis, setBis] = useState(monat(vormonat, true));
  const [e, setE] = useState<E>(einstellungen ?? { sachkontenlaenge: 4, erloeskonto: 8100, bankkonto: 1200, geldtransit: 1360, debitor: 10000 });
  const [bearbeiten, setBearbeiten] = useState(!einstellungen);
  const [msg, setMsg] = useState("");

  if (!istAdmin)
    return <p className="text-sm text-slate-500">Den DATEV-Export für die Steuerberatung erstellt ein Admin der Praxis.</p>;

  async function speichern(ev: React.FormEvent) {
    ev.preventDefault();
    const res = await fetch("/api/datev", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setMsg(res?.ok ? "Gespeichert." : d?.error ?? "Speichern hat nicht geklappt.");
    if (res?.ok) setBearbeiten(false);
  }

  const feld = (k: keyof E, label: string, hilfe?: string) => (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input className="input mt-1" inputMode="numeric" value={e[k] ?? ""} onChange={(x) => setE({ ...e, [k]: x.target.value === "" ? undefined : Number(x.target.value) })} required={k === "beraternummer" || k === "mandantennummer"} />
      {hilfe && <span className="text-xs text-slate-500">{hilfe}</span>}
    </label>
  );

  return (
    <div data-testid="datev">
      {bearbeiten ? (
        <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-3">
          {feld("beraternummer", "Beraternummer", "von Ihrer Steuerberatung")}
          {feld("mandantennummer", "Mandantennummer", "von Ihrer Steuerberatung")}
          {feld("sachkontenlaenge", "Sachkontenlänge", "meist 4")}
          {feld("erloeskonto", "Erlöskonto", "SKR03 üblich: 8100 (steuerfrei)")}
          {feld("bankkonto", "Bankkonto", "SKR03 üblich: 1200")}
          {feld("geldtransit", "Geldtransit (Online-Zahlung)", "SKR03 1360, SKR04 1460")}
          {feld("debitor", "Debitor (Sammelkonto)", "eine Stelle länger als die Sachkonten, z. B. 10000")}
          <label className="block text-sm">
            <span className="text-slate-600">Kontenrahmen</span>
            <select className="input mt-1" value={e.kontenrahmen ?? "03"} onChange={(x) => setE({ ...e, kontenrahmen: x.target.value as "03" | "04" })}>
              <option value="03">SKR03</option>
              <option value="04">SKR04</option>
            </select>
            <span className="text-xs text-slate-500">bei SKR04 die Konten oben anpassen</span>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-3">
            Konten bitte mit Ihrer Steuerberatung abstimmen. Selbstzahlerleistungen mit Umsatzsteuer (z. B. Ästhetik) bucht die Steuerberatung auf ein eigenes Erlöskonto um.
          </p>
          <div className="flex items-center gap-3 sm:col-span-3">
            <button className="btn-primary">Speichern</button>
            {msg && <span className="text-sm text-slate-600" role="status">{msg}</span>}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-full gap-2 text-sm" role="group" aria-label="Zeitraum">
            {([["Vormonat", vormonat], ["Dieser Monat", new Date()]] as const).map(([name, d]) => {
              const aktiv = von === monat(d) && bis === monat(d, true);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={aktiv}
                  className={`rounded-full border px-3 py-1 ${aktiv ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:border-slate-500"}`}
                  onClick={() => {
                    setVon(monat(d));
                    setBis(monat(d, true));
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <label className="text-sm">
            <span className="block text-slate-600">von</span>
            <input type="date" className="input mt-1" value={von} onChange={(x) => setVon(x.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-slate-600">bis</span>
            <input type="date" className="input mt-1" value={bis} onChange={(x) => setBis(x.target.value)} />
          </label>
          <a className="btn-primary" href={`/api/datev?von=${von}&bis=${bis}`} data-testid="datev-download">
            DATEV-Buchungsstapel herunterladen
          </a>
          <button type="button" className="text-sm text-slate-500 underline" onClick={() => setBearbeiten(true)}>
            Berater {e.beraternummer} / Mandant {e.mandantennummer} ändern
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Rechnungen als Forderung, Zahlungseingänge als Ausgleich. Format EXTF Buchungsstapel für den Import in DATEV Kanzlei-Rechnungswesen oder DATEV Unternehmen online.
        Ohne Namen, Diagnosen oder Behandlungen im Buchungstext.
      </p>
    </div>
  );
}
