import crypto from "crypto";
import { signaturSecret } from "@/lib/geheimnis";
import { BESTAETIGUNG_MINUTEN } from "@/lib/portalPruefung";

// Bestätigung nach richtiger Eingabe des Geburtsdatums (S5): ein kurzlebiger,
// signierter Wert für ein httpOnly-Cookie. Die Signatur bindet ihn an genau
// diesen Portal-Link, diesen Patienten und das hinterlegte Geburtsdatum:
// Ein neuer Link oder ein korrigiertes Geburtsdatum macht ihn ungültig, und
// für einen anderen Link ist er wertlos. Im Cookie stehen nur zwei Zeitpunkte
// und die Signatur, keine Patientendaten.

export type PruefBindung = {
  /** SHA-256 des Link-Tokens (lib/tokens.ts) */
  linkHash: string;
  patientId: string;
  /** hinterlegtes Geburtsdatum als Kalendertag "JJJJ-MM-TT" */
  geburtstag: string;
};

const DAUER_MS = BESTAETIGUNG_MINUTEN * 60_000;

/** Eigener Cookie-Name je Link, damit mehrere Links auf einem Gerät (z. B. Eltern und Kind) sich nicht überschreiben. */
export const pruefCookieName = (linkHash: string) => `sorrida_pp_${linkHash.slice(0, 16)}`;

const TOKEN_FORM = /^[A-Za-z0-9_-]{20,128}$/;

/**
 * Pfade, unter denen der Browser das Cookie mitschickt: nur die Seiten und Schnittstellen dieses einen Links.
 * Nie "/": Sonst ginge die Kennung des Links von Praxis B 30 Minuten lang bei jedem Aufruf an Praxis A mit
 * (und an /meine-praxen). Der Server bekäme dann in einer Anfrage Links zweier Praxen (AVV, Anlage 1).
 */
export function pruefCookiePfade(token: string): string[] {
  if (!TOKEN_FORM.test(token)) throw new Error("Ungültiger Portal-Link");
  return [`/portal/${token}`, `/api/portal/${token}`];
}

/**
 * Fertige Set-Cookie-Zeilen für die Bestätigung: je Pfad des Links eine, dazu eine, die ein früher unter "/"
 * gesetztes Cookie desselben Links löscht. Als Zeilen statt über NextResponse.cookies, weil Next.js dort je Name
 * nur einen Eintrag hält (zwei Pfade mit gleichem Namen gingen verloren).
 */
export function pruefCookieZeilen(token: string, cookie: { name: string; wert: string; maxAge: number }, sicher: boolean): string[] {
  if (!/^sorrida_pp_[0-9a-f]{16}$/.test(cookie.name) || !/^[0-9A-Za-z._-]+$/.test(cookie.wert)) throw new Error("Ungültiges Cookie");
  const zusatz = `; HttpOnly; SameSite=Lax${sicher ? "; Secure" : ""}`;
  const dauer = Math.max(0, Math.floor(cookie.maxAge));
  return [
    ...pruefCookiePfade(token).map((pfad) => `${cookie.name}=${cookie.wert}; Path=${pfad}; Max-Age=${dauer}${zusatz}`),
    `${cookie.name}=; Path=/; Max-Age=0${zusatz}`,
  ];
}

const sig = (b: PruefBindung, zeiten: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(`portal-pruefung:${b.linkHash}:${b.patientId}:${b.geburtstag}:${zeiten}`).digest("base64url");

/** Wert "<geprüft>.<ablauf>.<signatur>" (Zeiten in Millisekunden). */
export function pruefToken(b: PruefBindung, now = Date.now(), secret = signaturSecret()): string {
  const zeiten = `${now}.${now + DAUER_MS}`;
  return `${zeiten}.${sig(b, zeiten, secret)}`;
}

/** Zeitpunkt der Prüfung, wenn der Wert echt, für diese Bindung ausgestellt und noch nicht abgelaufen ist; sonst null. */
export function pruefTokenLesen(token: string | null | undefined, b: PruefBindung, now = Date.now(), secret?: string): { geprueftAt: Date; gueltigBis: Date } | null {
  if (!token || token.length > 200) return null;
  const teile = token.split(".");
  if (teile.length !== 3) return null;
  const [iat, exp, s] = teile;
  if (!/^\d{10,16}$/.test(iat) || !/^\d{10,16}$/.test(exp) || !s) return null;
  const von = Number(iat), bis = Number(exp);
  // Laufzeit ist fest; ein Wert aus der Zukunft oder mit anderer Dauer ist nie von uns.
  if (bis - von !== DAUER_MS || bis < now || von > now + 60_000) return null;
  let soll: string;
  try {
    soll = sig(b, `${iat}.${exp}`, secret ?? signaturSecret());
  } catch {
    return null; // ohne Schlüssel gilt nichts als bestätigt
  }
  const a = Buffer.from(soll), c = Buffer.from(s);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return null;
  return { geprueftAt: new Date(von), gueltigBis: new Date(bis) };
}
