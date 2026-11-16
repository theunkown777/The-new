const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('H Rauchtest', async (b) => {
  const c = await b.newContext(KONTEXT); const p = await c.newPage();
  let fehler = [], csp = [], kaputt = [];
  const horchen = (s) => { s.on('pageerror', (e) => fehler.push(e.message)); s.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text().slice(0, 160)); }); s.on('response', (r) => { if (r.status() >= 500) kaputt.push(r.status() + ' ' + r.url().replace(L, '')); }); };
  horchen(p);
  await demo(p);
  const SEITEN = ['/dashboard', '/patients', '/termine', '/eingang', '/zahlungen', '/settings', '/vorsorge', '/proposals/new', '/rechner', '/rechner/zuzahlung-2027', '/rechner/eigenanteil-zahnersatz', '/rechner/goae-rechnung', '/empfang', '/mein-bereich', '/praxismanager', '/settings/team', '/settings/termine', '/patients/import'];
  for (const u of SEITEN) {
    fehler = []; csp = []; kaputt = [];
    const r = await p.goto(L + u, { waitUntil: 'networkidle' }).catch((e) => ({ status: () => 'Zeitüberschreitung' })); await p.waitForTimeout(300);
    const text = await p.locator('body').innerText();
    pruef(`${u}: lädt ohne Seitenfehler und ohne blockierte Inhalte`, r.status() === 200 && fehler.length === 0 && csp.length === 0 && kaputt.length === 0 && !/Application error|Etwas ist schiefgelaufen|Internal Server Error/.test(text) && text.length > 200, [`Status ${r.status()}`, ...fehler, ...csp, ...kaputt].slice(0, 3).join(' | '));
  }
  // Handy: dieselben Seiten ohne waagerechtes Scrollen
  const hc = await b.newContext({ ...HANDY, storageState: await c.storageState() }); const hp = await hc.newPage(); horchen(hp);
  const zuBreit = [];
  for (const u of SEITEN) { fehler = []; await hp.goto(L + u, { waitUntil: 'networkidle' }).catch(() => {}); await hp.waitForTimeout(200); const w = await hp.evaluate(() => document.documentElement.scrollWidth); if (w > 390 || fehler.length) zuBreit.push(`${u} ${w}px ${fehler[0] || ''}`); }
  pruef(`390 px: alle ${SEITEN.length} Seiten ohne waagerechtes Scrollen und ohne Seitenfehler`, zuBreit.length === 0, zuBreit.join(' | '));
  // Rechner (öffentlich, ohne Anmeldung)
  const oc = await b.newContext(KONTEXT); const op = await oc.newPage(); horchen(op);
  const oh = await b.newContext(HANDY); const ohp = await oh.newPage(); horchen(ohp);
  const RECHNER = [
    ['/rechner/zuzahlung-2027', 'zz-ergebnis', async (s) => { await s.getByTestId('zz-kosten').fill('87,50'); }, async (s) => { await s.getByTestId('zz-art').selectOption({ index: 1 }); }],
    ['/rechner/eigenanteil-zahnersatz', 'ze-ergebnis', async (s) => { await s.getByTestId('ze-bonus').selectOption({ index: 1 }); }, async (s) => { await s.getByTestId('ze-befund').selectOption({ index: 2 }); }],
    ['/rechner/goae-rechnung', 'go-ergebnis', async (s) => { await s.getByTestId('go-faktor').fill('3,5'); }, async (s) => { await s.getByTestId('go-punkte').fill('450'); }],
  ];
  for (const [u, id, aendern, aendern2] of RECHNER) {
    fehler = []; csp = [];
    await op.goto(L + u, { waitUntil: 'networkidle' }); const vor = await op.getByTestId(id).innerText();
    await aendern(op); await op.waitForTimeout(200); const nach = await op.getByTestId(id).innerText();
    await aendern2(op); await op.waitForTimeout(200); const nach2 = await op.getByTestId(id).innerText();
    pruef(`${u}: Eingabe ändern → Ergebnis ändert sich`, vor !== nach && nach !== nach2 && /€/.test(nach) && !/NaN|undefined|Infinity/.test(nach + nach2) && fehler.length === 0 && csp.length === 0, `${vor.replace(/\n/g, ' ').slice(0, 60)} → ${nach.replace(/\n/g, ' ').slice(0, 60)} ${fehler[0] || csp[0] || ''}`);
    await ohp.goto(L + u, { waitUntil: 'networkidle' }); await aendern(ohp); await ohp.waitForTimeout(200);
    const w = await ohp.evaluate(() => document.documentElement.scrollWidth);
    pruef(`${u}: 390 px ohne waagerechtes Scrollen, Ergebnis ändert sich`, w <= 390 && (await ohp.getByTestId(id).innerText()) !== vor, 'Breite ' + w);
    await ohp.screenshot({ path: D + `/h-${id}-390.png`, fullPage: true });
    if (id === 'ze-ergebnis') await op.screenshot({ path: D + '/h-ze-1280.png', fullPage: true });
  }
  await op.goto(L + '/rechner', { waitUntil: 'networkidle' }); const links = await op.locator('a[href^="/rechner/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  pruef('/rechner (öffentlich): verlinkt die drei Rechner', ['/rechner/zuzahlung-2027', '/rechner/eigenanteil-zahnersatz', '/rechner/goae-rechnung'].every((x) => links.includes(x)), links.join(', '));
  await ohp.goto(L + '/rechner', { waitUntil: 'networkidle' }); const w = await ohp.evaluate(() => document.documentElement.scrollWidth); pruef('/rechner: 390 px ohne waagerechtes Scrollen', w <= 390, 'Breite ' + w);
});
