import { normWort, wortstamm } from "@/lib/anlassErkennung";

// Preisliste einlesen: Aus eingefügtem Text oder einer Text-/CSV-Datei werden Zeilen
// „Leistung … Betrag“ gelesen und über die Ähnlichkeit der Bezeichnung den vorhandenen Leistungen
// der Praxis zugeordnet. Rein regelbasiert, ohne KI. Gespeichert wird hier nichts: Das Ergebnis ist
// eine Vorschau, die die Praxis Zeile für Zeile bestätigt.

export interface Preiszeile {
  /** Zeilennummer in der Vorlage (ab 1). */
  zeile: number;
  bezeichnung: string;
  betragCent: number;
  /** „ab 60 €“: Der Betrag ist ein Mindestbetrag. */
  ab: boolean;
  /** Hinweis für die Vorschau, z. B. bei „ab“-Preisen oder Preisspannen. */
  vermerk?: string;
}

export interface PreislisteErgebnis {
  zeilen: Preiszeile[];
  /** Zeilen mit Text, aber ohne erkennbaren Betrag (z. B. Überschriften). */
  ohneBetrag: { zeile: number; text: string }[];
}

export const PREISLISTE_MAX_ZEILEN = 500;
export const VERMERK_AB = "„ab“-Preis: als Mindestbetrag gelesen. Bitte den Betrag prüfen.";
export const VERMERK_SPANNE = "Preisspanne: der untere Betrag wurde gelesen. Bitte prüfen.";

