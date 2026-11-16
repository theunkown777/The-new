import { normWort, wortstamm } from "@/lib/anlassErkennung";
import type { HilfeEintrag } from "@/lib/hilfeWissen";

// Suche in der Wissenssammlung ohne KI: Die Wörter der Frage werden mit Stichwörtern, Frage, Menüpfad
// und Antwort der Einträge verglichen (Umlaute, Endungen und zusammengesetzte Wörter ausgeglichen).
// Seltene Wörter zählen mehr als häufige. Das Ergebnis ist vorhersehbar und verlässt den Browser nicht.

const OHNE_GEWICHT = new Set(
  ("wie wo was wer wann warum wieso weshalb welche welcher welches kann koennen ich man wir sie mir mich uns einen eine einer eines einem ein den dem das der die des ist sind war mit fuer in im an am auf aus zu zum zur und oder bei von vom " +
    "mein meine meinen meiner unser unsere sorrida bitte moechte will muss soll es gibt geht mache machen tun nicht noch auch nur dann wenn denn so da hier dort etwas mal eigentlich ueber nach vor durch als ob dass hat habe haben hatte wird werden wurde").split(" "),
);

function woerter(text: string): string[] {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => normWort(m[0])).filter((w) => w.length >= 2 && !OHNE_GEWICHT.has(w)).map(wortstamm);
}

/** Wie gut passt ein Wort des Eintrags (a) zum gesuchten Wort (b)? 1 = gleich, 0,6 = Wortanfang oder Wortteil, 0 = nicht. */
function passt(a: string, b: string): number {
  if (a === b) return 1;
  const [kurz, lang] = a.length <= b.length ? [a, b] : [b, a];
  // gleicher Wortanfang: ab fünf Buchstaben immer, bei kurzen Wörtern nur mit kurzer Endung („neu“ und „neuen“)
  if (lang.startsWith(kurz) && (kurz.length >= 5 || (kurz.length >= 3 && lang.length - kurz.length <= 2))) return 0.6;
  // zusammengesetztes Wort im Eintrag enthält das gesuchte Wort („Patientenliste“ und „Liste“)
  return b.length >= 5 && a.length > b.length && a.includes(b) ? 0.6 : 0;
}

interface Verzeichnis { stich: string[]; frage: string[]; pfad: string[]; antwort: string[] }
const verzeichnis = new WeakMap<HilfeEintrag, Verzeichnis>();
function felder(e: HilfeEintrag): Verzeichnis {
  let v = verzeichnis.get(e);
  if (!v) {
    v = { stich: woerter(e.stichwoerter.join(" ")), frage: woerter(e.frage), pfad: woerter(e.pfad), antwort: woerter(e.antwort) };
    verzeichnis.set(e, v);
  }
  return v;
}

export interface HilfeTreffer { eintrag: HilfeEintrag; punkte: number }

/** Unter diesem Wert gilt: kein passender Eintrag. */
export const HILFE_MINDESTPUNKTE = 1;
/** Mindestens dieser Anteil der Wörter der Frage muss im Eintrag vorkommen. */
export const HILFE_MINDESTANTEIL = 0.5;

/**
 * Die besten Einträge zur Frage, beste zuerst. `fach` blendet Einträge aus, die nur für Zahnarztpraxen
 * bzw. nur für die übrigen Fächer gelten ("zahn" | "andere"; ohne Angabe: alle).
 */
export function sucheHilfe(frage: string, eintraege: HilfeEintrag[], opt: { anzahl?: number; fach?: "zahn" | "andere" } = {}): HilfeTreffer[] {
  const liste = eintraege.filter((e) => !e.nur || !opt.fach || e.nur === opt.fach);
  const gesucht = [...new Set(woerter(frage.slice(0, 500)))];
  if (gesucht.length === 0 || liste.length === 0) return [];
  const treffer = liste.map((eintrag) => {
    const f = felder(eintrag);
    const beste = (feld: string[], w: string) => feld.reduce((m, x) => Math.max(m, passt(x, w)), 0);
    const je = gesucht.map((w) => Math.max(3 * beste(f.stich, w), 2 * beste(f.frage, w), 2 * beste(f.pfad, w), beste(f.antwort, w)));
    return { eintrag, je };
  });
  // Seltene Wörter zählen mehr: Gewicht je Wort nach der Zahl der Einträge, in denen es vorkommt.
  const gewicht = gesucht.map((_, i) => {
    const n = treffer.filter((t) => t.je[i] > 0).length;
    return n === 0 ? 0 : Math.log(1 + liste.length / n) / Math.log(1 + liste.length);
  });
  return treffer
    .map((t) => ({ eintrag: t.eintrag, anteil: t.je.filter((p) => p > 0).length / gesucht.length, punkte: Math.round(t.je.reduce((s, p, i) => s + p * gewicht[i], 0) * 100) / 100 }))
    .filter((t) => t.punkte >= HILFE_MINDESTPUNKTE && t.anteil >= HILFE_MINDESTANTEIL)
    .map(({ eintrag, punkte }) => ({ eintrag, punkte }))
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, opt.anzahl ?? 3);
}
