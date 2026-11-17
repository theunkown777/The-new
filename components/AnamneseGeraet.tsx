"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnamnesisForm, type GeraetUebernahme } from "@/components/AnamnesisForm";
import { meineAngabenLesen, meineAngabenSchreiben, type AngabenStand } from "@/lib/geraeteSpeicher";
import {
  FalscherCode,
  KopieKaputt,
  MAX_BEZEICHNUNG,
  ablaufTag,
  codeMangel,
  heute,
  kopieAblegen,
  kopieEntschluesseln,
  kopieVerschluesseln,
  protokollNotieren,
  type Kopie,
} from "@/lib/meineAngaben";
import { angabenAusBogen, uebernahmeFuer } from "@/lib/meineAngabenUebernahme";
import type { AnamneseProfil } from "@/lib/anamneseProfile";
import type { PraxisGruppe } from "@/lib/praxisGruppe";
import { ANGABEN_UI, PORTAL_LOCALE, portalDir, type AngabenUi, type PortalLang } from "@/lib/portalI18n";

// „Eigene Angaben mitnehmen“ im Anamnesebogen, nur auf dem eigenen Gerät des Patienten (/a/<token> und
// /portal/<token>/anamnese/<id>; nie am Empfang, nie in der Praxis-App). Alles geschieht im Browser:
//   - Nach dem Senden kann der Patient eine Kopie seiner Antworten behalten. Ohne seinen Klick wird nichts gespeichert.
//     Die Kopie wird mit seinem Code verschlüsselt (lib/meineAngaben.ts). Der Code verlässt das Gerät nie.
//   - In einem offenen Bogen kann er eine Kopie öffnen und passende Antworten einsetzen (lib/meineAngabenUebernahme.ts).
//     An den Server geht danach nur der Bogen wie sonst und der Tag (Stand) der übernommenen Angaben.
// Kein Aufruf an den Server beim Lesen oder Speichern. Die Praxis, aus deren Bogen die Kopie stammt, erfährt nichts.

type Props = {
  token: string;
  practiceName: string;
  firstName: string;
  profil: AnamneseProfil;
  postUrl?: string;
  backHref?: string;
  /** Art der Praxis (Zahn, Arzt, Therapie), vom Server bestimmt. Steht lesbar an der Kopie. */
  gruppe: PraxisGruppe;
  lang: PortalLang;
};

const fuellen = (text: string, werte: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in werte ? String(werte[k]) : m));

const FELD = "rounded-2xl border border-slate-200 bg-white p-4";
const FOKUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const KNOPF_HAUPT = `btn-primary min-h-[44px] ${FOKUS}`;
const KNOPF_NEBEN = `btn-secondary min-h-[44px] ${FOKUS}`;
// Felder für den Code: Browser und Passwort-Manager sollen ihn nicht speichern und nicht vorschlagen (autocomplete="off"
// und die Kennzeichen von 1Password, LastPass, Bitwarden und Dashlane). Ein Browser kann trotzdem fragen; der Hinweis
// unter dem Feld sagt dann, dass man ablehnt.
const NICHT_MERKEN = { autoComplete: "off", "data-1p-ignore": "true", "data-lpignore": "true", "data-bwignore": "true", "data-form-type": "other" } as const;

export function AnamneseGeraet({ gruppe, lang, ...form }: Props) {
  const t = ANGABEN_UI[lang];
  const locale = PORTAL_LOCALE[lang];
  const dir = portalDir(lang);
  const datum = (tag: string) => new Date(`${tag}T00:00:00Z`).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const meinePraxen = `/meine-praxen${lang === "de" ? "" : `?lang=${lang}`}#meine-angaben`;
  // Name der Kopie, aus der gerade übernommen ist (für das Protokoll auf dem Gerät).
  const benutzt = useRef<string | null>(null);

  function gesendet(mitUebernahme: boolean) {
    if (!mitUebernahme || !benutzt.current) return;
    const ablage = meineAngabenLesen();
    if (!ablage.verfuegbar) return;
    meineAngabenSchreiben(protokollNotieren(ablage, { am: heute(), praxis: form.practiceName.slice(0, 160), kopie: benutzt.current }));
  }

  return (
    <AnamnesisForm
      {...form}
      geraet={{
        uebernahme: (u) => <Uebernahme u={u} t={t} lang={lang} dir={dir} profil={form.profil} datum={datum} meinePraxen={meinePraxen} onBenutzt={(n) => (benutzt.current = n)} />,
        nachSenden: (antworten) => (
          <Behalten antworten={antworten} t={t} lang={lang} dir={dir} profil={form.profil} practiceName={form.practiceName} gruppe={gruppe} datum={datum} meinePraxen={meinePraxen} />
        ),
        gesendet,
        markiert: (stand) => fuellen(t.markiert, { datum: datum(stand) }),
        praxisSieht: (stand) => fuellen(t.praxisSieht, { datum: datum(stand) }),
        geprueft: t.geprueft,
        gepruefFehlt: t.gepruefFehlt,
        lang,
        dir,
      }}
    />
  );
}

