// Alle Upstash-Zugangsdaten aus der Umgebung sammeln. Vercel legt sie je
// nach Einrichtung als KV_REST_API_URL/_TOKEN, UPSTASH_REDIS_REST_URL/_TOKEN
// oder mit Präfix (z. B. STORAGE_KV_REST_API_URL) an. Nach dem Neuanlegen
// einer Datenbank bleiben alte Werte oft stehen; deshalb werden alle Paare
// gesammelt und der Limiter nimmt das erste, das antwortet.

export type RedisCredentials = { source: string; url: string; token: string };

const URL_SUFFIXES = ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"];

export function redisCandidates(env: Record<string, string | undefined>): RedisCredentials[] {
  const out: RedisCredentials[] = [];
  const seen = new Set<string>();
  const keys = Object.keys(env).sort();
  for (const suffix of URL_SUFFIXES) {
    for (const key of keys) {
      if (key !== suffix && !key.endsWith(`_${suffix}`)) continue;
      const url = env[key];
      const token = env[key.replace(/URL$/, "TOKEN")];
      if (!url || !token || !/^https:\/\//.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({ source: key.replace(/_URL$/, "_*"), url, token });
    }
  }
  return out;
}
