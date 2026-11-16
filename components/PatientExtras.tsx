"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, type PatientLang, type Ui } from "@/lib/patientI18n";
import { SPRECH_SPRACHE, lokaleStimme, type VorleseTeil } from "@/lib/vorlesen";

// Zusätze der Patientenansicht des Vorschlags: Vorlesen, Lese-Link für eine Vertrauensperson und „Erinnern Sie mich“.
// Alles läuft auf dem Gerät des Patienten bzw. gegen die eigenen Schnittstellen; es wird nichts von fremden Servern geladen
// und es geht keine Nachricht an Patienten oder Dritte.

export type LeseLinkZeile = { id: string; createdAt: string };

/** Kalendertag (als Mitternacht UTC gespeichert) in der Schreibweise der Sprache. */
const tag = (iso: string, lang: PatientLang) => new Date(iso).toLocaleDateString(LOCALES[lang].dateLocale, { timeZone: "UTC" });
const tagErzeugt = (iso: string, lang: PatientLang) => new Date(iso).toLocaleDateString(LOCALES[lang].dateLocale);

async function ruf(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, status: res?.status ?? 0, data };
}

/**
 * „Vorlesen“ mit der Sprachausgabe des Browsers. Gesprochen wird nur mit Stimmen, die auf dem Gerät laufen
 * (lib/vorlesen.ts lokaleStimme); Online-Stimmen des Browsers werden nie verwendet. Der Knopf erscheint nur,
 * wenn es für die Sprache der Ansicht eine solche Stimme gibt.
 */
export function VorlesenKnopf({ teile, lang, t }: { teile: () => VorleseTeil[]; lang: PatientLang; t: Pick<Ui, "readAloud" | "readStop"> }) {
  const [stimmen, setStimmen] = useState<SpeechSynthesisVoice[]>([]);
  const [liest, setLiest] = useState(false);
  const lauf = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    const synth = window.speechSynthesis;
    // Die Liste der Stimmen kommt in manchen Browsern erst nach dem Laden der Seite.
    const laden = () => setStimmen(synth.getVoices());
    laden();
    synth.addEventListener?.("voiceschanged", laden);
    return () => {
      synth.removeEventListener?.("voiceschanged", laden);
      lauf.current++;
      synth.cancel();
    };
  }, []);
  if (!lokaleStimme(stimmen, SPRECH_SPRACHE[lang])) return null;

  function stopp() {
    lauf.current++;
    window.speechSynthesis.cancel();
    setLiest(false);
  }
  function start() {
    const meinLauf = ++lauf.current;
    window.speechSynthesis.cancel();
    // Je Teil die Stimme auf dem Gerät für dessen Sprache. Teile ohne solche Stimme werden ausgelassen,
    // statt sie dem Browser zu überlassen (der könnte eine Online-Stimme wählen).
    const liste = teile().flatMap((teil) => {
      const stimme = lokaleStimme(stimmen, SPRECH_SPRACHE[teil.lang]);
      return stimme ? [{ ...teil, stimme }] : [];
    });
    liste.forEach((teil, i) => {
      const u = new SpeechSynthesisUtterance(teil.text);
      u.voice = teil.stimme;
      u.lang = teil.stimme.lang || SPRECH_SPRACHE[teil.lang];
      u.rate = 0.95;
      if (i === liste.length - 1) u.onend = () => meinLauf === lauf.current && setLiest(false);
      u.onerror = () => meinLauf === lauf.current && setLiest(false);
      window.speechSynthesis.speak(u);
    });
    setLiest(liste.length > 0);
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-sm text-slate-700 hover:border-slate-400"
      onClick={liest ? stopp : start}
      aria-pressed={liest}
      data-testid={liest ? "vorlesen-stopp" : "vorlesen"}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        {liest ? <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" /> : <path d="M3 6h2.5L9 3v10L5.5 10H3zM11 5.5c1 1 1 4 0 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {liest ? t.readStop : t.readAloud}
    </button>
  );
}

