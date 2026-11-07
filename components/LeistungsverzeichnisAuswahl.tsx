"use client";

import { useEffect, useState } from "react";

type Gliederung = { system: string; titel: string; anzahl: number; kapitel: { name: string; anzahl: number }[] };
type Leistung = { id: string; system: string; code: string; text: string; kapitel: string | null; abschnitt: string | null; punkte: number | null; euroCent: number | null };

const KURZ: Record<string, string> = { GOAE: "GOÄ", UVGOAE: "UV-GOÄ", KV_REGIONAL: "KV", HMV_PRODUKT: "HMV-Produkt", HEILMITTEL: "HM", HEILPRAKTIKER: "HP", SGB_XI: "SGB XI", APOTHEKE: "Apotheke", HEBAMME: "Hebamme" };
const euro = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/**
 * Leistungen aus dem amtlichen Leistungsverzeichnis zur Sitzung ergänzen, geordnet
 * nach dem Fach der Praxis: Verzeichnis (wichtigstes zuerst) → Kapitel → Leistung.
 */
export function LeistungsverzeichnisAuswahl({ onAdd, offenStart = false, frei = false }: { onAdd: (items: never[]) => void; offenStart?: boolean; frei?: boolean }) {
  const [offen, setOffen] = useState(offenStart);
  const [gliederung, setGliederung] = useState<Gliederung[] | null>(null);
  const [kv, setKv] = useState<string | null>(null);
  const [system, setSystem] = useState<string | null>(null);
  const [kapitel, setKapitel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [suche, setSuche] = useState("");
  const [liste, setListe] = useState<{ anzahl: number; leistungen: Leistung[] } | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [hinzu, setHinzu] = useState<Record<string, "laeuft" | "ok">>({});
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => { setOffen(offenStart); }, [offenStart]);

  // Suche beim Tippen: kurz warten, dann ab 2 Zeichen suchen
  useEffect(() => {
    const t = setTimeout(() => setSuche(q.trim().length >= 2 ? q.trim() : ""), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!offen || gliederung) return;
    fetch("/api/amtliche-leistungen/fach").then((r) => r.json()).then((d) => {
      setGliederung(d.gliederung ?? []);
      setKv(d.kvName ?? null);
      if (d.gliederung?.[0]) setSystem(d.gliederung[0].system);
    }).catch(() => setFehler("Leistungsverzeichnis nicht erreichbar"));
  }, [offen, gliederung]);

  useEffect(() => {
    if (!offen || (!system && !suche)) return;
    if (!suche && !kapitel) { setListe(null); return; }
    setLaedt(true);
    const p = new URLSearchParams();
    if (suche) p.set("q", suche);
    if (system && !suche) p.set("system", system);
    if (kapitel && !suche) p.set("kapitel", kapitel);
    fetch(`/api/amtliche-leistungen/fach?${p}`).then((r) => r.json()).then((d) => setListe({ anzahl: d.anzahl ?? 0, leistungen: d.leistungen ?? [] })).finally(() => setLaedt(false));
  }, [offen, system, kapitel, suche]);

  const hinzufuegen = async (l: Leistung) => {
    setHinzu((h) => ({ ...h, [l.id]: "laeuft" }));
    setFehler(null);
    const res = await fetch("/api/amtliche-leistungen/fuer-sitzung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [l.id] }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (res?.ok && d?.items?.length) {
      onAdd(d.items as never[]);
      setHinzu((h) => ({ ...h, [l.id]: "ok" }));
    } else {
      setHinzu((h) => { const n = { ...h }; delete n[l.id]; return n; });
      setFehler(d?.error ?? "Konnte nicht hinzugefügt werden");
    }
  };

  const aktuelles = gliederung?.find((g) => g.system === system) ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white" data-testid="leistungsverzeichnis-auswahl">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>
        <span>
          <span className="font-medium text-slate-900">{frei ? "Leistungen auswählen" : "Fehlt eine Leistung? Hier suchen und ergänzen"}</span>
          <span className="block text-xs text-slate-500">Alle amtlichen Leistungen Ihres Fachs: Name oder Ziffer eintippen, mit „+“ übernehmen</span>
        </span>
        <span className="text-slate-400">{offen ? "–" : "+"}</span>
      </button>
      {offen && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-sm">
          {fehler && <p className="text-xs text-red-700" role="alert">{fehler}</p>}
          {!gliederung ? (
            <p className="text-xs text-slate-500">Lädt …</p>
          ) : (
            <>
              <input className="input" value={q} placeholder="Suchen: Text oder Ziffer, z. B. Wundversorgung, 03000, Sonographie" aria-label="Leistung im Verzeichnis suchen"
                onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSuche(q.trim()); } }} autoFocus={frei} />
              {!suche && <p className="text-xs text-slate-500">oder stöbern: erst das Verzeichnis, dann das Kapitel wählen</p>}
              {!suche && (
                <>
                  <div className="flex flex-wrap gap-1.5" data-testid="auswahl-verzeichnisse">
                    {gliederung.map((g) => (
                      <button key={g.system} type="button" onClick={() => { setSystem(g.system); setKapitel(null); }}
                        className={`rounded-full px-2.5 py-1 text-xs ${system === g.system ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"}`}>
                        {g.titel} ({g.anzahl.toLocaleString("de-DE")})
                      </button>
                    ))}
                  </div>
                  {gliederung.some((g) => g.system === "KV_REGIONAL") ? null : kv === null && (
                    <p className="text-xs text-slate-500">Regionale KV-Ziffern erscheinen, sobald unter Praxis → Leistungsverzeichnis Ihr KV-Bezirk gewählt ist.</p>
                  )}
                  {aktuelles && (
                    <ul className="max-h-64 space-y-0.5 overflow-y-auto" data-testid="auswahl-kapitel">
                      {aktuelles.kapitel.map((k) => (
                        <li key={k.name}>
                          <button type="button" onClick={() => setKapitel(kapitel === k.name ? null : k.name)}
                            className={`flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-xs ${kapitel === k.name ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50"}`}>
                            <span>{k.name}</span><span className="tabular-nums text-slate-400">{k.anzahl}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {suche && <button type="button" className="text-xs text-brand-700 underline" onClick={() => { setQ(""); setSuche(""); }}>Zurück zur Gliederung</button>}
              {laedt && <p className="text-xs text-slate-500">Lädt …</p>}
              {liste && !laedt && (
                <div>
                  {liste.anzahl === 0 && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="auswahl-nichts">
                      Nichts gefunden für „{suche}“. Tipps: ein kürzeres Wort (z. B. „Wund“ statt „Wundversorgung“), die Ziffer selbst (z. B. 03000) oder ein anderes Wort (z. B. „Sono“ für Ultraschall).
                      Fehlt eine Praxisleistung ganz, legen Sie sie unter <a className="underline" href="/settings/catalog">Einstellungen → Leistungskatalog</a> als eigene Leistung an.
                    </div>
                  )}
                  <p className="mb-1 text-xs text-slate-500" data-testid="auswahl-treffer">{liste.anzahl.toLocaleString("de-DE")} Leistungen{liste.anzahl > liste.leistungen.length ? `, die ersten ${liste.leistungen.length}` : ""}</p>
                  <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                    {liste.leistungen.map((l) => (
                      <li key={l.id} className="flex items-start justify-between gap-3 py-2" data-testid="auswahl-leistung">
                        <span className="min-w-0">
                          <span className="mr-1.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-600">{KURZ[l.system] ?? l.system} {l.code}</span>
                          <span className="text-slate-800">{l.text}</span>
                          {(l.punkte != null || l.euroCent != null) && (
                            <span className="ml-1 text-xs text-slate-400">{l.punkte != null ? `${l.punkte} Pkt.` : euro(l.euroCent!)}</span>
                          )}
                        </span>
                        <button type="button" disabled={!!hinzu[l.id]} onClick={() => hinzufuegen(l)}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-brand-700 ring-1 ring-brand-200 disabled:text-salbei-700 disabled:ring-salbei-200">
                          {hinzu[l.id] === "ok" ? "✓ ergänzt" : hinzu[l.id] === "laeuft" ? "…" : "+ ergänzen"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
