// Leistungslisten als CSV einlesen, z. B. die regionalen Gebührenordnungspositionen der eigenen KV,
// Selektiv- und Sonderverträge (HZV, DMP, Impfvereinbarungen) oder eine Liste aus der Praxissoftware.
// Format: eine Zeile je Leistung, Trennzeichen Semikolon, Komma oder Tabulator.
//   Ziffer ; Bezeichnung ; Betrag in Euro (optional) ; Punkte (optional) ; Hinweis (optional)
// Eine Kopfzeile ist erlaubt; mit Kopfzeile dürfen die Spalten in beliebiger Reihenfolge stehen.

export type CsvLeistung = { code: string; title: string; festbetragCent: number | null; punktzahl: number | null; description: string | null };
export type CsvErgebnis = { zeilen: CsvLeistung[]; fehler: { zeile: number; grund: string }[] };

const KOPF: Record<keyof CsvLeistung, RegExp> = {
  code: /^(ziffer|gop|gnr|code|nummer|nr\.?|position|symbolnummer|pseudo-?gop|leistungsziffer)$/i,
  title: /^(bezeichnung|leistung|text|titel|legende|beschreibung|kurztext|leistungsbezeichnung)$/i,
  festbetragCent: /^(betrag|euro|€|preis|eur|betrag in euro|vergütung|verguetung|honorar)$/i,
  punktzahl: /^(punkte|punktzahl|pkt\.?|bewertung)$/i,
  description: /^(hinweis|anmerkung|bemerkung|kasse|kassen|vertrag|gültig|gueltig)$/i,
};

/** Eine CSV-Zeile mit Anführungszeichen korrekt zerlegen. */
function zerlege(zeile: string, trenner: string): string[] {
  const out: string[] = [];
  let feld = "", inQ = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inQ) {
      if (c === '"' && zeile[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === trenner) { out.push(feld.trim()); feld = ""; }
    else feld += c;
  }
  out.push(feld.trim());
  return out;
}

/** "12,50 €", "1.234,56", "12.50" → Cent; leer → null; ungültig → NaN. */
export function euroInCent(s: string | undefined): number | null {
  const t = (s ?? "").replace(/€|EUR/gi, "").replace(/\s/g, "");
  if (!t) return null;
  const norm = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

export function leseLeistungenCsv(text: string, maxZeilen = 5000): CsvErgebnis {
  const roh = text.replace(/^﻿/, "").split(/\r?\n/).map((z) => z.trimEnd());
  const zeilen = roh.filter((z) => z.trim() !== "");
  const fehler: CsvErgebnis["fehler"] = [];
  if (!zeilen.length) return { zeilen: [], fehler: [{ zeile: 0, grund: "Die Liste ist leer." }] };
  const erste = zeilen[0];
  const trenner = ["\t", ";", ","].sort((a, b) => erste.split(b).length - erste.split(a).length)[0];

  // Spaltenzuordnung: aus der Kopfzeile oder Standardreihenfolge
  const kopf = zerlege(erste, trenner);
  const idx: Partial<Record<keyof CsvLeistung, number>> = {};
  kopf.forEach((k, i) => {
    for (const [feld, re] of Object.entries(KOPF) as [keyof CsvLeistung, RegExp][]) if (idx[feld] === undefined && re.test(k.trim())) idx[feld] = i;
  });
  const mitKopf = idx.code !== undefined && idx.title !== undefined;
  const spalte = mitKopf ? idx : { code: 0, title: 1, festbetragCent: 2, punktzahl: 3, description: 4 };

  const out: CsvLeistung[] = [];
  const gesehen = new Set<string>();
  zeilen.slice(mitKopf ? 1 : 0).forEach((z, i) => {
    const nr = i + (mitKopf ? 2 : 1);
    if (out.length >= maxZeilen) { if (out.length === maxZeilen) fehler.push({ zeile: nr, grund: `Mehr als ${maxZeilen} Zeilen: Rest nicht übernommen.` }); return; }
    const f = zerlege(z, trenner);
    const wert = (k: keyof CsvLeistung) => (spalte[k] !== undefined ? f[spalte[k]!] ?? "" : "");
    const code = wert("code").slice(0, 40), title = wert("title").slice(0, 300);
    if (!code || !title) { fehler.push({ zeile: nr, grund: "Ziffer oder Bezeichnung fehlt." }); return; }
    const cent = euroInCent(wert("festbetragCent"));
    if (Number.isNaN(cent)) { fehler.push({ zeile: nr, grund: `Betrag „${wert("festbetragCent")}“ ist keine Zahl.` }); return; }
    const pRoh = wert("punktzahl").replace(/\./g, "").replace(",", ".");
    const punkte = pRoh ? Math.round(Number(pRoh)) : null;
    if (punkte !== null && !Number.isFinite(punkte)) { fehler.push({ zeile: nr, grund: `Punkte „${wert("punktzahl")}“ sind keine Zahl.` }); return; }
    if (gesehen.has(code)) { fehler.push({ zeile: nr, grund: `Ziffer ${code} doppelt.` }); return; }
    gesehen.add(code);
    out.push({ code, title, festbetragCent: cent, punktzahl: punkte, description: wert("description").slice(0, 1000) || null });
  });
  return { zeilen: out, fehler };
}
