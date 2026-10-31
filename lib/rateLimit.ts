import { Redis } from "@upstash/redis";
import { redisCandidates } from "@/lib/redisCredentials";

// Testmodus-Prinzip wie bei ANTHROPIC_API_KEY/RESEND_API_KEY (siehe
// lib/anthropic.ts, lib/email.ts): ohne angebundenen Redis-Store läuft der
// Limiter In-Memory weiter (nur pro Prozess, kein global konsistenter
// Schutz) statt zu crashen - relevant für lokale Entwicklung und Tests. In
// Produktion mit Upstash-Redis ist der Schutz über alle Serverless-Instanzen
// hinweg konsistent.
//
// Alle gesetzten Zugangsdaten (alte und neue Datenbank, mit und ohne Präfix);
// genutzt wird das erste Paar, das antwortet.
const candidates = redisCandidates(process.env).map((c) => ({
  ...c,
  // Kurze Zeitgrenze und kaum Wiederholungen: ein nicht erreichbarer Store
  // darf die Anmeldung nicht minutenlang blockieren.
  client: new Redis({ url: c.url, token: c.token, retry: { retries: 1, backoff: () => 200 }, signal: () => AbortSignal.timeout(1500) }),
  downUntil: 0,
}));
const REDIS_COOLDOWN_MS = 60 * 1000;

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

// Ist der Redis-Store nicht erreichbar (z. B. gelöschte Upstash-Datenbank,
// deren Zugangsdaten noch gesetzt sind), soll der Missbrauchsschutz nicht die
// Anmeldung lahmlegen: dann gilt für diesen Aufruf der In-Memory-Zähler.
async function withRedis<T>(op: (r: Redis) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  for (const c of candidates) {
    if (Date.now() < c.downUntil) continue;
    try {
      return { ok: true, value: await op(c.client) };
    } catch (err) {
      // Eine Minute lang nicht erneut versuchen, damit nicht jeder Aufruf auf die Zeitgrenze wartet.
      c.downUntil = Date.now() + REDIS_COOLDOWN_MS;
      console.error(`Rate-Limit: Redis (${c.source}) nicht erreichbar:`, err);
    }
  }
  return { ok: false };
}

/** Für /api/status: antwortet einer der Redis-Stores wirklich, und welcher? */
export async function redisStatus(): Promise<{ state: "nicht angebunden" | "erreichbar" | "nicht erreichbar"; source?: string; tried: number }> {
  if (!candidates.length) return { state: "nicht angebunden", tried: 0 };
  for (const c of candidates) {
    try {
      await c.client.ping();
      c.downUntil = 0;
      return { state: "erreichbar", source: c.source, tried: candidates.length };
    } catch {
      c.downUntil = Date.now() + REDIS_COOLDOWN_MS;
    }
  }
  return { state: "nicht erreichbar", tried: candidates.length };
}

function prefixed(key: string): string {
  return `ratelimit:${key}`;
}

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const res = await withRedis((r) => r.get<number>(prefixed(key)));
  if (res.ok) return (res.value ?? 0) >= limit;
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart > windowMs) return false;
  return bucket.count >= limit;
}

export async function recordAttempt(key: string, windowMs: number): Promise<void> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const res = await withRedis(async (r) => {
    const count = await r.incr(prefixed(key));
    if (count === 1) await r.expire(prefixed(key), windowSeconds);
  });
  if (res.ok) return;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export async function clearAttempts(key: string): Promise<void> {
  const res = await withRedis((r) => r.del(prefixed(key)));
  if (res.ok) return;
  buckets.delete(key);
}