type Gemeinsam = { t: AngabenUi; lang: PortalLang; dir: "ltr" | "rtl"; profil: AnamneseProfil; datum: (tag: string) => string; meinePraxen: string };

function fachWort(t: AngabenUi, g: PraxisGruppe): string {
  return g === "zahn" ? t.fachZahn : g === "therapie" ? t.fachTherapie : t.fachArzt;
}

/** Über den Fragen: Kopie wählen, Code eingeben, passende Antworten einsetzen. */
function Uebernahme({ u, t, lang, dir, profil, datum, meinePraxen, onBenutzt }: Gemeinsam & { u: GeraetUebernahme; onBenutzt: (name: string | null) => void }) {
  const [stand, setStand] = useState<AngabenStand | null>(null);
  const [krypto, setKrypto] = useState(false);
  const [offen, setOffen] = useState(false);
  const [wahl, setWahl] = useState("");
  const [code, setCode] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState<string[]>([]);
  // Name der Praxis, aus deren Bogen die Kopie stammt: nur auf Klick („Herkunft anzeigen“), nicht offen auf dem Bildschirm.
  const [herkunft, setHerkunft] = useState("");
  const ergebnisRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const titelRef = useRef<HTMLHeadingElement>(null);

  // Gelesen wird erst im Browser, nach dem Öffnen des Bogens. Ohne Kopie zeigt der Bogen nichts davon. Abgelaufene
  // Kopien löscht das Lesen; das sagt der Bogen dann (auch wenn keine Kopie übrig ist).
  useEffect(() => {
    const s = meineAngabenLesen();
    // Schon das erste Lesen löscht Abgelaufenes. Liest der Bogen noch einmal (React im Entwicklungsmodus), bleibt die Zahl.
    setStand((vorher) => ({ ...s, abgelaufen: Math.max(s.abgelaufen, vorher?.abgelaufen ?? 0) }));
    setKrypto(!!globalThis.crypto?.subtle);
  }, []);
  useEffect(() => {
    if (offen) titelRef.current?.focus();
  }, [offen]);

  if (!stand?.verfuegbar) return null;
  const alt = stand.abgelaufen > 0 ? fuellen(t.abgelaufenGeloescht, { anzahl: stand.abgelaufen }) : "";
  const altHinweis = alt && (
    <p className="mt-3 text-sm text-slate-700" role="status" data-testid="angaben-abgelaufen">{alt}</p>
  );
  if (stand.kopien.length === 0 || !krypto) {
    if (!alt) return null;
    return (
      <section className={`${FELD} mt-6`} lang={lang} dir={dir} aria-label={t.abschnitt} data-testid="angaben-uebernahme">
        <p className="text-sm text-slate-700" role="status" data-testid="angaben-abgelaufen">{alt}</p>
      </section>
    );
  }
  const kopie = stand.kopien.find((k) => k.id === wahl) ?? stand.kopien[0];

  async function oeffnen(e: React.FormEvent) {
    e.preventDefault();
    if (laeuft) return;
    setFehler("");
    setErgebnis([]);
    setHerkunft("");
    setLaeuft(true);
    const eingabe = code;
    setCode("");
    try {
      const inhalt = await kopieEntschluesseln(kopie, eingabe);
      const r = uebernahmeFuer(inhalt, profil);
      if (!r.ok) {
        setFehler(r.grund === "ansprache" ? t.passtNichtAnsprache : t.nichtsPassend);
        return;
      }
      const anzahl = u.einsetzen(r.werte, kopie.stand);
      if (anzahl === 0) {
        setFehler(t.beantwortetBleiben);
        return;
      }
      onBenutzt(kopie.bezeichnung);
      // Was die Praxis dieses Bogens sieht (Hinweis mit Stand) und was die Praxis der Kopie erfährt (nichts).
      const zeilen = [fuellen(t.uebernommen, { name: kopie.bezeichnung, datum: datum(kopie.stand), anzahl, gesamt: profil.fragen.length }), fuellen(t.praxisSieht, { datum: datum(kopie.stand) }), t.quelleNichts];
      if (anzahl < Object.keys(r.werte).length) zeilen.push(t.beantwortetBleiben);
      setErgebnis(zeilen);
      setHerkunft(inhalt.praxis);
      setOffen(false);
      requestAnimationFrame(() => ergebnisRef.current?.focus());
    } catch (err) {
      setFehler(err instanceof FalscherCode ? t.falscherCode : err instanceof KopieKaputt ? t.kopieKaputt : t.oeffnenNichtMoeglich);
      requestAnimationFrame(() => codeRef.current?.focus());
    } finally {
      setLaeuft(false);
    }
  }

  function zuruecknehmen() {
    u.zuruecknehmen();
    onBenutzt(null);
    setErgebnis([t.zurueckgenommen]);
    setHerkunft("");
    requestAnimationFrame(() => ergebnisRef.current?.focus());
  }

  return (
    <section className={`${FELD} mt-6`} lang={lang} dir={dir} aria-labelledby="angaben-titel" data-testid="angaben-uebernahme">
      {u.aktiv ? (
        <>
          <div ref={ergebnisRef} tabIndex={-1} role="status" className="space-y-1 text-sm text-slate-800 outline-none" data-testid="angaben-ergebnis">
            <h2 id="angaben-titel" className="font-medium text-slate-900">{t.uebernehmen}</h2>
            {ergebnis.map((z) => (
              <p key={z}>{z}</p>
            ))}
          </div>
          {herkunft && (
            <details className="mt-2 text-sm text-slate-700" data-testid="angaben-herkunft">
              <summary className={`cursor-pointer rounded py-3 underline ${FOKUS}`} data-testid="angaben-herkunft-zeigen">{t.herkunft}</summary>
              <p className="mt-1">{fuellen(t.quelle, { praxis: herkunft })}</p>
            </details>
          )}
          <button type="button" className={`${KNOPF_NEBEN} mt-3`} onClick={zuruecknehmen} data-testid="angaben-zuruecknehmen">
            {t.zuruecknehmen}
          </button>
        </>
      ) : !offen ? (
        <>
          <h2 id="angaben-titel" className="sr-only">{t.uebernehmen}</h2>
          <button type="button" className={`${KNOPF_NEBEN} w-full`} aria-expanded={false} onClick={() => setOffen(true)} data-testid="angaben-uebernehmen">
            {t.uebernehmen}
          </button>
          {altHinweis}
          {ergebnis.length > 0 && (
            <div ref={ergebnisRef} tabIndex={-1} role="status" className="mt-3 text-sm text-slate-800 outline-none" data-testid="angaben-ergebnis">
              {ergebnis.map((z) => (
                <p key={z}>{z}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={oeffnen} className="space-y-4" noValidate>
          <h2 id="angaben-titel" ref={titelRef} tabIndex={-1} className="font-medium text-slate-900 outline-none">{t.uebernehmen}</h2>
          <p className="text-sm text-slate-700">{t.uebernehmenText}</p>
          {altHinweis}
          <fieldset>
            <legend className="label">{t.kopieWaehlen}</legend>
            <ul className="space-y-2" aria-label={t.kopienAria}>
              {stand.kopien.map((k) => (
                <li key={k.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-brand-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600">
                    <input type="radio" name="angaben-kopie" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" checked={k.id === kopie.id} onChange={() => setWahl(k.id)} />
                    <span>
                      <span className="block font-medium text-slate-900">{k.bezeichnung}</span>
                      <span className="block text-slate-600">
                        {fuellen(t.stand, { datum: datum(k.stand) })} · {fuellen(t.bogen, { fach: fachWort(t, k.gruppe) })}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div>
            <label className="label" htmlFor="angaben-code">{t.code}</label>
            <input
              ref={codeRef}
              id="angaben-code"
              type="password"
              className="input"
              {...NICHT_MERKEN}
              autoCapitalize="none"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={fehler === t.falscherCode ? true : undefined}
              aria-describedby={fehler ? "angaben-fehler" : "angaben-vergessen"}
              data-testid="angaben-code"
            />
          </div>
          {fehler && <p id="angaben-fehler" className="text-sm text-red-700" role="alert" data-testid="angaben-fehler">{fehler}</p>}
          <div className="flex flex-wrap gap-2">
            <button className={KNOPF_HAUPT} disabled={laeuft || code.length === 0} data-testid="angaben-oeffnen">
              {laeuft ? t.oeffnet : t.uebernehmenKnopf}
            </button>
            <button type="button" className={KNOPF_NEBEN} onClick={() => { setOffen(false); setFehler(""); setCode(""); }}>
              {t.abbrechen}
            </button>
          </div>
          <p id="angaben-vergessen" className="text-xs text-slate-600">
            <a href={meinePraxen} className="underline">{t.codeVergessen}</a>
          </p>
        </form>
      )}
    </section>
  );
}

/** Nach dem Senden: Kopie der Antworten auf diesem Gerät behalten, nur auf Klick. */
function Behalten({ antworten, t, lang, dir, profil, practiceName, gruppe, datum, meinePraxen }: Gemeinsam & { antworten: Record<string, { yes?: boolean; detail?: string }>; practiceName: string; gruppe: PraxisGruppe }) {
  const [moeglich, setMoeglich] = useState(false);
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState(profil.ansprache === "eltern" ? t.standardNameKind : t.standardName);
  const [code1, setCode1] = useState("");
  const [code2, setCode2] = useState("");
  const [fehler, setFehler] = useState<{ text: string; feld: "name" | "code1" | "code2" | null } | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [ersetzenFrage, setErsetzenFrage] = useState<Kopie | null>(null);
  const [ende, setEnde] = useState<{ text: string; voll: boolean } | null>(null);
  const refs = { name: useRef<HTMLInputElement>(null), code1: useRef<HTMLInputElement>(null), code2: useRef<HTMLInputElement>(null) };
  const endeRef = useRef<HTMLDivElement>(null);
  const frageRef = useRef<HTMLParagraphElement>(null);
  const nameRef = refs.name;
  const q = useMemo(() => angabenAusBogen(profil, antworten), [profil, antworten]);

  useEffect(() => {
    setMoeglich(meineAngabenLesen().verfuegbar && !!globalThis.crypto?.subtle);
  }, []);
  useEffect(() => {
    if (ende) endeRef.current?.focus();
  }, [ende]);
  useEffect(() => {
    if (ersetzenFrage) frageRef.current?.focus();
  }, [ersetzenFrage]);
  useEffect(() => {
    if (offen) nameRef.current?.focus();
  }, [offen, nameRef]);

  if (!moeglich || Object.keys(q).length === 0) return null;

  function fehlerZeigen(text: string, feld: "name" | "code1" | "code2" | null) {
    setFehler({ text, feld });
    if (feld) refs[feld].current?.focus();
  }

  function ablegen(kopie: Kopie, ersetzen: boolean) {
    const r = kopieAblegen(meineAngabenLesen(), kopie, ersetzen);
    if (r.art === "gleicherName") return setErsetzenFrage(kopie);
    setErsetzenFrage(null);
    if (r.art === "voll") return setEnde({ text: t.voll, voll: true });
    if (!meineAngabenSchreiben(r.ablage)) return fehlerZeigen(t.nichtMoeglich, null);
    setEnde({ text: fuellen(t.gespeichert, { datum: datum(ablaufTag(kopie.stand)) }), voll: false });
  }

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (laeuft) return;
    const bezeichnung = name.replace(/\s+/g, " ").trim().slice(0, MAX_BEZEICHNUNG);
    if (!bezeichnung) return fehlerZeigen(t.nameFehlt, "name");
    const mangel = codeMangel(code1);
    if (mangel) return fehlerZeigen(mangel === "kurz" ? t.codeZuKurz : mangel === "ohneBuchstaben" ? t.codeOhneBuchstaben : t.codeEinfach, "code1");
    if (code1 !== code2) return fehlerZeigen(t.codeUngleich, "code2");
    setFehler(null);
    setLaeuft(true);
    const code = code1;
    setCode1("");
    setCode2("");
    try {
      const kopie = await kopieVerschluesseln({ v: 1, fach: profil.fach, ansprache: profil.ansprache, praxis: practiceName.slice(0, 160), q }, code, { bezeichnung, stand: heute(), gruppe });
      ablegen(kopie, false);
    } catch {
      fehlerZeigen(t.nichtMoeglich, null);
    } finally {
      setLaeuft(false);
    }
  }

  let inhalt: ReactNode;
  if (ende) {
    inhalt = (
      <div ref={endeRef} tabIndex={-1} role="status" className="space-y-3 text-sm text-slate-800 outline-none" data-testid={ende.voll ? "angaben-voll" : "angaben-gespeichert"}>
        <p>{ende.text}</p>
        <p>
          <a href={meinePraxen} className="font-medium text-brand-700 underline">{t.zuMeinenPraxen}</a>
        </p>
      </div>
    );
  } else if (ersetzenFrage) {
    inhalt = (
      <div className="space-y-3">
        <p ref={frageRef} tabIndex={-1} className="text-sm font-medium text-slate-900 outline-none" data-testid="angaben-gleicher-name">{t.gleicherName}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={KNOPF_HAUPT} onClick={() => ablegen(ersetzenFrage, true)} data-testid="angaben-ersetzen">{t.ersetzen}</button>
          <button type="button" className={KNOPF_NEBEN} onClick={() => { setErsetzenFrage(null); setOffen(true); }}>{t.abbrechen}</button>
        </div>
      </div>
    );
  } else if (!offen) {
    inhalt = (
      <button type="button" className={`${KNOPF_HAUPT} w-full`} aria-expanded={false} onClick={() => setOffen(true)} data-testid="angaben-behalten">
        {t.behalten}
      </button>
    );
  } else {
    const fehlerId = (feld: "name" | "code1" | "code2") => (fehler?.feld === feld ? "angaben-behalten-fehler" : undefined);
    inhalt = (
      <form onSubmit={speichern} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="angaben-name">{t.bezeichnung}</label>
          <input ref={refs.name} id="angaben-name" className="input" maxLength={MAX_BEZEICHNUNG} value={name} onChange={(e) => setName(e.target.value)} aria-describedby={["angaben-name-hinweis", fehlerId("name")].filter(Boolean).join(" ")} aria-invalid={fehler?.feld === "name" || undefined} data-testid="angaben-name" />
          <p id="angaben-name-hinweis" className="mt-1 text-xs text-slate-600">{t.bezeichnungHinweis}</p>
        </div>
        <div>
          <label className="label" htmlFor="angaben-code-neu">{t.codeNeu}</label>
          <input ref={refs.code1} id="angaben-code-neu" type="password" className="input" {...NICHT_MERKEN} autoCapitalize="none" spellCheck={false} value={code1} onChange={(e) => setCode1(e.target.value)} aria-describedby={["angaben-code-hinweis", fehlerId("code1")].filter(Boolean).join(" ")} aria-invalid={fehler?.feld === "code1" || undefined} data-testid="angaben-code-neu" />
        </div>
        <div>
          <label className="label" htmlFor="angaben-code-wdh">{t.codeWiederholen}</label>
          <input ref={refs.code2} id="angaben-code-wdh" type="password" className="input" {...NICHT_MERKEN} autoCapitalize="none" spellCheck={false} value={code2} onChange={(e) => setCode2(e.target.value)} aria-describedby={fehlerId("code2")} aria-invalid={fehler?.feld === "code2" || undefined} data-testid="angaben-code-wdh" />
          <p id="angaben-code-hinweis" className="mt-1 text-xs text-slate-600">{t.codeHinweis} {t.codeVergessen}</p>
        </div>
        {fehler && <p id="angaben-behalten-fehler" className="text-sm text-red-700" role="alert" data-testid="angaben-behalten-fehler">{fehler.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={KNOPF_HAUPT} disabled={laeuft} data-testid="angaben-speichern">{laeuft ? t.speichert : t.speichern}</button>
          <button type="button" className={KNOPF_NEBEN} onClick={() => { setOffen(false); setFehler(null); setCode1(""); setCode2(""); }}>{t.abbrechen}</button>
        </div>
      </form>
    );
  }

  return (
    <section className={`${FELD} mt-10 text-start`} lang={lang} dir={dir} aria-labelledby="angaben-behalten-titel" data-testid="angaben-angebot">
      <h2 id="angaben-behalten-titel" className="text-lg font-semibold text-slate-900">{t.behaltenTitel}</h2>
      {!ende && (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p>{t.behaltenText}</p>
          <p>{t.behaltenWas}</p>
          <p>{t.behaltenSicher}</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 font-medium text-amber-900" data-testid="angaben-geteilt">{t.geteilt}</p>
        </div>
      )}
      <div className="mt-4">{inhalt}</div>
    </section>
  );
}
