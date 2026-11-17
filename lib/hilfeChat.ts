// Chat „Frag Sorrida“: Zustand und Entscheidungen als reine Funktionen (components/FragSorrida.tsx zeigt nur an).
// Der Verlauf lebt nur im Zustand von React: kein localStorage, kein sessionStorage, nichts auf dem Server.
// Nach dem Schließen des Browsers ist er weg.

import type { PmThema } from "@/lib/hilfeAnker";

/** Höchstens so viele Nachrichten stehen im Verlauf; ältere fallen vorne weg. */
export const CHAT_MAX = 20;
/** Höchstens so viele frühere Fragen gehen als Kontext an die KI (ohne Antworten). */
export const VERLAUF_KI = 3;
/** Höchstlänge einer Frage. */
export const FRAGE_MAX = 500;

export type KiStand = { art: "laeuft" } | { art: "antwort"; passt: boolean; antwort: string; quellen: string[] } | { art: "fehler"; text: string };

export type ChatNachricht =
  | { id: number; von: "nutzer"; text: string }
  /** Antwort aus dem Wissen: Kennungen der Einträge, bester zuerst. Leer = nichts gefunden. */
  | { id: number; von: "sorrida"; art: "hilfe"; frage: string; eintraege: string[]; thema?: PmThema; ki?: KiStand }
  /** Eine Meldung, die gerade auf der Seite steht, mit dem Eintrag, der sie erklärt. */
  | { id: number; von: "sorrida"; art: "meldung"; meldung: string; eintrag: string };

export interface ChatZustand { nachrichten: ChatNachricht[]; naechsteId: number }
export const CHAT_START: ChatZustand = { nachrichten: [], naechsteId: 1 };

export type ChatEreignis =
  | { typ: "frage"; text: string; eintraege: string[]; thema?: PmThema | null }
  | { typ: "meldung"; meldung: string; eintrag: string }
  /** Ein weiterer Eintrag wird als eigene Antwort gezeigt (z. B. „Auch passend“). */
  | { typ: "eintrag"; frage: string; eintrag: string }
  | { typ: "ki-start"; zu: number }
  | { typ: "ki-antwort"; zu: number; passt: boolean; antwort: string; quellen: string[] }
  | { typ: "ki-fehler"; zu: number; text: string }
  | { typ: "leeren" };

const kuerzen = (n: ChatNachricht[]) => (n.length > CHAT_MAX ? n.slice(n.length - CHAT_MAX) : n);

/** Ein Schritt im Chat. Reine Funktion: gleicher Zustand und gleiches Ereignis ergeben dasselbe. */
export function chatSchritt(z: ChatZustand, e: ChatEreignis): ChatZustand {
  switch (e.typ) {
    case "frage": {
      const text = e.text.trim().slice(0, FRAGE_MAX);
      if (!text) return z;
      const frage: ChatNachricht = { id: z.naechsteId, von: "nutzer", text };
      const antwort: ChatNachricht = { id: z.naechsteId + 1, von: "sorrida", art: "hilfe", frage: text, eintraege: e.eintraege, ...(e.thema ? { thema: e.thema } : {}) };
      return { nachrichten: kuerzen([...z.nachrichten, frage, antwort]), naechsteId: z.naechsteId + 2 };
    }
    case "meldung": {
      if (z.nachrichten.some((n) => n.von === "sorrida" && n.art === "meldung" && n.eintrag === e.eintrag)) return z;
      const n: ChatNachricht = { id: z.naechsteId, von: "sorrida", art: "meldung", meldung: e.meldung, eintrag: e.eintrag };
      return { nachrichten: kuerzen([...z.nachrichten, n]), naechsteId: z.naechsteId + 1 };
    }
    case "eintrag": {
      const n: ChatNachricht = { id: z.naechsteId, von: "sorrida", art: "hilfe", frage: e.frage, eintraege: [e.eintrag] };
      return { nachrichten: kuerzen([...z.nachrichten, n]), naechsteId: z.naechsteId + 1 };
    }
    case "ki-start":
    case "ki-antwort":
    case "ki-fehler": {
      const ki: KiStand = e.typ === "ki-start" ? { art: "laeuft" } : e.typ === "ki-antwort" ? { art: "antwort", passt: e.passt, antwort: e.antwort, quellen: e.quellen } : { art: "fehler", text: e.text };
      return { ...z, nachrichten: z.nachrichten.map((n) => (n.id === e.zu && n.von === "sorrida" && n.art === "hilfe" ? { ...n, ki } : n)) };
    }
    case "leeren":
      return { nachrichten: [], naechsteId: z.naechsteId };
  }
}

