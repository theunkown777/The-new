// Vorschau-Schloss für die eigene Domain, solange Sorrida noch nicht öffentlich ist.
// Auf den Hosts in VORSCHAU_HOSTS (z. B. "sorrida.de,www.sorrida.de") sehen Besucher nur die
// Seite „Demnächst“ mit Anmeldefeld. Wer VORSCHAU_BENUTZER und VORSCHAU_PASSWORT kennt,
// bekommt ein signiertes Cookie und sieht danach die ganze Seite. Läuft in der Middleware (Edge),
// deshalb nur Web-Crypto.

export const VORSCHAU_COOKIE = "sorrida_vorschau";
export const VORSCHAU_TAGE = 30;

export function vorschauHosts(env: Record<string, string | undefined> = process.env): string[] {
  return (env.VORSCHAU_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/**
 * Gilt das Vorschau-Schloss für diesen Host? Die eingetragenen Hosts und, solange der Vorschau-Modus
 * aktiv ist, auch jede *.vercel.app-Adresse (Projekt- und Deployment-Adressen). Sonst wäre die Seite
 * über die Vercel-Adresse ohne Zugangsdaten zu sehen.
 */
export function istVorschauHost(host: string | null, env: Record<string, string | undefined> = process.env): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  const hosts = vorschauHosts(env);
  if (!hosts.length) return false;
  return hosts.includes(h) || h.endsWith(".vercel.app");
}

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...Array.from(new Uint8Array(buf)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

const geheimnis = (env: Record<string, string | undefined>) => `vorschau:${env.NEXTAUTH_SECRET || "dev-secret-nur-lokal"}:${env.VORSCHAU_PASSWORT ?? ""}`;

/** Cookie-Wert "<ablauf>.<signatur>"; ändert sich das Passwort, werden alte Cookies ungültig. */
export async function vorschauCookie(now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<string> {
  const ablauf = now + VORSCHAU_TAGE * 86_400_000;
  return `${ablauf}.${await hmac(String(ablauf), geheimnis(env))}`;
}

export async function vorschauCookieGueltig(wert: string | undefined, now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<boolean> {
  if (!wert) return false;
  const [ablauf, sig] = wert.split(".");
  if (!ablauf || !sig || Number(ablauf) < now) return false;
  const soll = await hmac(ablauf, geheimnis(env));
  if (soll.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/**
 * Kurzlebiger Passierschein für das Fenster, das der Sorrida-Connector aus der Praxissoftware öffnet.
 * Der Connector meldet sich mit seinem Praxis-Schlüssel an, kennt aber das Vorschau-Passwort nicht.
 * /api/connector/launch hängt diesen Schein an die Start-Adresse; die Middleware prüft ihn und
 * setzt dann das normale Vorschau-Cookie. Signiert, 10 Minuten gültig, anders getrennt als das Cookie.
 */
export const VORSCHAU_PASS_MINUTEN = 10;
export async function vorschauPass(now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<string> {
  const ablauf = now + VORSCHAU_PASS_MINUTEN * 60_000;
  return `${ablauf}.${await hmac(`pass:${ablauf}`, geheimnis(env))}`;
}
export async function vorschauPassGueltig(wert: string | null | undefined, now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<boolean> {
  if (!wert) return false;
  const [ablauf, sig] = wert.split(".");
  if (!ablauf || !sig || !/^\d+$/.test(ablauf) || Number(ablauf) < now || Number(ablauf) > now + VORSCHAU_PASS_MINUTEN * 60_000 + 60_000) return false;
  const soll = await hmac(`pass:${ablauf}`, geheimnis(env));
  if (soll.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** Zugangsdaten vergleichen, ohne die Länge oder Position eines Unterschieds zu verraten. */
export async function zugangPasst(benutzer: string, passwort: string, env: Record<string, string | undefined> = process.env): Promise<boolean> {
  const sollB = env.VORSCHAU_BENUTZER, sollP = env.VORSCHAU_PASSWORT;
  if (!sollB || !sollP) return false;
  const [a, b, c, d] = await Promise.all([hmac(benutzer, "b"), hmac(sollB, "b"), hmac(passwort, "p"), hmac(sollP, "p")]);
  return (a === b) && (c === d);
}

/**
 * Pfade, die auch ohne Zugang erreichbar sein müssen: die Demnächst-Seite und ihre Bausteine sowie
 * Zugänge mit eigener Absicherung, die keine Website-Inhalte zeigen:
 * Sorrida-Connector (Praxis-Schlüssel), nächtliche Aufgabe (CRON_SECRET), Stripe (Signatur),
 * Schnittstelle v1 (API-Schlüssel), Kalender-Abo der Praxis (geheimer Link, ohne Patientennamen) und
 * Patientenlinks (geheimer Link je Patient, nur dessen Daten).
 */
const EIGENE_ABSICHERUNG = ["/api/connector/", "/api/cron/", "/api/stripe/webhook", "/api/v1/", "/api/kalender/"];
const PATIENTENLINK = /^\/(api\/)?(p|portal|a)\/[^/]{16,}(\/|$)/;
export function freiOhneZugang(pfad: string): boolean {
  return EIGENE_ABSICHERUNG.some((p) => pfad.startsWith(p)) || PATIENTENLINK.test(pfad) || pfad === "/demnaechst" || pfad === "/api/vorschau" || pfad.startsWith("/_next/") || pfad.startsWith("/brand/") || pfad.startsWith("/fonts/") || pfad === "/favicon.ico" || pfad === "/robots.txt" || pfad === "/icon.svg";
}
