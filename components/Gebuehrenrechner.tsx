"use client";

import { useMemo, useState } from "react";
import { BEGRUENDUNGEN, WERKE, betragCent, pruefeFaktor, spanne, type GoaeGruppe, type Gebuehrenwerk } from "@/lib/gebuehren";

const eur = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const STUFE_CLS = { ok: "bg-emerald-50 text-emerald-800", begruendung: "bg-amber-50 text-amber-900", vereinbarung: "bg-red-50 text-red-800", unzulaessig: "bg-red-50 text-red-800" };

export function Gebuehrenrechner({ werke, punktwerte }: { werke: Gebuehrenwerk[]; punktwerte: Partial<Record<Gebuehrenwerk, number>> }) {
  const [werk, setWerk] = useState<Gebuehrenwerk>(werke[0]);
  const [gruppe, setGruppe] = useState<GoaeGruppe>("persoenlich");
  const [punkte, setPunkte] = useState(80);
  const [faktor, setFaktor] = useState(2.3);
  const [anzahl, setAnzahl] = useState(1);
  const [euro, setEuro] = useState(10);
  // BEMA-Punktwerte verhandelt jede KZV je Kassenart; ohne Eintrag ein klar markierter Beispielwert.
  const BEISPIEL_BEMA = 120;
  const [pw, setPw] = useState<number>(punktwerte[werk] ?? WERKE[werk].punktwertCent ?? BEISPIEL_BEMA);
  const info = WERKE[werk];
  const s = spanne(werk, gruppe);

  const wechsel = (w: Gebuehrenwerk) => {
    setWerk(w);
    setPw(punktwerte[w] ?? WERKE[w].punktwertCent ?? BEISPIEL_BEMA);
    setFaktor(spanne(w, gruppe)?.schwelle ?? 1);
  };

  const r = useMemo(() => {
    const betrag = betragCent({ werk, punkte, faktor, punktwertCent: pw, euroBetrag: euro, anzahl });
    const schwelle = s ? betragCent({ werk, punkte, faktor: s.schwelle, punktwertCent: pw, anzahl }) : null;
    const hoechst = s ? betragCent({ werk, punkte, faktor: s.hoechst, punktwertCent: pw, anzahl }) : null;
    return { betrag, schwelle, hoechst, pruefung: pruefeFaktor(werk, faktor, gruppe) };
  }, [werk, punkte, faktor, pw, euro, anzahl, s, gruppe]);

  return (
    <section className="card space-y-4" data-testid="gebuehrenrechner">
      <div>
        <h2 className="font-semibold text-slate-900">Gebührenrechner</h2>
        <p className="mt-1 text-sm text-slate-600">Betrag einer Position, Spanne und was eine begründete Steigerung bringt.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {werke.map((w) => (
          <button key={w} type="button" onClick={() => wechsel(w)} data-testid="werk"
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ${w === werk ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200"}`}>
            {WERKE[w].kurz}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{info.name} · zahlt: {info.zahler}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {werk === "UVGOAE" ? (
          <label className="text-sm text-slate-600">Betrag je Leistung (€)<input type="number" step="0.01" className="input mt-1 w-full" value={euro} onChange={(e) => setEuro(Number(e.target.value))} /></label>
        ) : (
          <>
            <label className="text-sm text-slate-600">Punkte<input type="number" className="input mt-1 w-full" value={punkte} onChange={(e) => setPunkte(Number(e.target.value))} data-testid="punkte" /></label>
            <label className="text-sm text-slate-600">Punktwert (Cent)
              <input type="number" step="0.00001" className="input mt-1 w-full" value={pw} onChange={(e) => setPw(Number(e.target.value))} readOnly={werk === "GOAE" || werk === "GOZ"} />
              <span className="mt-1 block text-xs text-slate-500">{info.punktwertQuelle ?? (punktwerte[werk] ? "Ihr hinterlegter KZV-Punktwert" : "Beispielwert! Punktwert Ihrer KZV und Kassenart eintragen (Einstellungen → Abrechnung)")}</span>
            </label>
          </>
        )}
        {info.faktor && (
          <label className="text-sm text-slate-600">Faktor<input type="number" step="0.1" min={1} className="input mt-1 w-full" value={faktor} onChange={(e) => setFaktor(Number(e.target.value))} data-testid="faktor" /></label>
        )}
        <label className="text-sm text-slate-600">Anzahl<input type="number" min={1} className="input mt-1 w-full" value={anzahl} onChange={(e) => setAnzahl(Math.max(1, Number(e.target.value)))} /></label>
        {werk === "GOAE" && (
          <label className="text-sm text-slate-600">Leistungsart
            <select className="input mt-1 w-full" value={gruppe} onChange={(e) => { setGruppe(e.target.value as GoaeGruppe); setFaktor(spanne("GOAE", e.target.value as GoaeGruppe)!.schwelle); }}>
              <option value="persoenlich">persönlich-ärztlich</option>
              <option value="technisch">medizinisch-technisch</option>
              <option value="labor">Labor</option>
            </select>
          </label>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#FBFAF8] p-4"><p className="text-xs text-slate-500">Betrag</p><p className="text-2xl font-semibold tabular-nums" data-testid="betrag">{eur(r.betrag)}</p></div>
        {r.schwelle != null && <div className="rounded-xl bg-[#FBFAF8] p-4"><p className="text-xs text-slate-500">beim Schwellenwert {s!.schwelle.toLocaleString("de-DE")}</p><p className="text-xl font-semibold tabular-nums">{eur(r.schwelle)}</p></div>}
        {r.hoechst != null && <div className="rounded-xl bg-[#FBFAF8] p-4"><p className="text-xs text-slate-500">beim Höchstsatz {s!.hoechst.toLocaleString("de-DE")}</p><p className="text-xl font-semibold tabular-nums">{eur(r.hoechst)}</p><p className="text-xs text-emerald-800">+{eur(r.hoechst - r.schwelle!)} mit Begründung</p></div>}
      </div>
      <p className={`rounded-lg px-3 py-2 text-sm ${STUFE_CLS[r.pruefung.stufe]}`} data-testid="pruefung">{r.pruefung.text}</p>
      {r.pruefung.stufe === "begruendung" && (
        <div className="text-sm">
          <p className="font-medium text-slate-800">Begründungsbausteine (Lücke immer mit dem konkreten Fall füllen):</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{BEGRUENDUNGEN.map((b) => <li key={b.text}><b>{b.kriterium}:</b> {b.text}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
