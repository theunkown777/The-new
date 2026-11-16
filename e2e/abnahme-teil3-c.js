const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
const bcrypt = require('bcryptjs');
const anmelden = async (b, email, pw, opt = KONTEXT) => {
  const c = await b.newContext(opt); const p = await c.newPage();
  await p.goto(L + '/login'); await p.locator('input[type="email"]').fill(email); await p.locator('input[type="password"]').fill(pw);
  await p.getByRole('button', { name: /anmelden/i }).first().click(); await p.waitForURL('**/dashboard', { timeout: 30000 });
  return { c, p };
};
const api = (p, methode, pfad, body) => p.evaluate(async ([m, u, bd]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: bd ? JSON.stringify(bd) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, j }; }, [methode, pfad, body]);
lauf('C Rollen und Standorte', async (b) => {
  const c = await b.newContext(KONTEXT); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  const [uid, email] = sql(`select id||'|'||email from "User" where "practiceId"='${pr}' and role='staff' order by "createdAt" limit 1`).split('|');
  const pw = 'Abnahme-' + Math.random().toString(36).slice(2, 10) + '!9';
  sql(`update "User" set "passwordHash"='${bcrypt.hashSync(pw, 10)}', "emailVerifiedAt"=now() where id='${uid}'`);
  // Patient mit Rechnung für die Suche
  const [rnr, rnach] = sql(`select i.number||'|'||p."lastName" from "Invoice" i join "Patient" p on p.id=i."patientId" where i."practiceId"='${pr}' limit 1`).split('|');
  let s = await api(p, 'GET', '/api/suche?q=' + encodeURIComponent(rnach));
  const hatRechnung = (j) => JSON.stringify(j).includes(rnr) || (j?.treffer || []).some((t) => /rechnung|zahlung/i.test(t.gruppe || t.art || ''));
  pruef('Geschäftsführung: Suche liefert Rechnungen', hatRechnung(s.j), `${rnach} / ${rnr}`);
  // Rolle über die Team-Einstellungen ändern
  await p.goto(L + '/settings/team'); await p.getByTestId('rolle-' + uid).selectOption('behandler'); await p.waitForTimeout(1500);
  pruef('Team-Einstellungen: Rolle auf Behandler/in gesetzt', sql(`select role from "User" where id='${uid}'`) === 'behandler', sql(`select role from "User" where id='${uid}'`));
  await p.screenshot({ path: D + '/c-team-1280.png' });

  // --- als Behandler/in
  const { c: c2, p: q } = await anmelden(b, email, pw);
  const f2 = []; q.on('pageerror', (e) => f2.push(e.message));
  const menue = await q.getByTestId('app-sidebar').innerText();
  pruef('Menü: Zahlungen und Analyse fehlen, statt Einstellungen „Mein Konto“', !/\nZahlungen\n|^Zahlungen$/m.test(menue) && !/Analyse/.test(menue) && /Mein Konto/.test(menue) && !/Einstellungen/.test(menue), menue.replace(/\n+/g, ' · ').slice(0, 260));
  pruef('Banner nennt „Behandler/in“', /Behandler\/in/.test(await q.getByTestId('demo-rolle-aktiv').innerText()), await q.getByTestId('demo-rolle-aktiv').innerText());
  await q.goto(L + '/settings');
  pruef('/settings zeigt den Hinweis und nur das eigene Konto', (await q.getByTestId('einstellungen-eingeschraenkt').count()) === 1 && (await q.locator('main a.card').count()) <= 2, (await q.locator('main a.card h2').allInnerTexts()).join(', '));
  await q.screenshot({ path: D + '/c-behandler-settings-1280.png' });
  for (const u of ['/settings/catalog', '/settings/team', '/settings/billing', '/settings/termine', '/settings/empfang', '/settings/praxis', '/settings/protokoll', '/settings/standorte', '/settings/templates']) {
    await q.goto(L + u); await q.waitForTimeout(200);
    pruef(`${u} leitet um`, /\/settings$/.test(q.url()), q.url().replace(L, ''));
  }
  await q.goto(L + '/settings/security');
  pruef('/settings/security bleibt erreichbar', /\/settings\/security$/.test(q.url()) && /Zwei-Faktor|Passwort/.test(await q.locator('main').innerText()));
  await q.goto(L + '/zahlungen');
  pruef('/zahlungen zeigt „kein Recht“', (await q.getByTestId('zahlungen-kein-recht').count()) === 1 && (await q.getByTestId('invoice-table').count()) === 0);
  await q.goto(L + '/analyse'); await q.waitForTimeout(300);
  const an = await q.locator('main').innerText();
  pruef('/analyse zeigt keine Zahlen', !/€/.test(an) || /Freigabe|keine Berechtigung|nicht freigegeben/i.test(an), q.url().replace(L, '') + ' ' + an.slice(0, 80).replace(/\n/g, ' '));
  await q.goto(L + '/dashboard');
  s = await api(q, 'GET', '/api/suche?q=' + encodeURIComponent(rnach));
  pruef('Suche liefert keine Rechnungen', s.status === 200 && !hatRechnung(s.j) && (s.j.treffer || []).length > 0, `${(s.j.treffer || []).length} Treffer`);
  s = await api(q, 'GET', '/api/suche?q=' + encodeURIComponent(rnr));
  pruef('Suche nach Rechnungsnummer liefert nichts', !JSON.stringify(s.j).includes(rnr));
  s = await api(q, 'GET', '/api/suche?q=DATEV');
  pruef('Suche: Seite Zahlungen wird nicht angeboten', !/zahlungen/i.test(JSON.stringify(s.j)), JSON.stringify(s.j).slice(0, 120));
  const zu = [['GET', '/api/invoices'], ['GET', '/api/settings/export'], ['GET', '/api/settings/team'], ['POST', '/api/settings/team', { email: 'x@test.local', name: 'X', role: 'admin' }], ['PATCH', '/api/settings/team/' + uid, { role: 'admin' }], ['POST', '/api/locations', { name: 'Fremd' }], ['POST', '/api/settings/empfang', { pin: '123456' }], ['POST', '/api/patients/import', { modus: 'speichern', patienten: [] }]];
  for (const [m, u, bd] of zu) { const r = await api(q, m, u, bd); pruef(`Schnittstelle ${m} ${u} abgelehnt`, [401, 403, 404, 405].includes(r.status), 'Status ' + r.status); }
  pruef('Rolle unverändert Behandler/in', sql(`select role from "User" where id='${uid}'`) === 'behandler');
  const hc = await b.newContext({ ...HANDY, storageState: await c2.storageState() }); const hp = await hc.newPage();
  await hp.goto(L + '/dashboard'); await hp.getByRole('button', { name: 'Menü öffnen' }).click(); await hp.waitForTimeout(200);
  const hm = await hp.locator('header nav').last().innerText();
  pruef('390 px: Menü ohne Zahlungen/Analyse, mit „Mein Konto“', !/Zahlungen/.test(hm) && !/Analyse/.test(hm) && /Mein Konto/.test(hm), hm.replace(/\n+/g, ' · ').slice(0, 200));
  await hp.screenshot({ path: D + '/c-behandler-menue-390.png' });
  // Freigabe öffnet Zahlungen und Analyse
  sql(`update "User" set "canSeeAnalytics"=true where id='${uid}'`);
  await q.goto(L + '/zahlungen');
  pruef('Mit Freigabe: Zahlungen sichtbar, Menü zeigt sie', (await q.getByTestId('zahlungen').count()) === 1 && /Zahlungen/.test(await q.getByTestId('app-sidebar').innerText()));
  sql(`update "User" set "canSeeAnalytics"=false where id='${uid}'`);

  // --- Standort-Zuordnung
  const ids = ['abn' + Date.now() + 'a', 'abn' + Date.now() + 'b'];
  sql(`delete from "Location" where "practiceId"='${pr}'`);
  sql(`insert into "Location"(id,"practiceId",name,rooms,"minutesPerDay") values ('${ids[0]}','${pr}','Standort Nord',1,480),('${ids[1]}','${pr}','Standort Süd',1,480)`);
  const pats = sql(`select id||'|'||"lastName" from "Patient" where "practiceId"='${pr}' and not "ohneAkte" order by "lastName" limit 3`).split('\n').map((x) => x.split('|'));
  const tag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  sql(`delete from "Appointment" where "practiceId"='${pr}' and start >= '${tag} 00:00:00'::timestamp - interval '1 hour' and start < '${tag} 23:00:00'`);
  const tid = ['t' + Date.now() + 'a', 't' + Date.now() + 'b', 't' + Date.now() + 'c'];
  sql(`insert into "Appointment"(id,"practiceId","patientId","locationId",start,minutes,reason) values
    ('${tid[0]}','${pr}','${pats[0][0]}','${ids[0]}','${tag} 19:00:00',30,'NORD-Termin'),
    ('${tid[1]}','${pr}','${pats[1][0]}','${ids[1]}','${tag} 19:30:00',30,'SUED-Termin'),
    ('${tid[2]}','${pr}','${pats[2][0]}',null,'${tag} 20:00:00',30,'OHNE-Ort-Termin')`);
  await p.goto(L + '/settings/team'); await p.getByTestId(`standort-${uid}-${ids[0]}`).check(); await p.waitForTimeout(1500);
  pruef('Team-Einstellungen: Standort zugeordnet', sql(`select count(*) from "UserLocation" where "userId"='${uid}'`) === '1', await p.getByTestId('standorte-stand-' + uid).innerText().catch(() => ''));
  await p.goto(L + '/termine'); let t = await p.getByTestId('termine').innerText();
  pruef('Geschäftsführung sieht alle drei Termine', ['NORD-Termin', 'SUED-Termin', 'OHNE-Ort-Termin'].every((x) => t.includes(x)));
  await q.goto(L + '/termine'); t = await q.getByTestId('termine').innerText();
  pruef('/termine zeigt nur Termine des eigenen Standorts', t.includes('NORD-Termin') && !t.includes('SUED-Termin') && !t.includes('OHNE-Ort-Termin') && !t.includes('Standort Süd'), (t.match(/[A-Z]+-(Ort-)?Termin/g) || []).join(', '));
  await q.screenshot({ path: D + '/c-termine-standort-1280.png' });
  await q.goto(L + '/termine?ort=' + ids[1]); t = await q.getByTestId('termine').innerText();
  pruef('/termine?ort=<fremd> zeigt keinen fremden Termin', !t.includes('SUED-Termin'));
  await q.goto(L + '/dashboard'); t = await q.locator('main').innerText();
  pruef('Dashboard zeigt nur den eigenen Termin', t.includes(pats[0][1]) && !new RegExp(`${pats[1][1]}[^\\n]*\\n?[^\\n]*SUED`).test(t) && !t.includes('SUED-Termin') && !t.includes('OHNE-Ort-Termin'), (t.match(/[A-Z]+-(Ort-)?Termin/g) || []).join(', ') || 'keine Anlässe im Text');
  const zahl = async (seite) => { await seite.goto(L + '/dashboard'); const x = await seite.locator('main').innerText(); return (x.match(/(\d+)\s*Termine? heute|Heute[^\n]*\n\s*(\d+)/i) || []).slice(1).find(Boolean); };
  console.log('     (Dashboard-Zahl Termine heute: Leitung ' + await zahl(p) + ', Behandler/in ' + await zahl(q) + ')');
  for (const u of ['/praxismanager', '/mein-bereich', '/eingang', '/patients/' + pats[1][0]]) { await q.goto(L + u); const x = await q.locator('main').innerText(); pruef(`${u.replace(/\/c\w+$/, '/<Patient Süd>')} ohne fremden Termin`, !x.includes('SUED-Termin') && !x.includes('OHNE-Ort-Termin')); }
  let r = await api(q, 'POST', '/api/appointments', { patientId: pats[1][0], locationId: ids[1], start: `${tag}T22:00:00+01:00`, minutes: 30, reason: 'Fremd' });
  pruef('Termin am fremden Standort per Schnittstelle → 403', r.status === 403, `Status ${r.status} ${r.j?.error || ''}`);
  r = await api(q, 'PATCH', '/api/appointments/' + tid[1], { status: 'ABGESAGT' });
  pruef('Fremden Termin ändern → abgelehnt', [403, 404].includes(r.status) && sql(`select status from "Appointment" where id='${tid[1]}'`) === 'GEPLANT', 'Status ' + r.status);
  r = await api(q, 'DELETE', '/api/appointments/' + tid[1]);
  const r0 = await api(q, 'DELETE', '/api/appointments/gibtesnicht');
  pruef('Fremden Termin löschen → abgelehnt, gleiche Antwort wie bei unbekanntem Termin', [403, 404, 409].includes(r.status) && r.status === r0.status && sql(`select count(*) from "Appointment" where id='${tid[1]}'`) === '1', `Status ${r.status} / unbekannt ${r0.status}`);
  r = await api(q, 'POST', '/api/appointments', { patientId: pats[0][0], start: `${tag}T22:30:00+01:00`, minutes: 30, reason: 'Eigen' });
  pruef('Eigener Termin ohne Standort-Angabe landet am eigenen Standort', r.status < 300 && sql(`select "locationId" from "Appointment" where "practiceId"='${pr}' and reason='Eigen'`) === ids[0], 'Status ' + r.status);
  pruef('Keine Seitenfehler', fehler.length + f2.length === 0, [...fehler, ...f2].slice(0, 2).join(' | '));
});
