"use client";

import { useEffect, useRef, useState } from "react";
import { meineAngabenLesen, meineAngabenLoeschen, meineAngabenSchreiben, type AngabenStand } from "@/lib/geraeteSpeicher";
import { ablaufTag, kopieEntfernen, type Ablage } from "@/lib/meineAngaben";
import type { PraxisGruppe } from "@/lib/praxisGruppe";
import type { AngabenUi } from "@/lib/portalI18n";

// „Meine Angaben auf diesem Gerät“ auf /meine-praxen: verschlüsselte Kopien der eigenen Antworten aus Anamnesebögen
// (lib/meineAngaben.ts). Gezeigt werden nur die lesbaren Felder: Name der Kopie, Stand und Art der Praxis. Zum
// Ansehen der Antworten braucht es den Code; hier wird nichts entschlüsselt. Kein Aufruf an den Server.
// Das Protokoll zeigt, wann der Patient Angaben in welchen Bogen übernommen hat. Es liegt nur auf diesem Gerät.

const fuellen = (text: string, werte: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in werte ? String(werte[k]) : m));

// Farben wie in components/MeinePraxen.tsx (hell und dunkel nach der Einstellung des Geräts).
const KARTE = "rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-[#24201F] dark:ring-[#3D3733]";
const TEXT_1 = "text-slate-700 dark:text-[#D5CCC2]";
const TEXT_2 = "text-slate-600 dark:text-[#BDB3A8]";
const KNOPF = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const KNOPF_NEBEN = `${KNOPF} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-brand-600 dark:border-[#5A534D] dark:bg-transparent dark:text-[#F1ECE6] dark:hover:bg-[#2B2725] dark:focus-visible:outline-[#E0ABA1]`;
const KNOPF_ACHTUNG = `${KNOPF} bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700 dark:bg-[#F2A7A0] dark:text-[#191615] dark:hover:bg-[#F7C3BE]`;

type Frage = { art: "kopie"; id: string } | { art: "alles" } | null;

