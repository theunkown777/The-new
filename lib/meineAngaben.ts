import { z } from "zod";
import { PRAXIS_GRUPPEN, type PraxisGruppe } from "@/lib/praxisGruppe";

// „Eigene Angaben mitnehmen“ (Brücke, Stufe 2, Teil D1): Der Patient behält auf dem eigenen Gerät eine
// verschlüsselte Kopie seiner Antworten aus einem Anamnesebogen. Damit füllt er den Bogen einer anderen Praxis
// vor, prüft ihn und schickt ihn selbst dorthin. Die Brücke ist das Gerät, nicht der Server:
//   - Gespeichert wird nur nach einem Klick, nur im Browser (localStorage), nur verschlüsselt.
//   - Verschlüsselt wird nur auf dem Gerät: PBKDF2-SHA-256 (mindestens 250 000 Durchläufe, zufälliges Salz) und
//     AES-GCM (zufälliger IV). Der Code des Patienten verlässt das Gerät nie und wird nicht gespeichert.
//   - Die erste Praxis erfährt nichts. Sorrida erfährt nichts. Die zweite Praxis sieht nur den Hinweis mit Stand.
//
// Im Klartext auf dem Gerät stehen nur: Name der Kopie (vom Patienten gewählt), Stand (Tag), Art des Bogens
// (Zahnmedizin, Medizin oder Therapie) und das Protokoll der Übernahmen (Tag, Anzeigename der Praxis, Name der Kopie).
// Verschlüsselt sind: Antworten (Ja oder Nein und Ergänzung) mit den Schlüsseln aus lib/anamneseProfile.ts, das
// Fach-Profil der Quelle, die Ansprache (selbst oder Eltern) und der Name der Praxis (nur zur Anzeige auf dem Gerät).
// Nie gespeichert: Wünsche, freie Hinweise, Name, Geburtsdatum, Token, Link.
//
// Diese Datei ist rein (kein Browser-Speicher, keine Datenbank). WebCrypto kommt aus globalThis.crypto.subtle
// (Browser und Node 22). Den Speicher fasst nur lib/geraeteSpeicher.ts an. Welche Antworten gespeichert und
// übernommen werden, regelt lib/meineAngabenUebernahme.ts.

export const ANGABEN_SCHLUESSEL = "sorrida:meine-angaben:v1";
/** Mehr Kopien behält das Gerät nicht. */
export const MAX_KOPIEN = 5;
/** Kopien und Protokoll verfallen nach so vielen Monaten ab ihrem Stand. */
export const GUELTIG_MONATE = 12;
/**
 * Mindestlänge des Codes. Die Kopie ist nur so sicher wie der Code: Wer die Kopie aus dem Speicher holt, kann Codes
 * ohne Begrenzung durchprobieren. Deshalb mindestens 8 Zeichen, nicht nur Ziffern und keine einfachen Folgen (codeMangel).
 */
export const MIN_CODE = 8;
/** Durchläufe für neue Kopien. */
export const PBKDF2_DURCHLAEUFE = 600_000;
/** Weniger wird beim Lesen nicht angenommen (gegen eine untergeschobene schwache Kopie). */
export const PBKDF2_MINDESTENS = 250_000;
const PBKDF2_HOECHSTENS = 5_000_000;
/** Einträge im Protokoll der Übernahmen. */
export const MAX_PROTOKOLL = 20;
export const MAX_BEZEICHNUNG = 40;

const TAG = /^\d{4}-\d{2}-\d{2}$/;
const tag = z.string().regex(TAG).refine((s) => tagGueltig(s), "Datum ungültig");
const text = (max: number, min = 0) => z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().min(min).max(max));
const b64 = (min: number, max: number) => z.string().min(min).max(max).regex(/^[A-Za-z0-9+/]+={0,2}$/);

/** Eine Kopie, wie sie auf dem Gerät liegt. Nur bezeichnung, stand und gruppe sind lesbar. */
export const kopieSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{16}$/),
  bezeichnung: text(MAX_BEZEICHNUNG, 1),
  stand: tag,
  gruppe: z.enum(PRAXIS_GRUPPEN),
  salt: b64(22, 24),
  iv: b64(16, 16),
  iter: z.number().int().min(PBKDF2_MINDESTENS).max(PBKDF2_HOECHSTENS),
  daten: b64(24, 60_000),
});
export type Kopie = z.infer<typeof kopieSchema>;

