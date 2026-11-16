// Gemeinsame Helfer der Browser-Durchläufe (Playwright, Chromium).
//
// Einstellungen kommen aus der Umgebung, nichts ist an eine Maschine gebunden:
//   BASIS   Adresse der laufenden Anwendung, Standard http://localhost:3000
//   DB      Postgres-Adresse für psql (ohne ?schema=…). Fehlt sie, gilt DATABASE_URL, sonst die .env im Projektordner.
//   BILDER  Ordner für Bildschirmfotos und Hilfsdateien, Standard e2e/.bilder (steht in .gitignore)
//   E2E_IP  Absender-Adresse der Aufrufe. Standard: je Durchlauf eine zufällige, damit die Begrenzungen
//           (Gastzugänge, Anmeldungen je Anschluss) nicht über mehrere Durchläufe hinweg zählen. "aus" schaltet das ab.
//
// Aufruf einzeln:  node e2e/abnahme-teil3-a.js      Alle nacheinander:  node e2e/alle.js
// Jeder Durchlauf endet mit Code 1, wenn eine Prüfung fehlschlägt oder der Durchlauf abbricht.
// Voraussetzung: Die Anwendung läuft (next start), psql ist installiert, playwright ist installiert
// (npm install --no-save playwright && npx playwright install chromium). Playwright steht bewusst nicht in package.json.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');

const WURZEL = path.join(__dirname, '..');
const L = (process.env.BASIS || 'http://localhost:3000').replace(/\/+$/, '');
const D = path.resolve(process.env.BILDER || path.join(__dirname, '.bilder')); // Ordner für Bilder und Hilfsdateien
fs.mkdirSync(D, { recursive: true });

function dbAdresse() {
  let url = process.env.DB || process.env.DATABASE_URL || '';
  if (!url) {
    try { url = (fs.readFileSync(path.join(WURZEL, '.env'), 'utf8').match(/^DATABASE_URL="?([^"\n]+)/m) || [])[1] || ''; } catch { /* keine .env */ }
  }
  return url.replace(/\?.*/, '');
}
const DB = dbAdresse();
// ohne Shell, damit Zeichen wie $ (bcrypt-Hash) unverändert ankommen
const sql = (q) => {
  if (!DB) throw new Error('Keine Datenbank angegeben: DB oder DATABASE_URL setzen');
  return execFileSync('psql', [DB, '-At', '-c', q]).toString().trim();
};

let ok = 0, fehl = 0;
const pruef = (n, b, x = '') => { console.log(`${b ? 'OK  ' : 'FEHL'} ${n}${x ? ' — ' + x : ''}`); b ? ok++ : fehl++; return b; };
const stand = () => ({ ok, fehl });

const IP = process.env.E2E_IP === 'aus' ? null : process.env.E2E_IP || `10.${60 + Math.floor(Math.random() * 30)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const kopf = IP ? { extraHTTPHeaders: { 'x-forwarded-for': IP } } : {};
const KONTEXT = { viewport: { width: 1280, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', deviceScaleFactor: 1, ...kopf };
const HANDY = { viewport: { width: 390, height: 844 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', deviceScaleFactor: 1, isMobile: true, hasTouch: true, ...kopf };

/** Gastzugang öffnen; liefert die ID der neuen Demo-Praxis. */
async function demo(p, fach = 'hausarzt') {
  await p.goto(L + '/demo?fach=' + fach); await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForURL('**/dashboard', { timeout: 120000 });
  return sql(`select id from "Practice" where "isDemo" order by "createdAt" desc limit 1`);
}

/** Einen Durchlauf ausführen. Ein Abbruch zählt als fehlgeschlagene Prüfung; am Ende steht der Code 0 oder 1. */
async function lauf(name, fn) {
  const b = await chromium.launch();
  try { await fn(b); } catch (e) { console.log('ABBRUCH', String((e && e.message) || e).split('\n').slice(0, 3).join(' / ')); fehl++; }
  console.log(`\n${name}: ${ok} bestanden, ${fehl} fehlgeschlagen`);
  await b.close().catch(() => {});
  process.exitCode = fehl ? 1 : 0;
}

/** Für Durchläufe mit eigener Zählung: Abbruch melden und mit Code 1 enden. */
function abbruch(e) {
  console.log('ABBRUCH', String((e && e.message) || e).split('\n').slice(0, 3).join(' / '));
  process.exit(1);
}

module.exports = { chromium, devices, L, D, DB, WURZEL, sql, pruef, stand, KONTEXT, HANDY, demo, lauf, abbruch };
