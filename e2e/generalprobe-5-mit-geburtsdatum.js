// Generalprobe 3 (nach dem Fable-Durchgang): Zahnarztpraxis von der Registrierung bis zum Portal, Kassen- und Privatpatient.
const { chromium, devices } = require('playwright');
const { generate } = require('otplib');
const { execFileSync } = require('child_process');
const { L, D, sql, abbruch } = require('./gemeinsam');
let fehl = 0;
const ok = (n, b, x = '') => { console.log(`${b ? 'OK  ' : 'FEHL'} ${n} ${b ? '' : x}`); if (!b) { fehl++; process.exitCode = 1; } };
const EMAIL = `praxis${Date.now() % 100000}@sonnenberg-test.local`, PW = 'Testpraxis-2026!';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', acceptDownloads: true, extraHTTPHeaders: { 'x-forwarded-for': '10.72.' + Math.floor(Math.random() * 250) + '.9' } });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(p.url().replace(L, '') + ': ' + e.message.slice(0, 80))); p.on('response', (r) => { if (r.status() >= 500) errs.push(r.status() + ' ' + r.url()); });
  const shot = (n, full = false) => p.screenshot({ path: `${D}/${n}.png`, fullPage: full });
  const anmelden = async (secret) => { await c.clearCookies(); await p.goto(L + '/login'); await p.fill('#email', EMAIL); await p.fill('#password', PW); await p.locator('button[type=submit]').click(); await p.locator('#token').waitFor(); await p.fill('#token', await generate({ secret })); await p.locator('button[type=submit]').click(); await p.waitForURL(/dashboard/); };

  // 1 Registrieren, 2FA einrichten, neu anmelden
  await p.goto(L + '/register'); await p.fill('#practiceName', 'Zahnarztpraxis Dr. Sonnenberg (Testpraxis 5)'); await p.selectOption('#specialty', 'zahn');
  await p.fill('#name', 'Dr. Lea Sonnenberg'); await p.fill('#email', EMAIL); await p.fill('#password', PW);
  // Die Registrierung verlangt zwei Bestätigungen (Unternehmer, Vertragstexte gelesen) und braucht REGISTRIERUNG_OFFEN=1.
  await p.getByTestId('register-unternehmer').check(); await p.getByTestId('register-vertragstexte').check();
  await p.click('button[type=submit]'); await p.waitForURL(/dashboard/, { timeout: 60000 });
  await p.getByRole('button', { name: '2FA einrichten' }).click(); const secret = (await p.getByText('Schlüssel (manuelle Eingabe)').innerText()).split(':').pop().trim();
  await p.fill('#totp-code', await generate({ secret })); await p.getByRole('button', { name: '2FA aktivieren' }).click(); await p.waitForTimeout(1500);
  await anmelden(secret);
  ok('Anmeldung mit 2FA nach Einrichtung', /dashboard/.test(p.url()));
  ok('Einrichtungs-Checkliste mit 7 Schritten', (await p.getByTestId('einrichtung').innerText()).includes('0 von 7'), await p.getByTestId('einrichtung').innerText().catch(() => '-'));

  // Einrichtung: Preise, Bank, Ausgangswerte
  await p.goto(L + '/settings/proposals'); for (const [k, v] of [['krone_vk', 980], ['komp_klein', 150]]) await p.locator('#price-' + k).fill(String(v));
  await p.getByRole('button', { name: 'Speichern' }).first().click(); await p.waitForTimeout(1000);
  await p.goto(L + '/zahlungen'); const inp = p.locator('main input'); await inp.nth(0).fill('Dr. Lea Sonnenberg'); await inp.nth(1).fill('DE89 3704 0044 0532 0130 00');
  await p.getByRole('button', { name: 'Bankverbindung speichern' }).click(); await p.waitForTimeout(1000);
  await p.goto(L + '/analyse/wirkung'); await p.getByTestId('ausgang-vorschlaegeMonat').fill('40'); await p.getByTestId('ausgang-ohneEntscheidungProzent').fill('35'); await p.getByTestId('ausgang-tageBisZahlung').fill('21');
  await p.getByRole('button', { name: /Ausgangswerte speichern/ }).click(); await p.waitForTimeout(1500);
  ok('Wirkungsbericht zeigt die Ausgangswerte', /40 Vorschläge im Monat, davon 35 % ohne Entscheidung, 21 Tage/.test(await p.getByTestId('wirkung').innerText()));

  // Patient (Kasse)
  const neu = async (vor, nach, kasse, name) => { await p.goto(L + '/patients/new'); const f = p.locator('main input, main select, main textarea'); await f.nth(0).fill(vor); await f.nth(1).fill(nach); await f.nth(2).selectOption('M'); await f.nth(3).fill('1968-04-12'); await f.nth(4).selectOption(kasse); await f.nth(5).fill(name); await p.locator('main button[type=submit]').click(); await p.waitForTimeout(2500); return sql(`select p.id from "Patient" p join "User" u on u."practiceId"=p."practiceId" where u.email='${EMAIL}' and p."lastName"='${nach}' limit 1`); };
  const pid = await neu('Thomas', 'Beispielmann', 'GKV', 'AOK Nordwest');

  // Abschluss
  await p.goto(L + '/abschluss/new?patientId=' + pid); await p.waitForTimeout(1500);
  ok('Kein Sitzungstyp vorausgewählt', (await p.getByTestId('sitzungstyp').inputValue()) === '');
  await p.getByTestId('sitzungstyp').selectOption({ label: 'Kontrolluntersuchung' }); await p.waitForTimeout(1000);
  const liste = await p.locator('main').innerText();
  ok('Kasse: PSI als BEMA 04, Beratung umbenannt', /Parodontaler Screening Index \(PSI\)\s*Kasse\s*BEMA 04/.test(liste) && /\nBeratung\n/.test(liste) && !/Eingehende Beratung/.test(liste));
  ok('Hinweis: Zahn/Region fehlt bei Röntgen', (await p.getByTestId('region-fehlt').innerText()).includes('Röntgen Einzelzahnaufnahme'));
  await p.getByText('Befunde eintragen').click(); const sels = p.locator('main select');
  for (let i = 0; i < await sels.count(); i++) if (/10 Jahre/.test(await sels.nth(i).innerText())) await sels.nth(i).selectOption({ label: '10 Jahre (75 %)' });
  for (const [n, bef] of [[36, 'zerstoert'], [46, 'karies_klein'], [24, 'fehlt'], [26, 'fehlt']]) { await p.locator(`button[aria-label^="Zahn ${n}"]:visible`).first().click(); await p.locator('main select').last().selectOption(bef); await p.waitForTimeout(300); }
  const karten = await p.locator('main').innerText();
  ok('Krone: Regelversorgung mit Durchschnittskosten 398 €, Eigenanteil 100 €', /Krone, Regelversorgung[\s\S]{0,200}Festzuschuss Befund 1\.1: 298,79\s€[\s\S]{0,60}Eigenanteil\s*100 €/.test(karten), karten.match(/Krone, Regelversorgung[\s\S]{0,260}/)?.[0]);
  ok('Zwei Lücken mit gemeinsamem Pfeiler: eine Brücke mit 2.1 + 2.5 + 3× 2.7', /Zähne 24, 26[\s\S]{0,400}Festzuschuss Befund 2\.1 \+ 2\.5 \+ 3× 2\.7: 1\.372,70\s€/.test(karten), karten.match(/Zähne 24, 26[\s\S]{0,420}/)?.[0]);
  await p.getByText('Zähne 24, 26').last().scrollIntoViewIfNeeded(); await shot('01-lueckenlogik');
  await p.locator('main input[type=checkbox]').last().check(); await p.getByRole('button', { name: 'Behandlung abschließen' }).last().click();
  await p.waitForURL(/abschluss\/(?!new)/, { timeout: 60000 }); await p.waitForTimeout(2000);
  const ergebnis = await p.locator('main').innerText();
  // Die Software empfiehlt nichts. Ohne Wahl der Praxis steht im Schreiben keine Empfehlung.
  ok('Schreiben: „Noch nicht entschieden. Wir besprechen die Möglichkeiten mit Ihnen.“, keine Empfehlung', /Noch nicht entschieden\. Wir besprechen die Möglichkeiten mit Ihnen\./.test(ergebnis) && !/Besprochene Wahl/.test(ergebnis) && !/Empfehlung/i.test(ergebnis), (ergebnis.match(/.{0,60}Empfehlung.{0,60}/i) || [''])[0]);
  ok('Schreiben: 2027 „per Gesetz“ und vorläufig', /per Gesetz[\s\S]*vorläufig/.test(ergebnis));
  await shot('02-ergebnis', true);
  await p.getByRole('button', { name: 'Link und QR-Code erzeugen' }).click(); await p.waitForTimeout(2000);
  const link = (await p.locator('main').innerHTML()).match(/https?:\/\/[^"<\s]*\/p\/[A-Za-z0-9_-]+/)[0];
  const propId = sql(`select id from "TreatmentProposal" where "patientId"='${pid}' order by "createdAt" desc limit 1`);

  // Nachfass-Liste vor der Antwort
  await p.goto(L + '/dashboard'); ok('Übersicht: Hinweis auf offenen Zahnersatz vor dem 1.1.2027', /Zahnersatz-Vorschlag vor dem 1\.1\.2027 offen/.test(await p.getByTestId('nachfass-hinweis').innerText().catch(() => '')));
  await p.goto(L + '/proposals/nachfassen'); const nf = await p.locator('main').innerText();
  ok('Nachfass-Liste: Patient, Stand und Mehrbetrag ab 2027', /Beispielmann, Thomas/.test(nf) && /nicht geöffnet/.test(nf) && /\+\d+ €/.test(nf), nf.slice(0, 600)); await shot('03-nachfassen');
  await p.getByTestId('hkp-eingereicht').first().check(); await p.waitForTimeout(1500);
  ok('„HKP eingereicht“ wird gespeichert', sql(`select "hkpEingereichtAt" is not null from "TreatmentProposal" where id='${propId}'`) === 't');

  // Patient am Handy
  const h = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', timezoneId: 'Europe/Berlin' }); const hp = await h.newPage();
  hp.on('pageerror', (e) => errs.push('HANDY ' + hp.url().replace(L, '') + ': ' + e.message.slice(0, 80)));
  await hp.goto(link); await hp.waitForTimeout(2000); const pt = await hp.locator('body').innerText();
  ok('Patient: Krone Kasse 299 €, Eigenanteil 100 €', /Kasse 299 €/.test(pt) && /\n100 €\n/.test(pt), pt.match(/Krone, Regelversorgung[\s\S]{0,200}/)?.[0]);
  await hp.getByText('Mehrschicht-Komposit, adhäsiv').first().click(); await hp.getByText('Vollkeramik-Krone').first().click(); await hp.getByText(/^Brücke \(5 Glieder\), Regelversorgung$/).first().click(); await hp.waitForTimeout(500);
  const sum = await hp.locator('body').innerText(); const erwartet = Math.round(95 + (980 - 298.79) + (1830.27 - 1372.7));
  ok(`Patient: Summe ${erwartet.toLocaleString('de-DE')} €`, new RegExp(`Ihr Eigenanteil für diese Auswahl\\s*${erwartet.toLocaleString('de-DE').replace('.', '\\.')} €`).test(sum), sum.match(/Ihr Eigenanteil für diese Auswahl\s*[^\n]*/)?.[0]);
  await hp.screenshot({ path: `${D}/04-patient-handy.png` });
  await hp.locator('textarea').first().fill('Ich hätte gern die Keramikkrone.'); await hp.getByRole('button', { name: 'Diese Auswahl besprechen' }).click(); await hp.waitForTimeout(2000);

  // Praxis: Wahl annehmen, ohne Neuladen stimmt die Ansicht
  await p.goto(L + '/proposals/' + propId); await p.getByTestId('patient-wahl').waitFor();
  await p.getByTestId('annehmen-patientenwahl').click(); await p.waitForTimeout(2500);
  const nachAnnahme = await p.locator('main').innerText();
  ok('Nach „Wahl des Patienten annehmen“ zeigt die Ansicht sofort die Wahl', !/Festgehalten ist eine andere Wahl/.test(nachAnnahme) && new RegExp(`EIGENANTEIL PATIENT\\s*${erwartet.toLocaleString('de-DE').replace('.', '\\.')} €`, 'i').test(nachAnnahme), nachAnnahme.match(/Eigenanteil Patient\s*[^\n]*/i)?.[0]);
  // Nachweis-PDF
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.getByTestId('nachweis-pdf').click()]); const pfad = `${D}/kosteninformation.pdf`; await dl.saveAs(pfad);
  const pdfText = execFileSync('pdftotext', ['-layout', pfad, '-']).toString(); // ohne Shell; braucht pdftotext (poppler-utils)
  ok('Nachweis-PDF: Optionen, Verlauf, Wahl des Patienten', /Kosteninformation zum Behandlungsvorschlag/.test(pdfText) && /Vollkeramik-Krone[^\n]*vom Patienten gewählt/.test(pdfText) && /Vom Patienten geöffnet/.test(pdfText) && /Rückmeldung des Patienten/.test(pdfText), pdfText.slice(0, 500));

  // Rechnung + Portal
  await p.goto(L + '/zahlungen'); await p.getByRole('button', { name: 'Rechnung erstellen' }).first().click(); await p.waitForTimeout(600); await p.getByRole('button', { name: 'Rechnung anlegen' }).click(); await p.waitForTimeout(2000);
  ok('Zahlungen: „1 Rechnung“ (Einzahl)', /1 Rechnung\n/.test(await p.locator('main').innerText()));
  await p.getByRole('button', { name: 'Link zum Bezahlen senden' }).click(); await p.waitForTimeout(2000);
  const portal = (await p.content()).match(/https?:\/\/[^"<\s&]*\/portal\/[A-Za-z0-9_-]+/)?.[0];
  await hp.goto(portal); await hp.waitForTimeout(2000); let po = await hp.locator('body').innerText();
  ok('Portal: Anteil stimmt mit Rechnung überein', new RegExp(`Ihr Anteil\\s*${erwartet.toLocaleString('de-DE').replace('.', '\\.')} €`).test(po), po.match(/Ihr Anteil\s*[^\n]*/)?.[0]);
  await hp.getByRole('button', { name: /bezahlen|zahlen/i }).first().click().catch(() => {}); await hp.waitForTimeout(500);
  await hp.getByRole('button', { name: 'Ich habe überwiesen' }).click(); await hp.waitForTimeout(2000);
  ok('Nach „Ich habe überwiesen“ bleiben die Zahlungsdaten erreichbar', await hp.getByTestId('zahlungsdaten-nach-meldung').count() === 1);
  await hp.screenshot({ path: `${D}/05-portal.png` });

  // Privatpatient: Betrag in Portal und Einverständnis
  const pid2 = await neu('Greta', 'Privat', 'PKV', 'Allianz Private');
  await p.goto(L + '/proposals/new?patientId=' + pid2); await p.waitForTimeout(1500);
  await p.locator(`button[aria-label^="Zahn 36"]:visible`).first().click(); await p.locator('main select').last().selectOption('zerstoert'); await p.waitForTimeout(500);
  const pk = await p.locator('main').innerText();
  const pkTeil = pk.slice(pk.lastIndexOf('Stark zerstört (Krone)'), pk.indexOf('Beträge sind Schätzungen'));
  ok('Privat: keine Kassenwörter in den Optionen', /Vollkeramik-Krone/.test(pkTeil) && !/Festzuschuss|Kassenfüllung|Regelversorgung|Kassenkrone/.test(pkTeil), pkTeil);
  await p.getByRole('button', { name: 'Vorschlag speichern' }).click(); await p.waitForURL(/proposals\/c/, { timeout: 20000 }); const prop2 = p.url().split('/').pop();
  await p.getByRole('button', { name: 'Link und QR-Code erzeugen' }).click(); await p.waitForTimeout(2000);
  const link2 = (await p.locator('main').innerHTML()).match(/https?:\/\/[^"<\s]*\/p\/[A-Za-z0-9_-]+/)[0];
  await hp.goto(link2); await hp.waitForTimeout(1500); await hp.getByText('Vollkeramik-Krone').first().click(); await hp.getByRole('button', { name: 'Diese Auswahl besprechen' }).click(); await hp.waitForTimeout(2000);
  const portal2 = await p.evaluate(async (id) => (await (await fetch(`/api/patients/${id}/portal`, { method: 'POST' })).json()).url, pid2);
  await hp.goto(portal2.replace(/^https?:\/\/[^/]+/, L) + '/vereinbarung/' + prop2); await hp.waitForTimeout(2000);
  const vorher = await hp.locator('body').innerText(); ok('Einverständnis: zuerst die Abfrage des Geburtsdatums, Erklärung und Unterschrift erst danach', /Geburtsdatum/.test(vorher) && !/Versicherung nach meinem Tarif/.test(vorher) && (await hp.locator('canvas, input[type="checkbox"]').count()) === 0, vorher.slice(0, 300));
  const gf = hp.locator('form[data-testid^="geburtsdatu"] input'); await gf.nth(0).fill('11'); await gf.nth(1).fill('04'); await gf.nth(2).fill('1968'); await hp.locator('form[data-testid^="geburtsdatu"] button').click(); await hp.waitForTimeout(1200);
  ok('Einverständnis: falsches Geburtsdatum wird abgelehnt', /Versuch/.test(await hp.locator('[data-testid="geb-fehler"]').innerText().catch(() => '')));
  await gf.nth(0).fill('12'); await hp.locator('form[data-testid^="geburtsdatu"] button').click(); await hp.waitForTimeout(1500); const ve = await hp.locator('body').innerText();
  ok('Einverständnis: richtiges Geburtsdatum gibt den Text frei', /Geburtsdatum bestätigt/.test(ve));
  ok('Privat: Einverständnis nennt Tarif-Erstattung 784 € (80 % von 980 €) und Eigenanteil 196 €', /Versicherung erstattet\s*784 €/.test(ve) && /Versicherung nach meinem Tarif voraussichtlich 784 € erstattet/.test(ve) && /Eigenanteil voraussichtlich 196 €/.test(ve), ve.slice(0, 700));
  await hp.goto(portal2.replace(/^https?:\/\/[^/]+/, L)); await hp.waitForTimeout(1500); po = await hp.locator('body').innerText();
  ok('Privat: Portal zeigt „Versicherung erstattet 784 €“ und „Ihr Anteil 196 €“', /Versicherung erstattet\s*784 €/.test(po) && /Ihr Anteil\s*196 €/.test(po), po.slice(0, 400));
  await hp.screenshot({ path: `${D}/06-portal-privat.png` });

  // Sonstiges
  await p.goto(L + '/eingang'); ok('Eingang: Schalter für die Morgen-Mail', await p.getByTestId('morgenmail').count() === 1);
  await p.goto(L + '/gibt-es-nicht'); ok('Deutsche Seite für unbekannte Adressen', /Diese Seite gibt es nicht/.test(await p.locator('body').innerText()));
  await p.goto(L + '/dashboard'); const ein = await p.getByTestId('einrichtung').innerText().catch(() => ''); ok('Checkliste zählt mit (5 von 7)', /5 von 7/.test(ein), ein.split('\n')[1]); await shot('07-uebersicht');
  ok('keine Fehler im Browser/Server', errs.length === 0, errs.join(' ; ').slice(0, 400));
  console.log(fehl ? `\n${fehl} Prüfungen fehlgeschlagen` : '\nAlle Prüfungen bestanden');
  await b.close();
})().catch(abbruch);
