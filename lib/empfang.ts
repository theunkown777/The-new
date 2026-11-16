import crypto from "crypto";
import { signaturSecret } from "@/lib/geheimnis";

// Empfangsmodus: Das Praxis-Tablet geht für ein paar Minuten in die Hand eines Patienten.
// Grundsätze:
// 1. Die Patientenansicht läuft nicht mit der Praxis-Sitzung. Bei der Übergabe wird das Sitzungs-Cookie
//    aus dem Browser genommen und verschlüsselt „geparkt“; solange ist auf dem Tablet niemand angemeldet.
// 2. Die Patientenansicht hängt an einem eigenen, signierten Übergabe-Token: 20 Minuten gültig, nur für
//    diesen einen Patienten und nur für die freigegebenen Schritte (Kontaktdaten, Anamnese, Unterschrift).
// 3. Zurück in die Praxis-Ansicht führt nur die vierstellige Empfangs-PIN. Nach 5 Fehlversuchen ist sie
//    5 Minuten gesperrt; nach der dritten Sperre in Folge wird die geparkte Sitzung verworfen und es
//    hilft nur noch die normale Anmeldung. So bleiben für eine PIN höchstens 15 Versuche.
// 4. Die geparkte Sitzung gilt nur, solange der Server sie kennt (lib/empfangParkung.ts): Das Cookie trägt
//    eine zufällige Kennung, in der Datenbank steht ihr Hashwert. Nach dem Entsperren und beim Verwerfen
//    wird der Eintrag gelöscht. Ein kopierter Cookie-Wert ist danach wertlos.

export const UEBERGABE_MINUTEN = 20;
export const LEERLAUF_MINUTEN = 3;
export const PIN_MAX_FEHLVERSUCHE = 5;
export const PIN_SPERRE_MINUTEN = 5;
export const PIN_MAX_SPERREN = 3;
/** Länger als eine Sitzung (lib/sitzung.ts) wird nichts geparkt. */
export const PARKEN_STUNDEN = 12;

export const UEBERGABE_COOKIE = "sorrida_uebergabe";
export const GEPARKT_COOKIE = "sorrida_empfang_sitzung";

// --- Empfangs-PIN ---

/** Regeln für die PIN: genau vier Ziffern, nicht viermal dieselbe, keine einfache Folge. */
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Bitte genau vier Ziffern eingeben.";
  if (/^(\d)\1{3}$/.test(pin)) return "Bitte nicht viermal dieselbe Ziffer.";
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) return "Bitte keine einfache Zahlenfolge wie 1234.";
  return null;
}

export interface PinStand {
  /** Fehlversuche seit der letzten Sperre bzw. seit der letzten richtigen Eingabe */
  fehlversuche: number;
  /** Sperren in Folge seit der letzten richtigen Eingabe */
  sperren: number;
  gesperrtBis: Date | null;
}

export type PinErgebnis =
  | { art: "ok"; stand: PinStand }
  | { art: "falsch"; stand: PinStand; rest: number }
  /** neu: Diese Eingabe hat die Sperre ausgelöst. verwerfen: dritte Sperre in Folge, geparkte Sitzung verwerfen. */
  | { art: "gesperrt"; stand: PinStand; minuten: number; neu: boolean; verwerfen: boolean };

export const pinGesperrt = (stand: PinStand, now = new Date()) => !!stand.gesperrtBis && stand.gesperrtBis.getTime() > now.getTime();

/**
 * Eine PIN-Eingabe auswerten und den neuen Zählerstand liefern. Während einer Sperre zählt keine
 * Eingabe, auch keine richtige: `richtig` wird dann nicht beachtet.
 */
export function pinVersuch(stand: PinStand, richtig: boolean, now = new Date()): PinErgebnis {
  if (pinGesperrt(stand, now)) {
    const minuten = Math.max(1, Math.ceil((stand.gesperrtBis!.getTime() - now.getTime()) / 60_000));
    return { art: "gesperrt", stand, minuten, neu: false, verwerfen: false };
  }
  if (richtig) return { art: "ok", stand: { fehlversuche: 0, sperren: 0, gesperrtBis: null } };
  const n = stand.fehlversuche + 1;
  if (n >= PIN_MAX_FEHLVERSUCHE) {
    const sperren = stand.sperren + 1;
    return {
      art: "gesperrt",
      stand: { fehlversuche: 0, sperren, gesperrtBis: new Date(now.getTime() + PIN_SPERRE_MINUTEN * 60_000) },
      minuten: PIN_SPERRE_MINUTEN, neu: true, verwerfen: sperren >= PIN_MAX_SPERREN,
    };
  }
  return { art: "falsch", stand: { fehlversuche: n, sperren: stand.sperren, gesperrtBis: null }, rest: PIN_MAX_FEHLVERSUCHE - n };
}

// --- Übergabe-Token: signiert, kurzlebig, nur für einen Patienten und bestimmte Schritte ---

export const UEBERGABE_ZWECKE = ["kontakt", "anamnese", "unterschrift"] as const;
export type UebergabeZweck = (typeof UEBERGABE_ZWECKE)[number];

