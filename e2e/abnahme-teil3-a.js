const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('A Suche', async (b) => {
  const c = await b.newContext(KONTEXT); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  const [pid, nach] = sql(`select id||'|'||"lastName" from "Patient" where "practiceId"='${pr}' and not "ohneAkte" order by "createdAt" limit 1`).split('|');
  await p.waitForTimeout(800);
  await p.getByTestId('suche-oeffnen').focus();
  await p.keyboard.press('Control+k');
  pruef('Strg+K öffnet die Suche', await p.getByTestId('suche-dialog').isVisible().catch(() => false));
  await p.keyboard.type(nach, { delay: 30 }); await p.getByTestId('suche-treffer').first().waitFor({ timeout: 8000 }).catch(() => {});
  const t = await p.getByTestId('suche-treffer').allInnerTexts();
  pruef('Patientenname zeigt Treffer', t.some((x) => x.includes(nach)), `${nach}: ${t.length} Treffer`);
  await p.screenshot({ path: D + '/a-suche-1280.png' });
  await p.keyboard.press('Enter'); await p.waitForURL(/\/patients\/|sel=/, { timeout: 10000 }).catch(() => {});
  pruef('Enter öffnet die Patientenseite', /\/patients\/c|sel=/.test(p.url()), p.url().replace(L, ''));
  const suche = async (wort) => { await p.keyboard.press('Control+k'); await p.getByTestId('suche-feld').fill(wort); await p.waitForTimeout(900); const r = await p.getByTestId('suche-treffer').evaluateAll((es) => es.map((e) => e.innerText.replace(/\n/g, ' ') + ' → ' + (e.getAttribute('href') || e.dataset.href || ''))); return r; };
  let r = await suche('DATEV'); pruef('„DATEV“ zeigt die Seite Zahlungen', r.some((x) => /Zahlungen/.test(x)), r.slice(0, 2).join(' | '));
  await p.keyboard.press('Escape');
  r = await suche('Diktat'); pruef('„Diktat“ zeigt die Sicherheit', r.some((x) => /Sicherheit/.test(x)), r.slice(0, 2).join(' | '));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // Fokus kehrt zurück
  await p.goto(L + '/dashboard'); await p.waitForTimeout(600);
  await p.getByTestId('suche-oeffnen').focus(); await p.keyboard.press('Control+k'); await p.getByTestId('suche-dialog').waitFor();
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  pruef('Esc schließt, Fokus kehrt zurück', (await p.getByTestId('suche-dialog').count()) === 0 && await p.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'suche-oeffnen', String(await p.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName)));
  await p.locator('body').click({ position: { x: 700, y: 10 } }).catch(() => {});
  await p.evaluate(() => document.activeElement?.blur?.());
  await p.keyboard.press('g'); await p.keyboard.press('t'); await p.waitForURL('**/termine', { timeout: 8000 }).catch(() => {});
  pruef('Kürzel g t führt zu /termine', /\/termine$/.test(p.url()), p.url().replace(L, ''));
  await p.waitForTimeout(500); await p.evaluate(() => document.activeElement?.blur?.());
  await p.keyboard.type('?'); await p.waitForTimeout(300);
  pruef('? zeigt die Kürzel-Hilfe', await p.getByTestId('kuerzel-dialog').isVisible().catch(() => false));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // In einem Eingabefeld lösen die Kürzel nichts aus
  await p.goto(L + '/patients'); await p.waitForTimeout(600);
  const feld = p.locator('main input[type="search"], main input[type="text"], main input:not([type])').first();
  await feld.click(); await p.keyboard.type('gt?'); await p.waitForTimeout(600);
  pruef('Im Eingabefeld lösen Kürzel nichts aus', /\/patients/.test(p.url()) && (await p.getByTestId('kuerzel-dialog').count()) === 0 && /gt\?/.test(await feld.inputValue()), `${p.url().replace(L, '')} Feld „${await feld.inputValue()}“`);
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
  // Handy
  const hc = await b.newContext({ ...HANDY, storageState: await c.storageState() }); const hp = await hc.newPage();
  await hp.goto(L + '/dashboard'); await hp.waitForTimeout(600);
  await hp.getByTestId('suche-oeffnen-handy').click(); await hp.waitForTimeout(300);
  const breit = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruef('390 px: Lupe öffnet die Suche, nichts ragt hinaus', await hp.getByTestId('suche-dialog').isVisible().catch(() => false) && breit <= 390, 'Breite ' + breit);
  await hp.getByTestId('suche-feld').fill(nach); await hp.waitForTimeout(900);
  await hp.screenshot({ path: D + '/a-suche-390.png' });
});
