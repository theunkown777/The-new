// Kleine, reine Helfer für die Belastungsprobe (scripts/lasttest.ts).
// Die Probe legt viele erfundene Praxen in einer LOKALEN Datenbank an und misst Antwortzeiten.
// Wichtigster Baustein ist die Sperre: Gegen eine entfernte Datenbank läuft die Probe nie.

/** Kennzeichen im Namen jeder Praxis der Belastungsprobe; daran wird am Ende gelöscht. */
export const LASTTEST_KENNZEICHEN = "LASTTEST";

/** Größe der Probe je Praxis. */
export const LASTTEST_UMFANG = { praxen: 40, patienten: 2500, vorschlaege: 1200, termine: 2000, rechnungen: 800 } as const;

/** Ab dieser Antwortzeit (Median, Millisekunden) wird eine Seite untersucht. */
export const LASTTEST_GRENZE_MS = 800;

const LOKALE_RECHNER = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Zeigt die Adresse auf eine Datenbank auf diesem Rechner? Nur dann darf die Belastungsprobe laufen.
 * Unlesbare Adressen, fremde Rechner und Adressen ohne Rechnernamen gelten als nicht lokal.
 */
export function istLokaleDatenbank(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return false;
    // Ein abweichender Rechner in ?host= (Socket oder anderer Server) zählt nicht als lokal.
    const hostParam = u.searchParams.get("host");
    if (hostParam && !LOKALE_RECHNER.has(hostParam) && !hostParam.startsWith("/")) return false;
    return LOKALE_RECHNER.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Median einer Messreihe; leere Reihe: NaN. */
export function median(werte: number[]): number {
  if (!werte.length) return NaN;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type Messung = { ziel: string; status: number; ms: number; kb: number };

/** Messwerte als Markdown-Tabelle; Zeilen über der Grenze sind markiert. */
export function messTabelle(zeilen: Messung[], grenzeMs = LASTTEST_GRENZE_MS): string {
  const kopf = "| Seite | Status | Median (ms) | Größe (kB) | über Grenze |\n|---|---|---|---|---|";
  const rest = zeilen.map((z) => `| ${z.ziel} | ${z.status} | ${Math.round(z.ms)} | ${Math.round(z.kb)} | ${z.ms > grenzeMs ? "ja" : "nein"} |`);
  return [kopf, ...rest].join("\n");
}

/** Liste in Blöcke teilen (für createMany). */
export function bloecke<T>(liste: T[], groesse: number): T[][] {
  const n = Math.max(1, Math.floor(groesse));
  const aus: T[][] = [];
  for (let i = 0; i < liste.length; i += n) aus.push(liste.slice(i, i + n));
  return aus;
}
