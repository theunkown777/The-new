// Festzuschüsse 2027: Euro-Beträge je Befund aus data/festzuschuss-2027.json.
// Rein und ohne Abhängigkeit vom Regelwerk (die Tabelle 2026 kommt als Parameter), damit
// lib/proposals.ts, das Skript scripts/festzuschuss-2027-einlesen.ts und die Tests dieselben Prüfungen nutzen.
//
// Die Datei ist anfangs leer ({}). Dann rechnet Sorrida 2027 mit der Tabelle 2026 und den neuen Sätzen,
// und das Ergebnis heißt „voraussichtlich“. Sobald die Datei eine vollständige Tabelle enthält,
// gelten deren Beträge und das Wort entfällt.

export type Referenz = Record<string, { name: string; euro: number }>;

/** Form der Datei data/festzuschuss-2027.json, sobald sie Werte enthält. */
export interface Festzuschuss2027Datei {
  /** Woher die Beträge stammen (Titel der Veröffentlichung) */
  quelle?: string;
  /** Tag des Einlesens, JJJJ-MM-TT */
  eingelesenAm?: string;
  /** Befund-Nummer → Betrag in Euro bei 100 % */
  befunde?: Record<string, number>;
}

/** Erlaubte Abweichung eines Betrags 2027 vom Betrag 2026 (Plausibilität beim Einlesen). */
export const TOLERANZ = 0.25;

/**
 * Tabelle 2027 aus dem Inhalt der Datei. Liefert null, wenn die Datei leer ist oder die Tabelle nicht
 * vollständig ist (jeder Befund aus 2026 braucht einen Betrag größer null). Eine halbe Tabelle gilt nicht:
 * Dann bleibt es bei 2026 und „voraussichtlich“.
 */
export function tabelle2027(roh: unknown, referenz: Referenz): Record<string, number> | null {
  const befunde = (roh as Festzuschuss2027Datei | null)?.befunde;
  if (!befunde || typeof befunde !== "object") return null;
  const aus: Record<string, number> = {};
  for (const befund of Object.keys(referenz)) {
    const wert = (befunde as Record<string, unknown>)[befund];
    if (typeof wert !== "number" || !Number.isFinite(wert) || wert <= 0) return null;
    aus[befund] = Math.round(wert * 100) / 100;
  }
  return aus;
}

/** Deutsche oder englische Zahl lesen: "1.051,84", "1051,84", "1051.84", "398,39 €". */
export function euroLesen(text: string): number | null {
  let t = text.replace(/[€\s]|EUR/gi, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export interface CsvErgebnis { werte: Record<string, number>; fehler: string[] }

/**
 * CSV „Befund;Euro“ lesen. Eine Kopfzeile ist erlaubt, leere Zeilen und Zeilen mit # werden übersprungen.
 * Jede Zeile, die sich nicht lesen lässt, und jeder doppelte Befund ist ein Fehler.
 */
export function csvLesen(text: string): CsvErgebnis {
  const werte: Record<string, number> = {};
  const fehler: string[] = [];
  const zeilen = text.replace(/^﻿/, "").split(/\r?\n/);
  zeilen.forEach((zeile, i) => {
    const z = zeile.trim();
    if (!z || z.startsWith("#")) return;
    const teile = z.split(";").map((t) => t.trim().replace(/^"|"$/g, ""));
    if (i === 0 && /^befund$/i.test(teile[0] ?? "")) return;
    if (teile.length < 2) { fehler.push(`Zeile ${i + 1}: zwei Spalten erwartet (Befund;Euro)`); return; }
    const befund = teile[0];
    if (!/^\d\.\d{1,2}$/.test(befund)) { fehler.push(`Zeile ${i + 1}: „${befund}“ ist keine Befund-Nummer (z. B. 1.1)`); return; }
    const euro = euroLesen(teile[1]);
    if (euro === null || euro <= 0) { fehler.push(`Zeile ${i + 1}: Betrag „${teile[1]}“ nicht lesbar`); return; }
    if (befund in werte) { fehler.push(`Zeile ${i + 1}: Befund ${befund} steht doppelt`); return; }
    werte[befund] = euro;
  });
  return { werte, fehler };
}

/**
 * Vollständigkeit gegen die Befunde 2026 und Plausibilität: Jeder Befund aus 2026 muss vorkommen,
 * kein Betrag darf mehr als 25 % vom Betrag 2026 abweichen. Unbekannte Befunde sind ein Fehler
 * (neue Befunde brauchen erst Namen und Logik im Regelwerk).
 */
export function pruefen(werte: Record<string, number>, referenz: Referenz, toleranz = TOLERANZ): string[] {
  const fehler: string[] = [];
  for (const [befund, ref] of Object.entries(referenz)) {
    const wert = werte[befund];
    if (wert === undefined) { fehler.push(`Befund ${befund} (${ref.name}) fehlt`); continue; }
    const abweichung = (wert - ref.euro) / ref.euro;
    if (Math.abs(abweichung) > toleranz) {
      fehler.push(`Befund ${befund}: ${wert.toFixed(2)} € weicht um ${(abweichung * 100).toFixed(1)} % von 2026 (${ref.euro.toFixed(2)} €) ab, erlaubt sind ±${Math.round(toleranz * 100)} %`);
    }
  }
  for (const befund of Object.keys(werte)) if (!(befund in referenz)) fehler.push(`Befund ${befund} gibt es in der Tabelle 2026 nicht`);
  return fehler;
}

/** Inhalt der JSON-Datei aus geprüften Werten, Befunde in der Reihenfolge der Tabelle 2026. */
export function dateiInhalt(werte: Record<string, number>, referenz: Referenz, quelle: string, eingelesenAm: string): Festzuschuss2027Datei {
  return { quelle, eingelesenAm, befunde: Object.fromEntries(Object.keys(referenz).map((b) => [b, werte[b]])) };
}
