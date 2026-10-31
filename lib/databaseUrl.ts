// Findet die Datenbank-Adresse, egal unter welchem Namen Vercel sie anlegt.
// Die Neon-Anbindung in Vercel setzt je nach Einrichtung DATABASE_URL,
// POSTGRES_PRISMA_URL, POSTGRES_URL oder dieselben Namen mit eigenem Präfix
// (z. B. STORAGE_DATABASE_URL). Ohne diese Erkennung bricht der Build mit
// "Environment variable not found: DATABASE_URL" ab.

type Env = Record<string, string | undefined>;

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "NEON_DATABASE_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DIRECT_URL", "NEON_DATABASE_URL_UNPOOLED"];

const isPg = (v: string | undefined): v is string => !!v && /^postgres(ql)?:\/\//.test(v);

function find(env: Env, names: string[], prefix?: string): { name: string; url: string; prefix: string } | null {
  if (prefix === undefined || prefix === "") {
    for (const n of names) if (isPg(env[n])) return { name: n, url: env[n]!, prefix: "" };
  }
  if (prefix === "") return null;
  // Mit Präfix, z. B. STORAGE_POSTGRES_PRISMA_URL
  for (const n of names) {
    const key = Object.keys(env)
      .sort()
      .find((k) => (prefix ? k === `${prefix}_${n}` : k.endsWith(`_${n}`)) && isPg(env[k]));
    if (key) return { name: key, url: env[key]!, prefix: key.slice(0, key.length - n.length - 1) };
  }
  return null;
}

/** Neon-Pooler (PgBouncer) braucht für Prisma pgbouncer=true. */
function forPrisma(url: string): string {
  if (!/-pooler\./.test(url) || /[?&]pgbouncer=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
}

/** Rechnername ohne "-pooler", um zu prüfen, ob zwei Adressen dieselbe Datenbank meinen. */
function dbHost(url: string): string {
  try {
    return new URL(url).hostname.replace("-pooler.", ".");
  } catch {
    return url;
  }
}

/** Direktverbindung zu einer gepoolten Neon-Adresse (Pooler-Teil im Rechnernamen entfernen). */
function unpooled(url: string): string {
  return url.replace(/-pooler\./, ".").replace(/([?&])pgbouncer=true&?/, "$1").replace(/[?&]$/, "");
}

export function resolveDatabaseUrls(env: Env): { runtime: string; direct: string; source: string } | null {
  const pooled = find(env, POOLED);
  if (!pooled) {
    const only = find(env, DIRECT);
    return only ? { runtime: forPrisma(only.url), direct: only.url, source: only.name } : null;
  }
  // Direktverbindung nur aus demselben Variablensatz (gleiches Präfix) und nur, wenn sie
  // auf dieselbe Datenbank zeigt. Sonst landen Migrationen in einer anderen Datenbank
  // als der, die die App nutzt (z. B. nach dem Verbinden einer zweiten Neon-Datenbank).
  const sameSet = find(env, DIRECT, pooled.prefix);
  const direct = sameSet && dbHost(sameSet.url) === dbHost(pooled.url) ? sameSet : null;
  return {
    runtime: forPrisma(pooled.url),
    direct: direct ? direct.url : unpooled(pooled.url),
    source: direct ? `${pooled.name} + ${direct.name}` : pooled.name,
  };
}
