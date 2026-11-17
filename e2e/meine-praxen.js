// Brücke zwischen Praxen auf dem Gerät des Patienten: „Meine Praxen auf diesem Gerät“ (Stufe 0 und 1).
// Zwei Demo-Praxen verschiedener Fächer (Hausarzt, Zahnarzt) mit demselben Menschen („Zwilling“: gleicher Name und
// gleiches Geburtsdatum), jeder mit eigenem Portal-Link. Geprüft wird:
//   - Portal-Kopf, Unterseite und Manifest zeigen Fach, Ort, Farbe und kurzen Namen der jeweiligen Praxis.
//   - Beide Praxen merken; /meine-praxen zeigt zwei getrennte Karten. Beim Öffnen der Liste kein Aufruf an /api.
//   - Jede Anfrage trägt höchstens ein Token. Öffnen, Umbenennen, Entfernen, Ablauf, alles löschen.
//   - Auf einem Gerät der Praxis (Sitzung, Empfangsmodus) gibt es keinen Knopf zum Merken und keine Liste.
//   - Handy (390 px) und Bildschirm (1280 px), hell und dunkel.
// Aufruf: BASIS=http://localhost:3105 BILDER=<Ordner> node e2e/meine-praxen.js
const crypto = require('crypto');
const { chromium, L, D, sql, pruef, stand, KONTEXT, HANDY } = require('./gemeinsam');

