"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { HilfeEintrag, HinweisArt } from "@/lib/hilfeWissen/typ";
import type { ErkannteMeldung } from "@/lib/hilfeSuche";
import type { MenueRechte } from "@/lib/rollen";
import { CHAT_START, FRAGE_MAX, chatSchritt, frueheFragen, kiKnopfZeigen, praxismanagerThema, type ChatNachricht } from "@/lib/hilfeChat";
import { appChatErlaubt, seiteErlaubt, seitenMuster, seitenTitel, websiteChatErlaubt, zeigZiel, type ZeigAuftrag } from "@/lib/hilfeZeiger";
import { MENUE_ZUSTAND } from "@/lib/menueEreignisse";
import { FRAGEN } from "@/lib/praxisManagerFragen";
import { hilfeZeigen } from "@/components/HilfeZeiger";

import { useAppText } from "@/components/FachKontext";
// „Frag Sorrida“ als Chat: schwebender Knopf unten rechts, Fenster mit Fokusfalle, Escape schließt.
// Antworten kommen aus der festen Wissenssammlung (lib/hilfeWissen), gesucht wird im Browser (lib/hilfeSuche).
// Die Sammlung wird erst beim ersten Öffnen geladen. Der Verlauf lebt nur im Zustand von React, nichts wird
// gespeichert. Mit eingeschalteten KI-Hilfen gibt es je Frage den Knopf „Mit KI beantworten“, nie automatisch.
// Modus "website": öffentliches Wissen, ohne KI, „Zeig mir wo“ auf Abschnitte der Startseite. Dort trägt das Fenster
// Papier und Haarlinie wie das Journal und wächst aus dem Knopf (app/globals.css, „Frag Sorrida auf der Website“).

type Modus = "app" | "website";

interface Paket {
  wissen: HilfeEintrag[];
  /** Fester Hinweis; in der App passend zur Art der Praxis (KZV nur bei Zahnmedizin). */
  hinweis: (art: HinweisArt) => string;
  such: typeof import("@/lib/hilfeSuche");
}

async function laden(modus: Modus): Promise<Paket> {
  const such = await import("@/lib/hilfeSuche");
  if (modus === "website") {
    const [w, t] = await Promise.all([import("@/lib/hilfeWissen/website"), import("@/lib/hilfeWissen/typ")]);
    return { wissen: w.WEBSITE_WISSEN, hinweis: () => t.WEBSITE_HINWEIS, such };
  }
  const w = await import("@/lib/hilfeWissen");
  return { wissen: w.HILFE_WISSEN, hinweis: w.hilfeHinweis, such };
}

const WEBSITE_START = ["web-was", "web-faecher", "web-kosten", "web-demo"];

/** Fokus im Fenster halten: Tab läuft im Kreis (wie components/Suche.tsx). */
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

