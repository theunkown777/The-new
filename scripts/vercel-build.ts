// Build auf Vercel: Datenbank-Adresse finden, Migrationen einspielen,
// Grunddaten anlegen, App bauen. Ersetzt die frühere Befehlskette in
// package.json, damit fehlende Einstellungen verständlich gemeldet werden.
import { execSync } from "child_process";
import { describeDatabaseEnv, resolveDatabaseUrls } from "../lib/databaseUrl";

const db = resolveDatabaseUrls(process.env);
const found = describeDatabaseEnv(process.env);
console.log(`Vercel-Umgebung: ${process.env.VERCEL_ENV ?? "unbekannt"} · Branch: ${process.env.VERCEL_GIT_COMMIT_REF ?? "?"}`);
console.log(`Datenbank-Variablen: ${found.length ? found.join(", ") : "keine"}`);
if (!db) {
  console.error(`
============================================================
SORRIDA: Keine Datenbank-Adresse gefunden.
(Umgebung: ${process.env.VERCEL_ENV ?? "unbekannt"}. Steht hier "preview", gelten die
 Variablen vermutlich nur für Production: Variable auch für Preview freigeben
 oder unter Settings → Environments den Production-Branch prüfen.)

So beheben (Vercel, Projekt öffnen):
1. Reiter "Storage" → Ihre Neon-Datenbank → "Connect Project"
   → dieses Projekt auswählen, Häkchen bei Production → Connect.
   ODER Settings → Environment Variables → Name DATABASE_URL,
   Wert = Connection String aus Neon (beginnt mit postgresql://),
   Häkchen bei Production → Save.
2. Deployments → letzter Eintrag → … → Redeploy.
============================================================
`);
  process.exit(1);
}
const host = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "?";
  }
};
console.log(`Datenbank-Adresse aus ${db.source}: App nutzt ${host(db.runtime)}, Migrationen über ${host(db.direct)}`);

const run = (cmd: string, url: string) =>
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

run("prisma generate", db.runtime);
run("prisma migrate deploy", db.direct);
run("tsx prisma/seed.ts", db.direct);
run("next build", db.runtime);
