"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_ORTE, MUND_BEREICHE, ORTE_STAND, SEIT_KURZ, WICHTIG, ZEICHEN, nachbarZaehne, orteFuer, type KurzArt, type OrtGruppe } from "@/lib/kurzcheck";
import { kurzUebersetzer, type KurzPaket } from "@/lib/kurzcheckTexte";
import { ZAEHNE } from "@/lib/modelle/gebiss";
import { webglDa } from "@/components/modelle/drei/Buehne";
import { ModellQuelle } from "@/components/modelle/ModellQuelle";
import { KoerperFigur, KopfFigur, ZahnBogen } from "./Figur";
import type { OrtModellGriff, OrtPunkt } from "./OrtModell3D";

// Das 3D-Modell (three.js und Modelldaten) lädt erst im Browser und im Hintergrund; bis dahin gilt die Zeichnung.
const OrtModell3D = dynamic(() => import("./OrtModell3D"), { ssr: false });

type Seit = keyof typeof SEIT_KURZ;
type Wichtig = keyof typeof WICHTIG;

// Kleine Bilder zu den Antworten (Linienzeichnungen, 24 × 24)
const BILD: Record<string, string> = {
  heute: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  tage: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2",
  wochen: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M7 13h10M7 16h10",
  monate: "M12 3a9 9 0 1 0 9 9M12 7v5l3 3M21 3v5h-5",
  kalt: "M12 2v20M4 7l16 10M20 7L4 17M9 4l3 3 3-3M9 20l3-3 3 3",
  heiss: "M8 3c0 3 3 3 3 6s-3 3-3 6M14 3c0 3 3 3 3 6s-3 3-3 6M5 21h14",
  kauen: "M4 9c2-4 14-4 16 0M4 15c2 4 14 4 16 0M7 9v3M12 8v4M17 9v3M7 15v-2M12 16v-3M17 15v-2",
  pochend: "M3 12h4l2-6 4 12 2-6h6",
  blutet: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z",
  geschwollen: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v8M8 12h8",
  abgebrochen: "M7 3h10l-2 8 3 2-6 8-1-7-4-2z",
  locker: "M8 4h8v9a4 4 0 0 1-8 0zM4 20c2-2 3 2 5 0M15 20c2-2 3 2 5 0",
  stechend: "M13 2L4 14h7l-1 8 9-12h-7z",
  dumpf: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  brennend: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 1-3-1-5 1-9Z",
  kribbelnd: "M5 6h.01M12 4h.01M19 6h.01M4 12h.01M9 10h.01M15 10h.01M20 12h.01M6 18h.01M12 16h.01M18 18h.01M12 21h.01",
  steif: "M6 4v16M18 4v16M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3",
  bewegung: "M13 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM7 21l3-6 3 2v4M10 15l1-5 4 2 3-1M11 10l-4 1-1 3",
  rot: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2M12 20v2M2 12h2M20 12h2",
  juckt: "M4 8l3-3 3 3 3-3 3 3 3-3M4 14l3-3 3 3 3-3 3 3 3-3M4 20l3-3 3 3 3-3 3 3 3-3",
  traenen: "M2 10s4-5 10-5 10 5 10 5-4 5-10 5S2 10 2 10ZM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16 17s2 2.2 2 3.3a2 2 0 0 1-4 0c0-1.1 2-3.3 2-3.3Z",
  trocken: "M2 9s4-5 10-5 10 5 10 5M5 18h.01M9 16h.01M13 18h.01M17 16h.01M7 20h.01M15 20h.01M19 19h.01",
  verschwommen: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12ZM8 12c1-1 2 1 3 0s2 1 3 0 2 1 3 0",
  licht: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  druck: "M12 3v6M9 6l3 3 3-3M12 21v-6M9 18l3-3 3 3M3 12h5M21 12h-5",
  blitze: "M12 2l1.5 5L18 5l-2 4.5L21 11l-5 1.5L18 17l-4.5-2L12 20l-1.5-5L6 17l2-4.5L3 11l5-1.5L6 5l4.5 2z",
  ohrdruck: "M8 18c0 2 4 3 5 0 1-2 4-3 4-8a5 5 0 0 0-10 0M10 10a2 2 0 0 1 4 0M21 3l-3 3M21 3h-3M21 3v3",
  hoeren: "M8 18c0 2 4 3 5 0 1-2 4-3 4-8a5 5 0 0 0-10 0M10 10a2 2 0 0 1 4 0M3 3l18 18",
  geraeusch: "M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12",
  schwindel: "M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6 8 8 0 0 1 8-8",
  schlucken: "M9 3v6a3 3 0 0 0 6 0V3M12 12v9M9 18l3 3 3-3",
  nase: "M12 3c-1 5-4 9-4 12a4 4 0 0 0 4 3 4 4 0 0 0 4-3M9 17h.01M15 17h.01",
  heiser: "M4 5h16v11H9l-5 4zM10 8l4 4M14 8l-4 4",
  riechen: "M8 21c0-4 8-4 8-8M12 3c-2 2 2 4 0 6M7 5c-2 2 2 4 0 6M17 5c-2 2 2 4 0 6",
  schuppt: "M3 8c3-3 6-3 9 0 3-3 6-3 9 0M3 14c3-3 6-3 9 0 3-3 6-3 9 0M3 20c3-3 6-3 9 0 3-3 6-3 9 0",
  naesst: "M8 4s4 4.5 4 7a4 4 0 0 1-8 0c0-2.5 4-7 4-7ZM17 10s3 3.3 3 5a3 3 0 0 1-6 0c0-1.7 3-5 3-5Z",
  blasen: "M7 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM16 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM16 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  fleck: "M10 6c3-2 7 0 6 4 2 3-1 7-5 6-4 1-6-3-4-6-1-2 1-4 3-4ZM17 17l4 4",
  schnell: "M13 2L4 14h7l-1 8 9-12h-7z",
  ursache: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM15 15l5 5M10 7v3M10 12.5h.01",
  kosten: "M17 7a6 6 0 1 0 0 10M4 10.5h9M4 13.5h9",
  angst: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 10h.01M15.5 10h.01M8 16c1.5-2 6.5-2 8 0",
  kontrolle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6",
};
function Bild({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={BILD[id] ?? BILD.kontrolle} /></svg>;
}

/** Gesicht, dessen Mund und Farbe der Stärke folgen (0 = entspannt, 10 = sehr starke Beschwerden). */
function Gesicht({ wert }: { wert: number }) {
  const farbe = wert <= 3 ? "#4D7C5F" : wert <= 6 ? "#C58A1B" : wert <= 8 ? "#C2410C" : "#9F1239";
  const mund = 10 - wert * 2; // +10 lächelt, −10 verzogen
  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-28 w-28 transition-colors duration-300" aria-hidden="true" data-testid="kurz-gesicht">
      <circle cx={50} cy={50} r={44} fill={farbe} fillOpacity={0.14} stroke={farbe} strokeWidth={4} />
      <path d={wert >= 7 ? "M30 36l10 5M70 36l-10 5" : "M32 38h8M60 38h8"} stroke={farbe} strokeWidth={4} strokeLinecap="round" />
      <circle cx={36} cy={46} r={3.5} fill={farbe} /><circle cx={64} cy={46} r={3.5} fill={farbe} />
      <path d={`M32 68 Q50 ${68 + mund} 68 68`} fill="none" stroke={farbe} strokeWidth={4.5} strokeLinecap="round" style={{ transition: "d .25s" }} />
    </svg>
  );
}

