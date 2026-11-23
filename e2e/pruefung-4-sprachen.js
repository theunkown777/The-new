const { chromium, devices } = require('playwright'); const { L, D, abbruch, eineZeile } = require('./gemeinsam');
let ok = 0, fehl = 0; const pruef = (n, b, i = '') => { console.log(`${b ? 'OK  ' : 'FEHL'} ${n}${i ? ' — ' + eineZeile(i) : ''}`); b ? ok++ : fehl++; };
(async () => { const b = await chromium.launch(); const ip = '10.75.' + Math.floor(Math.random() * 250) + '.9';
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', extraHTTPHeaders: { 'x-forwarded-for': ip } }); const p = await c.newPage();
  await p.goto(L + '/demo?fach=zahn'); await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForURL('**/dashboard', { timeout: 120000 });
  const ph = await p.goto(L + '/patients').then(() => p.locator('main a[href*="sel="]').first().getAttribute('href')); const pid = new URLSearchParams(ph.split('?')[1]).get('sel');
  await p.goto(L + '/proposals/new?patientId=' + pid); await p.waitForTimeout(1500);
  await p.locator('main input[type="number"]').first().fill('52');
  for (const [z, f] of [['36', 'fehlt'], ['46', 'stift'], ['25', 'karies_gross'], ['14', 'teilkrone']]) { await p.locator(`button[aria-label^="Zahn ${z}"]:visible`).first().click(); await p.locator('main select').last().selectOption(f); await p.waitForTimeout(300); }
  const praxis = await p.locator('main').innerText(); pruef('Praxis: neue Befunde Stiftaufbau und Teilkrone im Zahnschema wählbar und berechnet', /Krone mit Stiftaufbau, Regelversorgung/.test(praxis) && /Teilkrone aus Metall, Regelversorgung/.test(praxis));
  await p.getByRole('button', { name: 'Vorschlag speichern' }).click(); await p.waitForURL(/proposals\/c/, { timeout: 20000 });
  await p.getByRole('button', { name: 'Link und QR-Code erzeugen' }).click(); await p.waitForTimeout(2000);
  const link = (await p.content()).match(/https?:\/\/[^"<\s&]*\/p\/[A-Za-z0-9_-]+/)?.[0].replace(/^https?:\/\/[^/]+/, L);
  const hc = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', timezoneId: 'Europe/Berlin', extraHTTPHeaders: { 'x-forwarded-for': ip } }); const hp = await hc.newPage(); const errs = []; hp.on('pageerror', (e) => errs.push(e.message.slice(0, 100))); hp.on('console', (m) => { if (/Content Security|Refused|Hydration|hydrat/i.test(m.text())) errs.push(m.text().slice(0, 120)); });
  const probe = { en: /crown|bridge/i, tr: /kron|köprü/i, uk: /[а-яіїє]{4,}/i, ru: /[а-яё]{4,}/i, pl: /koron|most/i, ar: /[؀-ۿ]{3,}/ };
  for (const lang of ['de', 'en', 'tr', 'uk', 'ru', 'pl', 'ar']) {
    await hp.goto(link + '?lang=' + lang); await hp.waitForTimeout(1200); const t = await hp.locator('body').innerText();
    const m = await hp.evaluate(() => ({ dir: document.querySelector('[dir]')?.getAttribute('dir') ?? getComputedStyle(document.querySelector('main') || document.body).direction, breit: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    const deutsch = lang === 'de' ? [] : (t.replace(/\((Regelversorgung|Festzuschuss|Heil- und Kostenplan|Bonusheft|Mehrkostenvereinbarung)\)/g, '').match(/Regelversorgung|Eigenanteil|Kassenleistung|Krone |Brücke|Empfehlung|Zahn \d|Füllung/g) || []);
    pruef(`Sprache ${lang}: übersetzt, kein Überlauf, keine deutschen Reste`, (lang === 'de' || probe[lang].test(t)) && m.breit <= 1 && deutsch.length === 0 && (lang !== 'ar' || m.dir === 'rtl'), `Überlauf ${m.breit}px, Richtung ${m.dir}, Reste: ${[...new Set(deutsch)].join(', ') || 'keine'}`);
    if (['ar', 'tr', 'uk'].includes(lang)) await hp.screenshot({ path: `${D}/08-vorschlag-${lang}.png`, fullPage: true });
    if (lang === 'ar') { await hp.screenshot({ path: `${D}/09-vorschlag-ar-oben.png` }); const sw = await hp.locator('a[href*="lang="], button[lang]').count(); pruef('Sprachwahl bietet sieben Sprachen', sw >= 7, `${sw} Schalter`); }
  }
  // Wahl auf Arabisch abschicken
  await hp.goto(link + '?lang=ar'); await hp.waitForTimeout(1000);
  pruef('Keine Seitenfehler in der Patientenansicht', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(`\n${ok} bestanden, ${fehl} fehlgeschlagen`); process.exitCode = fehl ? 1 : 0; })().catch(abbruch);
