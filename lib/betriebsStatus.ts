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

/**
 * Fehler aus dem Betrieb (lib/fehlerlog.ts): in Ordnung, solange in 24 Stunden nicht mehr als
 * `grenze` verschiedene Fehler aufgetreten sind. Genannt wird nur die Zahl.
 */
export function fehlerPunkt(anzahl: number, grenze = 20): Punkt {
  return { ok: anzahl <= grenze, info: `${anzahl} ${anzahl === 1 ? "verschiedener" : "verschiedene"}${anzahl > grenze ? ` (mehr als ${grenze}): Ansicht /betrieb prüfen` : ""}` };
}

/** Einstellungen der Anmeldung: Schlüssel gesetzt und Adresse passend zum geöffneten Host. */
export function anmeldungPunkte(requestHost: string | null, env: Record<string, string | undefined> = process.env): { NEXTAUTH_SECRET: Punkt; NEXTAUTH_URL: Punkt } {
  let nextauthHost: string | null = null;
  try {
    nextauthHost = env.NEXTAUTH_URL ? new URL(env.NEXTAUTH_URL).host : null;
  } catch {
    nextauthHost = "ungültig";
  }
  return {
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET
      ? { ok: true, info: "gesetzt" }
      : { ok: false, info: "fehlt: in Vercel als Environment Variable setzen und neu deployen" },
    NEXTAUTH_URL: !nextauthHost
      ? { ok: !!env.VERCEL_URL, info: env.VERCEL_URL ? "nicht gesetzt (Vercel-Adresse wird automatisch genutzt)" : "fehlt" }
      : nextauthHost === requestHost
        ? { ok: true, info: nextauthHost }
        : requestHost?.endsWith(".vercel.app") && !nextauthHost.endsWith(".vercel.app")
          // Eigene Domain ist eingestellt, geöffnet wurde nur die technische Vercel-Adresse: richtig so
          ? { ok: true, info: `${nextauthHost} (eigene Domain; Anmeldung führt dorthin)` }
          : { ok: false, info: `zeigt auf ${nextauthHost}, geöffnet ist aber ${requestHost}: auf https://${requestHost} ändern oder die Seite unter ${nextauthHost} öffnen` },
  };
}

/** Antwortet die Datenbank? `ping` ist die kleinste Abfrage (SELECT 1). */
export async function datenbankPunkt(ping: () => Promise<unknown>): Promise<Punkt> {
  try {
    await ping();
    return { ok: true, info: "erreichbar" };
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    return { ok: false, info: `nicht erreichbar${code ? ` (${code})` : ""}: DATABASE_URL prüfen` };
  }
}

/** Was die öffentliche Seite /status zeigt: drei Ja/Nein-Angaben, keine Einzelheiten. */
export interface KernStatus { website: boolean; anmeldung: boolean; datenbank: boolean }

/** Aus den Punkten des Selbsttests die drei öffentlichen Angaben bilden (dieselben Punkte wie /api/status). */
export function kernAusPunkten(checks: Record<string, Punkt>): KernStatus {
  const kurz = kurzfassung(checks);
  return {
    // Wer diese Angabe liest, hat eine Antwort der Website bekommen.
    website: true,
    anmeldung: !!kurz.NEXTAUTH_SECRET?.ok && !!kurz.NEXTAUTH_URL?.ok,
    datenbank: !!kurz.Datenbank?.ok,
  };
}

/** Kurzfassung für /status: Anmeldung und Datenbank mit denselben Prüfungen wie /api/status. */
export async function kernStatus(requestHost: string | null, ping: () => Promise<unknown>, env: Record<string, string | undefined> = process.env): Promise<KernStatus> {
  return kernAusPunkten({ ...anmeldungPunkte(requestHost, env), Datenbank: await datenbankPunkt(ping) });
}