/** „Mit einer Vertrauensperson teilen“: zweiter Link nur zum Lesen, höchstens drei, jederzeit widerrufbar. */
export function TeilenBlock({ apiUrl, anfang, max, lang, t }: { apiUrl: string; anfang: LeseLinkZeile[]; max: number; lang: PatientLang; t: Ui }) {
  const [links, setLinks] = useState(anfang);
  const [neu, setNeu] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [kopiert, setKopiert] = useState(false);
  const [kannTeilen, setKannTeilen] = useState(false);
  useEffect(() => setKannTeilen(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  const voll = links.length >= max;

  async function erzeugen() {
    setLaeuft(true);
    setFehler("");
    setKopiert(false);
    const r = await ruf(apiUrl, "POST");
    setLaeuft(false);
    if (r.ok && r.data?.pfad) {
      setNeu(`${window.location.origin}${r.data.pfad}?lang=${lang}`);
      setLinks(r.data.links ?? []);
    } else setFehler(r.data?.code === "LIMIT" ? t.shareLimit : t.actionFailed);
  }
  async function widerrufen(id: string) {
    setLaeuft(true);
    setFehler("");
    const r = await ruf(apiUrl, "DELETE", { id });
    setLaeuft(false);
    if (r.ok) {
      setLinks(r.data?.links ?? []);
      setNeu(null);
    } else setFehler(t.actionFailed);
  }
  async function kopieren() {
    if (!neu) return;
    try {
      await navigator.clipboard.writeText(neu);
      setKopiert(true);
    } catch {
      // Ohne Zugriff auf die Zwischenablage bleibt der Link im Feld markierbar.
      (document.getElementById("lese-link-feld") as HTMLInputElement | null)?.select();
    }
  }
  async function teilen() {
    if (!neu) return;
    // Abbrechen des Teilen-Dialogs ist kein Fehler.
    await navigator.share({ title: t.readOnlyTitle, url: neu }).catch(() => null);
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="teilen-titel" data-testid="teilen">
      <h2 id="teilen-titel" className="font-semibold text-slate-900">
        {t.shareTitle}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{t.shareText}</p>
      {neu && (
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3" data-testid="lese-link-neu">
          <input id="lese-link-feld" className="input" readOnly value={neu} dir="ltr" onFocus={(e) => e.currentTarget.select()} aria-label={t.shareTitle} data-testid="lese-link-url" />
          <p className="mt-2 text-xs text-slate-500">{t.shareOnce}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {kannTeilen && (
              <button type="button" className="btn btn-primary" onClick={teilen} data-testid="lese-link-teilen">
                {t.shareSend}
              </button>
            )}
            <button type="button" className={kannTeilen ? "btn btn-secondary" : "btn btn-primary"} onClick={kopieren} data-testid="lese-link-kopieren">
              {t.shareCopy}
            </button>
            {kopiert && (
              <span className="self-center text-sm text-emerald-700" role="status" data-testid="lese-link-kopiert">
                {t.shareCopied}
              </span>
            )}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <ul className="mt-3 space-y-2" data-testid="lese-links">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span>{t.shareFrom(tagErzeugt(l.createdAt, lang))}</span>
              <button type="button" className="text-brand-700 underline underline-offset-2" disabled={laeuft} onClick={() => widerrufen(l.id)} data-testid="lese-link-widerrufen">
                {t.shareRevoke}
              </button>
            </li>
          ))}
        </ul>
      )}
      {voll ? (
        <p className="mt-3 text-xs text-slate-500" data-testid="lese-link-grenze">
          {t.shareLimit}
        </p>
      ) : (
        <button type="button" className="btn btn-secondary mt-3" disabled={laeuft} onClick={erzeugen} data-testid="lese-link-erzeugen">
          {t.shareCreate}
        </button>
      )}
      {fehler && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {fehler}
        </p>
      )}
    </section>
  );
}

/** „Erinnern Sie mich“: Der Patient wählt einen Tag; die Praxis bekommt dann eine Aufgabe und meldet sich selbst. */
export function ErinnernBlock({ apiUrl, anfang, lang, t }: { apiUrl: string; anfang: string | null; lang: PatientLang; t: Ui }) {
  const [am, setAm] = useState(anfang);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function setzen(tage: number | null) {
    setLaeuft(true);
    setFehler("");
    const r = tage == null ? await ruf(apiUrl, "DELETE") : await ruf(apiUrl, "POST", { tage });
    setLaeuft(false);
    if (r.ok) setAm(r.data?.erinnernAm ?? null);
    else setFehler(t.actionFailed);
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-4" data-testid="erinnern">
      <h3 className="text-sm font-medium text-slate-900">{t.remindTitle}</h3>
      {am ? (
        <p className="mt-1 text-sm text-slate-700" role="status" data-testid="erinnern-gesetzt">
          {t.remindSet(tag(am, lang))}{" "}
          <button type="button" className="text-brand-700 underline underline-offset-2" disabled={laeuft} onClick={() => setzen(null)} data-testid="erinnern-loeschen">
            {t.remindDelete}
          </button>
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">{t.remindText}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([[3, t.remind3], [7, t.remind7], [14, t.remind14]] as const).map(([tage, text]) => (
              <button key={tage} type="button" className="btn btn-secondary" disabled={laeuft} onClick={() => setzen(tage)} data-testid={`erinnern-${tage}`}>
                {text}
              </button>
            ))}
          </div>
        </>
      )}
      {fehler && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {fehler}
        </p>
      )}
    </div>
  );
}
