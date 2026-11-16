// Fehler aus dem Betrieb: Bereinigung, bevor etwas gespeichert wird.
// Rein (keine Datenbank, kein Node-Modul), damit Server, Browser und Tests dieselben Regeln nutzen.
//
// Grundsatz: Im Fehlerlog dürfen keine Patientendaten landen. Deshalb wird lieber zu viel
// entfernt als zu wenig. Übrig bleibt, WAS schiefging und WO, nicht MIT WELCHEN Daten.

export const MELDUNG_MAX = 300;
export const ORT_MAX = 160;
export const STACK_ZEILEN = 3;
const LUECKE = "…";

export type FehlerQuelle = "server" | "browser";

/**
 * Ort des Fehlers: nur der Pfad. Ohne Herkunft, ohne Abfrage-Teil, ohne Sprungmarke.
 * Pfadteile mit 16 oder mehr Zeichen (Tokens, IDs) und Zahlen ab 5 Stellen werden durch „…“ ersetzt;
 * feste Seitennamen aus Kleinbuchstaben und Bindestrichen bleiben bis 40 Zeichen stehen.
 * Platzhalter einer Route wie [id] oder [token] bleiben stehen.
 */
export function ortBereinigen(roh: unknown): string {
  let pfad = String(roh ?? "").trim();
  // Herkunft abschneiden (https://host/…), dann Abfrage-Teil und Sprungmarke
  pfad = pfad.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
  pfad = pfad.split(/[?#]/)[0];
  if (!pfad.startsWith("/")) pfad = `/${pfad}`;
  const teile = pfad.split("/").map((teil) => {
    if (!teil) return teil;
    if (/^\[{1,2}(\.\.\.)?[A-Za-z0-9_]{1,30}\]{1,2}$/.test(teil) || /^\([A-Za-z0-9_-]{1,30}\)$/.test(teil)) return teil;
    let t = teil;
    try { t = decodeURIComponent(teil); } catch { /* bleibt roh */ }
    // Feste Namen von Seiten bestehen nur aus Kleinbuchstaben und Bindestrichen (z. B. „abrechnungspruefung“,
    // „leistungsverzeichnis“): Sie bleiben stehen, damit der Ort lesbar ist. IDs und Tokens enthalten Ziffern
    // oder Großbuchstaben und fallen ab 16 Zeichen weg.
    const seitenName = /^[a-z]+(-[a-z]+)*$/.test(t) && t.length <= 40;
    if (t.length >= 16 && !seitenName) return LUECKE;
    if (/\d{5,}/.test(t) || /@/.test(t)) return LUECKE;
    // Nur einfache Zeichen behalten; alles andere könnte ein Suchwort oder ein Name sein
    return /^[A-Za-z0-9._~-]+$/.test(t) ? t : LUECKE;
  });
  const sauber = teile.join("/").replace(/\/{2,}/g, "/");
  return sauber.length > ORT_MAX ? `${sauber.slice(0, ORT_MAX - 1)}${LUECKE}` : sauber;
}

// Ab diesen Stellen folgen in Datenbank- und Prüfmeldungen die betroffenen Werte: alles danach fällt weg.
const ABSCHNEIDEN = [
  /unique constraint failed on/i,
  /foreign key constraint (failed|violated)( on)?/i,
  /null constraint violation( on)?/i,
  /duplicate key value/i,
  /violates [a-z -]*constraint/i,
  /failing row contains/i,
  /\bdetail:/i,
  /\bkey \(/i,
  /invalid input (syntax|value)/i,
  /value out of range/i,
  /argument\s+[`'"]?\w+[`'"]?\s*(:|is missing|must not)/i,
  /unknown arg(ument)?/i,
  /invalid value( for| provided)?/i,
  /expected .{0,40}, received/i,
  /unexpected token/i,
  /is not valid json/i,
  /\bwhere:\s*\{/i,
  /\bdata:\s*\{/i,
  /\bbody:\s*/i,
  /\bpayload:\s*/i,
];

// Aufrufe wie `prisma.patient.create()` sagen nur, welche Abfrage es war. Sie bleiben stehen.
const PRISMA_AUFRUF = /^prisma\.[A-Za-z$_][\w$]{0,40}\.[A-Za-z$_][\w$]{0,40}\(\)$/;

/**
 * Meldung bereinigen: einzeilig, ohne E-Mail-Adressen, ohne Ziffernfolgen ab 5 Stellen, ohne Datumsangaben,
 * ohne IBAN, ohne Texte in Anführungszeichen, ohne lange Zeichenketten (Tokens) und ohne alles,
 * was nach „Unique constraint failed on“ und ähnlichen Stellen steht. Höchstens 300 Zeichen.
 */
export function meldungBereinigen(roh: unknown): string {
  let t = typeof roh === "string" ? roh : roh instanceof Error ? roh.message : String(roh ?? "");
  // Vorab begrenzen, damit sehr lange Eingaben keine Zeit kosten
  t = t.slice(0, 4000).replace(/\s+/g, " ").trim();

  for (const muster of ABSCHNEIDEN) {
    const m = muster.exec(t);
    if (m) t = `${t.slice(0, m.index + m[0].length).replace(/[\s:({[`'"]+$/, "")} ${LUECKE}`;
  }

  // Texte in Anführungszeichen (auch deutsche und typografische); Prisma-Aufrufe bleiben
  t = t.replace(/`([^`]*)`/g, (ganz, innen: string) => (PRISMA_AUFRUF.test(innen) ? innen : LUECKE));
  t = t
    .replace(/"[^"]*"/g, LUECKE)
    .replace(/„[^“”"]*[“”"]/g, LUECKE)
    .replace(/“[^”]*”/g, LUECKE)
    .replace(/»[^«]*«/g, LUECKE)
    .replace(/«[^»]*»/g, LUECKE)
    .replace(/‚[^‘’']*[‘’']/g, LUECKE)
    .replace(/‘[^’]*’/g, LUECKE)
    .replace(/(^|[\s(=:,[{])'[^']*'/g, `$1${LUECKE}`);
  // Übrig gebliebene einzelne Anführungszeichen: Der Rest könnte ein angefangenes Zitat sein
  const offen = t.search(/["„“”»«`]/);
  if (offen >= 0) t = `${t.slice(0, offen)}${LUECKE}`;

  t = t
    // Adressen im Netz samt Abfrage-Teil
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, LUECKE)
    // E-Mail-Adressen
    .replace(/[^\s<>()[\]{},;:]+@[^\s<>()[\]{},;:]+/g, LUECKE)
    // Lange Zeichenketten ohne Leerzeichen (IDs, Tokens, Schlüssel). Zuerst, vor den Ziffernregeln: Sonst
    // schneiden diese nur die Ziffern heraus und Bruchstücke eines Tokens bleiben stehen.
    .replace(/[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g, (w) => (w.length >= 16 ? LUECKE : w))
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, LUECKE)
    // IBAN (auch in Vierergruppen)
    .replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, LUECKE)
    // Datumsangaben (Geburtsdatum): 03.05.1980, 3.5.80, 1980-05-03
    .replace(/\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b/g, LUECKE)
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+Z?)?/g, LUECKE)
    // Ziffernfolgen ab 5 Stellen, auch mit Leerzeichen, Punkt, Schräg- oder Bindestrich gegliedert (Telefon, Versichertennummer)
    .replace(/[A-Za-z]?\d(?:[ ./-]?\d){4,}/g, LUECKE)
    // Noch einmal nach den Ziffernregeln: was jetzt noch lang ist und Ziffern enthält
    .replace(/[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g, (w) => (w.length >= 16 ? LUECKE : w))
    // Mehrere Lücken hintereinander zusammenziehen
    .replace(/(?:…[\s,;:]*){2,}/g, `${LUECKE} `)
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "Fehler ohne Meldung";
  return t.length > MELDUNG_MAX ? `${t.slice(0, MELDUNG_MAX - 1)}${LUECKE}` : t;
}