const kachel = (an: boolean) => `flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start text-[15px] transition ${an ? "border-brand-600 bg-brand-50 font-medium text-brand-900" : "border-slate-200 bg-white text-slate-800 hover:border-brand-300"}`;
const knopf = (an: boolean) => `rounded-full px-3 py-2 text-sm ring-1 ${an ? "bg-orange-100 font-medium text-orange-950 ring-orange-400" : "bg-white text-slate-700 ring-slate-200 hover:text-brand-700"}`;

// Zähne in der Liste wie im Mund: oben 18 … 11 21 … 28, unten 48 … 41 31 … 38
const OBEN = ZAEHNE.filter((z) => z.fdi < 30).map((z) => z.fdi).sort((a, b) => (a < 20 ? -a : a) - (b < 20 ? -b : b));
const UNTEN = ZAEHNE.filter((z) => z.fdi > 30).map((z) => z.fdi).sort((a, b) => (a > 40 ? -a : a) - (b > 40 ? -b : b));

export function Kurzcheck({ token, art, praxis, vorname, paket, gelenkeErlaubt = false }: { token: string; art: KurzArt; praxis: string; vorname: string; paket: KurzPaket; gelenkeErlaubt?: boolean }) {
  const tt = useMemo(() => kurzUebersetzer(paket), [paket]);
  const { t } = tt;
  const [schritt, setSchritt] = useState(0);
  const [keine, setKeine] = useState(false);
  const [orte, setOrte] = useState<string[]>([]);
  const [punkte, setPunkte] = useState<Record<string, OrtPunkt>>({});
  const [ansicht, setAnsicht] = useState<"vorn" | "hinten">("vorn");
  const [staerke, setStaerke] = useState<number | null>(null);
  const [seit, setSeit] = useState<Seit | null>(null);
  const [zeichen, setZeichen] = useState<string[]>([]);
  const [wichtig, setWichtig] = useState<Wichtig | null>(null);
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [letzterZahn, setLetzterZahn] = useState<number | null>(null);

  // 3D nur mit WebGL; bei „Bewegung reduzieren“ zuerst die Zeichnung (das Modell bleibt über den Schalter erreichbar)
  const [raum, setRaum] = useState(false);
  const [kannRaum, setKannRaum] = useState(false);
  const [dreiBereit, setDreiBereit] = useState(false);
  const [gelenke, setGelenke] = useState(false);
  const modell = useRef<OrtModellGriff | null>(null);
  useEffect(() => {
    const geht = webglDa();
    setKannRaum(geht);
    setRaum(geht && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const dreiSichtbar = raum && dreiBereit;
  useEffect(() => { if (!hinweis) return; const x = window.setTimeout(() => setHinweis(null), 6000); return () => window.clearTimeout(x); }, [hinweis]);

  // Ohne Beschwerden entfallen die Fragen 2 bis 4.
  const folge = keine ? [0, 4] : [0, 1, 2, 3, 4];
  const stelle = folge.indexOf(schritt);
  const weiterOk = schritt === 0 ? keine || orte.length > 0 : schritt === 1 ? staerke !== null : schritt === 2 ? seit !== null : schritt === 3 ? true : wichtig !== null;

  /** Stelle hinzufügen oder (umschalten) wieder entfernen. Beide Augen oder beide Ohren werden zusammengefasst. */
  function ortSetzen(o: string, umschalten: boolean, p?: OrtPunkt) {
    setKeine(false); setHinweis(null);
    if (orte.includes(o)) {
      if (umschalten) entfernen(o);
      else if (p) setPunkte((alt) => ({ ...alt, [o]: p }));
      return;
    }
    const m = /^(auge|ohr):([RL])$/.exec(o);
    if (m && orte.includes(`${m[1]}:B`)) return;
    if (m && orte.includes(`${m[1]}:${m[2] === "R" ? "L" : "R"}`)) {
      setOrte((l) => [...l.filter((x) => !x.startsWith(`${m[1]}:`)), `${m[1]}:B`]);
      setPunkte((alt) => { const n = { ...alt }; delete n[`${m[1]}:R`]; delete n[`${m[1]}:L`]; return n; });
      return;
    }
    if (orte.length >= MAX_ORTE) { setHinweis(t("genug", { n: MAX_ORTE })); return; }
    setOrte((l) => [...l, o]);
    if (p) setPunkte((alt) => ({ ...alt, [o]: p }));
    if (o.startsWith("zahn:")) setLetzterZahn(Number(o.slice(5)));
  }
  function entfernen(o: string) {
    setOrte((l) => l.filter((x) => x !== o));
    setPunkte((alt) => { const n = { ...alt }; delete n[o]; return n; });
  }
  /** Aus der Zeichnung oder der Liste: umschalten; im Modell zur Stelle drehen */
  const ortUmschalten = (o: string) => { const neu = !orte.includes(o); ortSetzen(o, true); if (neu && dreiSichtbar) modell.current?.zeige(o); };
  const zahnTauschen = (alt: number, neu: number) => { setOrte((l) => (l.includes(`zahn:${neu}`) ? l.filter((x) => x !== `zahn:${alt}`) : l.map((x) => (x === `zahn:${alt}` ? `zahn:${neu}` : x)))); setLetzterZahn(neu); };

  async function senden() {
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/portal/${token}/kurzcheck`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keine, orte, staerke, seit, zeichen, wichtig, notiz, stand: ORTE_STAND }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFehler(paket.lang === "de" && d?.error ? d.error : t("fehler"));
    setFertig(true);
  }
  const weiter = () => { if (stelle < folge.length - 1) setSchritt(folge[stelle + 1]); else senden(); };

  if (fertig)
    return (
      <div className="rounded-3xl bg-white p-6 text-center" role="status" data-testid="kurz-danke">
        <svg viewBox="0 0 64 64" className="mx-auto h-16 w-16 text-salbei-600" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx={32} cy={32} r={27} /><path d="M20 33l8 8 16-18" /></svg>
        <h2 className="mt-3 font-display text-2xl text-slate-900">{t("danke", { name: vorname })}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("dankeText", { praxis })}</p>
        <a href={`/portal/${token}${paket.lang === "de" ? "" : `?lang=${paket.lang}`}`} className="btn-primary mt-4 inline-block">{t("uebersicht")}</a>
      </div>
    );

  const TITEL = [t("wo"), t("staerke"), t("seit"), art === "zahn" ? t("wannZahn") : art === "koerper" ? t("wieKoerper") : t("wasSonst"), t("wichtig")];
  const UNTER = [art === "zahn" ? t("unterZahn", { n: MAX_ORTE }) : t("unterWo", { n: MAX_ORTE }), t("unterStaerke"), t("eine"), t("mehrere"), t("eine")];
  const kopfArt = art === "auge" || art === "hno";
  const koerperArt = art === "koerper" || art === "haut";
  const modellHinweis = art === "zahn" ? t("modellGebiss") : kopfArt ? t("modellKopf") : t("modellKoerper");
  // Liste der Stellen nach Gruppen (ohne Mund: der hat eigene Kacheln)
  const gruppen = (() => {
    const m = new Map<OrtGruppe, string[]>();
    for (const o of orteFuer(art)) if (o.gruppe !== "mund") m.set(o.gruppe, [...(m.get(o.gruppe) ?? []), o.id]);
    return Array.from(m.entries());
  })();
  const zahnNachbarn = letzterZahn && orte.includes(`zahn:${letzterZahn}`) ? nachbarZaehne(letzterZahn) : [];

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6" data-testid="kurzcheck" data-schritt={schritt} data-art={art}>
      <div className="flex items-center gap-2" aria-hidden="true">
        {folge.map((s, i) => <span key={s} className={`h-2 flex-1 rounded-full transition-colors ${i <= stelle ? "bg-brand-600" : "bg-slate-200"}`} />)}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700" data-testid="kurz-zaehler">{t("frage", { i: stelle + 1, n: folge.length })}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight text-slate-900">{TITEL[schritt]}</h2>
      <p className="mt-1 text-sm text-slate-600">{UNTER[schritt]}</p>

      <div className="mt-4" key={schritt}>
        {schritt === 0 && (
          <div className="kurz-ein">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {koerperArt ? (
                <div className="flex w-fit rounded-full bg-slate-100 p-1 text-sm" role="tablist" aria-label={t("ansicht")}>
                  {(["vorn", "hinten"] as const).map((a) => <button key={a} type="button" role="tab" aria-selected={ansicht === a} onClick={() => { setAnsicht(a); if (dreiSichtbar) modell.current?.blick(a === "vorn" ? 0 : Math.PI); }} data-testid={`kurz-ansicht-${a}`} className={`rounded-full px-4 py-2 ${ansicht === a ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{a === "vorn" ? t("vorn") : t("hinten")}</button>)}
                </div>
              ) : <span />}
              {kannRaum && (
                <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs" role="group" aria-label={t("darstellung")}>
                  {([[true, "3D"], [false, t("schema")]] as const).map(([wert, name]) => (
                    <button key={String(wert)} type="button" aria-pressed={raum === wert} onClick={() => setRaum(wert)} data-testid={wert ? "kurz-3d" : "kurz-schema"}
                      className={`rounded-full px-3 py-1.5 ${raum === wert ? "bg-brand-600 font-medium text-white" : "text-slate-600"}`}>{name}</button>
                  ))}
                </div>
              )}
            </div>
            <div className={`relative overflow-hidden rounded-2xl bg-[#FBF7F1] ring-1 ring-[#E9E2DA] ${art === "zahn" ? "h-[min(52vh,26rem)]" : "h-[min(58vh,30rem)]"} min-h-[18rem]`} data-testid="kurz-buehne" data-modell={dreiSichtbar ? "3d" : "schema"}>
              {/* Die Zeichnung steht sofort. Sobald das Modell bereit ist, blendet es darüber, und die Zeichnung ruht (inert). */}
              <div className="flex h-full items-center justify-center p-2" inert={dreiSichtbar} aria-hidden={dreiSichtbar || undefined}>
                {art === "zahn" ? <ZahnBogen gewaehlt={orte} onToggle={ortUmschalten} name={tt.ort} beschriftung={{ oben: t("oben"), unten: t("unten"), rechts: t("rechts"), links: t("links") }} label={t("gebiss")} />
                  : kopfArt ? <KopfFigur gewaehlt={orte} onToggle={ortUmschalten} name={tt.ort} label={t("modellAria")} />
                  : <KoerperFigur ansicht={ansicht} gewaehlt={orte} onToggle={ortUmschalten} art={art} name={tt.ort} label={ansicht === "vorn" ? t("figurVorn") : t("figurHinten")} />}
              </div>
              {raum && (
                <div className="kurz-3d modell-buehne absolute inset-0" data-sichtbar={dreiSichtbar ? "1" : "0"} aria-hidden={!dreiSichtbar || undefined}>
                  <OrtModell3D ref={modell} art={art} orte={orte} punkte={punkte} gelenke={gelenke} beschriftung={t("modellAria")}
                    onOrt={(o, tr) => { if (!o) { setHinweis(t("keinOrt")); return; } ortSetzen(o, false, { punkt: tr.punkt, normale: tr.normale }); }}
                    onBereit={() => setDreiBereit(true)} onFehler={() => { setRaum(false); setKannRaum(false); }} />
                </div>
              )}
              {raum && !dreiBereit && <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-xs text-slate-500" aria-live="polite" data-testid="kurz-3d-laedt">{t("laedt")}</p>}
            </div>
            {art === "zahn" && !dreiSichtbar && <p className="mt-1 text-center text-xs text-slate-500">{t("zahnSeite")}</p>}
            {dreiSichtbar && (
              <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
                <p className="text-xs text-slate-600" data-testid="kurz-modell-hinweis">{modellHinweis} {t("drehen")}</p>
                {art === "koerper" && gelenkeErlaubt && (
                  <button type="button" aria-pressed={gelenke} onClick={() => setGelenke((g) => !g)} className={knopf(gelenke)} data-testid="kurz-gelenke">{t("gelenke")}</button>
                )}
              </div>
            )}
            {dreiSichtbar && <ModellQuelle />}
            {hinweis && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status" data-testid="kurz-hinweis">{hinweis}</p>}

            {orte.length > 0 && (
              <div className="mt-3" data-testid="kurz-orte" aria-live="polite">
                <p className="sr-only">{t("gewaehlt")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {orte.map((o) => <button key={o} type="button" onClick={() => entfernen(o)} className="rounded-full bg-orange-100 px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300" aria-label={t("entfernen", { ort: tt.ort(o) })} data-ort={o}>{tt.ort(o)} <span aria-hidden="true">✕</span></button>)}
                </div>
                {zahnNachbarn.length > 0 && letzterZahn && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-600" data-testid="kurz-nachbarn">
                    {t("nachbar")}
                    {zahnNachbarn.map((n) => <button key={n} type="button" className="rounded-full bg-white px-3 py-1 text-sm text-slate-800 ring-1 ring-slate-300 hover:text-brand-700" onClick={() => zahnTauschen(letzterZahn, n)} data-testid={`kurz-nachbar-${n}`}>{n}</button>)}
                  </p>
                )}
              </div>
            )}

            {art === "zahn" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {MUND_BEREICHE.map((m) => <button key={m.id} type="button" className={kachel(orte.includes(`mund:${m.id}`))} aria-pressed={orte.includes(`mund:${m.id}`)} onClick={() => ortSetzen(`mund:${m.id}`, true)} data-testid={`kurz-mund-${m.id}`}>{tt.w(m.name)}</button>)}
              </div>
            )}

            {/* Alle Stellen als Knöpfe: für Tastatur und Bildschirmleser und für alle, die lieber lesen als tippen */}
            <details className="mt-3 rounded-2xl ring-1 ring-slate-200" data-testid="kurz-liste">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900">{t("liste")}</summary>
              <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                {art === "zahn" ? (
                  ([["g_zaehneOben", OBEN], ["g_zaehneUnten", UNTEN]] as const).map(([g, liste]) => (
                    <div key={g} role="group" aria-label={t(g)}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(g)}</p>
                      <div className="mt-1.5 grid grid-cols-8 gap-1" dir="ltr">
                        {liste.map((n) => { const o = `zahn:${n}`, an = orte.includes(o); return <button key={n} type="button" aria-pressed={an} aria-label={tt.ort(o)} onClick={() => ortUmschalten(o)} className={`rounded-lg py-2 text-sm tabular-nums ring-1 ${an ? "bg-orange-100 font-semibold text-orange-950 ring-orange-400" : "bg-white text-slate-700 ring-slate-200"}`} data-testid={`kurz-ort-${o}`}>{n}</button>; })}
                      </div>
                    </div>
                  ))
                ) : gruppen.map(([g, ids]) => (
                  <div key={g} role="group" aria-label={t(`g_${g}`)}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(`g_${g}`)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ids.map((o) => <button key={o} type="button" aria-pressed={orte.includes(o)} onClick={() => ortUmschalten(o)} className={knopf(orte.includes(o))} data-testid={`kurz-ort-${o}`}>{tt.ort(o)}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <button type="button" className={`${kachel(keine)} mt-3`} aria-pressed={keine} onClick={() => { setKeine((k) => !k); setOrte([]); setPunkte({}); }} data-testid="kurz-keine"><Bild id="kontrolle" />{t("keine")}</button>
          </div>
        )}

        {schritt === 1 && (
          <div className="kurz-ein text-center">
            <Gesicht wert={staerke ?? 0} />
            <p className="mt-2 font-display text-4xl tabular-nums text-slate-900" data-testid="kurz-staerke-wert">{staerke ?? "–"}<span className="text-lg text-slate-500"> {t("vonZehn")}</span></p>
            <p className="text-sm text-slate-600">{staerke === null ? t("bitteWaehlen") : tt.staerke(staerke)}</p>
            <input type="range" min={0} max={10} step={1} value={staerke ?? 0} onChange={(e) => setStaerke(Number(e.target.value))} aria-label={t("staerkeRegler")} className="kurz-regler mt-4 w-full" data-testid="kurz-staerke" />
            <div className="mt-2 grid grid-cols-11 gap-1" role="group" aria-label={t("staerkeWahl")} dir="ltr">
              {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" aria-pressed={staerke === n} onClick={() => setStaerke(n)} className={`rounded-lg py-2 text-sm tabular-nums ${staerke === n ? "bg-brand-600 font-semibold text-white" : "bg-slate-100 text-slate-700"}`} data-testid={`kurz-staerke-${n}`}>{n}</button>)}
            </div>
            {(staerke ?? 0) >= 8 && <p className="mt-4 rounded-xl bg-red-50 p-3 text-start text-sm text-red-900" role="alert" data-testid="kurz-dringend">{t("dringend")}</p>}
          </div>
        )}

        {schritt === 2 && (
          <div className="kurz-ein grid gap-2 sm:grid-cols-2">
            {(Object.keys(SEIT_KURZ) as Seit[]).map((k) => <button key={k} type="button" className={kachel(seit === k)} aria-pressed={seit === k} onClick={() => setSeit(k)} data-testid={`kurz-seit-${k}`}><Bild id={k} />{tt.w(SEIT_KURZ[k])}</button>)}
          </div>
        )}

        {schritt === 3 && (
          <div className="kurz-ein grid gap-2 sm:grid-cols-2">
            {ZEICHEN[art].map((z) => { const an = zeichen.includes(z.id); return <button key={z.id} type="button" className={kachel(an)} aria-pressed={an} onClick={() => setZeichen((l) => (an ? l.filter((x) => x !== z.id) : l.length >= 4 ? l : [...l, z.id]))} data-testid={`kurz-zeichen-${z.id}`}><Bild id={z.id} />{tt.w(z.name)}</button>; })}
          </div>
        )}

        {schritt === 4 && (
          <div className="kurz-ein">
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(WICHTIG) as Wichtig[]).filter((k) => !keine || k !== "schnell").map((k) => <button key={k} type="button" className={kachel(wichtig === k)} aria-pressed={wichtig === k} onClick={() => setWichtig(k)} data-testid={`kurz-wichtig-${k}`}><Bild id={k} />{tt.w(WICHTIG[k])}</button>)}
            </div>
            <label className="mt-4 block text-sm text-slate-700" htmlFor="kurz-notiz">{t("notiz")}</label>
            <textarea id="kurz-notiz" className="input mt-1.5" rows={2} maxLength={200} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder={t("notizPlatz")} data-testid="kurz-notiz" />
          </div>
        )}
      </div>

      {fehler && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert" data-testid="kurz-fehler">{fehler}</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        {stelle > 0 ? <button type="button" className="btn-secondary" onClick={() => setSchritt(folge[stelle - 1])} data-testid="kurz-zurueck">{t("zurueck")}</button> : <span />}
        <button type="button" className="btn-primary min-w-[9rem]" disabled={!weiterOk || busy} onClick={weiter} data-testid="kurz-weiter">{busy ? t("sendet") : stelle === folge.length - 1 ? t("absenden") : t("weiter")}</button>
      </div>
      <p className="mt-4 text-xs text-slate-500">{t("fuss", { praxis })}</p>
    </div>
  );
}
