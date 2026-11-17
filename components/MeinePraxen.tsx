"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gemerktePraxenLesen, gemerktePraxenLoeschen, gemerktePraxenSchreiben, meineAngabenLoeschen } from "@/lib/geraeteSpeicher";
import { abgelaufen, entfernen, kartenTitel, portalPfad, umbenennen, type GemerktePraxis } from "@/lib/meinePraxen";
import { GRUPPEN_FARBE, GRUPPEN_SYMBOL } from "@/lib/praxisGruppe";
import type { GeraetUi } from "@/lib/portalI18n";

// „Meine Praxen auf diesem Gerät“: liest die Liste aus dem Speicher des Browsers (lib/geraeteSpeicher.ts).
// Kein Aufruf an den Server, auch nicht an /api/portal: „Öffnen“ ist ein gewöhnlicher Link auf genau ein Portal.
// Jede Praxis ist eine eigene Karte. Es gibt keine gemischte Liste (keine Termine oder Rechnungen aus mehreren
// Praxen in einem Strom) und keinen Vergleich zwischen Praxen.

type Stand = { geladen: false } | { geladen: true; verfuegbar: boolean; praxen: GemerktePraxis[] };
const fuellen = (text: string, werte: { name?: string; datum?: string }) =>
  text.replace("{name}", () => werte.name ?? "").replace("{datum}", () => werte.datum ?? "");

// Feste Farben für hell und dunkel: Patientenseiten nutzen die gewohnten Farbwerte (app/globals.css, :root);
// die dunkle Fassung folgt der Einstellung des Geräts (prefers-color-scheme).
const KARTE = "rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-[#24201F] dark:ring-[#3D3733]";
const TEXT_2 = "text-slate-600 dark:text-[#BDB3A8]";
const KNOPF = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const KNOPF_HAUPT = `${KNOPF} bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 dark:bg-[#E0ABA1] dark:text-[#191615] dark:hover:bg-[#EDC4BC] dark:focus-visible:outline-[#E0ABA1]`;
const KNOPF_NEBEN = `${KNOPF} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-brand-600 dark:border-[#5A534D] dark:bg-transparent dark:text-[#F1ECE6] dark:hover:bg-[#2B2725] dark:focus-visible:outline-[#E0ABA1]`;
const KNOPF_ACHTUNG = `${KNOPF} bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700 dark:bg-[#F2A7A0] dark:text-[#191615] dark:hover:bg-[#F7C3BE]`;

