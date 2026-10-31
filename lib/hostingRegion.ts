// Standort von Datenbank und Funktionen für den Selbsttest (/api/status).
// Die Website sagt "Anwendung läuft in Frankfurt"; der Datenbank-Standort
// steht im AVV. Hier lässt sich beides nach dem Deploy nachprüfen.

const KNOWN: { re: RegExp; region: (m: RegExpMatchArray) => string; provider: string }[] = [
  { provider: "Neon", re: /\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/, region: (m) => m[1] },
  { provider: "Supabase", re: /^aws-\d+-([a-z]{2}-[a-z]+-\d)\.pooler\.supabase\.com$/, region: (m) => m[1] },
  { provider: "Prisma Postgres / Accelerate", re: /prisma-data\.net$|accelerate\.prisma/, region: () => "unbekannt" },
];

const EU = /^eu-|^europe-|frankfurt|fra/i;

export function databaseLocation(url: string | undefined): { provider: string; region: string; eu: boolean | null } {
  if (!url) return { provider: "nicht gesetzt", region: "–", eu: null };
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { provider: "unbekannt", region: "–", eu: null };
  }
  if (host === "localhost" || host === "127.0.0.1") return { provider: "lokal", region: "lokal", eu: null };
  for (const k of KNOWN) {
    const m = host.match(k.re);
    if (m) {
      const region = k.region(m);
      return { provider: k.provider, region, eu: region === "unbekannt" ? null : EU.test(region) };
    }
  }
  return { provider: host.split(".").slice(-2).join("."), region: "unbekannt", eu: null };
}
