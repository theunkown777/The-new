// Adresse des Absenders für die Begrenzungen je Anschluss (lib/rateLimit.ts).
// Ohne Node-Abhängigkeiten.
//
// Die Kopfzeile X-Forwarded-For kann jeder Absender selbst mitschicken. Verlässlich ist nur der Teil,
// den der eigene Eingang (Vercel bzw. ein vorgeschalteter Proxy) anhängt:
//   - Auf Vercel setzt die Plattform x-vercel-forwarded-for und x-real-ip selbst und überschreibt
//     mitgeschickte Werte. Diese beiden gelten zuerst.
//   - Sonst gilt der LETZTE Eintrag von X-Forwarded-For: Ein Proxy hängt die Adresse, die er selbst
//     gesehen hat, hinten an. Die Einträge davor stammen vom Absender und zählen nicht.
// Läuft der Server ganz ohne Proxy (lokal mit `next start`), gibt es keine verlässliche Angabe:
// Dann wählt der Absender den Wert selbst. Im Betrieb steht immer ein Eingang davor.

type Kopf = { get(name: string): string | null };

const erster = (wert: string | null | undefined) => (wert ?? "").split(",")[0].trim();
const sauber = (wert: string) => (wert && wert.length <= 64 && /^[0-9A-Fa-f:.]+$/.test(wert) ? wert.toLowerCase() : "");

export function anschluss(kopf: Kopf, env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL) {
    const vercel = sauber(erster(kopf.get("x-vercel-forwarded-for"))) || sauber(erster(kopf.get("x-real-ip")));
    if (vercel) return vercel;
  }
  const kette = (kopf.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return sauber(kette[kette.length - 1] ?? "") || sauber(erster(kopf.get("x-real-ip"))) || "unknown";
}

/** Dasselbe für Kopfzeilen als einfaches Objekt (next-auth reicht sie so durch). */
export function anschlussAus(kopf: Record<string, string | string[] | undefined> | null | undefined, env: Record<string, string | undefined> = process.env): string {
  return anschluss({ get: (name) => { const v = kopf?.[name]; return Array.isArray(v) ? v.join(",") : v ?? null; } }, env);
}