/** Dateipfad einer Stack-Zeile: ohne Herkunft, ohne Parameter, nur die letzten drei Teile. */
function dateiKurz(roh: string): string {
  let d = roh.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "").replace(/^file:\/\//i, "");
  d = d.split(/[?#]/)[0];
  const teile = d.split(/[\\/]/).filter(Boolean);
  return teile.slice(-3).join("/").replace(/[^A-Za-z0-9._()[\]/@-]/g, "").slice(0, 100);
}

/**
 * Stack bereinigen: nur die obersten drei Aufrufzeilen, je „Funktion (Datei:Zeile:Spalte)“.
 * Die Meldungszeile am Anfang fällt weg (sie steht bereinigt im Feld Meldung), Parameter an Dateipfaden auch.
 */
export function stackBereinigen(roh: unknown): string {
  if (typeof roh !== "string" || !roh) return "";
  const zeilen: string[] = [];
  for (const zeile of roh.slice(0, 8000).split("\n")) {
    if (zeilen.length >= STACK_ZEILEN) break;
    const z = zeile.trim();
    // V8: "at fn (datei:1:2)" oder "at datei:1:2"; Firefox/Safari: "fn@datei:1:2"
    const v8 = /^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/.exec(z);
    const ff = v8 ? null : /^([^@]*)@(.+?):(\d+):(\d+)$/.exec(z);
    const m = v8 ?? ff;
    if (!m) continue;
    const fn = (m[1] ?? "").replace(/^async\s+/, "").replace(/[^A-Za-z0-9_$.<>]/g, "").slice(0, 60);
    const datei = dateiKurz(m[2]);
    if (!datei) continue;
    zeilen.push(`${fn || "(anonym)"} (${datei}:${m[3]}:${m[4]})`);
  }
  return zeilen.join("\n");
}

/** Kurzer, fester Hash (16 Hex-Zeichen) ohne Krypto-Modul: reicht, um gleiche Fehler zusammenzuzählen. */
function hash64(text: string): string {
  let h1 = 0xdeadbeef ^ text.length, h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return hex(h2) + hex(h1);
}

/** Fingerabdruck: gleiche Quelle, gleicher Ort, gleiche (bereinigte) Meldung → derselbe Eintrag, nur der Zähler steigt. */
export function fingerabdruck(quelle: FehlerQuelle, ort: string, meldung: string): string {
  return hash64(`${quelle}\n${ort}\n${meldung}`);
}

export interface FehlerRoh {
  quelle: FehlerQuelle;
  /** Route oder Pfad */
  ort: unknown;
  meldung: unknown;
  stack?: unknown;
}

export interface FehlerSauber {
  quelle: FehlerQuelle;
  ort: string;
  meldung: string;
  stack: string;
  fingerabdruck: string;
}

/** Alles in einem Schritt: So und nur so kommt ein Fehler in die Datenbank. */
export function fehlerAufbereiten(roh: FehlerRoh): FehlerSauber {
  const quelle: FehlerQuelle = roh.quelle === "browser" ? "browser" : "server";
  const ort = ortBereinigen(roh.ort);
  const meldung = meldungBereinigen(roh.meldung);
  return { quelle, ort, meldung, stack: stackBereinigen(roh.stack), fingerabdruck: fingerabdruck(quelle, ort, meldung) };
}

/** Grenze für den Statusbericht: mehr als so viele verschiedene Fehler in 24 Stunden gelten als „nicht ok“. */
export const FEHLER_GRENZE_24H = 20;

/**
 * Tägliche Mail an das Sorrida-Team: nur die Zahl, die Orte und der Link zur Ansicht. Keine Meldungstexte.
 * Liefert null, wenn es nichts zu melden gibt.
 */
export function fehlerMail(orte: string[], basisUrl: string): { subject: string; html: string } | null {
  if (!orte.length) return null;
  const anzahl = orte.length;
  const verschieden = Array.from(new Set(orte.map((o) => ortBereinigen(o)))).sort().slice(0, 30);
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const link = `${basisUrl.replace(/\/+$/, "")}/betrieb`;
  return {
    subject: `Sorrida: ${anzahl} ${anzahl === 1 ? "neuer Fehler" : "neue Fehler"} seit gestern`,
    html: [
      `<p>Seit gestern ${anzahl === 1 ? "ist 1 neuer Fehler" : `sind ${anzahl} neue Fehler`} eingetragen.</p>`,
      `<p>Orte:</p><ul>${verschieden.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`,
      `<p>Ansicht: <a href="${esc(link)}">${esc(link)}</a></p>`,
      "<p>Diese Mail enthält keine Meldungstexte.</p>",
    ].join("\n"),
  };
}