/** „1.234,50“, „85,-“, „85“, „12.50“, „1,234.50“ → Cent; nicht lesbar → null. */
export function betragInCent(roh: string): number | null {
  let s = roh.replace(/[\s ']/g, "").replace(/[–—]/g, "-");
  s = s.replace(/[.,]-+$/, ""); // „85,-“ und „85.-“
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const komma = s.lastIndexOf(",");
  const punkt = s.lastIndexOf(".");
  let ganz = s;
  let dezimal = "";
  if (komma >= 0 && punkt >= 0) {
    const trenn = Math.max(komma, punkt);
    ganz = s.slice(0, trenn);
    dezimal = s.slice(trenn + 1);
  } else if (komma >= 0) {
    const nach = s.length - komma - 1;
    // „12,5“ und „12,50“ sind Dezimalzahlen; „1,234“ (englische Tausenderschreibweise) wird nicht geraten
    if (nach <= 2) { ganz = s.slice(0, komma); dezimal = s.slice(komma + 1); }
    else return null;
  } else if (punkt >= 0) {
    const nach = s.length - punkt - 1;
    if (nach <= 2) { ganz = s.slice(0, punkt); dezimal = s.slice(punkt + 1); } // „12.50“
    else if (nach !== 3) return null; // „1.250“ ist ein Tausenderpunkt
  }
  ganz = ganz.replace(/[.,]/g, "");
  if (!/^\d{1,7}$/.test(ganz) || !/^\d{0,2}$/.test(dezimal)) return null;
  return Number(ganz) * 100 + Number(dezimal.padEnd(2, "0") || "0");
}

const ZAHL = String.raw`\d{1,3}(?:[.'  ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,](?:\d{1,2}|-{1,2}|–))?`;
const WAEHRUNG = String.raw`€|eur\b|euro\b`;
// Betrag mit Währung davor oder danach
const MIT_WAEHRUNG = new RegExp(String.raw`(?:(?:${WAEHRUNG})\s*(${ZAHL}))|(?:(${ZAHL})\s*(?:${WAEHRUNG}))`, "gi");
// Betrag am Zeilenende ohne Währung: nur mit Nachkommastellen oder klar abgesetzt (Trennzeichen, Tabulator, Punktlinie, zwei Leerzeichen)
const AM_ENDE = new RegExp(String.raw`(?:[;\t|]|\.{2,}|…|\s{2,}|:\s)\s*(${ZAHL})\s*$|\s(\d+,(?:\d{2}|-{1,2}|–))\s*$`, "i");

const saeubern = (s: string) =>
  s
    .replace(/["“”„]/g, "")
    .replace(/^[\s\-–•*·]+/, "")
    .replace(/^\(?\d{1,3}[.)]\s+/, "") // laufende Nummer „1.“ oder „12)“
    .replace(/[\s.…·_:;|\t\-–]+$/, "")
    .replace(/[\t;|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Eine Zeile lesen. null: kein Betrag erkennbar. */
export function lesePreiszeile(text: string, zeile = 1): Preiszeile | null {
  const roh = text.replace(/ /g, " ").trim();
  if (!roh) return null;

  let start = -1;
  let ende = -1;
  let zahl = "";
  const funde = [...roh.matchAll(MIT_WAEHRUNG)];
  if (funde.length) {
    // Bei mehreren Beträgen in einer Zeile („50 € bis 80 €“) zählt der erste nach der Bezeichnung.
    const f = funde.find((m) => (m.index ?? 0) > 0) ?? funde[0];
    start = f.index ?? 0;
    ende = start + f[0].length;
    zahl = f[1] ?? f[2];
  } else {
    const m = AM_ENDE.exec(roh);
    if (!m) return null;
    zahl = m[1] ?? m[2];
    start = m.index;
    ende = roh.length;
  }
  const betragCent = betragInCent(zahl);
  if (betragCent == null || betragCent > 10_000_000) return null;

  let davor = roh.slice(0, start);
  const danach = roh.slice(ende);
  let ab = false;
  let vermerk: string | undefined;
  // „ab 60 €“
  const abTreffer = /(?:^|[\s(:;|\t])ab\s*$/i.exec(davor);
  if (abTreffer) {
    ab = true;
    vermerk = VERMERK_AB;
    davor = davor.slice(0, abTreffer.index);
  }
  // „50 bis 80 €“, „50–80 €“, „von 50 bis 80 €“: Der gelesene Betrag ist dann der obere; wir nehmen den unteren.
  const spanne = new RegExp(String.raw`(?:von\s+)?(${ZAHL})\s*(?:€|eur|euro)?\s*(?:bis|-|–)\s*$`, "i").exec(davor);
  let cent = betragCent;
  if (spanne) {
    const unten = betragInCent(spanne[1]);
    if (unten != null && unten < betragCent) {
      cent = unten;
      vermerk = VERMERK_SPANNE;
      davor = davor.slice(0, spanne.index);
    }
  } else if (/^\s*(?:bis|-|–)\s*\d/.test(danach)) {
    vermerk = VERMERK_SPANNE;
  }

  let bezeichnung = saeubern(davor);
  // „60 € je Sitzung“: kurzer Zusatz hinter dem Betrag gehört zur Bezeichnung
  const zusatz = saeubern(danach.replace(/^\s*(?:bis|-|–)\s*[\d.,]+\s*(?:€|eur|euro)?/i, ""));
  if (zusatz && zusatz.length <= 40 && /\p{L}{2,}/u.test(zusatz) && !bezeichnung.toLowerCase().includes(zusatz.toLowerCase())) bezeichnung = `${bezeichnung} (${zusatz.replace(/^\(|\)$/g, "")})`;
  if (bezeichnung.length < 2 || !/\p{L}/u.test(bezeichnung)) return null;
  return { zeile, bezeichnung: bezeichnung.slice(0, 120), betragCent: cent, ab, ...(vermerk ? { vermerk } : {}) };
}

/** Text einer Preisliste lesen (eingefügt oder aus einer Text-/CSV-Datei). Kopfzeilen und Zeilen ohne Betrag werden gemeldet, nicht geraten. */
export function parsePreisliste(text: string): PreislisteErgebnis {
  const zeilen: Preiszeile[] = [];
  const ohneBetrag: PreislisteErgebnis["ohneBetrag"] = [];
  const roh = text.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < roh.length && zeilen.length < PREISLISTE_MAX_ZEILEN; i++) {
    const t = roh[i].trim();
    if (!t) continue;
    const z = lesePreiszeile(t, i + 1);
    if (z) zeilen.push(z);
    else if (ohneBetrag.length < 50 && /\p{L}{2,}/u.test(t)) ohneBetrag.push({ zeile: i + 1, text: t.slice(0, 120) });
  }
  return { zeilen, ohneBetrag };
}

// ---------------------------------------------------------------------------
// Zuordnung über die Ähnlichkeit der Bezeichnung

const OHNE_GEWICHT = new Set("und oder der die das des dem den ein eine mit bei auf fuer von vom zur zum zu im in am an als nach je pro inkl inklusive zzgl ggf z b".split(" "));

function woerter(name: string): string[] {
  return [...name.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => normWort(m[0])).filter((w) => !OHNE_GEWICHT.has(w)).map(wortstamm);
}
const zweier = (s: string) => { const out: string[] = []; for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out; };
function dice(a: string[], b: string[], gleich: (x: string, y: string) => boolean): number {
  if (!a.length || !b.length) return 0;
  const frei = [...b];
  let treffer = 0;
  for (const x of a) {
    const i = frei.findIndex((y) => gleich(x, y));
    if (i >= 0) { treffer++; frei.splice(i, 1); }
  }
  return (2 * treffer) / (a.length + b.length);
}

/** Ähnlichkeit zweier Bezeichnungen von 0 (nichts gemeinsam) bis 1 (gleich, bis auf Schreibweise und Endungen). */
export function aehnlichkeit(a: string, b: string): number {
  const wa = woerter(a);
  const wb = woerter(b);
  if (!wa.length || !wb.length) return 0;
  if (wa.join(" ") === wb.join(" ")) return 1;
  const wort = dice(wa, wb, (x, y) => x === y || (Math.min(x.length, y.length) >= 5 && (x.startsWith(y) || y.startsWith(x))));
  const zeichen = dice(zweier(wa.join("")), zweier(wb.join("")), (x, y) => x === y);
  return Math.round((0.6 * wort + 0.4 * zeichen) * 100) / 100;
}

export interface Preisziel { id: string; name: string }

export interface Preiszuordnung {
  zeile: Preiszeile;
  /** Vorhandene Leistung, zu der die Zeile passt; null = keine passt, Vorschlag: neue eigene Leistung. */
  zielId: string | null;
  aehnlichkeit: number;
  /** Weitere naheliegende Leistungen für die Auswahl in der Vorschau, beste zuerst. */
  naheliegend: { id: string; aehnlichkeit: number }[];
  vermerk?: string;
}

/** Ab dieser Ähnlichkeit wird eine vorhandene Leistung vorgeschlagen. Darunter: neue eigene Leistung. */
export const ZUORDNUNG_SCHWELLE = 0.6;

/**
 * Ordnet jede Zeile der ähnlichsten vorhandenen Leistung zu. Jede Leistung wird höchstens einer Zeile
 * vorgeschlagen (der ähnlichsten); die anderen Zeilen werden als neue eigene Leistung vorgeschlagen.
 */
export function ordnePreiseZu(zeilen: Preiszeile[], ziele: Preisziel[], schwelle = ZUORDNUNG_SCHWELLE): Preiszuordnung[] {
  const out: Preiszuordnung[] = zeilen.map((zeile) => {
    const werte = ziele.map((z) => ({ id: z.id, aehnlichkeit: aehnlichkeit(zeile.bezeichnung, z.name) })).filter((w) => w.aehnlichkeit >= 0.3).sort((p, q) => q.aehnlichkeit - p.aehnlichkeit);
    const beste = werte[0];
    const passt = beste && beste.aehnlichkeit >= schwelle;
    return { zeile, zielId: passt ? beste.id : null, aehnlichkeit: passt ? beste.aehnlichkeit : 0, naheliegend: werte.slice(0, 3), ...(zeile.vermerk ? { vermerk: zeile.vermerk } : {}) };
  });
  // Dieselbe Leistung nur einmal vorschlagen
  const vergeben = new Map<string, number>();
  out.forEach((z, i) => {
    if (!z.zielId) return;
    const alt = vergeben.get(z.zielId);
    if (alt === undefined || out[alt].aehnlichkeit < z.aehnlichkeit) vergeben.set(z.zielId, i);
  });
  const nameVon = new Map(ziele.map((z) => [z.id, z.name]));
  return out.map((z, i) => {
    if (!z.zielId || vergeben.get(z.zielId) === i) return z;
    const hinweis = `Ähnlich zu „${nameVon.get(z.zielId)}“, dort passt eine andere Zeile besser.`;
    return { ...z, zielId: null, aehnlichkeit: 0, vermerk: z.vermerk ? `${z.vermerk} ${hinweis}` : hinweis };
  });
}
