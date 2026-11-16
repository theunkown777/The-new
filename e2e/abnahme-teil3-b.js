const fs = require('fs');
const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('B Patientenliste einlesen', async (b) => {
  const c = await b.newContext(KONTEXT); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  const csv = D + '/patienten.csv';
  fs.writeFileSync(csv, ['Nachname;Vorname;Geburtsdatum;Kasse;Mobil',
    'Abnahme;Anna;12.03.1980;AOK Nordwest;0171 2345678',
    'Abnahme;Bernd;01.11.1975;TK;0172 9876543',
    'Abnahme;Clara;31.02.1990;Barmer;0173 1112223',       // kaputtes Datum
    'Abnahme;Dieter;05.05.1955;DAK;0174 5556667',
    'Abnahme;Anna;12.03.1980;AOK Nordwest;0171 2345678',  // doppelt
    'Abnahme;Emil;24.12.2001;Debeka;0175 4443332'].join('\r\n'), 'utf8');
  await p.goto(L + '/patients'); await p.getByTestId('liste-einlesen').click(); await p.waitForURL('**/patients/import');
  const durchlauf = async () => {
    await p.getByTestId('import-datei').setInputFiles(csv);
    await p.getByTestId('import-erkannt').waitFor({ timeout: 8000 });
    const erkannt = await p.getByTestId('import-erkannt').innerText();
    await p.getByTestId('import-vorschau').click(); await p.getByTestId('import-vorschau-ergebnis').waitFor({ timeout: 15000 });
    const z = async (t) => await p.getByTestId(t).innerText();
    return { erkannt, neu: await z('import-zahl-neu'), vorhanden: await z('import-zahl-vorhanden'), fehler: await z('import-zahl-fehler') };
  };
  let v = await durchlauf();
  pruef('Datei erkannt: 6 Zeilen, Semikolon', /6 Zeilen/.test(v.erkannt) && /Semikolon/.test(v.erkannt), v.erkannt);
  pruef('Vorschau: 4 neu, 1 vorhanden (doppelt), 1 fehlerhaft', v.neu === '4' && v.vorhanden === '1' && v.fehler === '1', JSON.stringify(v));
  const fl = await p.getByTestId('import-fehlerliste').innerText().catch(() => '');
  pruef('Fehlerliste nennt Zeile 4 und das Datum', /Zeile 4/.test(fl) && /datum/i.test(fl), fl.replace(/\n/g, ' '));
  await p.getByTestId('import-vorschau-ergebnis').scrollIntoViewIfNeeded(); await p.screenshot({ path: D + '/b-import-1280.png' });
  await p.getByTestId('import-speichern').click(); await p.getByTestId('import-fertig').waitFor({ timeout: 20000 });
  const fertig = await p.getByTestId('import-fertig').innerText();
  pruef('Speichern: Fertig-Meldung mit 4 neu', /4 .* neu angelegt/.test(fertig), fertig.split('\n')[1]);
  const inDb = sql(`select count(*) from "Patient" where "practiceId"='${pr}' and "lastName"='Abnahme'`);
  pruef('4 Datensätze in der Datenbank', inDb === '4', inDb);
  const einw = sql(`select count(*) from "Patient" where "practiceId"='${pr}' and "lastName"='Abnahme' and ("contactConsentAt" is not null or "whatsappConsentAt" is not null)`);
  pruef('Keine Einwilligungen aus der Datei übernommen', einw === '0', einw);
  await p.reload(); v = await durchlauf();
  pruef('Zweiter Lauf: 0 neu, 5 vorhanden', v.neu === '0' && v.vorhanden === '5' && await p.getByTestId('import-speichern').isDisabled(), JSON.stringify(v));
  await p.goto(L + '/patients?q=Abnahme'); await p.waitForTimeout(800);
  let liste = await p.locator('main').innerText();
  if (!/Abnahme/.test(liste)) { await p.goto(L + '/patients'); const s = p.locator('main input').first(); await s.fill('Abnahme'); await p.waitForTimeout(1200); liste = await p.locator('main').innerText(); }
  pruef('Die Eingelesenen stehen in der Liste', ['Anna', 'Bernd', 'Dieter', 'Emil'].every((n) => new RegExp('Abnahme,? ' + n + '|' + n + ' Abnahme').test(liste)), (liste.match(/Abnahme[^\n]*/g) || []).slice(0, 4).join(' | '));
  // Handy
  const hc = await b.newContext({ ...HANDY, storageState: await c.storageState() }); const hp = await hc.newPage();
  await hp.goto(L + '/patients/import'); await hp.getByTestId('import-datei').setInputFiles(csv); await hp.getByTestId('import-vorschau').click(); await hp.getByTestId('import-vorschau-ergebnis').waitFor();
  const breit = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruef('390 px: Vorschau ohne waagerechtes Scrollen', breit <= 390, 'Breite ' + breit);
  await hp.screenshot({ path: D + '/b-import-390.png', fullPage: true });
  // Mitarbeiterin
  await p.goto(L + '/dashboard'); await p.locator('[data-testid="demo-rollenwechsel"]:visible').click(); await p.waitForTimeout(500); await p.waitForURL('**/dashboard'); await p.waitForTimeout(1500);
  const rolle = await p.getByTestId('demo-rolle-aktiv').innerText();
  await p.goto(L + '/patients/import');
  pruef('Als Mitarbeiterin: kein Recht zum Einlesen', (await p.getByTestId('import-kein-recht').count()) === 1 && (await p.getByTestId('import-datei').count()) === 0, rolle);
  await p.goto(L + '/patients');
  pruef('Als Mitarbeiterin: Knopf „Liste einlesen“ fehlt', (await p.getByTestId('liste-einlesen').count()) === 0);
  const api = await p.evaluate(async () => { const r = await fetch('/api/patients/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modus: 'speichern', patienten: [{ zeile: 2, lastName: 'Hack', firstName: 'Test' }] }) }); return r.status; });
  pruef('Als Mitarbeiterin: Schnittstelle lehnt ab (403)', api === 403, 'Status ' + api);
  pruef('Banner nennt die Rolle über rollenLabel', /Mitarbeiter\/in/.test(rolle), rolle);
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
});
