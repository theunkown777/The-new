import { normWort, wortstamm } from "@/lib/anlassErkennung";
import type { HilfeEintrag } from "@/lib/hilfeWissen/typ";
import type { MenueRechte } from "@/lib/rollen";

// Suche in der Wissenssammlung ohne KI: Die Wörter der Frage werden mit Stichwörtern, Meldungen, Frage, Menüpfad
// und Antwort der Einträge verglichen (Umlaute, Endungen und zusammengesetzte Wörter ausgeglichen).
// Seltene Wörter zählen mehr als häufige. Das Ergebnis ist vorhersehbar und verlässt den Browser nicht.

const OHNE_GEWICHT = new Set(
  ("wie wo was wer wann warum wieso weshalb welche welcher welches kann koennen ich man wir sie mir mich uns einen eine einer eines einem ein den dem das der die des ist sind war mit fuer in im an am auf aus zu zum zur und oder bei von vom " +
    "mein meine meinen meiner unser unsere sorrida bitte moechte will muss soll es gibt geht mache machen tun nicht noch auch nur dann wenn denn so da hier dort etwas mal eigentlich ueber nach vor durch als ob dass hat habe haben hatte wird werden wurde").split(" "),
);

// Fächer sagen statt „Patienten“ auch „Klienten“ oder „Kunden“ (lib/fachprofile.ts). Die Sammlung schreibt „Patienten“.
const PERSON_WORT: Record<string, string> = {
  klient: "patient", klienten: "patienten", klientin: "patientin", klientinnen: "patientinnen",
  kunde: "patient", kunden: "patienten", kundin: "patientin", kundinnen: "patientinnen",
};

function woerter(text: string): string[] {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)]
    .map((m) => normWort(m[0]))
    .map((w) => PERSON_WORT[w] ?? w)
    .filter((w) => w.length >= 2 && !OHNE_GEWICHT.has(w))
    .map(wortstamm);
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

/** Platzhalter für die Suche: Gesucht wird mit den üblichen Wörtern, angezeigt mit denen des Fachs. */
const fuerSuche = (t: string) => t.replace(/\{P\}/g, "Patienten").replace(/\{A\}/g, "Behandlung");

interface Verzeichnis { stich: string[]; meld: string[]; frage: string[]; pfad: string[]; antwort: string[] }
const verzeichnis = new WeakMap<HilfeEintrag, Verzeichnis>();
function felder(e: HilfeEintrag): Verzeichnis {
  let v = verzeichnis.get(e);
  if (!v) {
    v = {
      stich: woerter(e.stichwoerter.join(" ")),
      // Meldungen zählen wie die Frage: Wer eine Meldung einfügt, findet den passenden Eintrag.
      meld: woerter((e.meldungen ?? []).join(" ")),
      frage: woerter(fuerSuche(e.frage)),
      pfad: woerter(fuerSuche(e.pfad)),
      antwort: woerter(fuerSuche(e.antwort)),
    };
    verzeichnis.set(e, v);
  }
  return v;
}

export interface HilfeTreffer { eintrag: HilfeEintrag; punkte: number }

/** Unter diesem Wert gilt: kein passender Eintrag. */
export const HILFE_MINDESTPUNKTE = 1;
/** Mindestens dieser Anteil der Wörter der Frage muss im Eintrag vorkommen. */
export const HILFE_MINDESTANTEIL = 0.5;
/** Aufschlag für Einträge, die zur geöffneten Seite gehören. */
export const SEITEN_BONUS = 1.15;

/** Was die Suche über das Konto und die Seite weiß. Alles optional. */
export interface HilfeKontext {
  /** "zahn" | "andere"; ohne Angabe: alle Einträge */
  fach?: "zahn" | "andere";
  /** Rechte des Kontos (lib/rollen.ts); ohne Angabe: keine Einschränkung */
  rechte?: MenueRechte;
  /** Pfad der geöffneten Seite (z. B. /patients/abc); nur für den Seitenbonus */
  seite?: string;
}

/** Einträge, die für dieses Fach und dieses Konto gelten. */
export function sichtbareHilfe(eintraege: HilfeEintrag[], k: Pick<HilfeKontext, "fach" | "rechte"> = {}): HilfeEintrag[] {
  return eintraege.filter((e) => (!e.nur || !k.fach || e.nur === k.fach) && (!e.recht || !k.rechte || k.rechte[e.recht]));
}

/** Passt eine Seite zum Muster eines Eintrags? Dynamische Teile ([id]) passen auf jeden Wert. */
export function seitePasst(pfad: string, muster: string): boolean {
  const p = pfad.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const m = muster.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const re = new RegExp(`^${m.split("/").map((t) => (/^\[[^\]]+\]$/.test(t) ? "[^/]+" : t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`);
  return re.test(p);
}
const gehoertZurSeite = (e: HilfeEintrag, pfad: string) => (e.seiten ?? []).some((m) => seitePasst(pfad, m));

/**
 * Die besten Einträge zur Frage, beste zuerst. Filter nach Fach und Rechten; Einträge zur geöffneten Seite
 * bekommen einen kleinen Aufschlag.
 */