export function FragSorrida({
  modus = "app",
  fach,
  hinweisArt,
  rechte,
  ki = false,
  personPl = "Patienten",
  person,
  abschluss = "Behandlung",
  gebuehrenrechner,
}: {
  modus?: Modus;
  fach?: "zahn" | "andere";
  /** Gibt es unter Abrechnung den Gebührenrechner (lib/abrechnungsarten.ts, gebuehrenwerkeFuer)? Ohne Angabe: ja. */
  gebuehrenrechner?: boolean;
  /** Art der Praxis für den festen Hinweis (lib/praxisKennung.ts: hinweisArt). Ohne Angabe: zahn bzw. neutral. */
  hinweisArt?: HinweisArt;
  rechte?: MenueRechte;
  /** KI-Hilfen aktiv (Schalter der Praxis UND KI-Zugang). Auf der Website immer aus. */
  ki?: boolean;
  personPl?: string;
  /** Personenwort im Singular („Kunde“, „Frau“); ersetzt „Patient“ im Fließtext der Hilfe. */
  person?: string;
  abschluss?: string;
}) {
  const ft = useAppText();
  const uid = useId();
  const pfad = usePathname() ?? "/";
  const [offen, setOffen] = useState(false);
  const [menueOffen, setMenueOffen] = useState(false);
  const [paket, setPaket] = useState<Paket | null>(null);
  const [ladeFehler, setLadeFehler] = useState(false);
  const [frage, setFrage] = useState("");
  const [meldungen, setMeldungen] = useState<ErkannteMeldung[]>([]);
  const [zustand, senden] = useReducer(chatSchritt, CHAT_START);
  const knopf = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const feld = useRef<HTMLInputElement>(null);
  const verlaufEnde = useRef<HTMLDivElement>(null);
  const kiAktiv = modus === "app" && ki;
  const web = modus === "website";
  // Auf der Website gibt es kein Menü im Sinn der App; die Pfade dort nennen Abschnitte und Seiten.
  const ortWort = modus === "website" ? "Ort" : "Menü";
  const woerter = useMemo(() => ({ personPl, person, abschluss }), [personPl, person, abschluss]);
  const kontext = useMemo(() => ({ fach, rechte, merkmale: gebuehrenrechner === undefined ? undefined : { gebuehrenrechner } }), [fach, rechte, gebuehrenrechner]);

  const erlaubt = modus === "website" ? websiteChatErlaubt(pfad) : appChatErlaubt(pfad);

  // Am Handy: Während das Menü offen ist, tritt der Knopf zurück.
  useEffect(() => {
    const zustand = (e: Event) => setMenueOffen(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(MENUE_ZUSTAND, zustand);
    return () => window.removeEventListener(MENUE_ZUSTAND, zustand);
  }, []);

  const eintragVon = useCallback((id: string) => paket?.wissen.find((e) => e.id === id) ?? null, [paket]);
  const text = useCallback(<T extends Pick<HilfeEintrag, "frage" | "antwort" | "pfad">>(e: T) => (paket ? paket.such.hilfeText(e, woerter) : e), [paket, woerter]);

  /** Meldungen, die gerade auf der Seite stehen (Meldungsfelder und übriger Text), nur im Browser abgeglichen. */
  const meldungenLesen = useCallback(
    (p: Paket) => {
      const alarme = Array.from(document.querySelectorAll<HTMLElement>('[role="alert"], [data-testid="app-fehler"]'))
        .filter((el) => !el.closest("[data-frag-sorrida]"))
        .map((el) => el.innerText || el.textContent || "");
      const seite = document.querySelector("main")?.textContent ?? "";
      setMeldungen(p.such.meldungenErkennen({ alarme, seite }, p.wissen, kontext));
    },
    [kontext],
  );

  // Die Meldungen liest der Effekt weiter unten, sobald Chat offen und Hilfetexte geladen sind.
  async function oeffnen() {
    setOffen(true);
    if (paket) return;
    try {
      setPaket(await laden(modus));
      setLadeFehler(false);
    } catch {
      setLadeFehler(true);
    }
  }

  const schliessen = useCallback(() => {
    setOffen(false);
    window.setTimeout(() => knopf.current?.focus(), 0);
  }, []);

  // Solange der Chat offen ist, bleiben die erkannten Meldungen aktuell: nach einem Seitenwechsel und wenn eine
  // Meldung erst nach dem Öffnen erscheint (etwa nach dem Speichern). Änderungen im Chat selbst zählen nicht.
  useEffect(() => {
    if (!offen || !paket) return;
    meldungenLesen(paket);
    let t: number | undefined;
    const imChat = (n: Node) => !!(n instanceof Element ? n : n.parentElement)?.closest("[data-frag-sorrida]");
    const beobachter = new MutationObserver((aenderungen) => {
      if (aenderungen.every((a) => imChat(a.target))) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => meldungenLesen(paket), 250);
    });
    beobachter.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      beobachter.disconnect();
      window.clearTimeout(t);
    };
  }, [offen, paket, pfad, meldungenLesen]);

  // Beim Öffnen: Fokus ins Feld.
  useEffect(() => {
    if (!offen) return;
    const t = window.setTimeout(() => feld.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [offen, paket]);

  // Neue Nachricht: ans Ende scrollen (ohne Bewegung, wenn reduziert gewünscht).
  useEffect(() => {
    if (!offen || zustand.nachrichten.length === 0) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    verlaufEnde.current?.scrollIntoView({ block: "end", behavior: ruhig ? "auto" : "smooth" });
  }, [zustand.nachrichten, offen]);

  function fragen(roh: string) {
    if (!paket) return;
    const f = roh.trim().slice(0, FRAGE_MAX);
    if (f.length < 2) return;
    const thema = modus === "app" ? praxismanagerThema(f, { analyse: rechte?.analyse }) : null;
    const treffer = paket.such.sucheHilfe(f, paket.wissen, { ...kontext, seite: pfad, anzahl: 3 });
    senden({ typ: "frage", text: f, eintraege: treffer.map((t) => t.eintrag.id), thema });
    setFrage("");
  }

  function zeigen(z: ZeigAuftrag) {
    setOffen(false);
    hilfeZeigen({ ...z, name: z.name.replace("{P}", personPl).replace("{A}", abschluss), pfad: text({ frage: "", antwort: "", pfad: z.pfad }).pfad });
  }

  async function mitKi(n: Extract<ChatNachricht, { art: "hilfe" }>) {
    senden({ typ: "ki-start", zu: n.id });
    const verlauf = frueheFragen(zustand, n.id);
    const res = await fetch("/api/ki/hilfe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Nur das Muster der Seite (Kennungen als „…“); der Server macht daraus einen festen Titel.
      body: JSON.stringify({ frage: n.frage, seite: seitenMuster(pfad), verlauf }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok || typeof d?.passt !== "boolean") {
      senden({ typ: "ki-fehler", zu: n.id, text: d?.error ?? "Die Antwort mit KI hat nicht geklappt. Die Einträge ohne KI stehen weiter bereit." });
      return;
    }
    const quellen = Array.isArray(d.quellen) ? d.quellen.map((q: { id?: unknown }) => String(q?.id ?? "")).filter(Boolean) : [];
    senden({ typ: "ki-antwort", zu: n.id, passt: d.passt, antwort: String(d.antwort ?? ""), quellen });
  }

  const zielFuer = useCallback((e: Pick<HilfeEintrag, "anker" | "href" | "pfad">) => zeigZiel(e, { pfad, rechte, fach }), [pfad, rechte, fach]);

  const startFragen = useMemo(() => {
    if (!paket) return [];
    if (modus === "website") return WEBSITE_START.map(eintragVon).filter((e): e is HilfeEintrag => !!e);
    return paket.such.fragenZurSeite(pfad, paket.wissen, { ...kontext, anzahl: 4 });
  }, [paket, modus, pfad, kontext, eintragVon]);
  const titel = modus === "app" ? seitenTitel(pfad, woerter) : null;

  if (!erlaubt) return null;

  // ------------------------------------------------------------ Bausteine der Anzeige

  const aktionen = (e: HilfeEintrag) => {
    const z = zielFuer(e);
    const oeffnenErlaubt = modus === "website" || seiteErlaubt(e.href, kontext);
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {z && (
          <button type="button" className="btn btn-secondary px-3 py-1.5 text-sm" onClick={() => zeigen(z)} data-testid="frag-sorrida-zeigen">
            Zeig mir wo
          </button>
        )}
        {oeffnenErlaubt && (
          <Link href={e.href} className="px-1 py-1.5 text-sm font-medium text-brand-700 underline" onClick={() => setOffen(false)} data-testid="frag-sorrida-oeffnen">
            Seite öffnen
          </Link>
        )}
      </div>
    );
  };

  const eintragKarte = (e: HilfeEintrag, haupt = true) => {
    const t = text(e);
    return (
      <div className={haupt ? "" : "mt-2 border-t border-slate-100 pt-2"} data-testid="frag-sorrida-eintrag" data-eintrag={e.id}>
        <p className="font-medium text-slate-900">{t.frage}</p>
        <p className="mt-1 text-slate-700">{t.antwort}</p>
        <p className="mt-1 text-xs text-slate-500">{ortWort}: {t.pfad}</p>
        {aktionen(e)}
      </div>
    );
  };

  const kiBereich = (n: Extract<ChatNachricht, { art: "hilfe" }>) => {
    if (!kiAktiv) return null;
    const k = n.ki;
    return (
      <div className="mt-3">
        {kiKnopfZeigen(n, kiAktiv) && (
          <button type="button" className="btn btn-secondary px-3 py-1.5 text-sm" onClick={() => mitKi(n)} data-testid="frag-sorrida-ki">
            {k?.art === "fehler" ? "Mit KI erneut versuchen" : "Mit KI beantworten"}
          </button>
        )}
        {k?.art === "laeuft" && <p className="text-sm text-slate-600" role="status">KI formuliert …</p>}
        {k?.art === "fehler" && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-frag-sorrida-meldung>{k.text}</p>}
        {k?.art === "antwort" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm" data-testid="frag-sorrida-ki-antwort">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Entwurf der KI, bitte am Eintrag prüfen</p>
            {k.passt ? (
              <>
                <p className="mt-1 text-slate-800">{k.antwort}</p>
                <p className="mt-2 text-xs font-medium text-slate-700">Quelle:</p>
                <ul className="mt-1 space-y-1">
                  {k.quellen.map(eintragVon).filter((e): e is HilfeEintrag => !!e).map((e) => (
                    <li key={e.id}>
                      <Link href={e.href} className="ziel text-brand-700 underline" onClick={() => setOffen(false)}>{text(e).frage}</Link>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const erste = k.quellen.map(eintragVon).find((e): e is HilfeEintrag => !!e);
                  const z = erste ? zielFuer(erste) : null;
                  return z ? (
                    <button type="button" className="btn btn-secondary mt-2 px-3 py-1.5 text-sm" onClick={() => zeigen(z)} data-testid="frag-sorrida-ki-zeigen">
                      Zeig mir wo
                    </button>
                  ) : null;
                })()}
              </>
            ) : (
              <p className="mt-1 text-slate-800">Dazu steht nichts in der Hilfe. Die KI antwortet nur aus den Hilfetexten und rät nicht.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const nachricht = (n: ChatNachricht) => {
    if (n.von === "nutzer") {
      return (
        <li key={n.id} className="flex justify-end">
          <p className="max-w-[85%] rounded-xl bg-brand-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-brand-100" data-testid="frag-sorrida-frage">
            <span className="sr-only">Ihre Frage: </span>
            {n.text}
          </p>
        </li>
      );
    }
    if (n.art === "meldung") {
      const e = eintragVon(n.eintrag);
      return (
        <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm" data-testid="frag-sorrida-meldung-antwort">
          <p className="text-slate-700">
            Auf dieser Seite steht: <q className="font-medium text-slate-900">{n.meldung}</q>
          </p>
          {e && (
            <>
              <p className="mt-1 text-slate-700">
                <span className="font-medium text-slate-900">Das bedeutet: </span>
                {text(e).antwort}
              </p>
              <p className="mt-1 text-xs text-slate-500">{ortWort}: {text(e).pfad}</p>
              {aktionen(e)}
            </>
          )}
        </li>
      );
    }
    const [erster, ...weitere] = n.eintraege.map(eintragVon).filter((e): e is HilfeEintrag => !!e);
    const pm = n.thema
      ? zielFuer({ anker: `praxismanager:${n.thema}`, href: `/praxismanager?thema=${n.thema}`, pfad: `Praxismanager → ${FRAGEN[n.thema]}` })
      : null;
    return (
      <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm" data-testid="frag-sorrida-antwort">
        {n.thema && (
          <div className="mb-2 border-b border-slate-100 pb-2" data-testid="frag-sorrida-praxismanager">
            <p className="text-slate-700">
              Die Frage <q className="font-medium text-slate-900">{FRAGEN[n.thema]}</q> beantwortet der Praxismanager aus Ihren Daten. Die Zahlen stehen dort, nicht hier im Chat.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {pm && (
                <button type="button" className="btn btn-secondary px-3 py-1.5 text-sm" onClick={() => zeigen(pm)} data-testid="frag-sorrida-zeigen">
                  Zeig mir wo
                </button>
              )}
              <Link href={`/praxismanager?thema=${n.thema}`} className="px-1 py-1.5 text-sm font-medium text-brand-700 underline" onClick={() => setOffen(false)}>
                Im Praxismanager öffnen
              </Link>
            </div>
          </div>
        )}
        {erster ? (
          eintragKarte(erster)
        ) : !n.thema ? (
          <p className="text-slate-700" data-testid="frag-sorrida-leer">
            Dazu habe ich keinen Eintrag gefunden. Versuchen Sie ein anderes Wort
            {modus === "app" ? (
              <>
                {" "}oder sehen Sie unter{" "}
                <Link href="/hilfe-praxis" className="text-brand-700 underline" onClick={() => setOffen(false)}>alle Themen</Link> durch.
              </>
            ) : (
              <>
                {" "}oder schreiben Sie uns über die{" "}
                <Link href="/hilfe" className="text-brand-700 underline" onClick={() => setOffen(false)}>Hilfe-Seite</Link>.
              </>
            )}
          </p>
        ) : null}
        {weitere.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Auch passend:</p>
            <ul className="mt-1 space-y-1">
              {weitere.map((e) => (
                <li key={e.id}>
                  <button type="button" className="ziel text-left text-sm text-brand-700 underline" onClick={() => senden({ typ: "eintrag", frage: text(e).frage, eintrag: e.id })}>
                    {text(e).frage}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {kiBereich(n)}
      </li>
    );
  };

  const leer = zustand.nachrichten.length === 0;

  return (
    <div data-frag-sorrida={modus}>
      {!offen && !menueOffen && (
        <button
          ref={knopf}
          type="button"
          onClick={oeffnen}
          aria-haspopup="dialog"
          aria-expanded={false}
          aria-label="Frag Sorrida"
          className="frag-druck rundgang-ausweichen fixed bottom-4 right-4 z-[46] flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-sm sm:px-4 font-semibold text-white shadow-lg ring-1 ring-black/5 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 print:hidden"
          data-testid="frag-sorrida-knopf"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11H9l-5 4z" />
            <path d="M9.5 9.2a2.5 2.5 0 0 1 4.8.8c0 1.5-2.3 1.7-2.3 3M12 14.6h.01" />
          </svg>
          {/* Auf dem Handy nur das Zeichen: So verdeckt der Knopf keine Bedienelemente der Seite. */}
          <span className="hidden sm:inline">Frag Sorrida</span>
        </button>
      )}

      {offen && (
        <>
          <div className="ein-schleier fixed inset-0 z-[59] bg-slate-900/20 sm:bg-transparent" onMouseDown={schliessen} aria-hidden="true" />
          <div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-titel`}
            aria-describedby={`${uid}-unter`}
            className={`ein-dialog fixed bottom-4 left-2 right-2 z-[60] flex flex-col overflow-hidden rounded-2xl border sm:left-auto sm:right-4 sm:w-[25rem] ${
              web ? "frag-fenster border-linie-stark bg-papier text-tinte shadow-[0_24px_48px_-24px_rgba(60,40,30,.55)]" : "border-slate-200 bg-white text-slate-900 shadow-2xl"
            }`}
            style={{ maxHeight: "min(40rem, calc(100dvh - var(--leiste-unten, 0px) - 2rem))" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                schliessen();
              } else fokusFalle(e, box.current);
            }}
            data-testid="frag-sorrida"
          >
            <div className={`flex justify-between gap-3 border-b ${web ? "items-center border-linie py-1.5 pl-4 pr-1.5" : "items-start border-slate-100 px-4 py-3"}`}>
              <div className="min-w-0">
                <h2 id={`${uid}-titel`} className="font-semibold text-slate-900">Frag Sorrida</h2>
                <p id={`${uid}-unter`} className="text-xs text-slate-500">
                  {modus === "website" ? "Antworten aus festen Texten zu Sorrida." : kiAktiv ? "Antworten aus festen Hilfetexten. KI nur auf Ihren Knopfdruck." : "Antworten aus festen Hilfetexten, ohne KI."}
                </p>
              </div>
              {web ? (
                <button
                  type="button"
                  onClick={schliessen}
                  aria-label="Schließen"
                  className="frag-druck grid h-11 w-11 shrink-0 place-items-center rounded-[6px] text-tinte-2 hover:bg-papier-2 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1D1D]"
                  data-testid="frag-sorrida-schliessen"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : (
                <button type="button" onClick={schliessen} className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-brand-600 hover:text-brand-700" data-testid="frag-sorrida-schliessen">
                  Schließen
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3" role="log" aria-live="polite" aria-label="Verlauf" data-testid="frag-sorrida-verlauf">
              {ladeFehler && <p className="text-sm text-red-700" role="alert" data-frag-sorrida-meldung>Die Hilfetexte konnten nicht geladen werden. Bitte laden Sie die Seite neu.</p>}
              {!paket && !ladeFehler && <p className="text-sm text-slate-500">Lädt …</p>}
              {paket && meldungen.length > 0 && (
                <div className="mb-3 space-y-2" data-testid="frag-sorrida-meldungen">
                  {meldungen.map((m) => (
                    <div key={m.eintrag.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                      <p className="text-slate-800">
                        Auf dieser Seite steht: <q className="font-medium">{m.meldung}</q>
                      </p>
                      <button type="button" className="ziel mt-1 text-sm font-medium text-brand-700 underline" onClick={() => senden({ typ: "meldung", meldung: m.meldung, eintrag: m.eintrag.id })} data-testid="frag-sorrida-meldung">
                        Was bedeutet das?
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {paket && leer && (
                <div data-testid="frag-sorrida-start">
                  <p className="text-sm font-medium text-slate-900">{modus === "website" ? "Häufige Fragen" : `Fragen zu dieser Seite${titel ? `: ${titel}` : ""}`}</p>
                  {startFragen.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {startFragen.map((e) => (
                        <li key={e.id}>
                          <button type="button" className="frag-druck w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-800 hover:border-brand-600 hover:text-brand-700" onClick={() => senden({ typ: "eintrag", frage: text(e).frage, eintrag: e.id })} data-testid="frag-sorrida-vorschlag">
                            {text(e).frage}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">Stellen Sie unten Ihre Frage, zum Beispiel „Wie lege ich einen Vorschlag an?“.</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500" data-testid="frag-sorrida-hinweis">{paket.hinweis(hinweisArt ?? (fach === "zahn" ? "zahn" : "andere"))}</p>
                </div>
              )}
              {!leer && <ul className="space-y-3">{zustand.nachrichten.map(nachricht)}</ul>}
              <div ref={verlaufEnde} />
            </div>

            <form
              className={`border-t px-4 py-3 ${web ? "border-linie" : "border-slate-100"}`}
              onSubmit={(e) => {
                e.preventDefault();
                fragen(frage);
              }}
            >
              <label htmlFor={`${uid}-feld`} className="sr-only">Ihre Frage</label>
              <div className="flex gap-2">
                <input
                  ref={feld}
                  id={`${uid}-feld`}
                  type="text"
                  className="input min-w-0 flex-1 border border-slate-300 bg-white text-base text-slate-900 sm:text-sm"
                  value={frage}
                  maxLength={FRAGE_MAX}
                  autoComplete="off"
                  enterKeyHint="send"
                  placeholder={modus === "website" ? "Ihre Frage zu Sorrida" : "Ihre Frage zur Bedienung"}
                  aria-describedby={`${uid}-hinweis`}
                  onChange={(e) => setFrage(e.target.value)}
                  data-testid="frag-sorrida-feld"
                />
                <button type="submit" className="btn btn-primary shrink-0 bg-brand-700 px-3 text-white disabled:bg-slate-100 disabled:text-slate-600 disabled:opacity-100" disabled={!paket || frage.trim().length < 2} data-testid="frag-sorrida-senden">
                  Fragen
                </button>
              </div>
              <p id={`${uid}-hinweis`} className="mt-1.5 text-xs text-slate-500">{ft("Bitte keine Patientendaten eingeben: keine Namen, keine Geburtsdaten, keine Befunde.")}</p>
              {!leer && (
                <button type="button" className="ziel mt-1 text-xs text-slate-500 underline hover:text-brand-700" onClick={() => senden({ typ: "leeren" })} data-testid="frag-sorrida-leeren">
                  Verlauf leeren
                </button>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