/** Ein Eintrag im Protokoll: wann übernommen, in den Bogen welcher Praxis (Anzeigename), aus welcher Kopie. */
export const protokollSchema = z.object({ am: tag, praxis: text(160, 1), kopie: text(MAX_BEZEICHNUNG, 1) });
export type ProtokollEintrag = z.infer<typeof protokollSchema>;

export type Ablage = { kopien: Kopie[]; protokoll: ProtokollEintrag[] };

const antwortSchema = z.strictObject({ yes: z.boolean(), detail: z.string().max(300).optional() });
export type Antwort = z.infer<typeof antwortSchema>;

/** Der verschlüsselte Inhalt einer Kopie. */
export const inhaltSchema = z.strictObject({
  v: z.literal(1),
  /** Fach-Profil der Quelle ("zahn", "hausarzt", …; lib/anamneseProfile.ts) */
  fach: z.string().regex(/^[a-z_]{2,40}$/),
  ansprache: z.enum(["patient", "eltern"]),
  /** Name der Praxis, bei der die Angaben gemacht wurden: nur zur Anzeige auf diesem Gerät. */
  praxis: z.string().max(160),
  q: z.record(z.string().regex(/^[a-z_]{2,40}$/), antwortSchema),
});
export type AngabenInhalt = z.infer<typeof inhaltSchema>;

const speicherSchema = z.object({ v: z.literal(1), kopien: z.array(z.unknown()), protokoll: z.array(z.unknown()).optional() });

// --- Tage ---

function tagGueltig(s: string): boolean {
  if (!TAG.test(s)) return false;
  const [j, m, t] = s.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}

/** Heutiger Tag auf dem Gerät (Ortszeit) als JJJJ-MM-TT. */
export function heute(jetzt: Date = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
}

/** Tag, an dem eine Kopie mit diesem Stand verfällt (12 Monate später). */
export function ablaufTag(stand: string): string {
  const [j, m, t] = stand.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1 + GUELTIG_MONATE, t)).toISOString().slice(0, 10);
}

export function abgelaufen(stand: string, jetzt: Date = new Date()): boolean {
  return heute(jetzt) >= ablaufTag(stand);
}

// --- Speicher lesen und schreiben (ohne Browser) ---

export type Lesestand = Ablage & {
  /** Etwas war kaputt oder abgelaufen und wurde verworfen: Der Aufrufer schreibt die Ablage zurück. */
  geaendert: boolean;
  /** So viele Kopien waren älter als 12 Monate und sind weggefallen. */
  abgelaufen: number;
};

/**
 * Inhalt des Speichers lesen. Kaputtes (kein JSON, andere Version, falsche Form) wird verworfen, einzelne kaputte
 * Kopien fallen weg. Kopien und Protokolleinträge, die älter als 12 Monate sind, fallen ebenfalls weg.
 */
export function ablageLesen(roh: string | null | undefined, jetzt: Date = new Date()): Lesestand {
  const leer: Lesestand = { kopien: [], protokoll: [], geaendert: false, abgelaufen: 0 };
  if (roh == null || roh === "") return leer;
  let json: unknown;
  try {
    json = JSON.parse(roh);
  } catch {
    return { ...leer, geaendert: true };
  }
  const r = speicherSchema.safeParse(json);
  if (!r.success) return { ...leer, geaendert: true };
  let geaendert = false;
  let alt = 0;
  const kopien: Kopie[] = [];
  for (const e of r.data.kopien) {
    const k = kopieSchema.safeParse(e);
    if (!k.success || kopien.some((x) => x.id === k.data.id)) geaendert = true;
    else if (abgelaufen(k.data.stand, jetzt)) {
      alt++;
      geaendert = true;
    } else kopien.push(sauberKopie(k.data));
  }
  const protokoll: ProtokollEintrag[] = [];
  for (const e of r.data.protokoll ?? []) {
    const p = protokollSchema.safeParse(e);
    if (!p.success || abgelaufen(p.data.am, jetzt)) geaendert = true;
    else protokoll.push({ am: p.data.am, praxis: p.data.praxis, kopie: p.data.kopie });
  }
  if (kopien.length > MAX_KOPIEN || protokoll.length > MAX_PROTOKOLL) geaendert = true;
  return { kopien: kopien.slice(0, MAX_KOPIEN), protokoll: protokoll.slice(0, MAX_PROTOKOLL), geaendert, abgelaufen: alt };
}

function sauberKopie(k: Kopie): Kopie {
  const { id, bezeichnung, stand, gruppe, salt, iv, iter, daten } = k;
  return { id, bezeichnung, stand, gruppe, salt, iv, iter, daten };
}