export function MeinePraxen({ t, locale, praxisGeraet }: { t: GeraetUi; locale: string; praxisGeraet: boolean }) {
  const [stand, setStand] = useState<Stand>({ geladen: false });
  const [meldung, setMeldung] = useState("");
  const [allesFrage, setAllesFrage] = useState(false);
  // Wohin der Tastaturfokus geht, wenn das fokussierte Element verschwindet: Token einer Karte oder die Meldung.
  const [fokus, setFokus] = useState<string | null>(null);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const allesFrageRef = useRef<HTMLParagraphElement>(null);
  const allesKnopfRef = useRef<HTMLButtonElement>(null);
  const allesFrageVorher = useRef(false);

  // Gelesen wird erst im Browser, nach dem Öffnen der Seite. Auf einem Gerät der Praxis gar nicht.
  useEffect(() => {
    if (praxisGeraet) return;
    setStand({ geladen: true, ...gemerktePraxenLesen() });
  }, [praxisGeraet]);

  useEffect(() => {
    if (fokus !== "meldung") return;
    meldungRef.current?.focus();
    setFokus(null);
  }, [fokus]);

  // Frage „Alles löschen?“: Fokus auf die Frage; nach „Abbrechen“ zurück auf den Knopf.
  useEffect(() => {
    if (allesFrage) allesFrageRef.current?.focus();
    else if (allesFrageVorher.current) allesKnopfRef.current?.focus();
    allesFrageVorher.current = allesFrage;
  }, [allesFrage]);

  const datum = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

  function speichern(praxen: GemerktePraxis[], text: string): boolean {
    if (!gemerktePraxenSchreiben(praxen)) {
      setMeldung(t.nichtMoeglich);
      return false;
    }
    setStand({ geladen: true, verfuegbar: true, praxen });
    setMeldung(text);
    return true;
  }

  function entfernenUndWeiter(praxen: GemerktePraxis[], token: string) {
    const i = praxen.findIndex((x) => x.token === token);
    const rest = entfernen(praxen, token);
    // Die Karte verschwindet: Fokus auf die nächste Karte, sonst die vorige, sonst die Meldung.
    if (speichern(rest, t.entfernt)) setFokus(rest[i]?.token ?? rest[i - 1]?.token ?? "meldung");
  }

  function allesLoeschen() {
    // Auf einem Gerät der Praxis löscht „Alles“ auch Kopien eigener Angaben (lib/meineAngaben.ts), falls hier welche liegen.
    if (praxisGeraet && !meineAngabenLoeschen()) return setMeldung(t.nichtMoeglich);
    if (!gemerktePraxenLoeschen()) return setMeldung(t.nichtMoeglich);
    setStand((s) => (s.geladen ? { ...s, praxen: [] } : s));
    setAllesFrage(false);
    setMeldung(t.geloescht);
    setFokus("meldung");
  }

  const status = (
    <p ref={meldungRef} tabIndex={-1} className="mt-4 min-h-[1.25rem] text-sm font-medium text-salbei-800 outline-none dark:text-[#C7D6C2]" role="status" aria-live="polite" data-testid="meine-praxen-meldung">
      {meldung}
    </p>
  );

  if (praxisGeraet) {
    // Gerät der Praxis: keine Liste zeigen. Löschen bleibt möglich, falls hier doch etwas liegt.
    return (
      <section className="mt-6" data-testid="meine-praxen-praxisgeraet">
        <p className={`${KARTE} p-4 text-sm ${TEXT_2}`}>{t.praxisGeraet}</p>
        <div className="mt-4">
          <button type="button" className={KNOPF_NEBEN} onClick={allesLoeschen} data-testid="meine-praxen-alles">
            {t.allesLoeschen}
          </button>
        </div>
        {status}
      </section>
    );
  }

  if (!stand.geladen) return <p className={`mt-6 text-sm ${TEXT_2}`} data-testid="meine-praxen-laden">{t.laden}</p>;
  if (!stand.verfuegbar) return <p className={`${KARTE} mt-6 p-4 text-sm ${TEXT_2}`} data-testid="meine-praxen-kein-speicher">{t.keinSpeicher}</p>;

  return (
    <section className="mt-6" aria-label={t.listeAria}>
      {stand.praxen.length === 0 ? (
        <p className={`${KARTE} p-4 text-sm ${TEXT_2}`} data-testid="meine-praxen-leer">{t.leer}</p>
      ) : (
        <ul className="space-y-4" data-testid="meine-praxen-liste">
          {stand.praxen.map((p) => (
            <Karte
              key={p.token}
              p={p}
              t={t}
              datum={datum}
              fokusTitel={fokus === p.token}
              onFokusErledigt={() => setFokus(null)}
              onUmbenennen={(name) => speichern(umbenennen(stand.praxen, p.token, name), "")}
              onEntfernen={() => entfernenUndWeiter(stand.praxen, p.token)}
            />
          ))}
        </ul>
      )}
      {status}
      {stand.praxen.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-[#3D3733]">
          {allesFrage ? (
            <div className="space-y-3">
              <p ref={allesFrageRef} tabIndex={-1} className="text-sm font-medium outline-none">{t.allesFrage}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={KNOPF_ACHTUNG} onClick={allesLoeschen} data-testid="meine-praxen-alles-ja">{t.jaAlles}</button>
                <button type="button" className={KNOPF_NEBEN} onClick={() => setAllesFrage(false)}>{t.abbrechen}</button>
              </div>
            </div>
          ) : (
            <button ref={allesKnopfRef} type="button" className={KNOPF_NEBEN} onClick={() => { setAllesFrage(true); setMeldung(""); }} data-testid="meine-praxen-alles">
              {t.allesLoeschen}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

type KarteProps = {
  p: GemerktePraxis;
  t: GeraetUi;
  datum: (iso: string) => string;
  /** Fokus auf den Titel dieser Karte (nachdem die Karte davor entfernt wurde). */
  fokusTitel: boolean;
  onFokusErledigt: () => void;
  onUmbenennen: (name: string) => void;
  onEntfernen: () => void;
};

function Karte({ p, t, datum, fokusTitel, onFokusErledigt, onUmbenennen, onEntfernen }: KarteProps) {
  const [art, setArt] = useState<"ansicht" | "umbenennen" | "entfernen">("ansicht");
  const [name, setName] = useState(p.eigenerName ?? "");
  // Nach Speichern oder Abbrechen geht der Fokus auf den Knopf zurück, der die Bearbeitung geöffnet hat.
  const [zurueck, setZurueck] = useState<"umbenennen" | "entfernen" | null>(null);
  const feld = useRef<HTMLInputElement>(null);
  const frage = useRef<HTMLParagraphElement>(null);
  const titel = useRef<HTMLHeadingElement>(null);
  const knopfUmbenennen = useRef<HTMLButtonElement>(null);
  const knopfEntfernen = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (art === "umbenennen") feld.current?.focus();
    else if (art === "entfernen") frage.current?.focus();
    else if (zurueck) {
      (zurueck === "umbenennen" ? knopfUmbenennen : knopfEntfernen).current?.focus();
      setZurueck(null);
    }
  }, [art, zurueck]);
  useEffect(() => {
    if (!fokusTitel) return;
    titel.current?.focus();
    onFokusErledigt();
  }, [fokusTitel, onFokusErledigt]);
  const schliessen = (von: "umbenennen" | "entfernen") => {
    setArt("ansicht");
    setZurueck(von);
  };

  const farbe = GRUPPEN_FARBE[p.gruppe];
  const pfad = portalPfad(p.token);
  const vorbei = abgelaufen(p);
  const titelId = `praxis-${p.token.slice(0, 12)}`;
  const zeile = [p.fachKurz, p.ort].filter(Boolean).join(" · ");

  return (
    <li
      className={`${KARTE} flex overflow-hidden`}
      style={{ "--g": farbe.farbe, "--gd": farbe.farbeDunkel } as CSSProperties}
      aria-labelledby={titelId}
      data-testid="meine-praxis"
      data-gruppe={p.gruppe}
    >
      <span className="w-1.5 shrink-0 bg-[var(--g)] dark:bg-[var(--gd)]" aria-hidden="true" />
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GRUPPEN_SYMBOL[p.gruppe].svg} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <h2 id={titelId} ref={titel} tabIndex={-1} className="text-base font-semibold text-slate-900 outline-none dark:text-[#F1ECE6]" data-testid="meine-praxis-titel">
              {kartenTitel(p)}
            </h2>
            {p.eigenerName && <p className={`text-sm ${TEXT_2}`}>{fuellen(t.praxis, { name: p.praxisName })}</p>}
            {zeile && <p className={`text-sm ${TEXT_2}`} lang="de" data-testid="meine-praxis-fach">{zeile}</p>}
          </div>
        </div>

        <p className={`mt-3 text-sm ${TEXT_2}`}>
          {p.vorname && <span className="me-3 inline-block">{fuellen(t.fuer, { name: p.vorname })}</span>}
          {!vorbei && <span className="inline-block">{fuellen(t.gueltig, { datum: datum(p.gueltigBis) })}</span>}
        </p>
        {vorbei && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-[#3A2E12] dark:text-[#F5D58A]" data-testid="meine-praxis-abgelaufen">
            {fuellen(t.abgelaufen, { datum: datum(p.gueltigBis) })}
          </p>
        )}

        {art === "umbenennen" && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              onUmbenennen(name);
              schliessen("umbenennen");
            }}
          >
            <label htmlFor={`${titelId}-name`} className="block text-sm font-medium">{t.eigenerName}</label>
            <input
              id={`${titelId}-name`}
              ref={feld}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={`${titelId}-hinweis`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-[#5A534D] dark:bg-[#1D1A19] dark:text-[#F1ECE6]"
              data-testid="meine-praxis-name"
            />
            <p id={`${titelId}-hinweis`} className={`text-xs ${TEXT_2}`}>{t.eigenerNameHinweis}</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={KNOPF_HAUPT} data-testid="meine-praxis-name-speichern">{t.speichern}</button>
              <button type="button" className={KNOPF_NEBEN} onClick={() => { setName(p.eigenerName ?? ""); schliessen("umbenennen"); }}>{t.abbrechen}</button>
            </div>
          </form>
        )}

        {art === "entfernen" && (
          <div className="mt-4 space-y-2" role="group" aria-label={t.entfernenFrage}>
            <p ref={frage} tabIndex={-1} className="text-sm font-medium outline-none">{t.entfernenFrage}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={KNOPF_ACHTUNG} onClick={onEntfernen} data-testid="meine-praxis-entfernen-ja">{t.jaEntfernen}</button>
              <button type="button" className={KNOPF_NEBEN} onClick={() => schliessen("entfernen")}>{t.abbrechen}</button>
            </div>
          </div>
        )}

        {art === "ansicht" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pfad && !vorbei && (
              <a href={pfad} className={KNOPF_HAUPT} data-testid="meine-praxis-oeffnen" aria-describedby={titelId}>
                {t.oeffnen}
              </a>
            )}
            <button ref={knopfUmbenennen} type="button" className={KNOPF_NEBEN} onClick={() => setArt("umbenennen")} aria-describedby={titelId} data-testid="meine-praxis-umbenennen">
              {t.umbenennen}
            </button>
            <button ref={knopfEntfernen} type="button" className={KNOPF_NEBEN} onClick={() => setArt("entfernen")} aria-describedby={titelId} data-testid="meine-praxis-entfernen">
              {t.entfernen}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
