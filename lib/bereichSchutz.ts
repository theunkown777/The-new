import crypto from "crypto";
import { signaturSecret } from "@/lib/geheimnis";

// Zweite Sperre für "Mein Bereich": Auch wer am angemeldeten Rechner sitzt
// (Empfang, gemeinsamer Arbeitsplatz), sieht Umsatz und Patientenstamm erst
// nach dem eigenen Bereichs-Passwort. Nach dem Entsperren gilt ein signiertes,
// nur für dieses Konto gültiges Cookie für kurze Zeit.

export const BEREICH_COOKIE = "sorrida_bereich";
export const BEREICH_MINUTEN = 30;
export const MAX_FEHLVERSUCHE = 5;
export const SPERRE_MINUTEN = 15;
export const MIN_LAENGE = 6;

const secret = () => signaturSecret();
const sig = (s: string) => crypto.createHmac("sha256", secret()).update(`bereich:${s}`).digest("base64url");

export function bereichToken(userId: string, now = Date.now()): string {
  const exp = now + BEREICH_MINUTEN * 60_000;
  return `${userId}.${exp}.${sig(`${userId}.${exp}`)}`;
}

export function bereichTokenGueltig(token: string | undefined | null, userId: string, now = Date.now()): boolean {
  if (!token) return false;
  const [uid, exp, s] = token.split(".");
  if (uid !== userId || !exp || !s || Number(exp) < now) return false;
  const soll = sig(`${uid}.${exp}`);
  return soll.length === s.length && crypto.timingSafeEqual(Buffer.from(soll), Buffer.from(s));
}

/** Passwortregeln: mindestens 6 Zeichen, nicht nur ein Zeichen wiederholt, keine reine Zahlenfolge. */
export function passwortProblem(pw: string): string | null {
  if (pw.length < MIN_LAENGE) return `Bitte mindestens ${MIN_LAENGE} Zeichen.`;
  if (pw.length > 200) return "Bitte höchstens 200 Zeichen.";
  if (/^(.)\1+$/.test(pw)) return "Bitte nicht nur ein Zeichen wiederholen.";
  if ("01234567890".includes(pw) || "09876543210".includes(pw)) return "Bitte keine einfache Zahlenfolge.";
  return null;
}
