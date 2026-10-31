// Findet die Datenbank-Adresse, egal unter welchem Namen Vercel sie anlegt.
// Die Neon-Anbindung in Vercel setzt je nach Einrichtung DATABASE_URL,
// POSTGRES_PRISMA_URL, POSTGRES_URL oder dieselben Namen mit eigenem Präfix
// (z. B. STORAGE_DATABASE_URL). Ohne diese Erkennung bricht der Build mit
// "Environment variable not found: DATABASE_URL" ab.

type Env = Record<string, string | undefined>;

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "NEON_DATABASE_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DIRECT_URL", "NEON_DATABASE_URL_UNPOOLED"];

const isPg = (v: string | undefined): v is string => !!v && /^postgres(ql)?:\/\//.test(v);

function find(env: Env, names: string[]): { name: string; url: string } | null {
  for (const n of names) if (isPg(env[n])) return { name: n, url: env[n]! };
  // Mit Präfix, z. B. STORAGE_POSTGRES_PRISMA_URL
  for (const n of names) {
    const key = Object.keys(env).sort().find((k) => k.endsWith(`_${n}`) && isPg(env[k]));
    if (key) return { name: key, url: env[key]! };
  }
  return null;
}

/** Neon-Pooler (PgBouncer) braucht für Prisma pgbouncer=true. */
function forPrisma(url: string): string {
  if (!/-pooler\./.test(url) || /[?&]pgbouncer=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
}

export function resolveDatabaseUrls(env: Env): { runtime: string; direct: string; source: string } | null {
  const pooled = find(env, POOLED);
  const direct = find(env, DIRECT);
  const main = pooled ?? direct;
  if (!main) return null;
  return {
    runtime: forPrisma(main.url),
    // Migrationen nicht über den Pooler.
    direct: (direct ?? main).url,
    source: direct && pooled ? `${pooled.name} + ${direct.name}` : main.name,
  };
}