export function MeineAngaben({ t, locale, praxisGeraet }: { t: AngabenUi; locale: string; praxisGeraet: boolean }) {
  const [stand, setStand] = useState<AngabenStand | null>(null);
  const [meldung, setMeldung] = useState("");
  const [frage, setFrage] = useState<Frage>(null);
  const [fokusMeldung, setFokusMeldung] = useState(false);
  // Nach „Abbrechen“ zurück auf den Knopf, der die Frage geöffnet hat.
  const [zurueck, setZurueck] = useState<string | null>(null);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const frageRef = useRef<HTMLParagraphElement>(null);

  // Gelesen wird erst im Browser. Auf einem Gerät der Praxis gar nicht. Abgelaufene Kopien löscht das Lesen.
  useEffect(() => {
    if (praxisGeraet) return;
    const s = meineAngabenLesen();
    setStand(s);
    if (s.abgelaufen > 0) setMeldung(fuellen(t.abgelaufenGeloescht, { anzahl: s.abgelaufen }));
  }, [praxisGeraet, t]);

  useEffect(() => {
    if (frage) frageRef.current?.focus();
  }, [frage]);
  useEffect(() => {
    if (!zurueck) return;
    document.getElementById(zurueck)?.focus();
    setZurueck(null);
  }, [zurueck]);
  useEffect(() => {
    if (!fokusMeldung) return;
    meldungRef.current?.focus();
    setFokusMeldung(false);
  }, [fokusMeldung]);

  if (praxisGeraet || !stand?.verfuegbar) return null;

  const datum = (tag: string) => new Date(`${tag}T00:00:00Z`).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const fach = (g: PraxisGruppe) => (g === "zahn" ? t.fachZahn : g === "therapie" ? t.fachTherapie : t.fachArzt);

  function schreiben(ablage: Ablage, text: string) {
    if (!meineAngabenSchreiben(ablage)) {
      setMeldung(t.nichtMoeglich);
    } else {
      setStand((s) => (s ? { ...s, ...ablage } : s));
      setMeldung(text);
    }
    setFrage(null);
    setFokusMeldung(true);
  }

  function allesLoeschen() {
    if (!meineAngabenLoeschen()) setMeldung(t.nichtMoeglich);
    else {
      setStand((s) => (s ? { ...s, kopien: [], protokoll: [] } : s));
      setMeldung(t.allesGeloescht);
    }
    setFrage(null);
    setFokusMeldung(true);
  }

  const { kopien, protokoll } = stand;
  const knoepfeFrage = (ja: string, onJa: () => void, testId: string, ausloeser: string) => (
    <div className="mt-3 space-y-3">
      <p ref={frageRef} tabIndex={-1} className="text-sm font-medium outline-none">{frage?.art === "alles" ? t.allesFrage : t.loeschenFrage}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={KNOPF_ACHTUNG} onClick={onJa} data-testid={testId}>{ja}</button>
        <button type="button" className={KNOPF_NEBEN} onClick={() => { setFrage(null); setZurueck(ausloeser); }}>{t.abbrechen}</button>
      </div>
    </div>
  );

  return (
    <section id="meine-angaben" className="mt-12 scroll-mt-6" aria-labelledby="meine-angaben-titel" data-testid="meine-angaben">
      <h2 id="meine-angaben-titel" className="font-display text-2xl leading-tight">{t.abschnitt}</h2>
      <p className={`mt-3 text-sm leading-relaxed ${TEXT_1}`}>{t.abschnittText}</p>
      <p className={`mt-2 text-sm ${TEXT_2}`}>{t.verfallen}</p>

      {kopien.length === 0 ? (
        <p className={`${KARTE} mt-4 p-4 text-sm ${TEXT_2}`} data-testid="meine-angaben-leer">{t.keineKopie}</p>
      ) : (
        <ul className="mt-4 space-y-3" aria-label={t.kopienAria} data-testid="meine-angaben-liste">
          {kopien.map((k) => (
            <li key={k.id} className={`${KARTE} p-4`} data-testid="meine-angaben-kopie">
              <h3 className="break-words font-medium">{k.bezeichnung}</h3>
              <p className={`mt-1 text-sm ${TEXT_2}`}>
                {fuellen(t.stand, { datum: datum(k.stand) })} · {fuellen(t.bogen, { fach: fach(k.gruppe) })}
              </p>
              <p className={`mt-1 text-xs ${TEXT_2}`}>{fuellen(t.giltBis, { datum: datum(ablaufTag(k.stand)) })}</p>
              {frage?.art === "kopie" && frage.id === k.id ? (
                knoepfeFrage(t.jaLoeschen, () => schreiben(kopieEntfernen(stand, k.id), t.geloescht), "meine-angaben-loeschen-ja", `meine-angaben-loeschen-${k.id}`)
              ) : (
                <button id={`meine-angaben-loeschen-${k.id}`} type="button" className={`${KNOPF_NEBEN} mt-3`} onClick={() => { setFrage({ art: "kopie", id: k.id }); setMeldung(""); }} data-testid="meine-angaben-loeschen">
                  {t.loeschen}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {protokoll.length > 0 && (
        <div className="mt-6" data-testid="meine-angaben-protokoll">
          <h3 className="font-medium">{t.protokoll}</h3>
          <p className={`mt-1 text-sm ${TEXT_2}`}>{t.protokollText}</p>
          <ul className={`mt-2 space-y-1 text-sm ${TEXT_1}`}>
            {protokoll.map((p, i) => (
              <li key={`${p.am}-${i}`} className="break-words">{fuellen(t.protokollZeile, { datum: datum(p.am), name: p.kopie, praxis: p.praxis })}</li>
            ))}
          </ul>
          <button type="button" className={`${KNOPF_NEBEN} mt-3`} onClick={() => schreiben({ kopien, protokoll: [] }, t.protokollGeloescht)} data-testid="meine-angaben-protokoll-loeschen">
            {t.protokollLoeschen}
          </button>
        </div>
      )}

      <p ref={meldungRef} tabIndex={-1} className="mt-4 min-h-[1.25rem] text-sm font-medium text-salbei-800 outline-none dark:text-[#C7D6C2]" role="status" aria-live="polite" data-testid="meine-angaben-meldung">
        {meldung}
      </p>

      {(kopien.length > 0 || protokoll.length > 0) && (
        <div className="mt-4 border-t border-slate-200 pt-5 dark:border-[#3D3733]">
          {frage?.art === "alles" ? (
            knoepfeFrage(t.jaAlles, allesLoeschen, "meine-angaben-alles-ja", "meine-angaben-alles")
          ) : (
            <button id="meine-angaben-alles" type="button" className={KNOPF_NEBEN} onClick={() => { setFrage({ art: "alles" }); setMeldung(""); }} data-testid="meine-angaben-alles">
              {t.allesLoeschen}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
