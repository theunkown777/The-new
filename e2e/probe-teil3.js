// Probe Teil 3: Portal-Termin, Vorsorge, Sammelaktionen, Gespräch, Schnellvorschlag, Favoriten, Eingang.
const { chromium, devices } = require('playwright');
const { L, D, sql, abbruch } = require('./gemeinsam');
let ok = 0, fehl = 0;
const pruef = (n, b, x = '') => { console.log(`${b ? 'OK  ' : 'FEHL'} ${n}${x ? ' — ' + x : ''}`); b ? ok++ : fehl++; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(p.url() + ' ' + e.message));
  try {
    await p.goto(L + '/demo?fach=hausarzt'); await p.getByRole('button', { name: 'Demo-Praxis öffnen' }).click(); await p.waitForURL('**/dashboard', { timeout: 120000 });
    const pr = sql(`select id from "Practice" where "isDemo" order by "createdAt" desc limit 1`);
    // 3.1 Recall-Kette
    await p.goto(L + '/vorsorge'); pruef('Vorsorge: Hinweis, solange Online-Termine aus sind', await p.getByTestId('vorsorge-kette-aus').count() === 1);
    sql(`update "Practice" set "buchungAktiv"=true where id='${pr}'`);
    await p.goto(L + '/vorsorge'); pruef('Vorsorge: Erklärung der Kette, wenn Online-Termine an sind', await p.getByTestId('vorsorge-kette').count() === 1);
    const hrefs = await p.locator('[data-testid="vorsorge-liste"] li a').evaluateAll((as) => as.map((x) => x.getAttribute('href')));
    const ids = hrefs.slice(0, 3).map((h) => new URLSearchParams(h.split('?')[1]).get('sel'));
    sql(`delete from "Appointment" where "patientId" in (${ids.map((i) => `'${i}'`).join(',')}) and start > now()`);
    await p.goto(L + '/vorsorge');
    const zeile = p.locator('[data-testid="vorsorge-liste"] li').first();
    const name = (await zeile.locator('a').first().innerText()).split('\n')[0];
    await zeile.getByRole('button', { name: 'Termin anbieten' }).click(); await zeile.getByTestId('nachricht-text').waitFor({ timeout: 15000 });
    const text = await zeile.getByTestId('nachricht-text').innerText();
    pruef('Vorsorge: Text bietet den Termin mit Link zur Buchung an', /\/termin\?anlass=/.test(text) && /freien Termin/.test(text), text.slice(0, 90));
    const url = text.match(/https?:\/\/\S+/)[0].replace(/^https?:\/\/[^/]+/, L);
    const hc = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE' }); const hp = await hc.newPage();
    await hp.goto(url); await hp.waitForTimeout(2500);
    const anlass = await hp.locator('input[placeholder*="Kontrolle"]').inputValue().catch(() => null);
    const zeitKnopf = hp.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    const hatZeit = await zeitKnopf.count();
    if (hatZeit) { await zeitKnopf.click(); await hp.waitForTimeout(300); }
    const anlass2 = await hp.locator('input[placeholder*="Kontrolle"]').inputValue().catch(() => anlass);
    pruef('Portal: Anlass ist aus der Erinnerung eingetragen', /Check-up/.test(anlass2 || anlass || ''), String(anlass2 || anlass));
    await hp.screenshot({ path: D + '/01-portal-termin.png' });
    if (hatZeit) { await hp.getByRole('button', { name: /buchen/i }).last().click(); await hp.waitForTimeout(2500); }
    const n = sql(`select count(*) from "Appointment" where "practiceId"='${pr}' and "nachErinnerung"`);
    pruef('Buchung nach Erinnerung wird gezählt', n === '1', 'Anzahl ' + n + ', freie Zeit gefunden: ' + hatZeit);
    await p.goto(L + '/vorsorge');
    pruef('Vorsorge: Kachel zeigt 1 Buchung, Zeile zeigt den Termin', (await p.getByTestId('vorsorge-gebucht').innerText()) === '1' && await p.getByTestId('vorsorge-termin').count() >= 1);
    await p.screenshot({ path: D + '/02-vorsorge.png' });
    // 3.10 Sammelaktion
    await p.getByTestId('sammel-start').click(); await p.getByTestId('sammel-los').click();
    const s1 = await p.getByTestId('sammel-schritt').innerText(); await p.getByTestId('sammel-weiter').click(); const s2 = await p.getByTestId('sammel-schritt').innerText();
    pruef('Sammelaktion: Schritt für Schritt durch die Liste', /1 von/i.test(s1) && /2 von/i.test(s2) && s1 !== s2);
    await p.screenshot({ path: D + '/03-sammel.png' });
    // 3.5 Schnellvorschlag + 3.4 Gespräch
    await p.goto(L + '/proposals/schnell'); await p.waitForTimeout(800);
    const kz = await p.getByTestId('schnell-kuerzel').inputValue(); pruef('Schnellvorschlag: Kürzel vorgeschlagen', /^K-\d{4}-\d+$/.test(kz), kz);
    await p.getByTestId('anlass-picker').getByText(/Check-up/).first().click(); await p.waitForTimeout(500);
    const vor = await p.locator('main').innerText();
    await p.getByTestId('gespraech-schalter').click(); await p.waitForTimeout(300);
    const im = await p.locator('main').innerText();
    pruef('Gesprächsansicht: Praxiszahlen ausgeblendet, Eigenanteil groß', /MEHRUMSATZ/i.test(vor) && !/Mehrumsatz|Volumen|Nicht vorgeschlagen/i.test(im) && await p.getByTestId('gespraech-summen').count() === 1 && !(await p.getByTestId('schnell-kuerzel').isVisible()));
    await p.screenshot({ path: D + '/04-gespraech.png' });
    await p.getByTestId('gespraech-schalter').click();
    await p.getByRole('button', { name: 'Vorschlag speichern' }).click(); await p.waitForURL(/proposals\/c.*qr=1/, { timeout: 20000 });
    await p.locator('img[alt*="QR"]').first().waitFor({ timeout: 15000 }).catch(() => {});
    pruef('Schnellvorschlag: QR-Code erscheint ohne weiteren Klick', await p.locator('img[alt*="QR"]').count() >= 1 && /Schnellvorschlag/.test(await p.locator('h1').innerText()), await p.locator('h1').innerText());
    await p.screenshot({ path: D + '/05-schnell-qr.png' });
    const link = (await p.locator('main').innerText()).match(/https?:\/\/\S+\/p\/\S+/)?.[0];
    if (link) { await hp.goto(link.replace(/^https?:\/\/[^/]+/, L)); await hp.waitForTimeout(1500); const t = await hp.locator('body').innerText(); pruef('Patientenansicht ohne Akte: kein „Hallo ohne Akte“', !/ohne Akte/.test(t) && /Ihr Behandlungsvorschlag/.test(t)); await hp.screenshot({ path: D + '/06-patient-ohne-akte.png' }); } else pruef('Patientenlink gefunden', false);
    const pid = sql(`select id from "Patient" where "practiceId"='${pr}' and "ohneAkte" limit 1`);
    await p.goto(L + '/patients/' + pid); pruef('Patientenseite: Hinweis „ohne Akte“', await p.getByTestId('akte-anlegen').count() === 1);
    await p.getByTestId('akte-vorname').fill('Mara'); await p.getByTestId('akte-nachname').fill('Testfall'); await p.getByTestId('akte-speichern').click(); await p.waitForTimeout(1500);
    pruef('Akte anlegen: Name steht, Hinweis ist weg', /Mara Testfall/.test(await p.locator('h1').innerText()) && await p.getByTestId('akte-anlegen').count() === 0);
    // 3.7 Favoriten + 3.14 Entwurf
    const ph = await p.goto(L + '/patients').then(() => p.locator('main a[href*="sel="]').first().getAttribute('href')); const pat = new URLSearchParams(ph.split('?')[1]).get('sel');
    await p.goto(L + '/proposals/new?patientId=' + pat); await p.waitForTimeout(800);
    await p.getByTestId('anlass-picker').getByText(/Reise/).first().click(); await p.waitForTimeout(400);
    await p.getByTestId('favorit-neu').click(); await p.getByTestId('favorit-name').fill('Reise-Paket'); await p.getByTestId('favorit-speichern').click(); await p.waitForTimeout(800);
    pruef('Favorit gespeichert', /gespeichert/.test(await p.getByTestId('favorit-meldung').innerText()));
    await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(1000);
    pruef('Entwurf: Hinweis nach dem Neuladen', await p.getByTestId('entwurf-hinweis').count() === 1);
    await p.getByTestId('entwurf-uebernehmen').click(); await p.waitForTimeout(400);
    pruef('Entwurf: Auswahl ist wieder da', /Reise/.test(await p.locator('main section.card h3').first().innerText().catch(() => '')));
    await p.goto(L + '/proposals/new?patientId=' + pat); await p.waitForTimeout(800); await p.getByTestId('entwurf-verwerfen').click().catch(() => {});
    await p.getByTestId('favorit-anwenden').first().click(); await p.waitForTimeout(400);
    pruef('Favorit übernommen: Anlass und Optionen erscheinen', await p.locator('main section.card h3').count() >= 1);
    await p.screenshot({ path: D + '/07-favorit.png' });
    // 3.8/3.9/3.14 Eingang
    await p.goto(L + '/eingang'); await p.waitForTimeout(800); const titel = await p.title(); const offenVor = await p.getByTestId('eingang-eintrag').count();
    pruef('Tab-Titel zeigt die Zahl', /^\(\d+\) /.test(titel), titel);
    await p.getByTestId('eingang-uebernehmen').first().click(); await p.waitForTimeout(1200);
    pruef('Eingang: „Sie übernehmen“ steht am Eintrag', /Sie übernehmen/.test(await p.getByTestId('eingang-zustaendig').first().innerText()));
    await p.getByTestId('eingang-filter-meine').click(); await p.waitForTimeout(800); pruef('Eingang: Filter zeigt nur die übernommenen', await p.getByTestId('eingang-eintrag').count() === 1);
    await p.screenshot({ path: D + '/08-eingang.png' });
    await p.goto(L + '/eingang'); await p.getByTestId('eingang-alle').click(); await p.getByTestId('eingang-rueckgaengig').waitFor({ timeout: 8000 }); await p.waitForTimeout(1500);
    const nach = await p.getByTestId('eingang-eintrag').count();
    await p.getByTestId('eingang-rueckgaengig').getByRole('button', { name: 'Rückgängig' }).click(); await p.waitForTimeout(1500);
    pruef('Eingang: Alle abhaken und Rückgängig', nach === 0 && await p.getByTestId('eingang-eintrag').count() === offenVor, `${offenVor} → ${nach} → ${await p.getByTestId('eingang-eintrag').count()}`);
    pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  } catch (e) { console.log('ABBRUCH', e.message.split('\n')[0]); await p.screenshot({ path: D + '/abbruch.png' }); fehl++; }
  console.log(`\n${ok} bestanden, ${fehl} fehlgeschlagen`);
  await b.close();
  process.exitCode = fehl ? 1 : 0;
})().catch(abbruch);
