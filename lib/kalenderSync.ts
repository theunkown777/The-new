import dns from "dns/promises";
import net from "net";
import { prisma } from "@/lib/prisma";
import { belegungenAusIcs } from "@/lib/ics";

// Abgleich mit dem Kalender der Praxis: Sorrida ruft die Kalender-Adresse (ICS) ab und übernimmt
// nur die belegten Zeiten. Die Adresse gibt die Praxis selbst ein; deshalb wird sie streng geprüft
// (nur https, keine internen Adressen), bevor der Server sie abruft.

const MAX_BYTES = 3 * 1024 * 1024;
const ZEITGRENZE_MS = 8000;
export const SYNC_ALTER_MS = 15 * 60 * 1000;
/** Zeitraum, für den belegte Zeiten gehalten werden */
export const kalenderFenster = (jetzt = new Date()) => ({ von: new Date(jetzt.getTime() - 864e5), bis: new Date(jetzt.getTime() + 100 * 864e5) });

function privat(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privat(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

/** Adresse prüfen und vereinheitlichen (webcal:// wird https://). Gibt einen Fehlertext zurück, wenn sie nicht erlaubt ist. */
export function kalenderUrlPruefen(eingabe: string): { url: string } | { fehler: string } {
  const roh = eingabe.trim().replace(/^webcals?:\/\//i, "https://");
  let u: URL;
  try { u = new URL(roh); } catch { return { fehler: "Das ist keine gültige Adresse." }; }
  if (u.protocol !== "https:") return { fehler: "Die Kalender-Adresse muss mit https:// oder webcal:// beginnen." };
  if (u.username || u.password) return { fehler: "Adressen mit Benutzername und Passwort werden nicht unterstützt." };
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|intranet)$/.test(host) || !host.includes(".") || (net.isIP(host) && privat(host)))
    return { fehler: "Diese Adresse ist nur in Ihrem Praxisnetz erreichbar. Sorrida braucht eine Adresse, die aus dem Internet abrufbar ist, oder Sie laden die Kalenderdatei hoch." };
  if (roh.length > 2000) return { fehler: "Die Adresse ist zu lang." };
  return { url: u.toString() };
}

async function oeffentlich(host: string): Promise<boolean> {
  if (net.isIP(host)) return !privat(host);
  const adressen = await dns.lookup(host, { all: true }).catch(() => []);
  return adressen.length > 0 && adressen.every((a) => !privat(a.address));
}

/** Kalenderdatei abrufen: höchstens 3 Weiterleitungen, jede Station wird erneut geprüft. */
export async function kalenderAbrufen(adresse: string): Promise<{ text: string } | { fehler: string }> {
  let url = adresse;
  for (let i = 0; i < 4; i++) {
    const p = kalenderUrlPruefen(url);
    if ("fehler" in p) return p;
    if (!(await oeffentlich(new URL(p.url).hostname))) return { fehler: "Die Adresse führt in ein internes Netz und wird nicht abgerufen." };
    let res: Response;
    try {
      res = await fetch(p.url, { redirect: "manual", signal: AbortSignal.timeout(ZEITGRENZE_MS), headers: { Accept: "text/calendar, text/plain;q=0.8, */*;q=0.5", "User-Agent": "Sorrida-Kalender/1.0" }, cache: "no-store" });
    } catch { return { fehler: "Der Kalender ist nicht erreichbar (Zeitüberschreitung oder Verbindungsfehler)." }; }
    if (res.status >= 300 && res.status < 400) {
      const ziel = res.headers.get("location");
      if (!ziel) return { fehler: "Der Kalender leitet ohne Ziel weiter." };
      url = new URL(ziel, p.url).toString();
      continue;
    }
    if (res.status === 401 || res.status === 403) return { fehler: "Der Kalender verlangt eine Anmeldung. Bitte die geheime, öffentliche ICS-Adresse verwenden (in Google: „Privatadresse im iCal-Format“)." };
    if (!res.ok) return { fehler: `Der Kalender antwortet mit Fehler ${res.status}.` };
    const laenge = Number(res.headers.get("content-length") ?? 0);
    if (laenge > MAX_BYTES) return { fehler: "Die Kalenderdatei ist zu groß (über 3 MB)." };
    const puffer = await res.arrayBuffer();
    if (puffer.byteLength > MAX_BYTES) return { fehler: "Die Kalenderdatei ist zu groß (über 3 MB)." };
    const text = new TextDecoder("utf-8").decode(puffer);
    if (!/BEGIN:VCALENDAR/i.test(text)) return { fehler: "Unter dieser Adresse liegt keine Kalenderdatei (ICS). Bitte die Adresse prüfen." };
    return { text };
  }
  return { fehler: "Zu viele Weiterleitungen." };
}

/** Belegte Zeiten einer Quelle ersetzen. Gibt die Zahl der übernommenen Zeiten zurück. */
export async function belegungenErsetzen(practiceId: string, quelle: "abo" | "datei", icsText: string, jetzt = new Date()): Promise<number> {
  const { von, bis } = kalenderFenster(jetzt);
  const liste = belegungenAusIcs(icsText, von, bis).slice(0, 4000);
  await prisma.$transaction([
    prisma.kalenderBelegung.deleteMany({ where: { practiceId, quelle } }),
    prisma.kalenderBelegung.createMany({ data: liste.map((b) => ({ practiceId, quelle, start: b.start, ende: b.ende, ganztag: b.ganztag })) }),
  ]);
  return liste.length;
}

/** Kalender-Abo der Praxis jetzt abgleichen. */
export async function kalenderAbgleichen(practiceId: string, jetzt = new Date()): Promise<{ ok: true; anzahl: number } | { ok: false; fehler: string }> {
  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { kalenderUrl: true } });
  if (!praxis?.kalenderUrl) return { ok: false, fehler: "Es ist keine Kalender-Adresse hinterlegt." };
  const r = await kalenderAbrufen(praxis.kalenderUrl);
  if ("fehler" in r) {
    await prisma.practice.update({ where: { id: practiceId }, data: { kalenderSyncFehler: r.fehler.slice(0, 300) } });
    return { ok: false, fehler: r.fehler };
  }
  const anzahl = await belegungenErsetzen(practiceId, "abo", r.text, jetzt);
  await prisma.practice.update({ where: { id: practiceId }, data: { kalenderSyncAt: jetzt, kalenderSyncFehler: null } });
  return { ok: true, anzahl };
}

/** Vor dem Anbieten freier Zeiten: abgleichen, wenn der letzte Abgleich älter als 15 Minuten ist. */
export async function kalenderFrischHalten(practice: { id: string; kalenderUrl: string | null; kalenderSyncAt: Date | null }, jetzt = new Date()) {
  if (!practice.kalenderUrl) return;
  if (practice.kalenderSyncAt && jetzt.getTime() - practice.kalenderSyncAt.getTime() < SYNC_ALTER_MS) return;
  await kalenderAbgleichen(practice.id, jetzt).catch(() => undefined);
}