const KENN = `e2e-br-${Date.now().toString(36)}`;
const token = () => crypto.randomBytes(32).toString('hex');
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const q = (s) => s.replace(/'/g, "''");

function anlegen() {
  const tA = token(), tB = token();
  const praxen = [
    { id: `${KENN}-haus`, name: 'Hausarztpraxis Dr. Weber (Demo)', fach: 'hausarzt', ort: '48143 Münster', t: tA },
    { id: `${KENN}-zahn`, name: 'Zahnarztpraxis Dr. Sonnenberg (Demo)', fach: 'zahn', ort: '48155 Münster', t: tB },
  ];
  for (const p of praxen) {
    sql(`insert into "Practice" (id, name, specialty, "isDemo", stammdaten) values ('${p.id}', '${q(p.name)}', '${p.fach}', true, '${q(JSON.stringify({ plzOrt: p.ort, strasse: 'Marktstraße 1' }))}'::jsonb)`);
    // Derselbe Mensch in beiden Praxen: zwei unverbundene Datensätze, je ein eigener Link.
    sql(`insert into "Patient" (id, "practiceId", "firstName", "lastName", "birthDate", email, phone, "portalTokenHash", "portalExpiresAt") values ('${p.id}-pat', '${p.id}', 'Anna', 'Zwilling', '1980-05-12', 'anna.zwilling@example.org', '+49 170 0000000', '${hash(p.t)}', now() + interval '60 days')`);
  }
  // Anamnese-Link (/a) der Zahnarztpraxis
  const tAnam = token();
  sql(`insert into "AnamnesisForm" (id, "practiceId", "patientId", "tokenHash", "expiresAt") values ('${KENN}-anam', '${KENN}-zahn', '${KENN}-zahn-pat', '${hash(tAnam)}', now() + interval '7 days')`);
  // Buchungsseite für neue Patienten (/t) der Zahnarztpraxis
  const kBuch = `${KENN.replace(/[^A-Za-z0-9_-]/g, '')}-buchung`.slice(0, 40);
  sql(`update "Practice" set "buchungKennung" = '${kBuch}', "neupatientenBuchung" = true where id = '${KENN}-zahn'`);
  return { tA, tB, tAnam, kBuch };
}
function aufraeumen() {
  sql(`delete from "AnamnesisForm" where id like '${KENN}%'`);
  sql(`delete from "AuditLog" where "practiceId" like '${KENN}%'`);
  sql(`delete from "Patient" where "practiceId" like '${KENN}%'`);
  sql(`delete from "Practice" where id like '${KENN}%'`);
}

(async () => {
  let b;
  const { tA, tB, tAnam, kBuch } = anlegen();
  try {
    b = await chromium.launch();
    const fotos = async (p, name, voll = false) => p.screenshot({ path: `${D}/${name}.png`, fullPage: voll });
    const csp = [];
    const neu = async (opt) => {
      const c = await b.newContext(opt);
      const p = await c.newPage();
      p.on('console', (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 140)); });
      return { c, p };
    };

    // ---------- Handy, 390 px, Gerät des Patienten ----------
    const { c: hc, p: hp } = await neu(HANDY);
    const anfragen = [];
    hp.on('request', (r) => anfragen.push(r.url().replace(L, '')));

    // Portal der Hausarztpraxis
    await hp.goto(`${L}/portal/${tA}`);
    pruef('Hausarzt: Farbstreifen der Gruppe „arzt“', (await hp.getByTestId('praxis-streifen').getAttribute('data-gruppe')) === 'arzt');
    pruef('Hausarzt: Fach und Ort unter dem Praxisnamen', (await hp.getByTestId('praxis-kennzeile').innerText()) === 'Hausarztpraxis · Münster');
    pruef('Hausarzt: Tab-Titel mit Praxisname', (await hp.title()).startsWith('Hausarztpraxis Dr. Weber (Demo) · '), await hp.title());
    const appleTitel = await hp.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content');
    pruef('Hausarzt: Titel der Web-App auf dem iPhone ist der kurze Praxisname', appleTitel === 'Weber', appleTitel);
    pruef('Hausarzt: Symbol im Tab und auf dem Startbildschirm aus der Gruppe', /gruppe-arzt\.svg/.test(await hp.locator('link[rel="icon"]').first().getAttribute('href')) && /gruppe-arzt-180\.png/.test(await hp.locator('link[rel="apple-touch-icon"]').getAttribute('href')));
    const manifestA = await (await hc.request.get(`${L}/portal/${tA}/manifest.webmanifest`)).json();
    pruef('Hausarzt: Manifest mit kurzem Namen, Farbe und Symbol der Gruppe', manifestA.short_name === 'Weber' && manifestA.theme_color === '#1D4ED8' && manifestA.icons.every((i) => i.src.includes('gruppe-arzt')), JSON.stringify(manifestA).slice(0, 200));
    await fotos(hp, '01-portal-hausarzt-390');
    await hp.getByTestId('praxis-merken-knopf').scrollIntoViewIfNeeded();
    await fotos(hp, '02-portal-hausarzt-fuss-390');
    await hp.getByTestId('praxis-merken-knopf').click();
    pruef('Hausarzt: „Gemerkt“ nach dem Klick', await hp.getByTestId('praxis-gemerkt').isVisible());
    await fotos(hp, '03-portal-hausarzt-gemerkt-390');

    // Unterseite mit Band
    await hp.goto(`${L}/portal/${tA}/fragen`);
    pruef('Unterseite: Band mit Praxisname, Fach und Ort', (await hp.getByTestId('praxis-band').innerText()).includes('Hausarztpraxis · Münster'));
    await fotos(hp, '04-portal-unterseite-fragen-390');

    // Portal der Zahnarztpraxis
    await hp.goto(`${L}/portal/${tB}`);
    pruef('Zahnarzt: Farbstreifen der Gruppe „zahn“', (await hp.getByTestId('praxis-streifen').getAttribute('data-gruppe')) === 'zahn');
    pruef('Zahnarzt: Fach und Ort', (await hp.getByTestId('praxis-kennzeile').innerText()) === 'Zahnarztpraxis · Münster');
    const manifestB = await (await hc.request.get(`${L}/portal/${tB}/manifest.webmanifest`)).json();
    pruef('Zahnarzt: eigener kurzer Name und eigene Farbe', manifestB.short_name === 'Sonnenberg' && manifestB.theme_color === '#0F766E' && manifestB.short_name !== manifestA.short_name, JSON.stringify(manifestB).slice(0, 160));
    await fotos(hp, '05-portal-zahnarzt-390');
    await hp.getByTestId('praxis-merken-knopf').click();
    pruef('Zahnarzt: „Gemerkt“ nach dem Klick', await hp.getByTestId('praxis-gemerkt').isVisible());

    // Anamnese-Link der Zahnarztpraxis zeigt die Kennung
    await hp.goto(`${L}/a/${tAnam}`);
    pruef('/a: Band der Zahnarztpraxis', (await hp.getByTestId('praxis-band').getAttribute('data-gruppe')) === 'zahn');
    await fotos(hp, '06-anamnese-link-390');
    await hp.goto(`${L}/t/${kBuch}`);
    pruef('/t: Streifen, Fach und Ort der Zahnarztpraxis', (await hp.getByTestId('praxis-streifen').getAttribute('data-gruppe')) === 'zahn' && (await hp.getByTestId('praxis-kennzeile').innerText()) === 'Zahnarztpraxis · Münster');
    await fotos(hp, '06b-buchungsseite-390');

    // Meine Praxen: Netzwerk ab hier beobachten
    await hp.goto(`${L}/portal/${tB}`);
    const ab = anfragen.length;
    await hp.getByTestId('meine-praxen-link').click();
    await hp.waitForURL('**/meine-praxen');
    await hp.getByTestId('meine-praxen-liste').waitFor();
    await hp.waitForTimeout(800);
    const beimOeffnen = anfragen.slice(ab).filter((u) => u.startsWith('/api/'));
    pruef('Beim Öffnen der Liste kein Aufruf an /api', beimOeffnen.length === 0, beimOeffnen.join(', '));
    const karten = hp.getByTestId('meine-praxis');
    pruef('Zwei getrennte Karten', (await karten.count()) === 2);
    pruef('Karten in den Farben ihrer Gruppen', JSON.stringify(await karten.evaluateAll((k) => k.map((x) => x.dataset.gruppe))) === '["arzt","zahn"]');
    const text = await hp.getByTestId('meine-praxen-liste').innerText();
    pruef('Karten nennen Praxis, Fach, Ort, für wen und gültig bis', /Hausarztpraxis Dr\. Weber[\s\S]*Hausarztpraxis · Münster[\s\S]*Für Anna[\s\S]*Gültig bis/.test(text) && /Zahnarztpraxis Dr\. Sonnenberg[\s\S]*Zahnarztpraxis · Münster/.test(text), text.slice(0, 300));
    pruef('Einleitung: Liste nur auf dem Gerät, Sorrida verbindet nichts', (await hp.getByTestId('meine-praxen-einleitung').innerText()).includes('Sorrida verbindet Ihre Daten nicht.'));
    const roh = await hp.evaluate(() => localStorage.getItem('sorrida:meine-praxen:v1'));
    const gespeichert = JSON.parse(roh);
    const felder = [...new Set(gespeichert.praxen.flatMap((e) => Object.keys(e)))].sort().join(',');
    pruef('Gespeichert nur erlaubte Felder', felder === 'fachKurz,gemerktAm,gruppe,gueltigBis,ort,praxisName,token,vorname', felder);
    pruef('Nichts Weiteres gespeichert (kein Nachname, kein Geburtsdatum, keine Kontaktdaten)', !/Zwilling|1980|example\.org|\+49/.test(roh));
    pruef('Nur dieser eine Schlüssel im Speicher', JSON.stringify(await hp.evaluate(() => Object.keys(localStorage))) === '["sorrida:meine-praxen:v1"]');
    const kopf = await hc.request.get(`${L}/meine-praxen`);
    pruef('Kopfzeilen: no-referrer und noindex', kopf.headers()['referrer-policy'] === 'no-referrer' && /noindex/.test(kopf.headers()['x-robots-tag'] || ''), JSON.stringify([kopf.headers()['referrer-policy'], kopf.headers()['x-robots-tag']]));
    pruef('Inhaltsrichtlinie unverändert: connect-src nur eigene Adresse', /connect-src 'self'/.test(kopf.headers()['content-security-policy'] || ''));
    await fotos(hp, '07-meine-praxen-390', true);

    // Umbenennen
    await karten.nth(0).getByTestId('meine-praxis-umbenennen').click();
    await hp.getByTestId('meine-praxis-name').fill('Hausärztin');
    await fotos(hp, '08-meine-praxen-umbenennen-390');
    await hp.getByTestId('meine-praxis-name-speichern').click();
    pruef('Umbenennen: eigener Name auf der Karte, Praxisname darunter', (await karten.nth(0).getByTestId('meine-praxis-titel').innerText()) === 'Hausärztin' && (await karten.nth(0).innerText()).includes('Praxis: Hausarztpraxis Dr. Weber (Demo)'));

    // Öffnen: genau ein Portal
    await karten.nth(1).getByTestId('meine-praxis-oeffnen').click();
    await hp.waitForURL(`**/portal/${tB}`);
    pruef('Öffnen führt in genau ein Portal', hp.url().endsWith(`/portal/${tB}`) && (await hp.getByTestId('praxis-streifen').getAttribute('data-gruppe')) === 'zahn');
    await hp.goBack();
    await hp.getByTestId('meine-praxen-liste').waitFor();

    // Entfernen
    await karten.nth(0).getByTestId('meine-praxis-entfernen').click();
    await fotos(hp, '09-meine-praxen-entfernen-frage-390');
    await karten.nth(0).getByTestId('meine-praxis-entfernen-ja').click();
    pruef('Entfernen: eine Karte bleibt (Zahnarzt)', (await karten.count()) === 1 && (await karten.nth(0).getAttribute('data-gruppe')) === 'zahn');
    pruef('Entfernen: Meldung für Bildschirmleser', (await hp.getByTestId('meine-praxen-meldung').innerText()) === 'Entfernt.');

    // Abgelaufen (auf dem Gerät verglichen): Datum im Speicher zurücksetzen
    await hp.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sorrida:meine-praxen:v1'));
      s.praxen[0].gueltigBis = '2026-01-02T10:00:00.000Z';
      localStorage.setItem('sorrida:meine-praxen:v1', JSON.stringify(s));
    });
    await hp.reload();
    await hp.getByTestId('meine-praxen-liste').waitFor();
    pruef('Abgelaufener Link: Hinweis statt „Öffnen“', (await hp.getByTestId('meine-praxis-abgelaufen').innerText()).includes('Abgelaufen am 02.01.2026') && (await hp.getByTestId('meine-praxis-oeffnen').count()) === 0);
    await fotos(hp, '10-meine-praxen-abgelaufen-390');

    // Kaputter Speicher wird verworfen
    await hp.evaluate(() => localStorage.setItem('sorrida:meine-praxen:v1', '{kaputt'));
    await hp.reload();
    await hp.getByTestId('meine-praxen-leer').waitFor();
    pruef('Kaputter Speicher wird verworfen', (await hp.evaluate(() => localStorage.getItem('sorrida:meine-praxen:v1'))) === null);

    // Alles löschen
    await hp.goto(`${L}/portal/${tA}`); await hp.getByTestId('praxis-merken-knopf').click();
    await hp.goto(`${L}/meine-praxen`); await hp.getByTestId('meine-praxen-liste').waitFor();
    await hp.getByTestId('meine-praxen-alles').click(); await hp.getByTestId('meine-praxen-alles-ja').click();
    pruef('Alles löschen: Liste leer, Schlüssel entfernt', (await hp.getByTestId('meine-praxen-meldung').innerText()).startsWith('Alles gelöscht') && (await hp.evaluate(() => localStorage.getItem('sorrida:meine-praxen:v1'))) === null);

    // Arabisch: von rechts nach links
    await hp.goto(`${L}/meine-praxen?lang=ar`);
    pruef('Arabisch: Seite von rechts nach links', (await hp.getByTestId('meine-praxen').getAttribute('dir')) === 'rtl');
    await fotos(hp, '11-meine-praxen-leer-arabisch-390');

    // Jede Anfrage trägt höchstens ein Token
    const zwei = anfragen.filter((u) => [tA, tB, tAnam].filter((t) => u.includes(t)).length > 1);
    pruef('Keine Anfrage mit mehr als einem Token', zwei.length === 0, zwei.join(', '));
    await hc.close();

    // ---------- Bildschirm, 1280 px, hell und dunkel ----------
    for (const [schema, nr] of [['light', '12'], ['dark', '13']]) {
      const { c, p } = await neu({ ...KONTEXT, colorScheme: schema });
      await p.goto(`${L}/portal/${tA}`); await p.getByTestId('praxis-merken-knopf').click();
      if (schema === 'light') await fotos(p, '12a-portal-hausarzt-1280');
      await p.goto(`${L}/portal/${tB}`); await p.getByTestId('praxis-merken-knopf').click();
      await p.goto(`${L}/meine-praxen`); await p.getByTestId('meine-praxen-liste').waitFor();
      pruef(`1280 px (${schema}): zwei Karten`, (await p.getByTestId('meine-praxis').count()) === 2);
      if (schema === 'dark') pruef('Dunkel: Seite folgt dem Gerät', (await p.getByTestId('meine-praxen').evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(25, 22, 21)');
      await fotos(p, `${nr}-meine-praxen-1280-${schema === 'light' ? 'hell' : 'dunkel'}`, true);
      if (schema === 'dark') {
        const { p: hd } = await neu({ ...HANDY, colorScheme: 'dark' });
        await hd.context().addInitScript(() => {});
        await hd.goto(`${L}/meine-praxen`);
        await fotos(hd, '14-meine-praxen-390-dunkel-leer');
        await hd.context().close();
      }
      await c.close();
    }

    // ---------- Gerät der Praxis: kein Merken, keine Liste ----------
    for (const [name, wert] of [['next-auth.session-token', 'x'], ['sorrida_uebergabe', 'x']]) {
      const { c, p } = await neu(HANDY);
      await c.addCookies([{ name, value: wert, url: L }]);
      await p.goto(`${L}/portal/${tA}`);
      pruef(`Praxis-Gerät (${name}): kein Knopf zum Merken`, (await p.getByTestId('praxis-merken').count()) === 0);
      await p.goto(`${L}/meine-praxen`);
      pruef(`Praxis-Gerät (${name}): keine Liste, nur Hinweis`, await p.getByTestId('meine-praxen-praxisgeraet').isVisible() && (await p.getByTestId('meine-praxis').count()) === 0);
      if (name === 'sorrida_uebergabe') await fotos(p, '15-meine-praxen-praxisgeraet-390');
      await c.close();
    }

    pruef('Keine Meldung der Inhaltsrichtlinie (CSP)', csp.length === 0, csp.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('ABBRUCH', String((e && e.message) || e).split('\n').slice(0, 4).join(' / '));
    pruef('Durchlauf ohne Abbruch', false);
  } finally {
    if (b) await b.close().catch(() => {});
    aufraeumen();
  }
  const { ok, fehl } = stand();
  console.log(`\nMeine Praxen: ${ok} bestanden, ${fehl} fehlgeschlagen`);
  process.exitCode = fehl ? 1 : 0;
})();
