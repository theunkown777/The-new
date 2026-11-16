const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('G Empfang', async (b) => {
  const TABLET = { ...KONTEXT, viewport: { width: 1024, height: 768 } };
  const c = await b.newContext(TABLET); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  const pats = sql(`select id||'|'||"lastName"||'|'||"firstName" from "Patient" where "practiceId"='${pr}' and not "ohneAkte" order by "lastName" limit 2`).split('\n').map((x) => x.split('|'));
  const [pid, nach, vor] = pats[0]; const andere = pats[1];
  const sitzung = async () => (await c.cookies()).filter((k) => /next-auth\.session-token/.test(k.name)).length;
  const api = (m, u, bd) => p.evaluate(async ([m, u, bd]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: bd ? JSON.stringify(bd) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, j }; }, [m, u, bd]);

  await p.goto(L + '/empfang');
  pruef('Ohne PIN: Hinweis, Übergabe gesperrt', (await p.getByTestId('empfang-keine-pin').count()) === 1);
  await p.goto(L + '/settings/empfang');
  await p.getByTestId('empfang-pin-neu').fill('4826'); await p.getByTestId('empfang-pin-nochmal').fill('4827'); await p.getByTestId('empfang-pin-speichern').click(); await p.waitForTimeout(800);
  pruef('PIN: zwei verschiedene Eingaben werden abgelehnt', sql(`select count(*) from "Practice" where id='${pr}' and "empfangPinHash" is not null`) === '0', await p.getByTestId('empfang-pin-meldung').innerText().catch(() => ''));
  await p.getByTestId('empfang-pin-neu').fill('4826'); await p.getByTestId('empfang-pin-nochmal').fill('4826'); await p.getByTestId('empfang-pin-speichern').click(); await p.waitForTimeout(1200);
  const hash = sql(`select "empfangPinHash" from "Practice" where id='${pr}'`);
  pruef('PIN gesetzt, nur als Hash gespeichert', /^\$2[aby]\$/.test(hash) && !hash.includes('4826'), await p.getByTestId('empfang-pin-meldung').innerText().catch(() => ''));

  const uebergeben = async () => {
    await p.goto(L + '/empfang'); await p.getByTestId('empfang-suche').fill(nach); await p.getByTestId('empfang-treffer').first().waitFor({ timeout: 8000 });
    await p.getByTestId('empfang-treffer').filter({ hasText: vor }).first().click();
    await p.getByTestId('empfang-schritt-kontakt').check(); await p.getByTestId('empfang-schritt-anamnese').check();
  };
  await uebergeben();
  await p.getByTestId('empfang-qr').click(); await p.getByTestId('empfang-qr-bild').waitFor({ timeout: 10000 });
  const qr = await p.getByTestId('empfang-qr-bild').evaluate((i) => ({ src: i.src.slice(0, 22), b: i.naturalWidth, h: i.naturalHeight }));
  pruef('QR-Code: Bild wird gezeigt', /^data:image\/(png|svg)/.test(qr.src) && qr.b > 100, JSON.stringify(qr));
  await p.screenshot({ path: D + '/g-empfang-1024.png', fullPage: true });
  await p.getByTestId('empfang-qr-schliessen').click();
  pruef('Vor der Übergabe: Praxis-Sitzung im Browser', (await sitzung()) === 1);
  await p.getByTestId('empfang-uebergeben').click(); await p.waitForURL('**/uebergabe', { timeout: 15000 }); await p.getByTestId('uebergabe').waitFor();
  const seite = await p.locator('body').innerText();
  pruef('/uebergabe zeigt nur diesen Patienten, kein Menü', (await p.getByTestId('uebergabe-name').innerText()) === `${vor} ${nach}` && !seite.includes(andere[1] + ',') && (await p.getByTestId('app-sidebar').count()) === 0 && !/Einstellungen|Zahlungen|Übersicht/.test(seite), await p.getByTestId('uebergabe-name').innerText());
  pruef('Schritte wie gewählt: Kontaktdaten und Anamnese', (await p.getByTestId('schritt-kontakt').count()) === 1 && (await p.getByTestId('schritt-anamnese').count()) === 1);
  await p.screenshot({ path: D + '/g-uebergabe-1024.png', fullPage: true });
  pruef('Keine Praxis-Sitzung mehr im Browser', (await sitzung()) === 0, (await c.cookies()).map((k) => k.name).join(', '));
  const p2 = await c.newPage();
  for (const u of ['/dashboard', '/patients', '/patients/' + andere[0], '/zahlungen', '/settings/team', '/eingang']) { await p2.goto(L + u); pruef(`Während der Übergabe: ${u.replace(andere[0], '<anderer Patient>')} führt zur Anmeldung`, /\/login/.test(p2.url()), p2.url().replace(L, '').slice(0, 50)); }
  await p2.goto(L + '/empfang'); pruef('Während der Übergabe: /empfang führt zur Anmeldung', /\/login/.test(p2.url()));
  for (const [m, u, bd] of [['GET', '/api/patients?q=' + andere[1]], ['GET', '/api/suche?q=' + andere[1]], ['GET', '/api/empfang/uebergabe?patientId=' + andere[0]], ['POST', '/api/empfang/uebergabe', { patientId: andere[0] }], ['POST', '/api/patients/' + andere[0] + '/portal'], ['GET', '/api/settings/export']]) { const r = await api(m, u, bd); pruef(`Während der Übergabe: ${m} ${u.replace(andere[0], '<anderer>').replace(andere[1], '<Name>')} → 401`, r.status === 401, 'Status ' + r.status); }
  await p2.close();
  // Kontaktdaten
  let r = await api('POST', '/api/empfang/patient/kontakt', { patientId: andere[0], email: 'boese@test.local', phone: '', einwilligung: true });
  pruef('Kontakt-Schnittstelle nimmt keine fremde Patienten-ID an', r.status === 400 && sql(`select count(*) from "Patient" where email='boese@test.local'`) === '0', 'Status ' + r.status);
  await p.getByTestId('kontakt-formular').locator('input[type="email"]').fill('abnahme.empfang@test.local'); await p.getByTestId('kontakt-formular').locator('input[type="tel"]').fill('0171 4440099');
  await p.getByTestId('kontakt-speichern').click(); await p.getByTestId('kontakt-gespeichert').waitFor({ timeout: 8000 }).catch(() => {});
  const k = sql(`select email||'|'||phone from "Patient" where id='${pid}'`);
  pruef('Kontaktdaten gespeichert (nur bei diesem Patienten)', (await p.getByTestId('kontakt-gespeichert').count()) === 1 && /abnahme\.empfang@test\.local\|.*4440099/.test(k) && sql(`select count(*) from "Patient" where "practiceId"='${pr}' and email='abnahme.empfang@test.local'`) === '1', k + ' ' + (await p.getByTestId('kontakt-fehler').innerText().catch(() => '')));
  // Fertig → Sperre
  await p.getByTestId('uebergabe-fertig').click(); await p.getByTestId('empfang-sperre').waitFor({ timeout: 10000 });
  pruef('„Fertig“ sperrt das Tablet', (await p.getByTestId('uebergabe').count()) === 0 && !(await p.locator('body').innerText()).includes(nach));
  await p.screenshot({ path: D + '/g-sperre-1024.png' });
  r = await api('POST', '/api/empfang/patient/kontakt', { email: 'spaeter@test.local', phone: '' });
  pruef('Nach „Fertig“: Patienten-Schnittstelle lehnt ab', r.status === 401, 'Status ' + r.status);
  await p.goto(L + '/dashboard'); pruef('Gesperrt: /dashboard führt zur Anmeldung', /\/login/.test(p.url()));
  await p.goto(L + '/uebergabe'); await p.getByTestId('empfang-pin-eingabe').fill('1111'); await p.getByTestId('empfang-entsperren').click(); await p.getByTestId('empfang-sperre-fehler').waitFor({ timeout: 8000 });
  pruef('Falsche PIN wird abgelehnt', /PIN falsch/.test(await p.getByTestId('empfang-sperre-fehler').innerText()) && (await sitzung()) === 0, await p.getByTestId('empfang-sperre-fehler').innerText());
  await p.goto(L + '/dashboard'); pruef('Nach falscher PIN: /dashboard weiter gesperrt', /\/login/.test(p.url()));
  await p.goto(L + '/uebergabe'); await p.getByTestId('empfang-pin-eingabe').fill('4826'); await p.getByTestId('empfang-entsperren').click(); await p.waitForURL('**/empfang', { timeout: 10000 }).catch(() => {});
  pruef('Richtige PIN: zurück nach /empfang ohne neue Anmeldung', /\/empfang$/.test(p.url()) && (await p.getByTestId('empfang').count()) === 1 && (await sitzung()) === 1, p.url().replace(L, ''));
  await p.goto(L + '/dashboard'); pruef('/dashboard geht wieder', /\/dashboard$/.test(p.url()) && (await p.getByTestId('app-sidebar').count()) === 1);
  await p.goto(L + '/uebergabe'); pruef('Nach dem Entsperren zeigt /uebergabe keine Patientendaten', (await p.getByTestId('uebergabe').count()) === 0);
  pruef('Protokoll: Übergabe vermerkt', Number(sql(`select count(*) from "AuditLog" where "practiceId"='${pr}' and action='empfang.uebergabe'`)) >= 1);

  // Sperre nach fünf Fehlversuchen
  await uebergeben(); await p.getByTestId('empfang-uebergeben').click(); await p.waitForURL('**/uebergabe'); await p.getByTestId('uebergabe-fertig-oben').click(); await p.getByTestId('empfang-sperre').waitFor();
  const st = []; for (const pin of ['0001', '0002', '0003', '0004', '0005']) st.push((await api('POST', '/api/empfang/entsperren', { pin })).status);
  r = await api('POST', '/api/empfang/entsperren', { pin: '4826' });
  pruef('Fünf Fehlversuche sperren die PIN, danach hilft auch die richtige nicht', st.slice(0, 4).every((x) => x === 403) && st[4] === 429 && r.status === 429 && (await sitzung()) === 0, st.join(',') + ' → richtige PIN: ' + r.status);
  await p.goto(L + '/dashboard'); pruef('PIN gesperrt: /dashboard führt zur Anmeldung', /\/login/.test(p.url()));
  sql(`update "Practice" set "empfangPinGesperrtBis"=null, "empfangPinFehlversuche"=0, "empfangPinSperren"=0 where id='${pr}'`);
  r = await api('POST', '/api/empfang/entsperren', { pin: '4826' });
  pruef('Nach Ablauf der Sperre geht die richtige PIN wieder', r.status === 200 && (await sitzung()) === 1, 'Status ' + r.status);
  // Handy-Breite der Patientenansicht
  await uebergeben(); await p.getByTestId('empfang-uebergeben').click(); await p.waitForURL('**/uebergabe');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  const breit = await p.evaluate(() => document.documentElement.scrollWidth); pruef('390 px: Patientenansicht ohne waagerechtes Scrollen', breit <= 390, 'Breite ' + breit);
  await p.screenshot({ path: D + '/g-uebergabe-390.png', fullPage: true });
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
});
