// Bankabgleich: Kontoauszug einlesen (CAMT.053 als XML, wie ihn jede
// deutsche Bank im Online-Banking anbietet, oder CSV) und Zahlungseingänge
// offenen Rechnungen zuordnen. Sorrida liest nur die Datei, die die Praxis
// hochlädt; es gibt keinen Zugriff auf das Konto.

export interface Buchung {
  datum: Date;
  betragCent: number;
  /** true = Gutschrift (Eingang) */
  eingang: boolean;
  zweck: string;
  name: string;
}

const unescapeXml = (s: string) => s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`))?.[1];
const alle = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "g"))].map((m) => m[1]);

/** CAMT.053 (ISO 20022) – einzelne Buchungen (Ntry) mit Betrag, Richtung, Datum, Verwendungszweck, Gegenpartei. */
export function parseCamt(xml: string): Buchung[] {
  return alle(xml, "Ntry").map((n) => {
    const betrag = Number((tag(n, "Amt") ?? "0").trim());
    const eingang = (tag(n, "CdtDbtInd") ?? "").trim() === "CRDT";
    const datum = (tag(tag(n, "BookgDt") ?? "", "Dt") ?? tag(tag(n, "ValDt") ?? "", "Dt") ?? "").trim();
    const zweck = alle(n, "Ustrd").map((u) => unescapeXml(u.trim())).join(" ");
    const partei = eingang ? tag(n, "Dbtr") : tag(n, "Cdtr");
    const name = unescapeXml((partei && tag(partei, "Nm")) ?? "").trim();
    return { datum: new Date(datum || Date.now()), betragCent: Math.round(betrag * 100), eingang, zweck, name };
  });
}

const zahl = (s: string) => {
  const t = s.replace(/[€\s"]/g, "");
  // Deutsch "1.234,56" oder englisch "1234.56"
  const n = /,\d{1,2}$/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const datumDe = (s: string) => {
  const m = s.trim().replace(/"/g, "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) return new Date(Number(m[3].length === 2 ? "20" + m[3] : m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
};

function zeilen(text: string, trenn: string): string[][] {
  const out: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const felder: string[] = [];
    let cur = "", q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === trenn && !q) { felder.push(cur); cur = ""; }
      else cur += ch;
    }
    felder.push(cur);
    out.push(felder.map((f) => f.trim()));
  }
  return out;
}

/** CSV-Export deutscher Banken: Kopfzeile mit Buchungstag, Verwendungszweck und Betrag wird gesucht, Vorspann übersprungen. */
export function parseCsv(text: string): Buchung[] {
  const trenn = (text.match(/;/g)?.length ?? 0) >= (text.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = zeilen(text.replace(/^﻿/, ""), trenn);
  const kopf = rows.findIndex((r) => r.some((c) => /betrag/i.test(c)) && r.some((c) => /verwendungszweck|buchungstext|zweck/i.test(c)));
  if (kopf < 0) return [];
  const h = rows[kopf].map((c) => c.toLowerCase());
  const col = (re: RegExp) => h.findIndex((c) => re.test(c));
  const iDatum = col(/buchungstag|buchungsdatum|datum|valuta/);
  const iZweck = col(/verwendungszweck/) >= 0 ? col(/verwendungszweck/) : col(/buchungstext|zweck/);
  const iBetrag = col(/^betrag|betrag \(eur\)|betrag/);
  const iName = col(/auftraggeber|zahlungspflichtige|begünstigter|name|empfänger/);
  const iSH = col(/^soll\/haben$|^s\/h$/);
  return rows.slice(kopf + 1).flatMap((r) => {
    const b = zahl(r[iBetrag] ?? "");
    const d = datumDe(r[iDatum] ?? "");
    if (!Number.isFinite(b) || !d) return [];
    const soll = iSH >= 0 && /^s/i.test(r[iSH] ?? "");
    const betrag = soll ? -Math.abs(b) : b;
    return [{ datum: d, betragCent: Math.round(Math.abs(betrag) * 100), eingang: betrag > 0, zweck: r[iZweck] ?? "", name: iName >= 0 ? r[iName] ?? "" : "" }];
  });
}

export function parseKontoauszug(text: string): Buchung[] {
  return /<(\w+:)?Document[\s>]|<(\w+:)?BkToCstmrStmt/.test(text) ? parseCamt(text) : parseCsv(text);
}

export interface OffeneRechnung {
  id: string;
  number: string;
  amountCent: number;
  lastName: string;
  firstName: string;
}

export interface Treffer {
  buchung: Buchung;
  rechnung: OffeneRechnung;
  /** sicher: Nummer und Betrag stimmen; abweichend: Nummer stimmt, Betrag nicht; vermutlich: kein Nummernbezug, aber Betrag und Name. */
  guete: "sicher" | "abweichend" | "vermutlich";
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

/** Ordnet Gutschriften offenen Rechnungen zu. Jede Rechnung höchstens einmal. */
export function abgleichen(buchungen: Buchung[], rechnungen: OffeneRechnung[]): { treffer: Treffer[]; ohneZuordnung: Buchung[] } {
  const frei = new Map(rechnungen.map((r) => [r.id, r]));
  const treffer: Treffer[] = [];
  const ohne: Buchung[] = [];
  for (const b of buchungen.filter((x) => x.eingang)) {
    const text = norm(`${b.zweck} ${b.name}`);
    const kompakt = text.replace(/[\s-]/g, "");
    let t: Treffer | null = null;
    for (const r of frei.values()) {
      const nr = r.number.toLowerCase();
      if (text.includes(nr) || kompakt.includes(nr.replace(/-/g, ""))) {
        t = { buchung: b, rechnung: r, guete: r.amountCent === b.betragCent ? "sicher" : "abweichend" };
        break;
      }
    }
    if (!t) {
      const kandidaten = [...frei.values()].filter((r) => r.amountCent === b.betragCent && text.includes(norm(r.lastName)));
      if (kandidaten.length === 1) t = { buchung: b, rechnung: kandidaten[0], guete: "vermutlich" };
    }
    if (t) { treffer.push(t); frei.delete(t.rechnung.id); } else ohne.push(b);
  }
  return { treffer, ohneZuordnung: ohne };
}
