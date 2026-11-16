import { impressumVollstaendig } from "@/lib/betreiber";
// Vorschau-Schloss für die eigene Domain, solange Sorrida noch nicht öffentlich ist.
// Ist VORSCHAU_HOSTS gesetzt (z. B. "sorrida.de,www.sorrida.de"), sehen Besucher auf jedem Host außer dem eigenen Rechner nur die
// Seite „Demnächst“ mit Anmeldefeld. Wer VORSCHAU_BENUTZER und VORSCHAU_PASSWORT kennt,
// bekommt ein signiertes Cookie und sieht danach die ganze Seite. Läuft in der Middleware (Edge),
// deshalb nur Web-Crypto.

import { signaturSecret } from "@/lib/geheimnis";

export const VORSCHAU_COOKIE = "sorrida_vorschau";
export const VORSCHAU_TAGE = 30;

export function vorschauHosts(env: Record<string, string | undefined> = process.env): string[] {
  return (env.VORSCHAU_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/** Host ohne Port, klein geschrieben, ohne Punkt am Ende („sorrida.de.“ ist derselbe Host wie „sorrida.de“). */
export function hostName(host: string): string {
  const h = host.trim().toLowerCase();
  // IPv6 in Klammern: „[::1]:3000“
  const ohnePort = h.startsWith("[") ? h.slice(0, h.indexOf("]") + 1) : h.split(":")[0];
  return ohnePort.replace(/\.+$/, "");
}
/** Der eigene Rechner: Hier gilt das Schloss nur, wenn der Host ausdrücklich in VORSCHAU_HOSTS steht. */
const LOKAL = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Gilt das Vorschau-Schloss für diesen Host? Solange der Vorschau-Modus aktiv ist (VORSCHAU_HOSTS gesetzt), gilt es
 * für JEDEN Host außer dem eigenen Rechner: für die eingetragenen Hosts, jede *.vercel.app-Adresse und auch für jede
 * weitere Domain, die später am Projekt hängt und in der Liste fehlt. So ist eine vergessene oder anders geschriebene
 * Adresse („sorrida.de.“) verschlossen statt offen.
 */
export function istVorschauHost(host: string | null, env: Record<string, string | undefined> = process.env): boolean {
  if (!host) return false;
  const hosts = vorschauHosts(env);
  if (!hosts.length) return false;
  const h = hostName(host);
  return hosts.map(hostName).includes(h) || !LOKAL.includes(h);
}

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...Array.from(new Uint8Array(buf)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

// Wirft in Produktion ohne NEXTAUTH_SECRET (lib/geheimnis.ts): kein Cookie mit bekanntem Schlüssel.
const geheimnis = (env: Record<string, string | undefined>) => `vorschau:${signaturSecret(env)}:${env.VORSCHAU_PASSWORT ?? ""}`;
// Beim Prüfen gilt ohne Schlüssel schlicht „ungültig“, damit die Middleware nicht für jede Seite abbricht.
const sollSignatur = (text: string, env: Record<string, string | undefined>) => Promise.resolve().then(() => hmac(text, geheimnis(env))).catch(() => null);

/** Cookie-Wert "<ablauf>.<signatur>"; ändert sich das Passwort, werden alte Cookies ungültig. */
export async function vorschauCookie(now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<string> {
  const ablauf = now + VORSCHAU_TAGE * 86_400_000;
  return `${ablauf}.${await hmac(String(ablauf), geheimnis(env))}`;
}

export async function vorschauCookieGueltig(wert: string | undefined, now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<boolean> {
  if (!wert) return false;
  const [ablauf, sig] = wert.split(".");
  if (!ablauf || !sig || Number(ablauf) < now) return false;
  const soll = await sollSignatur(ablauf, env);
  if (!soll || soll.length !== sig.length) return false;
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
  const soll = await sollSignatur(`pass:${ablauf}`, env);
  if (!soll || soll.length !== sig.length) return false;
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
// Pflichtangaben: Die Demnächst-Seite ist schon ein geschäftlicher Auftritt. Impressum (§ 5 DDG), Datenschutzerklärung
// (Art. 13 DSGVO) und die Lizenzangaben müssen deshalb auch ohne Zugang erreichbar sein.
// Das AVV-Muster gehört dazu: Die Datenschutzerklärung verweist darauf, der Verweis darf nicht ins Leere führen.
const PFLICHTSEITEN = ["/impressum", "/datenschutz", "/lizenzen", "/avv"];
/**
 * Stufe „öffentlich, aber geschützt“ (Variable VORSCHAU_OEFFENTLICH): Die Informationsseiten der Website sind
 * ohne Zugang erreichbar und dürfen in Suchmaschinen stehen. App, Anmeldung, Registrierung und (ohne den Wert
 * „demo“) auch der Gastzugang bleiben hinter dem Zugang für Pilotpraxen und Partner; Patientenlinks bleiben geheim
 * und für Suchmaschinen gesperrt.
 *   leer        → alles hinter dem Zugang (nur „Demnächst“)
 *   "1"         → Informationsseiten öffentlich, Gastzugang verschlossen
 *   "demo"      → zusätzlich der Gastzugang (/demo) öffentlich, aber nicht in Suchmaschinen
 */
export type OeffentlichStufe = "aus" | "seiten" | "demo";
export function oeffentlichStufe(env: Record<string, string | undefined> = process.env, impressumOk: boolean = impressumVollstaendig()): OeffentlichStufe {
  // Sicherung: Ohne vollständiges Impressum (zweiter Kontaktweg neben der E-Mail, § 5 DDG) wird nichts öffentlich,
  // auch wenn die Variable gesetzt ist. Der Statusbericht nennt den Grund.
  if (!impressumOk) return "aus";
  const v = (env.VORSCHAU_OEFFENTLICH ?? "").trim().toLowerCase();
  return v === "demo" ? "demo" : v === "1" || v === "ja" || v === "true" ? "seiten" : "aus";
}

/**
 * Sind die Informationsseiten (Hilfe mit Kontaktformular, Vorschau …) für Besucher ohne Zugang erreichbar?
 * Ja, wenn es kein Vorschau-Schloss gibt oder die öffentliche Stufe gilt. Impressum und Datenschutzerklärung zeigen
 * Verweise auf solche Seiten nur dann als Link; sonst führte der Verweis auf die Seite „Demnächst“.
 */
export function infoSeitenOffen(env: Record<string, string | undefined> = process.env, impressumOk: boolean = impressumVollstaendig()): boolean {
  return vorschauHosts(env).length === 0 || oeffentlichStufe(env, impressumOk) !== "aus";
}

/** Informationsseiten: dürfen in Suchmaschinen stehen. Keine App, keine Patientendaten, keine Anmeldung. */
const INFO_GENAU = ["/", "/ratgeber", "/rechner", "/leistungen", "/hilfe", "/avv", "/vorschau", "/neu", "/zahnmedizin", "/fachgebiete", "/sitemap.xml", "/vertrauen", "/status"];
const INFO_UNTER = ["/ratgeber/", "/rechner/", "/leistungen/", "/fachgebiete/"];
export function istInfoSeite(pfad: string): boolean {
  return INFO_GENAU.includes(pfad) || PFLICHTSEITEN.includes(pfad) || INFO_UNTER.some((p) => pfad.startsWith(p));
}
/** Was die Informationsseiten zum Arbeiten brauchen: Anfrage- und Hilfeformular, Terminbuchung der Praxen für neue Patienten. */
const INFO_DIENSTE = ["/api/leads", "/api/support"];
const TERMINSEITE = /^\/(api\/)?t\/[^/]{8,}(\/|$)/;
const DEMO_PFADE = ["/demo", "/api/demo"];

/** In der öffentlichen Stufe ohne Zugang erreichbar. */
export function oeffentlichFrei(pfad: string, env: Record<string, string | undefined> = process.env, impressumOk: boolean = impressumVollstaendig()): boolean {
  const stufe = oeffentlichStufe(env, impressumOk);
  if (stufe === "aus") return false;
  if (istInfoSeite(pfad) || INFO_DIENSTE.includes(pfad) || TERMINSEITE.test(pfad)) return true;
  return stufe === "demo" && DEMO_PFADE.some((p) => pfad === p || pfad.startsWith(p + "/"));
}
/**
 * Stufe „demo“: Der Gastzugang muss sich ohne Vorschau-Zugang anmelden können, sonst endet /demo in einer Fehlermeldung.
 * Frei sind dafür nur die Anmelde-Bausteine von next-auth. Die App selbst öffnet sich danach allein für die Sitzung
 * einer Demo-Praxis (gastSitzung); Sitzungen echter Konten bleiben hinter dem Zugang, ebenso Anmeldeseite,
 * Registrierung, Einladung, Passwort-Wege und die öffentlichen Modellseiten.
 */
const GAST_ANMELDUNG = ["/api/auth/providers", "/api/auth/csrf", "/api/auth/callback/credentials", "/api/auth/session", "/api/auth/signout", "/api/auth/_log"];
const NICHT_FUER_GAESTE = ["/login", "/register", "/api/register", "/api/auth", "/accept-invite", "/forgot-password", "/reset-password", "/verify-email", "/anatomie"];
export function gastFrei(pfad: string, gastSitzung: boolean, env: Record<string, string | undefined> = process.env, impressumOk: boolean = impressumVollstaendig()): boolean {
  if (oeffentlichStufe(env, impressumOk) !== "demo") return false;
  if (GAST_ANMELDUNG.includes(pfad)) return true;
  return gastSitzung && !NICHT_FUER_GAESTE.some((p) => pfad === p || pfad.startsWith(p + "/"));
}
/** Darf diese Seite in Suchmaschinen stehen? Nur Informationsseiten, und nur in der öffentlichen Stufe. */
export function darfInSuchmaschinen(pfad: string, env: Record<string, string | undefined> = process.env, impressumOk: boolean = impressumVollstaendig()): boolean {
  return oeffentlichStufe(env, impressumOk) !== "aus" && istInfoSeite(pfad);
}

export function freiOhneZugang(pfad: string): boolean {
  return EIGENE_ABSICHERUNG.some((p) => pfad.startsWith(p)) || PATIENTENLINK.test(pfad) || PFLICHTSEITEN.includes(pfad) || pfad === "/demnaechst" || pfad === "/api/vorschau" || pfad.startsWith("/_next/") || pfad.startsWith("/brand/") || pfad.startsWith("/fonts/") || pfad === "/favicon.ico" || pfad === "/robots.txt" || pfad === "/icon.svg";
}