/** Die letzten Fragen vor der Antwort `zu` (ohne Antworten), für den Kontext der KI. */
export function frueheFragen(z: ChatZustand, zu: number, anzahl = VERLAUF_KI): string[] {
  const i = z.nachrichten.findIndex((n) => n.id === zu);
  const davor = (i < 0 ? z.nachrichten : z.nachrichten.slice(0, i)).filter((n): n is Extract<ChatNachricht, { von: "nutzer" }> => n.von === "nutzer");
  // Die letzte Nutzerfrage vor der Antwort ist die Frage selbst; sie geht getrennt mit.
  return davor.slice(0, -1).slice(-anzahl).map((n) => n.text);
}

/** Der Knopf „Mit KI beantworten“ erscheint nur bei eingeschalteten KI-Hilfen, je Frage, nie automatisch. */
export const kiKnopfZeigen = (n: ChatNachricht, kiAktiv: boolean): boolean => kiAktiv && n.von === "sorrida" && n.art === "hilfe" && n.frage.trim().length >= 3 && n.ki?.art !== "laeuft" && n.ki?.art !== "antwort";

// ------------------------------------------------------------ Praxismanager-Weiche

/**
 * Freie Frage einem Thema des Praxismanagers zuordnen. Bewusst enger als themaFuerFrage in lib/praxisManager.ts:
 * Dort ist die Frage schon im Praxismanager, hier muss der Chat Fragen zu Zahlen sicher von Fragen zur Bedienung trennen.
 */
const PM_STICHWORTE: [PmThema, RegExp][] = [
  ["abrechnung", /abgerechnet|nicht in rechnung|leistung(en)? (fehl|vergessen)/i],
  ["termine", /termin|kalender|auslastung|frei(e|er)? (slot|platz)/i],
  ["berichte", /bericht|freigab|arztbrief/i],
  ["vorsorge", /vorsorge|recall|prophylaxe/i],
  ["umsatz", /umsatz|einnahm|verdien|geld (rein|eingegangen)/i],
  ["rechnungen", /rechnung|mahn|überfällig|ueberfaellig|bezahlt|offene posten/i],
  ["engpaesse", /engpass|engpässe|hakt|liegen geblieben|stau|klemmt|was fehlt|zu tun/i],
];

/** Fragt jemand nach den eigenen Zahlen („Welche Rechnungen sind offen?“) statt nach der Bedienung („Wo sehe ich …“)? */
const DATENFRAGE = /^\s*(welche[rsn]?\b|wer\b|wie ?viele?\b|wie läuft|wie laeuft|wie voll|wo hakt|was ist (noch )?(nicht|offen|liegen|heute|überfällig)|was steht (heute|an)|was fehlt|was muss ich heute|gibt es (noch )?offene|sind (noch )?.{0,30}offen|haben wir|habe ich (noch )?offene)/i;
/** „Was fehlt mir noch bei der Einrichtung?“ fragt nach der Liste „Ihre Praxis einrichten“, nicht nach Engpässen. */
const EINRICHTUNG = /einricht|eingerichtet|einstellung|konto|passwort|zwei-faktor/i;
const BEDIENFRAGE = /^\s*(wie (lege|trage|kann|mache|schalte|richte|finde|bekomme|ändere|aendere|erstelle|schicke|sende|storniere|exportiere|gebe|lade|verbinde|nutze)|wo (finde|sehe|trage|lege|ändere|aendere|stelle|kann)|warum|was bedeutet|was heißt|was heisst|was ist der|was ist die|was ist das)/i;

/**
 * Weiche: Geht es um die eigenen Zahlen der Praxis, führt Frag Sorrida zum passenden Thema im Praxismanager
 * (/praxismanager?thema=…). In den Chat schreibt es dabei keine Zahlen. Gibt das Thema zurück oder null.
 */
export function praxismanagerThema(frage: string, opt: { analyse?: boolean } = {}): PmThema | null {
  const f = frage.trim();
  if (!DATENFRAGE.test(f) || BEDIENFRAGE.test(f) || EINRICHTUNG.test(f)) return null;
  for (const [t, re] of PM_STICHWORTE) if (re.test(f)) return t === "umsatz" && opt.analyse === false ? null : t;
  return null;
}