/** Text für den Speicher. Nur erlaubte Felder, höchstens 5 Kopien und 20 Protokolleinträge. */
export function ablageSchreiben(a: Ablage): string {
  return JSON.stringify({
    v: 1,
    kopien: a.kopien.slice(0, MAX_KOPIEN).map(sauberKopie),
    protokoll: a.protokoll.slice(0, MAX_PROTOKOLL).map(({ am, praxis, kopie }) => ({ am, praxis, kopie })),
  });
}

export const leereAblage = (a: Ablage) => a.kopien.length === 0 && a.protokoll.length === 0;

const gleich = (a: string, b: string) => a.replace(/\s+/g, " ").trim().toLocaleLowerCase("de") === b.replace(/\s+/g, " ").trim().toLocaleLowerCase("de");

export type AblegeErgebnis =
  | { art: "neu" | "ersetzt"; ablage: Ablage }
  /** Eine Kopie mit gleichem Namen liegt schon da: Der Patient entscheidet, ob sie ersetzt wird. */
  | { art: "gleicherName"; ablage: Ablage }
  | { art: "voll"; ablage: Ablage };

/** Eine neue Kopie ablegen. Gleicher Name ersetzt nur mit `ersetzen`. Mehr als 5 Kopien gibt es nicht. */
export function kopieAblegen(ablage: Ablage, neu: Kopie, ersetzen = false): AblegeErgebnis {
  const vorhanden = ablage.kopien.find((k) => gleich(k.bezeichnung, neu.bezeichnung));
  if (vorhanden && !ersetzen) return { art: "gleicherName", ablage };
  if (vorhanden) return { art: "ersetzt", ablage: { ...ablage, kopien: [neu, ...ablage.kopien.filter((k) => k.id !== vorhanden.id)] } };
  if (ablage.kopien.length >= MAX_KOPIEN) return { art: "voll", ablage };
  return { art: "neu", ablage: { ...ablage, kopien: [neu, ...ablage.kopien] } };
}

export function kopieEntfernen(ablage: Ablage, id: string): Ablage {
  return { ...ablage, kopien: ablage.kopien.filter((k) => k.id !== id) };
}

/** Übernahme notieren (neueste zuerst). Nur der Anzeigename der Praxis, der Tag und der Name der Kopie. */
export function protokollNotieren(ablage: Ablage, eintrag: ProtokollEintrag): Ablage {
  const p = protokollSchema.safeParse(eintrag);
  if (!p.success) return ablage;
  return { ...ablage, protokoll: [p.data, ...ablage.protokoll].slice(0, MAX_PROTOKOLL) };
}

// --- Verschlüsselung (nur auf dem Gerät) ---

export class FalscherCode extends Error {
  constructor() {
    super("Der Code passt nicht.");
    this.name = "FalscherCode";
  }
}

/** Die Kopie lässt sich mit dem richtigen Code nicht lesen (anderer Aufbau, beschädigt). Löschen hilft. */
export class KopieKaputt extends Error {
  constructor() {
    super("Die Kopie lässt sich nicht öffnen.");
    this.name = "KopieKaputt";
  }
}

/**
 * Warum ein Code nicht taugt, oder null. Keine Messung der Stärke, nur die Fälle, die sich schnell durchprobieren
 * lassen: zu kurz, ohne Buchstaben (etwa eine PIN), wenige verschiedene Zeichen, Folgen wie „abcdefgh“ oder eine
 * Tastaturreihe, und sehr häufige Wörter mit Zahlen oder Zeichen davor oder dahinter („Passwort123!“).
 */
export type CodeMangel = "kurz" | "ohneBuchstaben" | "einfach";
const REIHEN = ["qwertzuiopü", "asdfghjklöä", "yxcvbnm", "qwertyuiop", "asdfghjkl", "zxcvbnm", "azertyuiop", "qsdfghjklm", "wxcvbn", "1234567890"];
const HAEUFIG = new Set(["passwort", "password", "kennwort", "geheim", "geheimnis", "hallo", "sorrida", "iloveyou", "letmein", "willkommen", "welcome", "admin", "test", "code", "pin"]);

