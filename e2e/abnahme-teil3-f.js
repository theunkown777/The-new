const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('F Neupatienten-Buchung', async (b) => {
  const c = await b.newContext(KONTEXT); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push('Praxis: ' + e.message));
  const pr = await demo(p);
  sql(`update "Practice" set "buchungAktiv"=true where id='${pr}'`);
  await p.goto(L + '/settings/termine');
  await p.getByTestId('neupatienten-aktiv').check(); await p.getByTestId('neupatienten-speichern').click();
  await p.getByTestId('neupatienten-link').waitFor({ timeout: 10000 });
  const url = (await p.getByTestId('neupatienten-link').innerText()).trim();
  pruef('Einstellungen: Link zur Buchungsseite erscheint', /\/t\/[A-Za-z0-9_-]{8,}$/.test(url), url);
  const rahmen = await p.getByTestId('neupatienten-rahmen').innerText();
  pruef('Einbettungs-Code (Rahmen) enthält den Link', rahmen.includes('<iframe') && rahmen.includes(url.replace(/^https?:\/\/[^/]+/, '')));
  await p.getByTestId('neupatienten').scrollIntoViewIfNeeded(); await p.screenshot({ path: D + '/f-einstellung-1280.png' });
  const pfad = url.replace(/^https?:\/\/[^/]+/, ''); const kennung = pfad.split('/').pop();

  // Kopfzeilen
  const kopf = async (u) => { const r = await fetch(L + u, { redirect: 'manual' }); return { xfo: r.headers.get('x-frame-options'), csp: r.headers.get('content-security-policy') || '', status: r.status }; };
  const kt = await kopf(pfad);
  pruef('/t/…: kein X-Frame-Options, frame-ancestors *', kt.status === 200 && !kt.xfo && /frame-ancestors \*/.test(kt.csp), `Status ${kt.status}, XFO ${kt.xfo}, ${(kt.csp.match(/frame-ancestors[^;]*/) || [''])[0]}`);
  for (const u of ['/', '/t', '/login', '/dashboard', '/api/status', '/termin', '/rechner', '/tarife', '/p/x', '/portal/x', '/api/t/' + kennung, '/team', '/tx/abc']) {
    const k = await kopf(u);
    pruef(`${u}: X-Frame-Options SAMEORIGIN und frame-ancestors 'self'`, k.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(k.csp), `Status ${k.status}, XFO ${k.xfo}, ${(k.csp.match(/frame-ancestors[^;]*/) || ['kein CSP'])[0]}`);
  }

  // Öffentliche Seite ohne Anmeldung
  const ausfuellen = async (seite, vor, nach, mobil) => {
    const csp = []; seite.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); }); seite.on('pageerror', (e) => fehler.push('Öffentlich: ' + e.message));
    await seite.goto(L + pfad); await seite.getByTestId('neutermin').waitFor();
    const tage = seite.getByTestId('neutermin-tag'); if (await tage.count() > 2) await tage.nth(2).click();
    await seite.getByTestId('neutermin-zeit').first().click();
    const wahl = await seite.getByTestId('neutermin-wahl').innerText();
    await seite.getByTestId('neutermin-vorname').fill(vor); await seite.getByTestId('neutermin-nachname').fill(nach);
    await seite.getByTestId('neutermin-geburtsdatum').fill('1988-04-09'); await seite.getByTestId('neutermin-mobil').fill(mobil);
    const sel = seite.getByTestId('neutermin-anlass'); if (!(await sel.inputValue())) await sel.selectOption({ index: 1 });
    return { wahl, csp, anlass: await sel.inputValue() };
  };
  const oc = await b.newContext(KONTEXT); const op = await oc.newPage();
  let a = await ausfuellen(op, 'Nora', 'Neupatientin', '0171 5550101');
  const body = await op.locator('body').innerText();
  pruef('Öffentliche Seite: ohne Anmeldung, ohne Menü der Praxis, als Beispiel gekennzeichnet', !/\/login/.test(op.url()) && !/Einstellungen|Dashboard|Übersicht/.test(body) && (await op.getByTestId('neutermin-beispiel').count()) === 1);
  // ohne Häkchen kein Versand
  await op.getByTestId('neutermin-senden').click(); await op.waitForTimeout(500);
  pruef('Ohne Datenschutz-Häkchen wird nichts gesendet', (await op.getByTestId('neutermin-fertig').count()) === 0 && sql(`select count(*) from "Terminanfrage" where "practiceId"='${pr}'`) === '0');
  await op.getByTestId('neutermin-datenschutz').check(); await op.waitForTimeout(4200);
  await op.screenshot({ path: D + '/f-buchung-1280.png', fullPage: true });
  await op.getByTestId('neutermin-senden').click(); await op.getByTestId('neutermin-fertig').waitFor({ timeout: 10000 }).catch(() => {});
  pruef('1280: Anfrage gesendet, Bestätigung erscheint', (await op.getByTestId('neutermin-fertig').count()) === 1, (await op.getByTestId('neutermin-fehler').innerText().catch(() => '')) || a.wahl);
  pruef('1280: keine von der Inhaltsrichtlinie blockierten Inhalte', a.csp.length === 0, a.csp[0] || '');
  const hc = await b.newContext(HANDY); const hp = await hc.newPage();
  a = await ausfuellen(hp, 'Hugo', 'Handybucher', '0172 5550202');
  await hp.getByTestId('neutermin-datenschutz').check();
  const breit = await hp.evaluate(() => document.documentElement.scrollWidth); pruef('390 px: Formular ohne waagerechtes Scrollen', breit <= 390, 'Breite ' + breit);
  await hp.screenshot({ path: D + '/f-buchung-390.png', fullPage: true });
  await hp.waitForTimeout(4200); await hp.getByTestId('neutermin-senden').click(); await hp.getByTestId('neutermin-fertig').waitFor({ timeout: 10000 }).catch(() => {});
  pruef('390 px: Anfrage gesendet, Bestätigung erscheint', (await hp.getByTestId('neutermin-fertig').count()) === 1, (await hp.getByTestId('neutermin-fehler').innerText().catch(() => '')) || a.wahl);
  pruef('Zwei Anfragen in der Datenbank, noch kein Patient', sql(`select count(*) from "Terminanfrage" where "practiceId"='${pr}' and status='OFFEN'`) === '2' && sql(`select count(*) from "Patient" where "practiceId"='${pr}' and "lastName" in ('Neupatientin','Handybucher')`) === '0');
  // In einem Rahmen auf einer fremden Website: kleiner eigener Webserver auf anderem Port (= anderer Ursprung).
  // (Eine von Playwright nur vorgetäuschte Seite gilt für Chromium als öffentliche Adresse und darf localhost nie einbetten.)
  const http = require('http');
  const web = http.createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end(`<html><body><h1>Praxis-Website</h1><iframe id="f" src="${L}${q.url === '/login' ? '/login' : pfad}" style="width:600px;height:700px"></iframe></body></html>`); });
  await new Promise((x) => web.listen(4999, '127.0.0.1', x));
  const rp = await oc.newPage(); const blockiert = []; rp.on('console', (m) => { if (/frame-ancestors|X-Frame-Options|Refused to (frame|display)/i.test(m.text())) blockiert.push(m.text()); });
  await rp.goto('http://127.0.0.1:4999/'); await rp.waitForTimeout(1500);
  const imRahmen = await rp.frameLocator('#f').getByTestId('neutermin').count().catch(() => 0);
  pruef('Buchungsseite lädt als Rahmen auf einer fremden Website', imRahmen === 1 && blockiert.length === 0, blockiert[0] || '');
  if (imRahmen) { await rp.frameLocator('#f').getByTestId('neutermin-zeit').first().click(); pruef('Im Rahmen: Zeit wählbar, Formular erscheint', (await rp.frameLocator('#f').getByTestId('neutermin-formular').count()) === 1); await rp.screenshot({ path: D + '/f-rahmen-1280.png' }); }
  await rp.goto('http://127.0.0.1:4999/login'); await rp.waitForTimeout(1200);
  const login = await rp.frameLocator('#f').locator('input[type="password"]').count().catch(() => 0);
  pruef('Anmeldeseite lädt NICHT als Rahmen auf einer fremden Website', login === 0 && blockiert.length >= 1, (blockiert[0] || '').slice(0, 110));
  web.close();

  // Lockfeld, zu schnell, falscher Anlass, fremde Kennung
  const freie = await (await fetch(L + '/api/t/' + kennung)).json();
  const ersterAnlass = a.anlass;
  const zeit = freie.tage[freie.tage.length - 1].zeiten.slice(-1)[0];
  const sende = async (zusatz, stempel = freie.stempel) => { const r = await fetch(L + '/api/t/' + kennung, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vorname: 'Robo', nachname: 'Automat', geburtsdatum: '1990-01-01', mobil: '0170 0000000', email: '', anlass: ersterAnlass, website: '', start: zeit, datenschutz: true, stempel, ...zusatz }) }); return { status: r.status, j: await r.json().catch(() => null) }; };
  let r = await sende({});
  pruef('Zu schnelles Absenden wird abgelehnt', r.status === 400 && /schnell/.test(r.j?.error || ''), `Status ${r.status} ${r.j?.error || ''}`);
  r = await sende({ website: 'http://spam.example' });
  pruef('Lockfeld gefüllt: scheinbarer Erfolg, aber kein Datensatz', r.status === 201 && r.j?.ok === true && sql(`select count(*) from "Terminanfrage" where "lastName"='Automat'`) === '0', 'Status ' + r.status);
  await new Promise((x) => setTimeout(x, 4300));
  r = await sende({ anlass: 'Frei erfundener Anlass mit Diagnose' });
  pruef('Anlass außerhalb der Liste wird abgelehnt', r.status === 400, `Status ${r.status} ${r.j?.error || ''}`);
  r = await sende({ datenschutz: false });
  pruef('Ohne Datenschutz-Bestätigung lehnt die Schnittstelle ab', r.status === 400, `Status ${r.status} ${r.j?.error || ''}`);
  r = await sende({ start: '2026-11-16T03:17:00.000Z' });
  pruef('Zeit außerhalb der freien Zeiten wird abgelehnt', [400, 409].includes(r.status), `Status ${r.status} ${r.j?.error || ''}`);
  const g = await fetch(L + '/t/gibtesnicht12345'); const gt = await g.text();
  pruef('Unbekannte Kennung: Hinweis statt Daten', /neutermin-aus/.test(gt) || g.status === 404, 'Status ' + g.status);
  pruef('Nichts von den Fehlversuchen gespeichert', sql(`select count(*) from "Terminanfrage" where "lastName"='Automat'`) === '0');

  // In der Praxis
  await p.goto(L + '/eingang'); const ein = await p.locator('main').innerText();
  pruef('Eingang zeigt die Anfragen', /Neupatientin|Handybucher|Online-Anfrage|Terminanfrage/i.test(ein), (ein.match(/[^\n]*(Anfrage)[^\n]*/i) || [''])[0].slice(0, 120));
  await p.screenshot({ path: D + '/f-eingang-1280.png' });
  await p.goto(L + '/termine'); await p.getByTestId('terminanfragen').waitFor();
  pruef('/termine zeigt 2 offene Anfragen mit „Beispiel“-Kennzeichen', (await p.getByTestId('terminanfrage').count()) === 2 && (await p.getByTestId('terminanfrage-beispiel').count()) === 2);
  await p.screenshot({ path: D + '/f-termine-anfragen-1280.png' });
  const zeile = p.getByTestId('terminanfrage').filter({ hasText: 'Neupatientin' });
  await zeile.getByTestId('terminanfrage-bestaetigen').click(); await p.getByTestId('terminanfrage-erledigt').waitFor({ timeout: 10000 });
  const erl = await p.getByTestId('terminanfrage-erledigt').innerText();
  pruef('Bestätigen: Meldung mit Text zum Weitergeben', /bestätigt, Akte neu angelegt/.test(erl) && (await p.getByTestId('terminanfrage-text').innerText()).length > 30, erl.split('\n')[0]);
  const neu = sql(`select p.id||'|'||a.quelle||'|'||to_char(a.start,'YYYY-MM-DD') from "Patient" p join "Appointment" a on a."patientId"=p.id where p."practiceId"='${pr}' and p."lastName"='Neupatientin'`).split('|');
  pruef('Patient und Termin sind entstanden (Quelle NEU)', neu.length === 3 && neu[1] === 'NEU', neu.join(' · '));
  const einw = sql(`select count(*) from "Patient" where "practiceId"='${pr}' and "lastName"='Neupatientin' and ("contactConsentAt" is not null or "whatsappConsentAt" is not null)`);
  pruef('Keine Einwilligung in Nachrichten unterstellt', einw === '0');
  await p.getByTestId('terminanfrage-zum-termin').click(); await p.waitForURL(/termine\?tag=/); await p.waitForTimeout(500);
  pruef('Termin steht im Kalender mit „neu, online angefragt“', (await p.getByTestId('termin').filter({ hasText: 'Neupatientin' }).getByTestId('termin-neu-online').count()) === 1);
  await p.goto(L + '/termine'); await p.getByTestId('terminanfrage').filter({ hasText: 'Handybucher' }).getByTestId('terminanfrage-ablehnen').click(); await p.getByTestId('terminanfrage-erledigt').waitFor({ timeout: 10000 });
  pruef('Ablehnen: kein Patient, kein Termin', sql(`select count(*) from "Patient" where "practiceId"='${pr}' and "lastName"='Handybucher'`) === '0' && sql(`select status from "Terminanfrage" where "lastName"='Handybucher' and "practiceId"='${pr}'`) === 'ABGELEHNT');
  // andere Praxis darf die Anfrage nicht bearbeiten
  const aid = sql(`select id from "Terminanfrage" where "practiceId"='${pr}' limit 1`);
  const c2 = await b.newContext(KONTEXT); const p2 = await c2.newPage(); await demo(p2);
  const st = await p2.evaluate(async (i) => (await fetch('/api/terminanfragen/' + i, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aktion: 'ablehnen' }) })).status, aid);
  pruef('Andere Praxis: fremde Anfrage → 404', st === 404, 'Status ' + st);
  // ausschalten
  await p.goto(L + '/settings/termine'); await p.getByTestId('neupatienten-aktiv').uncheck(); await p.getByTestId('neupatienten-speichern').click(); await p.waitForTimeout(1200);
  await op.goto(L + pfad); const aus = await op.locator('body').innerText();
  pruef('Ausgeschaltet: Seite zeigt nur einen Hinweis', (await op.getByTestId('neutermin-zeit').count()) === 0 && /anrufen|rufen Sie|ausgeschaltet|keine Online-Termine/i.test(aus));
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
});
