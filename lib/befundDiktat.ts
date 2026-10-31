import { FINDINGS, GLOBAL_FINDINGS, isValidTooth, type FindingCode, type GlobalCode } from "@/lib/dentalFindings";

// Befund-Diktat: Aus gesprochenem oder getipptem Text wie
// "16 Karies MOD, 25 Karies klein, 36 fehlt, 46 Füllung insuffizient, Zahnstein"
// wird das Zahnschema befüllt. Bewusst regelbasiert statt KI: Das Ergebnis
// ist vorhersehbar, sofort da, kostet nichts und verlässt den Browser nicht.
//
// Konvention: Zahn, dann Befund ("16 Karies groß"). Innerhalb eines durch
// Komma/Punkt getrennten Abschnitts geht auch Befund, dann Zahn
// ("Karies groß an 16 und 17").

export type DiktatCode = FindingCode | "ok";

export interface DiktatResult {
  teeth: Partial<Record<string, DiktatCode>>;
  globals: GlobalCode[];
  /** Zahnnummern ohne zuordenbaren Befund. */
  unassigned: number[];
}

const UNITS: Record<string, number> = { ein: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8 };
const TEENS: Record<string, number> = { elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18 };
const TENS: Record<string, number> = { zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40 };

/** Deutsche Zahlwörter für Zahnnummern ("sechsunddreißig", "eins sechs") in Ziffern umschreiben. */
export function normalizeNumbers(text: string): string {
  let s = text.toLowerCase().replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue(?!ll)/g, "ü");
  const unit = Object.keys(UNITS).sort((a, b) => b.length - a.length).join("|");
  s = s.replace(new RegExp(`\\b(${unit})und(${Object.keys(TENS).join("|")})\\b`, "g"), (_m, u, t) => String(TENS[t] + UNITS[u]));
  s = s.replace(new RegExp(`\\b(${Object.keys(TEENS).join("|")})\\b`, "g"), (m) => String(TEENS[m]));
  // "eins sechs" / "zahn vier sechs" -> 16 / 46 (nur Quadrant 1–4 und Position 1–8)
  s = s.replace(new RegExp(`\\b(eins|zwei|drei|vier)\\s+(${unit})\\b`, "g"), (m, q, p) => {
    const n = UNITS[q] * 10 + UNITS[p];
    return isValidTooth(n) ? String(n) : m;
  });
  return s;
}

type Rule = { code: DiktatCode | GlobalCode; global?: boolean; re: RegExp };

const DEFEKT = "(?:insuffizient|defekt|kaputt|undicht|frakturiert|gebrochen|abgebrochen|locker|alt)";
const RULES: Rule[] = [
  { code: "ok", re: /kariesfrei|ohne befund|\bo\.\s?b\.|unauffällig|\bgesund\b|\bintakt\b/g },
  { code: "fuellung_defekt", re: new RegExp(`${DEFEKT}\\w*\\s+(?:alte\\s+)?füllung|füllung\\s+(?:ist\\s+)?${DEFEKT}\\w*|füllung\\s+(?:verloren|raus|herausgefallen)|sekundärkaries`, "g") },
  { code: "karies_gross", re: /(?:tiefe|große|grosse|ausgedehnte)\s+karies|karies\s+(?:groß|gross|tief|ausgedehnt|mehrflächig|(?:ab\s+)?(?:3|drei|4|vier|5|fünf)\s+flächen)/g },
  { code: "karies_klein", re: /karies\s+(?:klein|initial|oberflächlich|(?:1|2|ein|eine|zwei)\s+fläche\w*)|(?:kleine|initiale)\s+karies/g },
  // Karies mit Flächenangabe (MOD, OD, …): ab drei Flächen groß.
  { code: "karies_gross", re: /karies\s+[modbvlp]{3,5}\b/g },
  { code: "karies_klein", re: /karies\s+[modbvlp]{1,2}\b/g },
  { code: "karies_klein", re: /\bkaries\b|\bkariös\w*/g },
  { code: "wurzel", re: /wurzelbehandlung|wurzelkanal|pulpitis|nerv\s+(?:ist\s+)?entzündet|entzündete[rn]?\s+nerv|\bdevital|apikale?\b|\bwurzel\b|\bwkb\b/g },
  { code: "zerstoert", re: /zerstört|zerstoert|krone\s+(?:nötig|notwendig)|überkronen|frakturiert|abgebrochen|tief\s+zerstört/g },
  { code: "fehlt", re: /\bfehlt\b|\bfehlen\b|fehlend\w*|\blücke\b|extrahiert|nicht\s+angelegt|gezogen/g },
  { code: "fissur", re: /fissur\w*|versiegel\w*/g },
  { code: "zahnstein", global: true, re: /zahnstein|beläge|belag|konkrement\w*/g },
  { code: "psi", global: true, re: /psi\s*(?:code\s*)?(?:3|4|drei|vier)|parodontitis|\bpa\b|zahnfleischtaschen|taschentiefe\w*/g },
  { code: "bruxismus", global: true, re: /knirsch\w*|bruxismus|\bpressen\b|presst|schlifffacette\w*/g },
  { code: "raucher", global: true, re: /raucher\w*|\braucht\b/g },
  { code: "bleaching", global: true, re: /bleaching|aufhellen|aufhellung|hellere zähne/g },
];