export function codeMangel(code: string): CodeMangel | null {
  const zeichen = [...code];
  if (zeichen.length < MIN_CODE || code.trim() === "") return "kurz";
  if (!/\p{L}/u.test(code)) return "ohneBuchstaben";
  const klein = code.normalize("NFC").toLocaleLowerCase("de");
  const z = [...klein];
  if (new Set(z).size < 4) return "einfach";
  const schritte = z.slice(1).map((c, i) => c.codePointAt(0)! - z[i].codePointAt(0)!);
  if (schritte.every((d) => d === 1) || schritte.every((d) => d === -1)) return "einfach";
  if (REIHEN.some((r) => r.includes(klein) || [...r].reverse().join("").includes(klein))) return "einfach";
  // Häufiges Wort, davor oder dahinter nur Ziffern und Zeichen: „Passwort123!“, „123sorrida“.
  const wort = klein.replace(/[^\p{L}]+/gu, "");
  if (HAEUFIG.has(wort)) return "einfach";
  return null;
}

export function codeGueltig(code: string): boolean {
  return codeMangel(code) === null;
}

const kodierer = new TextEncoder();

function zuB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function ausB64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function zufall(n: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

async function schluessel(code: string, salt: Uint8Array<ArrayBuffer>, durchlaeufe: number): Promise<CryptoKey> {
  const basis = await globalThis.crypto.subtle.importKey("raw", kodierer.encode(code.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return globalThis.crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: durchlaeufe }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/**
 * Bindet die lesbaren Felder an den verschlüsselten Inhalt: Wer Name, Stand, Art oder Durchläufe im Speicher ändert
 * oder die Namen zweier Kopien vertauscht (etwa „Angaben für Lena“ und „Angaben für Max“), bricht die Kopie.
 * Der Name steht zuletzt, weil nur er „|“ enthalten kann.
 */
const zusatz = (k: Pick<Kopie, "id" | "stand" | "gruppe" | "iter" | "bezeichnung">) =>
  kodierer.encode(`${ANGABEN_SCHLUESSEL}|${k.id}|${k.stand}|${k.gruppe}|${k.iter}|${k.bezeichnung}`);

/** Neue Kopie verschlüsseln. Wirft, wenn der Code zu kurz oder der Inhalt ungültig ist. */
export async function kopieVerschluesseln(
  inhalt: AngabenInhalt,
  code: string,
  meta: { bezeichnung: string; stand: string; gruppe: PraxisGruppe },
  durchlaeufe: number = PBKDF2_DURCHLAEUFE,
): Promise<Kopie> {
  if (!codeGueltig(code)) throw new Error("Der Code taugt nicht.");
  if (durchlaeufe < PBKDF2_MINDESTENS) throw new Error("Zu wenige Durchläufe.");
  const sauber = inhaltSchema.parse(inhalt);
  const id = Array.from(zufall(8), (b) => b.toString(16).padStart(2, "0")).join("");
  const salt = zufall(16);
  const iv = zufall(12);
  // Der Name so, wie er im Speicher steht (Leerzeichen zusammengefasst): Er ist Teil der Zusatzdaten.
  const kopf = { id, stand: meta.stand, gruppe: meta.gruppe, iter: durchlaeufe, bezeichnung: kopieSchema.shape.bezeichnung.parse(meta.bezeichnung) };
  const key = await schluessel(code, salt, durchlaeufe);
  const daten = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: zusatz(kopf) }, key, kodierer.encode(JSON.stringify(sauber))));
  return kopieSchema.parse({ ...kopf, salt: zuB64(salt), iv: zuB64(iv), daten: zuB64(daten) });
}

/**
 * Kopie mit dem Code öffnen.
 *   - FalscherCode: Der Code passt nicht, oder jemand hat die Kopie im Speicher verändert (AES-GCM unterscheidet das
 *     nicht).
 *   - KopieKaputt: Die Kopie hat nicht die erwartete Form, oder der Code passt, aber der Inhalt ist nicht lesbar.
 *   - Andere Fehler: Der Browser kann nicht entschlüsseln (etwa ohne WebCrypto).
 */
export async function kopieEntschluesseln(kopie: Kopie, code: string): Promise<AngabenInhalt> {
  const p = kopieSchema.safeParse(kopie);
  if (!p.success) throw new KopieKaputt();
  const k = p.data;
  let salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, daten: Uint8Array<ArrayBuffer>;
  try {
    [salt, iv, daten] = [ausB64(k.salt), ausB64(k.iv), ausB64(k.daten)];
  } catch {
    throw new KopieKaputt();
  }
  const key = await schluessel(code, salt, k.iter);
  let klar: ArrayBuffer;
  try {
    klar = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: zusatz(k) }, key, daten);
  } catch {
    throw new FalscherCode();
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(klar));
  } catch {
    throw new KopieKaputt();
  }
  const r = inhaltSchema.safeParse(json);
  if (!r.success) throw new KopieKaputt();
  return r.data;
}
