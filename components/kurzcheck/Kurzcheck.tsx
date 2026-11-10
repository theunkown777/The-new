"use client";

import { useState } from "react";
import { MAX_ORTE, MUND_BEREICHE, SEIT_KURZ, WICHTIG, ZEICHEN, ortName, staerkeWort, type KurzArt } from "@/lib/kurzcheck";
import { KoerperFigur, ZahnBogen } from "./Figur";

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

const kachel = (an: boolean) => `flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] transition ${an ? "border-brand-600 bg-brand-50 font-medium text-brand-900" : "border-slate-200 bg-white text-slate-800 hover:border-brand-300"}`;

export function Kurzcheck({ token, art, praxis, vorname }: { token: string; art: KurzArt; praxis: string; vorname: string }) {
  const [schritt, setSchritt] = useState(0);
  const [keine, setKeine] = useState(false);
  const [orte, setOrte] = useState<string[]>([]);
  const [ansicht, setAnsicht] = useState<"vorn" | "hinten">("vorn");
  const [staerke, setStaerke] = useState<number | null>(null);
  const [seit, setSeit] = useState<Seit | null>(null);
  const [zeichen, setZeichen] = useState<string[]>([]);
  const [wichtig, setWichtig] = useState<Wichtig | null>(null);
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);

  // Ohne Beschwerden entfallen die Fragen 2 bis 4.
  const folge = keine ? [0, 4] : [0, 1, 2, 3, 4];
  const stelle = folge.indexOf(schritt);
  const weiterOk = schritt === 0 ? keine || orte.length > 0 : schritt === 1 ? staerke !== null : schritt === 2 ? seit !== null : schritt === 3 ? true : wichtig !== null;
  const ortUmschalten = (o: string) => { setKeine(false); setOrte((l) => (l.includes(o) ? l.filter((x) => x !== o) : l.length >= MAX_ORTE ? l : [...l, o])); };

  async function senden() {
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/portal/${token}/kurzcheck`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keine, orte, staerke, seit, zeichen, wichtig, notiz }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFehler(d?.error ?? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    setFertig(true);
  }
  const weiter = () => { if (stelle < folge.length - 1) setSchritt(folge[stelle + 1]); else senden(); };

  if (fertig)
    return (
      <div className="rounded-3xl bg-white p-6 text-center" role="status" data-testid="kurz-danke">
        <svg viewBox="0 0 64 64" className="mx-auto h-16 w-16 text-salbei-600" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx={32} cy={32} r={27} /><path d="M20 33l8 8 16-18" /></svg>
        <h2 className="mt-3 font-display text-2xl text-slate-900">Danke, {vorname}.</h2>
        <p className="mt-1 text-sm text-slate-600">{praxis} hat Ihre Antworten erhalten und kann sich auf Ihren Termin vorbereiten.</p>
        <a href={`/portal/${token}`} className="btn-primary mt-4 inline-block">Zurück zur Übersicht</a>
      </div>
    );

  const TITEL = [
    art === "zahn" ? "Wo haben Sie Beschwerden?" : "Wo haben Sie Beschwerden?",
    "Wie stark sind die Beschwerden?",
    "Seit wann haben Sie das?",
    art === "zahn" ? "Wann merken Sie es?" : "Wie fühlt es sich an?",
    "Was ist Ihnen für den Termin am wichtigsten?",
  ];
  const UNTER = [
    art === "zahn" ? `Tippen Sie auf den Zahn (bis zu ${MAX_ORTE}). Sie müssen es nicht genau wissen.` : `Tippen Sie auf die Stelle (bis zu ${MAX_ORTE}).`,
    "Schieben Sie den Regler: 0 bedeutet keine Beschwerden, 10 die stärksten, die Sie sich vorstellen können.",
    "Eine Antwort genügt.",
    "Mehrere Antworten sind möglich. Wenn nichts passt, tippen Sie einfach auf „Weiter“.",
    "Eine Antwort genügt.",
  ];

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6" data-testid="kurzcheck" data-schritt={schritt}>
      <div className="flex items-center gap-2" aria-hidden="true">
        {folge.map((s, i) => <span key={s} className={`h-2 flex-1 rounded-full transition-colors ${i <= stelle ? "bg-brand-600" : "bg-slate-200"}`} />)}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700" data-testid="kurz-zaehler">Frage {stelle + 1} von {folge.length}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight text-slate-900">{TITEL[schritt]}</h2>
      <p className="mt-1 text-sm text-slate-600">{UNTER[schritt]}</p>

      <div className="mt-4" key={schritt}>
        {schritt === 0 && (
          <div className="kurz-ein">
            {art === "zahn" ? (
              <>
                <div className="rounded-2xl bg-[#FBF7F1] p-2 ring-1 ring-[#E9E2DA]"><ZahnBogen gewaehlt={orte} onToggle={ortUmschalten} /></div>
                <p className="mt-1 text-center text-xs text-slate-500">Wie beim Blick in den Mund: Ihre rechte Seite liegt links im Bild.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {MUND_BEREICHE.map((m) => <button key={m.id} type="button" className={kachel(orte.includes(`mund:${m.id}`))} aria-pressed={orte.includes(`mund:${m.id}`)} onClick={() => ortUmschalten(`mund:${m.id}`)} data-testid={`kurz-mund-${m.id}`}>{m.name}</button>)}
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-2 flex w-fit rounded-full bg-slate-100 p-1 text-sm" role="tablist" aria-label="Ansicht">
                  {(["vorn", "hinten"] as const).map((a) => <button key={a} type="button" role="tab" aria-selected={ansicht === a} onClick={() => setAnsicht(a)} data-testid={`kurz-ansicht-${a}`} className={`rounded-full px-4 py-2 ${ansicht === a ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{a === "vorn" ? "Von vorn" : "Von hinten"}</button>)}
                </div>
                <div className="rounded-2xl bg-[#FBF7F1] p-2 ring-1 ring-[#E9E2DA]"><KoerperFigur ansicht={ansicht} gewaehlt={orte} onToggle={ortUmschalten} /></div>
              </>
            )}
            {orte.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" data-testid="kurz-orte">
                {orte.map((o) => <button key={o} type="button" onClick={() => ortUmschalten(o)} className="rounded-full bg-orange-100 px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300" aria-label={`${ortName(o)} entfernen`}>{ortName(o)} ✕</button>)}
              </div>
            )}
            <button type="button" className={`${kachel(keine)} mt-3`} aria-pressed={keine} onClick={() => { setKeine((k) => !k); setOrte([]); }} data-testid="kurz-keine"><Bild id="kontrolle" />Ich habe keine Beschwerden</button>
          </div>
        )}

        {schritt === 1 && (
          <div className="kurz-ein text-center">
            <Gesicht wert={staerke ?? 0} />
            <p className="mt-2 font-display text-4xl tabular-nums text-slate-900" data-testid="kurz-staerke-wert">{staerke ?? "–"}<span className="text-lg text-slate-500"> von 10</span></p>
            <p className="text-sm text-slate-600">{staerke === null ? "Bitte wählen" : staerkeWort(staerke)}</p>
            <input type="range" min={0} max={10} step={1} value={staerke ?? 0} onChange={(e) => setStaerke(Number(e.target.value))} aria-label="Stärke der Beschwerden von 0 bis 10" className="kurz-regler mt-4 w-full" data-testid="kurz-staerke" />
            <div className="mt-2 grid grid-cols-11 gap-1" role="group" aria-label="Stärke wählen">
              {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" aria-pressed={staerke === n} onClick={() => setStaerke(n)} className={`rounded-lg py-2 text-sm tabular-nums ${staerke === n ? "bg-brand-600 font-semibold text-white" : "bg-slate-100 text-slate-700"}`} data-testid={`kurz-staerke-${n}`}>{n}</button>)}
            </div>
            {(staerke ?? 0) >= 8 && <p className="mt-4 rounded-xl bg-red-50 p-3 text-left text-sm text-red-900" role="alert" data-testid="kurz-dringend">Bei sehr starken Beschwerden rufen Sie bitte direkt in der Praxis an und warten nicht auf den Termin. Im Notfall wählen Sie die 112.</p>}
          </div>
        )}

        {schritt === 2 && (
          <div className="kurz-ein grid gap-2 sm:grid-cols-2">
            {(Object.keys(SEIT_KURZ) as Seit[]).map((k) => <button key={k} type="button" className={kachel(seit === k)} aria-pressed={seit === k} onClick={() => setSeit(k)} data-testid={`kurz-seit-${k}`}><Bild id={k} />{SEIT_KURZ[k]}</button>)}
          </div>
        )}

        {schritt === 3 && (
          <div className="kurz-ein grid gap-2 sm:grid-cols-2">
            {ZEICHEN[art].map((z) => { const an = zeichen.includes(z.id); return <button key={z.id} type="button" className={kachel(an)} aria-pressed={an} onClick={() => setZeichen((l) => (an ? l.filter((x) => x !== z.id) : l.length >= 4 ? l : [...l, z.id]))} data-testid={`kurz-zeichen-${z.id}`}><Bild id={z.id} />{z.name}</button>; })}
          </div>
        )}

        {schritt === 4 && (
          <div className="kurz-ein">
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(WICHTIG) as Wichtig[]).filter((k) => !keine || k !== "schnell").map((k) => <button key={k} type="button" className={kachel(wichtig === k)} aria-pressed={wichtig === k} onClick={() => setWichtig(k)} data-testid={`kurz-wichtig-${k}`}><Bild id={k} />{WICHTIG[k]}</button>)}
            </div>
            <label className="mt-4 block text-sm text-slate-700" htmlFor="kurz-notiz">Möchten Sie der Praxis noch etwas sagen? (freiwillig)</label>
            <textarea id="kurz-notiz" className="input mt-1.5" rows={2} maxLength={200} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="In eigenen Worten, höchstens zwei Sätze" data-testid="kurz-notiz" />
          </div>
        )}
      </div>

      {fehler && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert" data-testid="kurz-fehler">{fehler}</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        {stelle > 0 ? <button type="button" className="btn-secondary" onClick={() => setSchritt(folge[stelle - 1])} data-testid="kurz-zurueck">Zurück</button> : <span />}
        <button type="button" className="btn-primary min-w-[9rem]" disabled={!weiterOk || busy} onClick={weiter} data-testid="kurz-weiter">{busy ? "Sendet …" : stelle === folge.length - 1 ? "Absenden" : "Weiter"}</button>
      </div>
      <p className="mt-4 text-xs text-slate-500">Ihre Antworten gehen nur an {praxis}. Der Fragebogen stellt keine Diagnose.</p>
    </div>
  );
}