type Event =
  | { kind: "tooth"; n: number; start: number; end: number }
  | { kind: "finding"; code: DiktatCode; start: number; end: number }
  | { kind: "global"; code: GlobalCode; start: number; end: number }
  | { kind: "break"; start: number; end: number };

export function parseBefundDiktat(text: string): DiktatResult {
  const s = normalizeNumbers(text);
  const raw: Event[] = [];
  for (const r of RULES) {
    for (const m of s.matchAll(r.re)) {
      const start = m.index ?? 0;
      raw.push(
        r.global
          ? { kind: "global", code: r.code as GlobalCode, start, end: start + m[0].length }
          : { kind: "finding", code: r.code as DiktatCode, start, end: start + m[0].length },
      );
    }
  }
  // Längster Treffer gewinnt bei Überschneidung ("kariesfrei" vor "karies").
  raw.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const words: Event[] = [];
  for (const e of raw) {
    if (!words.some((k) => e.start < k.end && k.start < e.end)) words.push(e);
  }
  const events: Event[] = [...words];
  for (const m of s.matchAll(/(?<!\d[,.]?)\b([1-4][1-8])\b(?![,.]?\d|\s*(?:%|€|euro|prozent|jahre|flächen|mm))/g)) {
    const start = m.index ?? 0;
    if (!words.some((k) => start >= k.start && start < k.end)) events.push({ kind: "tooth", n: Number(m[1]), start, end: start + 2 });
  }
  for (const m of s.matchAll(/[,;.\n]|\bdann\b|\bdanach\b/g)) {
    const start = m.index ?? 0;
    // Punkt in "o. b." ist kein Satzende.
    if (!words.some((k) => start >= k.start && start < k.end)) events.push({ kind: "break", start, end: start + m[0].length });
  }
  events.sort((a, b) => a.start - b.start);

  const teeth: DiktatResult["teeth"] = {};
  const globals = new Set<GlobalCode>();
  let pending: number[] = [];
  const unassigned: number[] = [];
  // Befund ohne vorangestellten Zahn gilt für die folgenden Zähne desselben Abschnitts.
  let leading: DiktatCode | null = null;

  for (const [i, e] of events.entries()) {
    // Komma zwischen zwei Zahnnummern ist eine Aufzählung ("14, 15 fehlen").
    if (e.kind === "break" && events[i - 1]?.kind === "tooth" && events[i + 1]?.kind === "tooth" && !/[.\n]/.test(s.slice(e.start, e.end))) continue;
    if (e.kind === "break") {
      if (leading === null) unassigned.push(...pending);
      pending = [];
      leading = null;
    } else if (e.kind === "tooth") {
      if (leading) teeth[String(e.n)] = leading;
      else pending.push(e.n);
    } else if (e.kind === "finding") {
      if (pending.length) {
        for (const n of pending) teeth[String(n)] = e.code;
        pending = [];
        leading = null;
      } else {
        leading = e.code;
      }
    } else {
      globals.add(e.code);
    }
  }
  if (leading === null) unassigned.push(...pending);
  return { teeth, globals: [...globals], unassigned: unassigned.filter((n) => !(String(n) in teeth)) };
}

/** Kurzbeschreibung für die Vorschau, z. B. "16 Karies, ab 3 Flächen". */
export function describeDiktat(r: DiktatResult): string[] {
  const out = Object.entries(r.teeth)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([n, c]) => `${n}: ${c === "ok" ? "ohne Befund" : FINDINGS[c as FindingCode]}`);
  for (const g of r.globals) out.push(GLOBAL_FINDINGS[g]);
  return out;
}
