// Bausteine für den Selbsttest /api/status, ohne Datenbank und Netz prüfbar.

export type Punkt = { ok: boolean; info: string };

/**
 * Missbrauchsschutz: Ohne erreichbaren Redis zählt jede Serverless-Instanz
 * für sich, Begrenzungen (Anmeldung, Portal-Links, KI-Aufrufe) greifen dann
 * nicht zuverlässig. Lokal und in der Vorschau in Ordnung, in Produktion
 * (VERCEL_ENV=production) ein Fehler.
 */
export function redisPunkt(
  redis: { state: "nicht angebunden" | "erreichbar" | "nicht erreichbar"; source?: string; tried: number },
  env: Record<string, string | undefined> = process.env,
): Punkt {
  const produktion = env.VERCEL_ENV === "production";
  if (redis.state === "erreichbar") {
    return { ok: true, info: `Upstash erreichbar (${redis.source}${redis.tried > 1 ? `, ${redis.tried - 1} weitere Zugangsdaten gesetzt, die nicht antworten – können gelöscht werden` : ""})` };
  }
  if (redis.state === "nicht angebunden") {
    return produktion
      ? { ok: false, info: "nicht angebunden: Zähler nur im Speicher je Instanz, Begrenzungen greifen in Produktion nicht zuverlässig. Upstash-Datenbank mit dem Projekt verbinden (Production) und neu deployen." }
      : { ok: true, info: "nicht angebunden (Zähler nur im Speicher, außerhalb der Produktion in Ordnung)" };
  }
  return {
    ok: !produktion,
    info: `${redis.tried} Zugangsdaten gesetzt, keine antwortet: läuft ersatzweise im Speicher. Neue Upstash-Datenbank mit dem Projekt verbinden (Production) und neu deployen, alte KV_/UPSTASH_-Variablen löschen.`,
  };
}

/**
 * Öffentliche Kurzfassung: je Punkt nur der Name und "ok" / "nicht ok".
 * Anbieter, Region, Commit, Variablennamen und Hinweise zur Behebung stehen
 * nur in der ausführlichen Fassung (Sorrida-Team oder CRON_SECRET).
 */
export function kurzfassung(checks: Record<string, Punkt>): Record<string, Punkt> {
  return Object.fromEntries(Object.entries(checks).map(([name, c]) => [name, { ok: c.ok, info: c.ok ? "ok" : "nicht ok" }]));
}

/** Zeitkonstanter Vergleich für "Authorization: Bearer <CRON_SECRET>". */
export function cronSecretPasst(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const soll = `Bearer ${secret}`;
  let diff = header.length ^ soll.length;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ (header.charCodeAt(i) || 0);
  return diff === 0;
}
