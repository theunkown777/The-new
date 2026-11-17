// Starter: führt alle Browser-Durchläufe nacheinander aus und druckt eine Zusammenfassung.
//
//   node e2e/alle.js                 alle Durchläufe
//   node e2e/alle.js teil3-a sprachen  nur Durchläufe, deren Dateiname eines der Wörter enthält
//
// Umgebung wie in e2e/gemeinsam.js: BASIS (Standard http://localhost:3000), DB, BILDER (Standard e2e/.bilder).
// Je Durchlauf gibt es einen eigenen Unterordner für Bilder. Endet mit Code 1, wenn ein Durchlauf fehlschlägt.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASIS = (process.env.BASIS || 'http://localhost:3000').replace(/\/+$/, '');
const BILDER = path.resolve(process.env.BILDER || path.join(__dirname, '.bilder'));
const ZEITLIMIT_MIN = Number(process.env.E2E_ZEITLIMIT_MIN || 20);

// Reihenfolge: zuerst die kurzen Prüfungen ohne Registrierung, die große Generalprobe zum Schluss.
const DURCHLAEUFE = [
  'pruefung-4-alle-fachrichtungen.js',
  'pruefung-4-sprachen.js',
  'meine-praxen.js',
  'abnahme-teil3-a.js',
  'abnahme-teil3-b.js',
  'abnahme-teil3-c.js',
  'abnahme-teil3-d.js',
  'abnahme-teil3-e.js',
  'abnahme-teil3-f.js',
  'abnahme-teil3-g.js',
  'abnahme-teil3-h.js',
  'probe-teil3.js',
  'generalprobe-5-mit-geburtsdatum.js',
];

/** Antwortet die Anwendung? Sonst wären alle Durchläufe nur Zeitüberschreitungen. */
async function erreichbar() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASIS + '/api/status', { signal: AbortSignal.timeout(5000) });
      if (r.status === 200 || r.status === 503) return true;
    } catch { /* noch nicht da */ }
    await new Promise((x) => setTimeout(x, 2000));
  }
  return false;
}

function einer(datei) {
  return new Promise((fertig) => {
    const name = datei.replace(/\.js$/, '');
    const bilder = path.join(BILDER, name);
    fs.mkdirSync(bilder, { recursive: true });
    const beginn = Date.now();
    let text = '';
    const kind = spawn(process.execPath, [path.join(__dirname, datei)], { env: { ...process.env, BASIS, BILDER: bilder }, stdio: ['ignore', 'pipe', 'pipe'] });
    const mit = (strom, ziel) => strom.on('data', (d) => { text += d; ziel.write(d); });
    mit(kind.stdout, process.stdout); mit(kind.stderr, process.stderr);
    const uhr = setTimeout(() => { text += '\nZEITLIMIT\n'; kind.kill('SIGKILL'); }, ZEITLIMIT_MIN * 60_000);
    kind.on('close', (code) => {
      clearTimeout(uhr);
      const zeilen = text.split('\n');
      fertig({
        name,
        code: code === 0 ? 0 : 1,
        ok: zeilen.filter((z) => z.startsWith('OK  ')).length,
        fehl: zeilen.filter((z) => z.startsWith('FEHL')).length,
        abbruch: zeilen.some((z) => z.startsWith('ABBRUCH') || z === 'ZEITLIMIT'),
        fehlgeschlagen: zeilen.filter((z) => z.startsWith('FEHL') || z.startsWith('ABBRUCH')).map((z) => z.slice(0, 200)),
        sekunden: Math.round((Date.now() - beginn) / 1000),
      });
    });
  });
}

(async () => {
  const filter = process.argv.slice(2);
  const liste = DURCHLAEUFE.filter((d) => !filter.length || filter.some((f) => d.includes(f)));
  if (!liste.length) { console.log('Kein Durchlauf passt zu: ' + filter.join(', ')); process.exit(1); }
  for (const d of liste) if (!fs.existsSync(path.join(__dirname, d))) { console.log('Datei fehlt: e2e/' + d); process.exit(1); }
  if (!(await erreichbar())) { console.log(`Die Anwendung antwortet nicht unter ${BASIS}. Erst starten (npm run build && npm start), dann erneut aufrufen.`); process.exit(1); }

  const ergebnisse = [];
  for (const d of liste) {
    console.log(`\n=== ${d} ===`);
    ergebnisse.push(await einer(d));
  }

  console.log('\n=== Zusammenfassung ===');
  for (const e of ergebnisse) {
    console.log(`${e.code === 0 ? 'OK  ' : 'FEHL'} ${e.name.padEnd(36)} ${String(e.ok).padStart(3)} bestanden, ${String(e.fehl).padStart(2)} fehlgeschlagen${e.abbruch ? ', abgebrochen' : ''} (${e.sekunden} s)`);
  }
  const schlecht = ergebnisse.filter((e) => e.code !== 0);
  if (schlecht.length) {
    console.log('\nFehlgeschlagene Prüfungen:');
    for (const e of schlecht) for (const z of e.fehlgeschlagen.length ? e.fehlgeschlagen : ['(ohne Meldung beendet)']) console.log(`  ${e.name}: ${z}`);
  }
  const summe = (k) => ergebnisse.reduce((s, e) => s + e[k], 0);
  console.log(`\n${ergebnisse.length} Durchläufe, ${summe('ok')} Prüfungen bestanden, ${summe('fehl')} fehlgeschlagen, ${schlecht.length} Durchläufe nicht in Ordnung. Bilder: ${path.relative(process.cwd(), BILDER) || '.'}`);
  process.exit(schlecht.length ? 1 : 0);
})();