export function sucheHilfe(frage: string, eintraege: HilfeEintrag[], opt: HilfeKontext & { anzahl?: number } = {}): HilfeTreffer[] {
  const liste = sichtbareHilfe(eintraege, opt);
  const gesucht = [...new Set(woerter(frage.slice(0, 500)))];
  if (gesucht.length === 0 || liste.length === 0) return [];
  const treffer = liste.map((eintrag) => {
    const f = felder(eintrag);
    const beste = (feld: string[], w: string) => feld.reduce((m, x) => Math.max(m, passt(x, w)), 0);
    const je = gesucht.map((w) => Math.max(3 * beste(f.stich, w), 2 * beste(f.meld, w), 2 * beste(f.frage, w), 2 * beste(f.pfad, w), beste(f.antwort, w)));
    return { eintrag, je };
  });
  // Seltene Wörter zählen mehr: Gewicht je Wort nach der Zahl der Einträge, in denen es vorkommt.
  const gewicht = gesucht.map((_, i) => {
    const n = treffer.filter((t) => t.je[i] > 0).length;
    return n === 0 ? 0 : Math.log(1 + liste.length / n) / Math.log(1 + liste.length);
  });
  return treffer
    .map((t) => {
      const roh = t.je.reduce((s, p, i) => s + p * gewicht[i], 0);
      const bonus = opt.seite && gehoertZurSeite(t.eintrag, opt.seite) ? SEITEN_BONUS : 1;
      return { eintrag: t.eintrag, anteil: t.je.filter((p) => p > 0).length / gesucht.length, roh, punkte: Math.round(roh * bonus * 100) / 100 };
    })
    .filter((t) => t.roh >= HILFE_MINDESTPUNKTE && t.anteil >= HILFE_MINDESTANTEIL)
    .map(({ eintrag, punkte }) => ({ eintrag, punkte }))
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, opt.anzahl ?? 3);
}

const ART_REIHE: Record<string, number> = { bedienung: 0, praxismanager: 1, website: 2, fehler: 3 };

/** „Fragen zu dieser Seite“: Einträge, die zur geöffneten Seite gehören, ohne Eingabe. Bedienung zuerst. */
export function fragenZurSeite(pfad: string, eintraege: HilfeEintrag[], opt: Omit<HilfeKontext, "seite"> & { anzahl?: number } = {}): HilfeEintrag[] {
  return sichtbareHilfe(eintraege, opt)
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => gehoertZurSeite(e, pfad))
    .sort((a, b) => (ART_REIHE[a.e.art ?? "bedienung"] ?? 0) - (ART_REIHE[b.e.art ?? "bedienung"] ?? 0) || a.i - b.i)
    .slice(0, opt.anzahl ?? 4)
    .map(({ e }) => e);
}

/** Text für den Vergleich von Meldungen: klein, Leerraum zusammengefasst. */
const meldungNorm = (t: string) => t.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();

/** Ab dieser Länge wird eine Meldung auch im übrigen Text der Seite erkannt (kürzere nur in Meldungsfeldern). */
export const MELDUNG_MINDESTLAENGE_SEITE = 30;

export interface ErkannteMeldung { meldung: string; eintrag: HilfeEintrag }

/**
 * Welche bekannten Meldungen stehen gerade auf der Seite? `alarme`: Texte aus Meldungsfeldern (role="alert"),
 * `seite`: übriger Text der Seite. Läuft nur im Browser; zurück kommt nur der Text aus der Wissenssammlung,
 * nie der Text der Seite selbst (darin könnten Namen stehen).
 */
export function meldungenErkennen(texte: { alarme: string[]; seite?: string }, eintraege: HilfeEintrag[], opt: Pick<HilfeKontext, "fach" | "rechte"> & { anzahl?: number } = {}): ErkannteMeldung[] {
  const alarme = texte.alarme.map(meldungNorm).filter(Boolean);
  const seite = meldungNorm(texte.seite ?? "");
  const gefunden: ErkannteMeldung[] = [];
  for (const e of sichtbareHilfe(eintraege, opt)) {
    for (const m of e.meldungen ?? []) {
      const n = meldungNorm(m);
      if (n.length < 4) continue;
      const imAlarm = alarme.some((a) => a.includes(n));
      const aufSeite = n.length >= MELDUNG_MINDESTLAENGE_SEITE && seite.includes(n);
      if ((imAlarm || aufSeite) && !gefunden.some((g) => g.eintrag.id === e.id)) gefunden.push({ meldung: m.trim(), eintrag: e });
    }
  }
  return gefunden.slice(0, opt.anzahl ?? 3);
}

/** Wörter des Fachs für die Anzeige: {P} = „Patienten“ oder das Wort des Fachs, {A} = „Behandlung“ oder das Wort des Fachs. */
export interface FachWoerter { personPl?: string; abschluss?: string }

/** Eintrag mit den Wörtern des Fachs (Platzhalter aufgelöst), wie lib/suche.ts die Seitentitel auflöst. */
export function hilfeText<T extends Pick<HilfeEintrag, "frage" | "antwort" | "pfad">>(e: T, w: FachWoerter = {}): T {
  const ersetzen = (t: string) => t.replace(/\{P\}/g, w.personPl ?? "Patienten").replace(/\{A\}/g, w.abschluss ?? "Behandlung");
  return { ...e, frage: ersetzen(e.frage), antwort: ersetzen(e.antwort), pfad: ersetzen(e.pfad) };
}
