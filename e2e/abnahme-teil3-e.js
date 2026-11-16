const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('E Warteliste', async (b) => {
  const c = await b.newContext({ ...KONTEXT, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  const pats = sql(`select id||'|'||"lastName"||'|'||"firstName" from "Patient" where "practiceId"='${pr}' and not "ohneAkte" order by "lastName" limit 2`).split('\n').map((x) => x.split('|'));
  const morgen = new Date(Date.now() + 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const tid = 'tw' + Date.now();
  sql(`insert into "Appointment"(id,"practiceId","patientId",start,minutes,reason) values ('${tid}','${pr}','${pats[1][0]}','${morgen} 09:00:00',30,'Kontrolle Abnahme')`);
  await p.goto(L + '/termine?tag=' + morgen);
  pruef('Warteliste anfangs leer', (await p.getByTestId('warteliste-leer').count()) === 1);
  await p.getByTestId('warteliste-neu').click();
  await p.getByTestId('warteliste-patient').fill(pats[0][1]); await p.getByTestId('warteliste-treffer').first().waitFor({ timeout: 8000 }); await p.getByTestId('warteliste-treffer').filter({ hasText: `${pats[0][1]}, ${pats[0][2]}` }).first().click(); // gleicher Nachname kommt vor: mit Vornamen wählen
  const ANLASS = 'Geheimer-Anlass Hautkontrolle';
  await p.getByTestId('warteliste-anlass').fill(ANLASS); await p.getByTestId('warteliste-zeit').selectOption('VORMITTAG'); await p.getByTestId('warteliste-notiz').fill('lieber früh');
  await p.getByTestId('warteliste-speichern').click(); await p.getByTestId('warteliste-eintrag').first().waitFor({ timeout: 8000 });
  const eintrag = await p.getByTestId('warteliste-eintrag').first().innerText();
  pruef('Eintrag angelegt und in der Liste', eintrag.includes(pats[0][1]) && eintrag.includes(ANLASS) && /vormittags/.test(eintrag), eintrag.replace(/\n/g, ' · '));
  pruef('Vor der Absage kein Vorschlag', (await p.getByTestId('warteliste-vorschlag').count()) === 0);
  const zeile = p.getByTestId('termin').filter({ hasText: 'Kontrolle Abnahme' });
  await zeile.getByTestId('termin-mehr').click(); await zeile.getByRole('button', { name: 'Abgesagt' }).click();
  await p.getByTestId('warteliste-vorschlag').waitFor({ timeout: 10000 }).catch(() => {});
  pruef('Nach der Absage: Vorschlag von der Warteliste am Termin', (await zeile.getByTestId('warteliste-vorschlag').count()) === 1 && (await zeile.getByTestId('warteliste-kandidat').first().innerText().catch(() => '')).includes(pats[0][1]));
  const tokenVor = sql(`select count(*) from "Patient" where id='${pats[0][0]}' and "portalTokenHash" is not null`);
  await zeile.getByTestId('warteliste-anbieten').first().click(); await zeile.getByTestId('warteliste-text').waitFor({ timeout: 10000 });
  const text = await zeile.getByTestId('warteliste-text').innerText();
  pruef('Text enthält einen Link', /https?:\/\/\S+/.test(text), text.replace(/\n/g, ' ').slice(0, 200));
  pruef('Text enthält keinen Anlass und keine Notiz', !text.includes(ANLASS) && !/Hautkontrolle|Kontrolle Abnahme|lieber früh/.test(text));
  pruef('Text nennt Tag und Uhrzeit der freien Zeit', /10:00/.test(text), (text.match(/[A-Z][a-z]+tag, [^.]*\.[^.]*\., \d\d:\d\d Uhr/) || [''])[0]);
  await zeile.getByTestId('warteliste-kopieren').click(); await p.waitForTimeout(300);
  pruef('Text kopieren legt ihn in die Zwischenablage', (await p.evaluate(() => navigator.clipboard.readText())).trim() === text.trim());
  await zeile.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.screenshot({ path: D + '/e-warteliste-1280.png' });
  pruef('In der Datenbank steht „angeboten“', sql(`select count(*) from "Warteliste" where "practiceId"='${pr}' and "angebotenAt" is not null`) === '1');
  // Link ohne Anmeldung öffnen
  const url = text.match(/https?:\/\/\S+/)[0].replace(/^https?:\/\/[^/]+/, L).replace(/[.,)]+$/, '');
  const hc = await b.newContext(HANDY); const hp = await hc.newPage();
  const antwort = await hp.goto(url); await hp.waitForTimeout(1500);
  const seite = await hp.locator('body').innerText();
  pruef('Link öffnet ohne Anmeldung die Seite der Person (390 px)', antwort.status() === 200 && !/\/login/.test(hp.url()) && !seite.includes(ANLASS), hp.url().replace(L, '').slice(0, 60));
  const breit = await hp.evaluate(() => document.documentElement.scrollWidth); pruef('390 px: kein waagerechtes Scrollen', breit <= 390, 'Breite ' + breit);
  await hp.screenshot({ path: D + '/e-angebot-390.png' });
  // Handy-Ansicht der Praxis
  const mc = await b.newContext({ ...HANDY, storageState: await c.storageState() }); const mp = await mc.newPage();
  await mp.goto(L + '/termine?tag=' + morgen); await mp.waitForTimeout(600);
  const mb = await mp.evaluate(() => document.documentElement.scrollWidth); pruef('390 px: /termine mit Vorschlag ohne waagerechtes Scrollen', mb <= 390, 'Breite ' + mb);
  // fremde Praxis: Angebot für einen fremden Eintrag
  const wid = sql(`select id from "Warteliste" where "practiceId"='${pr}' limit 1`);
  const c2 = await b.newContext(KONTEXT); const p2 = await c2.newPage(); await demo(p2);
  const st = await p2.evaluate(async ([w, t]) => (await fetch(`/api/warteliste/${w}/angebot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terminId: t }) })).status, [wid, tid]);
  pruef('Andere Praxis: Angebot für fremden Eintrag → 404', st === 404, 'Status ' + st);
  const st2 = await p2.evaluate(async (w) => (await fetch(`/api/warteliste/${w}`, { method: 'DELETE' })).status, wid);
  pruef('Andere Praxis: fremden Eintrag entfernen → abgelehnt', st2 === 404 && sql(`select count(*) from "Warteliste" where id='${wid}'`) === '1', 'Status ' + st2);
  await p.reload(); await p.getByTestId('warteliste-entfernen').first().click(); await p.waitForTimeout(1200);
  pruef('Eintrag entfernen', (await p.getByTestId('warteliste-eintrag').count()) === 0);
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
});
