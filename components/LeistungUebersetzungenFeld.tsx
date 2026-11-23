"use client";

import { useState } from "react";
import {
  LEISTUNG_SPRACHEN,
  LEISTUNG_SPRACHE_NAME,
  mitKiEntwurf,
  uebersetzungAktuell,
  uebersetzungStand,
  type LeistungSprache,
  type LeistungUebersetzungen,
} from "@/lib/eigeneLeistung";

import { useAppText } from "@/components/FachKontext";
const STAND_TEXT = {
  fehlt: null,
  veraltet: "deutscher Text geändert, bitte prüfen",
  maschinell: "maschinell übersetzt, bitte prüfen",
  ungeprueft: "bitte prüfen",
  geprueft: "geprüft",
} as const;

/**
 * Übersetzungen einer eigenen Leistung: Name und Hinweis in sechs Sprachen, zum Selbsteintragen.
 * Mit eingeschalteten KI-Hilfen erzeugt ein Knopf einen Entwurf. Patienten sehen eine Übersetzung
 * erst, wenn hier „geprüft“ angehakt und gespeichert ist.
 */
export function LeistungUebersetzungenFeld({
  name,
  nutzen,
  value,
  onChange,
  ki,
  readOnly = false,
}: {
  name: string;
  nutzen?: string;
  value: LeistungUebersetzungen | undefined;
  onChange: (u: LeistungUebersetzungen | undefined) => void;
  ki: boolean;
  readOnly?: boolean;
}) {
  const ft = useAppText();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const leistung = { name, nutzen, uebersetzungen: value };
  const aktuell = uebersetzungAktuell(leistung);
  const staende = LEISTUNG_SPRACHEN.map((l) => uebersetzungStand(leistung, l));
  const geprueft = staende.filter((s) => s === "geprueft").length;
  const offen = staende.filter((s) => s === "maschinell" || s === "ungeprueft" || s === "veraltet").length;
  const zu = { name: name.trim(), kurz: nutzen?.trim() || undefined };

  function setze(lang: LeistungSprache, patch: Partial<NonNullable<LeistungUebersetzungen["sprachen"][LeistungSprache]>>) {
    const alt = value?.sprachen[lang];
    // Wer den deutschen Text geändert hat, bestätigt mit jeder Eingabe wieder zum neuen Text; alte Häkchen gelten nicht weiter.
    const basis = aktuell ? (value?.sprachen ?? {}) : Object.fromEntries(Object.entries(value?.sprachen ?? {}).map(([k, s]) => [k, s ? { ...s, geprueft: false } : s]));
    const neu = { name: alt?.name ?? "", kurz: alt?.kurz, maschinell: alt?.maschinell, geprueft: aktuell ? (alt?.geprueft ?? false) : false, ...patch };
    onChange({ zu, sprachen: { ...basis, [lang]: neu } });
  }

  async function mitKi() {
    setLaeuft(true);
    setFehler(null);
    const res = await fetch("/api/ki/uebersetzung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: zu.name, kurz: zu.kurz ?? null }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setLaeuft(false);
    if (!res?.ok || !d?.uebersetzungen) return setFehler(d?.error ?? "Das Übersetzen mit KI hat nicht geklappt. Sie können die Felder selbst ausfüllen.");
    onChange(mitKiEntwurf(leistung, d.uebersetzungen));
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" data-testid="leistung-uebersetzungen">
      <summary className="cursor-pointer font-medium text-slate-800">
        {ft("Übersetzungen für Patienten (")}{geprueft} von {LEISTUNG_SPRACHEN.length} geprüft{offen > 0 ? `, ${offen} zu prüfen` : ""})
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-600">
          {ft("Name und Hinweis der Praxis in den Sprachen der Patientenansicht. Patienten sehen eine Übersetzung erst, wenn „geprüft“ angehakt und gespeichert ist. Sonst bleibt der deutsche Text stehen.")}
        </p>
        {value && !aktuell && (
          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900" data-testid="uebersetzung-veraltet">
            Der deutsche Text wurde geändert. Die Übersetzungen gelten erst wieder, wenn Sie sie prüfen und neu anhaken.
          </p>
        )}
        {ki && !readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary" disabled={laeuft || zu.name.length < 2} onClick={mitKi} data-testid="uebersetzung-ki">
              {laeuft ? "KI übersetzt …" : "Mit KI übersetzen (Entwurf)"}
            </button>
            <span className="text-xs text-slate-500">Schickt nur Name und Hinweis dieser Leistung an den KI-Dienst. Geprüfte Übersetzungen bleiben stehen.</span>
          </div>
        )}
        {fehler && <p className="text-xs text-red-700" role="alert">{fehler}</p>}
        {LEISTUNG_SPRACHEN.map((lang, i) => {
          const s = value?.sprachen[lang];
          const stand = staende[i];
          const hinweis = STAND_TEXT[stand];
          return (
            <fieldset key={lang} className="rounded border border-slate-200 bg-white p-2" data-testid={`uebersetzung-${lang}`}>
              <legend className="px-1 text-xs font-semibold text-slate-700">
                {LEISTUNG_SPRACHE_NAME[lang]}
                {hinweis && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 font-medium ${stand === "geprueft" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`} data-testid={`uebersetzung-stand-${lang}`}>
                    {hinweis}
                  </span>
                )}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  lang={lang}
                  maxLength={160}
                  disabled={readOnly}
                  placeholder="Name der Leistung"
                  aria-label={`Name der Leistung auf ${LEISTUNG_SPRACHE_NAME[lang]}`}
                  value={s?.name ?? ""}
                  // Neu selbst eingetragen (kein KI-Entwurf): gilt als von der Praxis verfasst. Ein KI-Entwurf braucht das Häkchen;
                  // wer einen vorhandenen Text ändert, behält den bisherigen Stand.
                  onChange={(e) => setze(lang, { name: e.target.value, geprueft: s?.maschinell ? false : s?.name.trim() ? stand === "geprueft" : e.target.value.trim().length > 0 })}
                />
                <input
                  className="input"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  lang={lang}
                  maxLength={400}
                  disabled={readOnly || !zu.kurz}
                  placeholder={zu.kurz ? ft("Hinweis der Praxis") : "kein deutscher Hinweis hinterlegt"}
                  aria-label={ft(`Hinweis der Praxis auf ${LEISTUNG_SPRACHE_NAME[lang]}`)}
                  value={s?.kurz ?? ""}
                  onChange={(e) => setze(lang, { kurz: e.target.value, geprueft: s?.maschinell ? false : stand === "geprueft" })}
                />
              </div>
              {s?.name.trim() && (
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" disabled={readOnly} checked={stand === "geprueft"} onChange={(e) => setze(lang, { geprueft: e.target.checked })} data-testid={`uebersetzung-geprueft-${lang}`} />
                  {ft("Geprüft: Diese Übersetzung stimmt und darf Patienten gezeigt werden")}
                </label>
              )}
            </fieldset>
          );
        })}
      </div>
    </details>
  );
}
