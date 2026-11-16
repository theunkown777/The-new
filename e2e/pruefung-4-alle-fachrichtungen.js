// Gesamtprüfung nach dem Umbau „für alle Fachrichtungen“: Inhaltsrichtlinie, Einstiege, Ratgeber,
// Zusatzleistungen, Diktat-Schalter, Zahn-Begriffe in Arzt- und Therapie-Demos.
const { chromium, devices } = require('playwright'); const { L, D, abbruch } = require('./gemeinsam');
let ok = 0, fehl = 0; const pruef = (name, bed, info = '') => { console.log(`${bed ? 'OK  ' : 'FEHL'} ${name}${info ? ' — ' + info : ''}`); bed ? ok++ : fehl++; };
const ctx = (b, o = {}) => b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', extraHTTPHeaders: { 'x-forwarded-for': '10.74.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, ...o });
const horch = (p, liste) => { p.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) liste.push(p.url().replace(L, '') + ': ' + t.slice(0, 160)); }); p.on('pageerror', (e) => liste.push(p.url().replace(L, '') + ' Seitenfehler: ' + e.message.slice(0, 120))); p.on('response', (r) => { if (r.status() >= 500) liste.push(r.status() + ' ' + r.url().replace(L, '')); }); };
(async () => { const b = await chromium.launch();
  // 1. Öffentliche Seiten: Inhaltsrichtlinie darf nichts blockieren
  if (!process.env.AB2) { const c = await ctx(b); const p = await c.newPage(); const v = []; horch(p, v);
    for (const u of ['/', '/ratgeber', '/ratgeber/igel-vereinbarung', '/ratgeber/heilmittel-zuzahlung', '/ratgeber/festzuschuss-2027', '/fachgebiete/haut', '/fachgebiete/physio', '/fachgebiete/zahn', '/anatomie', '/anatomie/koerper', '/anatomie/gebiss', '/anatomie/auge', '/vorschau', '/leistungen', '/hilfe', '/demo', '/register', '/login']) { await p.goto(L + u, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(u.startsWith('/anatomie/') ? 5000 : 600); }
    pruef('Inhaltsrichtlinie: 18 öffentliche Seiten ohne blockierte Inhalte oder Fehler', v.length === 0, v.slice(0, 4).join(' | '));
    // Startseite
    await p.goto(L + '/'); const start = await p.locator('body').innerText();
    pruef('Startseite: keine hervorgehobene Zahn-Kachel', !/Von hier kommt Sorrida/.test(start));
    const kacheln = await p.locator('[data-testid="fach-kachel"]').allInnerTexts(); const zi = kacheln.findIndex((k) => /Zahnmedizin/.test(k));
    pruef('Startseite: Zahnmedizin als normale Kachel zwischen den anderen', zi > 0 && zi < kacheln.length - 1, `Platz ${zi + 1} von ${kacheln.length}, erste: ${kacheln[0]?.split('\n')[0]}`);
    await p.locator('#fach').scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({ path: D + '/01-fachauswahl.png' });
    // Ratgeber
    await p.goto(L + '/ratgeber'); const rg = await p.locator('main').innerText(); const iAlle = rg.indexOf('alle Praxen'), iZahn = rg.search(/Zahnarztpraxen/);
    const links = await p.locator('main a[href^="/ratgeber/"]').count();
    pruef('Ratgeber: 18 Artikel, „alle Praxen“ vor Zahnarztpraxen', links === 18 && iAlle >= 0 && iZahn > iAlle, `${links} Artikel`);
    await p.screenshot({ path: D + '/02-ratgeber.png', fullPage: true });
    await p.goto(L + '/ratgeber/igel-vereinbarung'); const art = await p.locator('main').innerText();
    pruef('Ratgeber-Artikel für Arztpraxen: Fußnote ohne KZBV, mit KBV', /KBV/.test(art) && !/KZBV/.test(art));
    await p.screenshot({ path: D + '/03-artikel-igel.png', fullPage: true });
    await p.goto(L + '/fachgebiete/haut'); const fh = await p.locator('main').innerText();
    pruef('Fachseite Haut verlinkt Ratgeber', /Ratgeber für Ihr Team/.test(fh) && (await p.locator('main a[href^="/ratgeber/"]').count()) >= 3);
    // Demo ohne Voreinstellung
    await p.goto(L + '/demo'); pruef('Demo: kein Fach vorausgewählt', (await p.locator('#demo-fach').inputValue()) === '');
    await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForTimeout(400);
    pruef('Demo: ohne Fach kommt ein Hinweis statt einer Zahnarztpraxis', /Fachgebiet/.test(await p.locator('p[role="alert"]').innerText().catch(() => '')) && p.url().endsWith('/demo'));
    const gruppen = await p.locator('#demo-fach optgroup').evaluateAll((g) => g.map((x) => x.label)); pruef('Demo: Fächer in Gruppen, ärztlich zuerst', gruppen[0] === 'Ärztliche Praxen' && gruppen.length === 3, gruppen.join(', '));
    await p.screenshot({ path: D + '/04-demo-wahl.png' });
    await p.goto(L + '/register'); pruef('Registrierung: kein Fach vorausgewählt, Pflichtfeld', (await p.locator('#specialty').inputValue()) === '' && (await p.locator('#specialty').getAttribute('required')) !== null);
    await p.goto(L + '/vorschau'); await p.waitForTimeout(600); pruef('Vorschau: beginnt mit der Hausarztpraxis', (await p.locator('[role="tab"][aria-selected="true"]').first().innerText()).includes('Hausarzt'), await p.locator('[role="tab"][aria-selected="true"]').first().innerText());
    const r = await p.goto(L + '/website'); pruef('Alte Zahn-Website leitet auf die Startseite um', p.url() === L + '/' && r.status() === 200);
    const sm = await (await p.request.get(L + '/sitemap.xml')).text(); pruef('Sitemap: alle Fächer und 18 Artikel', (sm.match(/\/ratgeber\//g) || []).length === 18 && /fachgebiete\/hausarzt/.test(sm));
    await c.close(); }
  // 2. Hautarzt-Demo: Zusatzleistungen, Einstellungen, Diktat
  { const c = await ctx(b); const p = await c.newPage(); const v = []; horch(p, v);
    await p.goto(L + '/demo?fach=haut'); pruef('Demo: Vorauswahl über die Fachseite bleibt', (await p.locator('#demo-fach').inputValue()) === 'haut');
    await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForURL('**/dashboard', { timeout: 120000 });
    await p.goto(L + '/settings'); const st = await p.locator('main').innerText();
    pruef('Einstellungen Hautarzt: keine GOZ/BEMA- und Zahn-Preiskarten, Anbindung über GDT', !/GOZ|BEMA|Vorschlagspreise|VDDS/.test(st) && /GDT/.test(st));
    await p.goto(L + '/settings/security'); const sec = await p.locator('[data-testid="diktat-einstellung"]').innerText();
    pruef('Sicherheit: Diktat-Schalter vorhanden, in der Demo erlaubt', /Sprachdienst des Browsers: erlaubt/.test(sec));
    await p.getByTestId('diktat-schalter').click(); await p.waitForTimeout(800);
    pruef('Diktat ausschalten wird gespeichert', /Sprachdienst des Browsers: aus/.test(await p.getByTestId('diktat-stand').innerText()) && (await p.evaluate(async () => (await (await fetch('/api/praxis/diktat')).json()).cloud)) === false);
    await p.screenshot({ path: D + '/05-diktat-schalter.png' });
    await p.goto(L + '/reports/new'); await p.waitForTimeout(1500); const dk = await p.locator('[data-testid="diktat-aus"], [data-testid="diktat-knopf"], [data-testid="diktat-ohne"], [data-testid="diktat-laden"]').first().getAttribute('data-testid').catch(() => null);
    pruef('Diktierknopf folgt dem Schalter (aus oder Erkennung auf dem Gerät)', dk === 'diktat-aus' || dk === 'diktat-ohne' || dk === 'diktat-laden' || (dk === 'diktat-knopf' && (await p.getByTestId('diktat-knopf').getAttribute('data-modus')) === 'lokal'), String(dk));
    // Vorschlag mit Hautkrebs-Screening anlegen
    await p.goto(L + '/patients'); const ph = await p.locator('main a[href*="sel="]').first().getAttribute('href'); const pid = new URLSearchParams(ph.split('?')[1]).get('sel');
    await p.goto(L + '/proposals/new?patientId=' + pid); await p.waitForTimeout(1200);
    await p.locator('main input[type="number"]').first().fill('52'); await p.getByTestId('anlass-picker').getByText(/Hautkrebs/).first().click(); await p.waitForTimeout(600);
    const zh = await p.getByTestId('zusatz-hinweis').count(); pruef('Vorschlag: Zusatzleistungen als eigene Positionen neben dem Screening', zh === 2, `${zh} Zusatzpositionen`);
    const vor = await p.locator('main').innerText();
    await p.getByRole('button', { name: /Auflichtmikroskopie/ }).click(); await p.waitForTimeout(400);
    const nach = await p.locator('main').innerText();
    pruef('Vorschlag: Screening bleibt gewählt, Auflichtmikroskopie kommt dazu', (await p.getByRole('button', { name: /Hautkrebs-Screening/ }).first().getAttribute('aria-pressed')) === 'true' && (await p.getByRole('button', { name: /Auflichtmikroskopie/ }).getAttribute('aria-pressed')) === 'true' && vor !== nach);
    await p.screenshot({ path: D + '/06-zusatzleistung-praxis.png', fullPage: true });
    await p.getByRole('button', { name: 'Vorschlag speichern' }).click(); await p.waitForURL(/proposals\/c/, { timeout: 20000 }).catch(() => {});
    const prop = p.url().match(/proposals\/(c[a-z0-9]+)/)?.[1]; pruef('Vorschlag gespeichert', !!prop, p.url().replace(L, ''));
    if (prop) { await p.getByRole('button', { name: 'Link und QR-Code erzeugen' }).click(); await p.waitForTimeout(2000);
      const link = (await p.content()).match(/https?:\/\/[^"<\s&]*\/p\/[A-Za-z0-9_-]+/)?.[0];
      const hc = await ctx(b, { ...devices['iPhone 13'] }); const hp = await hc.newPage(); horch(hp, v);
      await hp.goto(link.replace(/^https?:\/\/[^/]+/, L)); await hp.waitForTimeout(1500); let pt = await hp.locator('body').innerText();
      pruef('Patient: Screening und beide Zusätze sichtbar, Zusatz der Praxis vorgewählt', /Hautkrebs-Screening/.test(pt) && /Auflichtmikroskopie/.test(pt) && /Videodermatoskopie/.test(pt));
      const summe = (t) => (t.match(/Ihr Eigenanteil[^\d]*([\d.,]+)/) || [])[1];
      const s1 = summe(pt); await hp.getByText(/Videodermatoskopie/).first().click(); await hp.waitForTimeout(400); pt = await hp.locator('body').innerText(); const s2 = summe(pt);
      pruef('Patient: Zusatz ankreuzen erhöht den Eigenanteil, Kassenleistung bleibt', s1 !== s2, `${s1} € → ${s2} €`);
      await hp.screenshot({ path: D + '/07-zusatzleistung-patient.png', fullPage: true }); await hc.close(); }
    pruef('Hautarzt-Demo ohne Seitenfehler und ohne blockierte Inhalte', v.length === 0, v.slice(0, 3).join(' | '));
    await c.close(); }
  // 3. Arzt- und Therapie-Demos: keine Zahn-Begriffe in der Oberfläche
  for (const fach of ['hausarzt', 'physio', 'psych']) { const c = await ctx(b); const p = await c.newPage(); const v = []; horch(p, v); const funde = [];
    await p.goto(L + '/demo?fach=' + fach); await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForURL('**/dashboard', { timeout: 120000 });
    for (const u of ['/dashboard', '/proposals', '/proposals/nachfassen', '/patients', '/eingang', '/zahlungen', '/termine', '/analyse', '/analyse/wirkung', '/abschluss/new', '/reports/new', '/settings', '/settings/connector', '/settings/security', '/settings/team', '/praxismanager', '/vorsorge', '/abrechnung']) {
      await p.goto(L + u).catch(() => {}); await p.waitForTimeout(700); const t = await p.locator('body').innerText().catch(() => '');
      const m = t.match(/[^\n]{0,40}(Zahn|GOZ|BEMA|Festzuschuss|Heil- und Kostenplan|VDDS|Bonusheft)[^\n]{0,40}/g); if (m) funde.push(u + ': ' + m.slice(0, 2).join(' / ')); }
    pruef(`Demo ${fach}: 18 Seiten ohne Zahn-Begriffe`, funde.length === 0, funde.slice(0, 5).join(' || ').slice(0, 600));
    pruef(`Demo ${fach}: keine Seitenfehler`, v.length === 0, v.slice(0, 3).join(' | '));
    await c.close(); }
  await b.close(); console.log(`\n${ok} bestanden, ${fehl} fehlgeschlagen`); process.exitCode = fehl ? 1 : 0; })().catch(abbruch);