export interface Uebergabe {
  practiceId: string;
  patientId: string;
  zwecke: UebergabeZweck[];
  /** Beginn und Ende der Gültigkeit (Millisekunden) */
  von: number;
  bis: number;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sig = (s: string) => crypto.createHmac("sha256", signaturSecret()).update(`uebergabe:${s}`).digest("base64url");
const gleich = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function uebergabeToken(a: { practiceId: string; patientId: string; zwecke: UebergabeZweck[] }, now = Date.now()): string {
  const inhalt = b64(JSON.stringify({ p: a.practiceId, pt: a.patientId, z: a.zwecke, v: now, b: now + UEBERGABE_MINUTEN * 60_000, n: crypto.randomBytes(6).toString("base64url") }));
  return `${inhalt}.${sig(inhalt)}`;
}

/** Token prüfen: Signatur, Form, Ablauf. Liefert null, wenn irgendetwas nicht stimmt. */
export function uebergabeLesen(token: string | null | undefined, now = Date.now()): Uebergabe | null {
  if (!token || token.length > 1000) return null;
  const [inhalt, s, ...rest] = token.split(".");
  if (rest.length || !inhalt || !s || !gleich(sig(inhalt), s)) return null;
  let d: unknown;
  try { d = JSON.parse(Buffer.from(inhalt, "base64url").toString("utf8")); } catch { return null; }
  if (!d || typeof d !== "object") return null;
  const { p, pt, z, v, b } = d as Record<string, unknown>;
  if (typeof p !== "string" || !p || typeof pt !== "string" || !pt || typeof v !== "number" || typeof b !== "number" || !Array.isArray(z)) return null;
  if (now >= b || now < v) return null;
  // Länger als vorgesehen gilt kein Token, auch kein richtig signiertes.
  if (b - v > UEBERGABE_MINUTEN * 60_000) return null;
  const zwecke = z.filter((x): x is UebergabeZweck => (UEBERGABE_ZWECKE as readonly string[]).includes(x as string));
  if (zwecke.length !== z.length) return null;
  return { practiceId: p, patientId: pt, zwecke, von: v, bis: b };
}

/** Gilt die Übergabe für genau diesen Patienten und diesen Schritt? */
export const uebergabeErlaubt = (u: Uebergabe | null, zweck: UebergabeZweck, patientId?: string): u is Uebergabe =>
  !!u && u.zwecke.includes(zweck) && (patientId === undefined || u.patientId === patientId);

// --- Praxis-Sitzung parken: verschlüsselt im Cookie, ohne PIN nicht zurückzuholen ---

const SITZUNG_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];
/** Sitzungs-Cookies von next-auth, auch in Teilen (….0, ….1) bei langen Tokens. */
export const istSitzungCookie = (name: string) => SITZUNG_COOKIES.some((n) => name === n || (name.startsWith(`${n}.`) && /^\d+$/.test(name.slice(n.length + 1))));

const parkSchluessel = () => crypto.createHash("sha256").update(`empfang-parken:${signaturSecret()}`).digest();

export interface Geparkt {
  practiceId: string;
  cookies: { name: string; value: string }[];
  bis: number;
  /** Zufällige Kennung dieser Parkung; ihr Hashwert steht in der Datenbank (lib/empfangParkung.ts). Null bei alten Werten ohne Kennung. */
  kennung: string | null;
}

/** Sitzungs-Cookies verschlüsseln (AES-256-GCM). Der Wert ist außerhalb des Servers nicht lesbar und nicht als Sitzung nutzbar. */
export function sitzungParken(a: { practiceId: string; cookies: { name: string; value: string }[]; kennung?: string | null }, now = Date.now()): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", parkSchluessel(), iv);
  const klar = JSON.stringify({ p: a.practiceId, c: a.cookies.map((x) => [x.name, x.value]), b: now + PARKEN_STUNDEN * 3600e3, ...(a.kennung ? { k: a.kennung } : {}) });
  const daten = Buffer.concat([c.update(klar, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), daten].map((x) => x.toString("base64url")).join(".");
}

export function sitzungHolen(wert: string | null | undefined, now = Date.now()): Geparkt | null {
  if (!wert || wert.length > 12_000) return null;
  const teile = wert.split(".");
  if (teile.length !== 3) return null;
  try {
    const [iv, tag, daten] = teile.map((t) => Buffer.from(t, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const d = crypto.createDecipheriv("aes-256-gcm", parkSchluessel(), iv);
    d.setAuthTag(tag);
    const j = JSON.parse(Buffer.concat([d.update(daten), d.final()]).toString("utf8")) as { p?: unknown; c?: unknown; b?: unknown; k?: unknown };
    if (typeof j.p !== "string" || typeof j.b !== "number" || !Array.isArray(j.c) || now >= j.b) return null;
    const cookies = (j.c as unknown[]).flatMap((x) => (Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "string" && istSitzungCookie(x[0]) ? [{ name: x[0], value: x[1] }] : []));
    if (cookies.length === 0) return null;
    return { practiceId: j.p, cookies, bis: j.b, kennung: typeof j.k === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(j.k) ? j.k : null };
  } catch {
    return null;
  }
}
