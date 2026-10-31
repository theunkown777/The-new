// Build auf Vercel: Datenbank-Adresse finden, Migrationen einspielen,
// Grunddaten anlegen, App bauen. Ersetzt die frühere Befehlskette in
// package.json, damit fehlende Einstellungen verständlich gemeldet werden.
import { execSync } from "child_process";
import { resolveDatabaseUrls } from "../lib/databaseUrl";

const db = resolveDatabaseUrls(process.env);
if (!db) {
  console.error(`
============================================================
SORRIDA: Keine Datenbank-Adresse gefunden.

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
console.log(`Datenbank-Adresse aus ${db.source}`);

const run = (cmd: string, url: string) =>
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

run("prisma generate", db.runtime);
run("prisma migrate deploy", db.direct);
run("tsx prisma/seed.ts", db.direct);
run("next build", db.runtime);
