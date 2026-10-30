import { Redis } from "@upstash/redis";

// Testmodus-Prinzip wie bei ANTHROPIC_API_KEY/RESEND_API_KEY (siehe
// lib/anthropic.ts, lib/email.ts): ohne angebundenen Redis-Store läuft der
// Limiter In-Memory weiter (nur pro Prozess, kein global konsistenter
// Schutz) statt zu crashen - relevant für lokale Entwicklung und Tests. In
// Produktion mit Upstash-Redis (per Vercel-Marketplace-Integration gesetzte
// KV_REST_API_URL/KV_REST_API_TOKEN) ist der Schutz über alle
// Serverless-Instanzen hinweg konsistent.
const HAS_REDIS = !!(
  (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
  (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
);

// Kurze Zeitgrenze und kaum Wiederholungen: ein nicht erreichbarer Store
// darf die Anmeldung nicht minutenlang blockieren.
const redis = HAS_REDIS
  ? Redis.fromEnv({ retry: { retries: 1, backoff: () => 200 }, signal: () => AbortSignal.timeout(1500) })
  : null;
const REDIS_COOLDOWN_MS = 60 * 1000;
let redisDownUntil = 0;

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

// Ist der Redis-Store nicht erreichbar (z. B. gelöschte Upstash-Datenbank,
// deren Zugangsdaten noch gesetzt sind), soll der Missbrauchsschutz nicht die
// Anmeldung lahmlegen: dann gilt für diesen Aufruf der In-Memory-Zähler.
async function withRedis<T>(op: (r: Redis) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  if (!redis || Date.now() < redisDownUntil) return { ok: false };
  try {
    return { ok: true, value: await op(redis) };
  } catch (err) {
    // Eine Minute lang nicht erneut versuchen, damit nicht jeder Aufruf auf die Zeitgrenze wartet.
    redisDownUntil = Date.now() + REDIS_COOLDOWN_MS;
    console.error("Rate-Limit: Redis nicht erreichbar, nutze Speicher-Zähler:", err);
    return { ok: false };
  }
}

/** Für /api/status: antwortet der Redis-Store wirklich? */
export async function redisStatus(): Promise<"nicht angebunden" | "erreichbar" | "nicht erreichbar"> {
  if (!redis) return "nicht angebunden";
  redisDownUntil = 0; // Statusprüfung testet immer live
  const res = await withRedis((r) => r.ping());
  return res.ok ? "erreichbar" : "nicht erreichbar";
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
