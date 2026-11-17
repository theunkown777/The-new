"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KUERZEL, KUERZEL_START, MIN_ZEICHEN, gruppenTitel, gruppieren, istEingabefeld, kuerzelSchritt, naechsterIndex, startAktionen, zuletztMerken, type KuerzelZustand, type Treffer,
} from "@/lib/suche";
import { APP_RUNDGANG_START } from "@/lib/rundgang";

// Suche über alles (Strg+K / ⌘K) und Tastenkürzel für die ganze App.
// Einmal im App-Layout eingehängt; <SucheKnopf /> öffnet sie von überall.

const OEFFNEN = "sorrida:suche";

// Zuletzt geöffnete Patienten: nur im Speicher dieses Tabs. Bewusst kein
// localStorage/sessionStorage – Patientennamen bleiben nicht im Browser liegen.
let zuletztImTab: Treffer[] = [];

/** Sichtbarer Knopf, der die Suche öffnet. `leiste`: Feld in der Seitenleiste; `kopf`: Lupe in der Kopfzeile am Handy. */
export function SucheKnopf({ variante = "leiste" }: { variante?: "leiste" | "kopf" }) {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  const oeffnen = () => window.dispatchEvent(new Event(OEFFNEN));
  const lupe = (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
  if (variante === "kopf") {
    return (
      <button type="button" onClick={oeffnen} aria-label="Suche öffnen" aria-haspopup="dialog" data-testid="suche-oeffnen-handy" data-hilfe="suche-oeffnen"
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand-100 hover:bg-brand-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        {lupe}
      </button>
    );
  }
  return (
    <button type="button" onClick={oeffnen} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" data-testid="suche-oeffnen" data-hilfe="suche-oeffnen"
      className="mb-4 flex w-full items-center gap-2 rounded-xl border border-[#E9E2DA] bg-white px-3 py-2 text-left text-sm text-slate-500 hover:border-brand-600 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      {lupe}
      <span className="flex-1">Suchen …</span>
      <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-xs text-slate-500">{mac ? "⌘ K" : "Strg K"}</kbd>
    </button>
  );
}

/** Fokus im Dialog halten: Tab läuft im Kreis. */
function fokusFalle(e: React.KeyboardEvent, box: HTMLElement | null) {
  if (e.key !== "Tab" || !box) return;
  const ziele = Array.from(box.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null);
  if (!ziele.length) return;
  const erstes = ziele[0], letztes = ziele[ziele.length - 1];
  const aktiv = document.activeElement;
  if (e.shiftKey && (aktiv === erstes || !box.contains(aktiv))) {
    e.preventDefault();
    letztes.focus();
  } else if (!e.shiftKey && (aktiv === letztes || !box.contains(aktiv))) {
    e.preventDefault();
    erstes.focus();
  }
}

export function Suche({ personPl = "Patienten", personSg = "Patient" }: { personPl?: string; personSg?: string }) {
  const router = useRouter();
  const uid = useId();
  const [offen, setOffen] = useState(false);
  const [hilfe, setHilfe] = useState(false);
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<Treffer[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktiv, setAktiv] = useState(-1);
  const [zuletzt, setZuletzt] = useState<Treffer[]>(zuletztImTab);

  const feld = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const hilfeBox = useRef<HTMLDivElement>(null);
  const hilfeZu = useRef<HTMLButtonElement>(null);
  const vorher = useRef<HTMLElement | null>(null);
  const kuerzel = useRef<KuerzelZustand>(KUERZEL_START);
  const zustand = useRef({ offen: false, hilfe: false });
  zustand.current = { offen, hilfe };

  const oeffnen = useCallback(() => {
    if (zustand.current.offen) return;
    vorher.current = document.activeElement as HTMLElement | null;
    setHilfe(false);
    setQ("");
    setTreffer([]);
    setFehler(null);
    setAktiv(-1);
    setZuletzt(zuletztImTab);
    setOffen(true);
  }, []);

  const schliessen = useCallback(() => {
    setOffen(false);
    setHilfe(false);
    // Fokus zurück an die Stelle, von der die Suche geöffnet wurde.
    const el = vorher.current;
    vorher.current = null;
    if (el && document.contains(el)) window.setTimeout(() => el.focus(), 0);
  }, []);

  // Was ohne Suchwort gezeigt wird: zuletzt geöffnete Patienten und Grundaktionen.
  const leerListe = useMemo<Treffer[]>(() => [...zuletzt, ...startAktionen(personSg)], [zuletzt, personSg]);
  const sucht = q.trim().length >= MIN_ZEICHEN;
  const gruppen = useMemo(() => (sucht ? gruppieren(treffer) : []), [sucht, treffer]);
  const flach = useMemo(() => (sucht ? gruppen.flatMap((g) => g.treffer) : leerListe), [sucht, gruppen, leerListe]);

  // Globale Tasten: Strg+K / ⌘K, g-Folgen, n, ?
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const z = zustand.current;
      const ziel = e.target as HTMLElement | null;
      // In einem offenen Dialog (auch fremden) gelten nur Strg+K und Esc.
      const imDialog = z.offen || z.hilfe || !!ziel?.closest?.('[aria-modal="true"]');
      const r = kuerzelSchritt(kuerzel.current, { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, repeat: e.repeat, imEingabefeld: imDialog || istEingabefeld(ziel) }, Date.now());
      kuerzel.current = r.zustand;
      if (!r.ergebnis) return;
      e.preventDefault();
      if (r.ergebnis.art === "suche") {
        if (z.offen) schliessen();
        else oeffnen();
      } else if (r.ergebnis.art === "hilfe") {
        vorher.current = document.activeElement as HTMLElement | null;
        setHilfe(true);
      } else {
        router.push(r.ergebnis.href);
      }
    };
    window.addEventListener("keydown", taste);
    window.addEventListener(OEFFNEN, oeffnen);
    return () => {
      window.removeEventListener("keydown", taste);
      window.removeEventListener(OEFFNEN, oeffnen);
    };
  }, [oeffnen, schliessen, router]);

  // Beim Öffnen: Fokus ins Feld, Seite dahinter nicht scrollen.
  useEffect(() => {
    if (!offen && !hilfe) return;
    const alt = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (offen) feld.current?.focus();
    else hilfeZu.current?.focus();
    return () => {
      document.body.style.overflow = alt;
    };
  }, [offen, hilfe]);

  // Abfrage mit kurzer Verzögerung; eine neue Eingabe bricht die alte Abfrage ab.
  useEffect(() => {
    if (!offen) return;
    if (!sucht) {
      setTreffer([]);
      setLaedt(false);
      setFehler(null);
      setAktiv(-1);
      return;
    }
    const abbruch = new AbortController();
    setLaedt(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/suche?q=${encodeURIComponent(q.trim())}`, { signal: abbruch.signal, cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFehler(data.error ?? "Die Suche ist gerade nicht erreichbar.");
          setTreffer([]);
        } else {
          setFehler(null);
          setTreffer(Array.isArray(data.treffer) ? data.treffer : []);
        }
        setAktiv(0);
        setLaedt(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setFehler("Keine Verbindung. Bitte erneut versuchen.");
        setTreffer([]);
        setLaedt(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      abbruch.abort();
    };
  }, [q, sucht, offen]);

  // Gewählten Treffer in den sichtbaren Bereich holen.
  useEffect(() => {
    if (aktiv < 0 || !flach[aktiv]) return;
    document.getElementById(`${uid}-${flach[aktiv].id}`)?.scrollIntoView({ block: "nearest" });
  }, [aktiv, flach, uid]);

  function waehlen(t: Treffer) {
    if (t.gruppe === "patienten" && t.patientId) {
      zuletztImTab = zuletztMerken(zuletztImTab, t);
    }
    setOffen(false);
    vorher.current = null;
    router.push(t.href);
  }

  function feldTaste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setAktiv((i) => naechsterIndex(i, flach.length, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" && flach.length && aktiv >= 0) {
      e.preventDefault();
      setAktiv(0);
    } else if (e.key === "End" && flach.length && aktiv >= 0) {
      e.preventDefault();
      setAktiv(flach.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = flach[aktiv] ?? (sucht && !laedt ? flach[0] : undefined);
      if (t) waehlen(t);
    }
  }

  const option = (t: Treffer) => {
    const i = flach.indexOf(t);
    const gewaehlt = i === aktiv;
    return (
      <li
        key={t.id}
        id={`${uid}-${t.id}`}
        role="option"
        aria-selected={gewaehlt}
        data-testid="suche-treffer"
        data-gruppe={t.gruppe}
        onMouseMove={() => i !== aktiv && setAktiv(i)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => waehlen(t)}
        className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${gewaehlt ? "bg-brand-50 text-brand-900 ring-1 ring-brand-200" : "text-slate-800"}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{t.titel}</span>
          {t.unter && <span className="block truncate text-xs text-slate-500">{t.unter}</span>}
        </span>
        {gewaehlt && <span className="hidden shrink-0 text-xs text-slate-500 sm:inline" aria-hidden="true">Enter ↵</span>}
      </li>
    );
  };

  const listeId = `${uid}-liste`;
  const anzahlText = !sucht ? "" : laedt ? "Suche läuft …" : fehler ? fehler : flach.length === 0 ? "Nichts gefunden." : `${flach.length} Treffer`;

  return (
    <>
      {offen && (
        <div className="ein-schleier fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/40 p-3 sm:p-6 sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && schliessen()} data-testid="suche-hintergrund">
          <div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Suche"
            data-testid="suche-dialog"
            className="ein-dialog flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[75vh]"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                schliessen();
              } else fokusFalle(e, box.current);
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                ref={feld}
                type="text"
                inputMode="search"
                enterKeyHint="go"
                role="combobox"
                aria-expanded={flach.length > 0}
                aria-controls={listeId}
                aria-autocomplete="list"
                aria-activedescendant={aktiv >= 0 && flach[aktiv] ? `${uid}-${flach[aktiv].id}` : undefined}
                aria-label={`Suchen: ${personPl}, Vorschläge, Rechnungen, Seiten`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={60}
                placeholder="Name, Geburtsdatum, Rechnung, Seite …"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={feldTaste}
                data-testid="suche-feld"
                className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0"
              />
              <button type="button" onClick={schliessen} data-testid="suche-schliessen" className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-brand-600 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <span className="hidden sm:inline">Esc</span>
                <span className="sm:hidden">Schließen</span>
              </button>
            </div>

            <p className="sr-only" role="status" aria-live="polite" data-testid="suche-status">{anzahlText}</p>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              <ul id={listeId} role="listbox" aria-label="Treffer" className="space-y-2">
                {!sucht && (
                  <>
                    {zuletzt.length > 0 && (
                      <li role="presentation">
                        <p id={`${uid}-g-zuletzt`} className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Zuletzt geöffnet</p>
                        <ul role="group" aria-labelledby={`${uid}-g-zuletzt`} data-testid="suche-zuletzt">{zuletzt.map(option)}</ul>
                      </li>
                    )}
                    <li role="presentation">
                      <p id={`${uid}-g-start`} className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Aktionen</p>
                      <ul role="group" aria-labelledby={`${uid}-g-start`}>{leerListe.filter((t) => t.gruppe === "aktionen").map(option)}</ul>
                    </li>
                  </>
                )}
                {sucht &&
                  gruppen.map((g) => (
                    <li key={g.gruppe} role="presentation" data-testid={`suche-gruppe-${g.gruppe}`}>
                      <p id={`${uid}-g-${g.gruppe}`} className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{gruppenTitel(g.gruppe, personPl)}</p>
                      <ul role="group" aria-labelledby={`${uid}-g-${g.gruppe}`}>{g.treffer.map(option)}</ul>
                    </li>
                  ))}
              </ul>
              {sucht && laedt && flach.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">Suche läuft …</p>}
              {sucht && !laedt && fehler && <p className="px-3 py-4 text-sm text-red-700" data-testid="suche-fehler">{fehler}</p>}
              {sucht && !laedt && !fehler && flach.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-600" data-testid="suche-leer">
                  Nichts gefunden. Gesucht wird nach Namen, Geburtsdatum (TT.MM.JJJJ), Rechnungsnummer und Seiten – nicht in Befunden oder Notizen.
                </p>
              )}
              {!sucht && q.trim().length > 0 && <p className="px-3 py-2 text-sm text-slate-500">Bitte mindestens 2 Zeichen eingeben.</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              <span className="hidden sm:inline">↑ ↓ wählen · Enter öffnen · Esc schließen</span>
              <button type="button" className="underline hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" onClick={() => { setOffen(false); setHilfe(true); }} data-testid="suche-kuerzel-zeigen">
                Tastenkürzel anzeigen
              </button>
            </div>
          </div>
        </div>
      )}

      {hilfe && (
        <div className="ein-schleier fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/40 p-3 sm:p-6 sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && schliessen()}>
          <div
            ref={hilfeBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-hilfe-titel`}
            data-testid="kuerzel-dialog"
            className="ein-dialog max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                schliessen();
              } else fokusFalle(e, hilfeBox.current);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`${uid}-hilfe-titel`} className="font-display text-2xl text-slate-900">Tastenkürzel</h2>
              <button ref={hilfeZu} type="button" onClick={schliessen} className="btn-secondary px-3 py-1 text-xs" data-testid="kuerzel-schliessen">Schließen</button>
            </div>
            <p className="mt-1 text-sm text-slate-600">Die Kürzel gelten überall in Sorrida, außer während Sie in ein Feld schreiben. Bei „g“ drücken Sie die Tasten nacheinander.</p>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {KUERZEL.map((k) => (
                <div key={k.tasten.join("+")} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-slate-800">{k.text === "Patienten" ? personPl : k.text}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {k.tasten.map((t, i) => (
                      <span key={t} className="flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-slate-500">{k.aktion === "suche" ? "+" : "dann"}</span>}
                        <kbd className="min-w-[1.75rem] rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-xs text-slate-800">{t}</kbd>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            {/* Rundgang durch die Hauptseiten (components/AppRundgang.tsx) */}
            <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              Neu in Sorrida?{" "}
              <button
                type="button"
                className="ziel font-medium text-brand-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                onClick={() => {
                  schliessen();
                  router.push(APP_RUNDGANG_START);
                }}
                data-testid="kuerzel-rundgang"
              >
                Rundgang durch Sorrida starten
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
