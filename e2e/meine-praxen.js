// Brücke zwischen Praxen auf dem Gerät des Patienten: „Meine Praxen auf diesem Gerät“ (Stufe 0 und 1).
// Zwei Demo-Praxen verschiedener Fächer (Hausarzt, Zahnarzt) mit demselben Menschen („Zwilling“: gleicher Name und
// gleiches Geburtsdatum), jeder mit eigenem Portal-Link. Geprüft wird:
//   - Portal-Kopf, Unterseite und Manifest zeigen Fach, Ort, Farbe und kurzen Namen der jeweiligen Praxis.
//   - Beide Praxen merken; /meine-praxen zeigt zwei getrennte Karten. Beim Öffnen der Liste kein Aufruf an /api und
//     kein Portal vorab geladen. Gleicher Name mit anderem Link: Der Knopf fragt nach.
//   - Das Cookie der Geburtsdatum-Bestätigung gilt nur für die Seiten dieses Links.
//   - Ersetzter Link: Die Seite „nicht mehr gültig“ nimmt ihn auf Wunsch aus der Liste, ohne Aufruf an den Server.
//   - Tastaturfokus nach Merken, Umbenennen und Entfernen; das Band der Praxis ist ein <header>.
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
    pruef('Hausarzt: Manifest mit kurzem Namen, Farbe und Symbol der Gruppe', manifestA.short_name === 'Weber' && manifestA.theme_color === '#5A1D1D' && manifestA.icons.every((i) => i.src.includes('gruppe-arzt')), JSON.stringify(manifestA).slice(0, 200));
    await fotos(hp, '01-portal-hausarzt-390');
    await hp.getByTestId('praxis-merken-knopf').scrollIntoViewIfNeeded();
    await fotos(hp, '02-portal-hausarzt-fuss-390');
    await hp.getByTestId('praxis-merken-knopf').click();
    pruef('Hausarzt: „Gemerkt“ nach dem Klick', await hp.getByTestId('praxis-gemerkt').isVisible());
    pruef('Hausarzt: Tastaturfokus auf der Meldung', (await hp.evaluate(() => document.activeElement && document.activeElement.dataset.testid)) === 'praxis-gemerkt');
    await fotos(hp, '03-portal-hausarzt-gemerkt-390');

    // Geburtsdatum bestätigen: Das Cookie geht nur an die Seiten dieses Links, nie an andere Praxen oder /meine-praxen.
    const best = await hc.request.post(`${L}/api/portal/${tA}/pruefung`, { data: { tag: 12, monat: 5, jahr: 1980 } });
    const pp = (await hc.cookies()).filter((c) => c.name.startsWith('sorrida_pp_'));
    pruef('Bestätigung: Cookie nur unter /portal/<Link> und /api/portal/<Link>', best.status() === 200 && JSON.stringify(pp.map((c) => c.path).sort()) === JSON.stringify([`/api/portal/${tA}`, `/portal/${tA}`]), `${best.status()} ${pp.map((c) => c.path).join(', ')}`);
    const mit = async (u) => (await hc.cookies(`${L}${u}`)).filter((c) => c.name.startsWith('sorrida_pp_')).length;
    pruef('Bestätigung: Browser schickt das Cookie nicht an Praxis B, /meine-praxen oder die Startseite', (await mit(`/portal/${tA}`)) === 1 && (await mit(`/portal/${tB}`)) === 0 && (await mit(`/api/portal/${tB}/pruefung`)) === 0 && (await mit('/meine-praxen')) === 0 && (await mit('/')) === 0);

    // Unterseite mit Band
    await hp.goto(`${L}/portal/${tA}/fragen`);
    pruef('Unterseite: Band mit Praxisname, Fach und Ort', (await hp.getByTestId('praxis-band').innerText()).includes('Hausarztpraxis · Münster'));
    pruef('Unterseite: Band ist ein <header> (Landmarke)', (await hp.getByTestId('praxis-band').evaluate((e) => e.tagName)) === 'HEADER');
    await fotos(hp, '04-portal-unterseite-fragen-390');

    // Portal der Zahnarztpraxis
    await hp.goto(`${L}/portal/${tB}`);
    pruef('Zahnarzt: Farbstreifen der Gruppe „zahn“', (await hp.getByTestId('praxis-streifen').getAttribute('data-gruppe')) === 'zahn');
    pruef('Zahnarzt: Fach und Ort', (await hp.getByTestId('praxis-kennzeile').innerText()) === 'Zahnarztpraxis · Münster');
    const manifestB = await (await hc.request.get(`${L}/portal/${tB}/manifest.webmanifest`)).json();
    pruef('Zahnarzt: eigener kurzer Name und eigene Farbe', manifestB.short_name === 'Sonnenberg' && manifestB.theme_color === '#86433A' && manifestB.short_name !== manifestA.short_name, JSON.stringify(manifestB).slice(0, 160));
    await fotos(hp, '05-portal-zahnarzt-390');
    await hp.getByTestId('praxis-merken-knopf').click();
    pruef('Zahnarzt: „Gemerkt“ nach dem Klick', await hp.getByTestId('praxis-gemerkt').isVisible());

    // Gleicher Name, anderer Link (etwa ein neuer Link der Praxis): Der Knopf fragt nach, statt still zu ersetzen.
    const ALT = 'f'.repeat(64);
    await hp.evaluate((alt) => {
      const s = JSON.parse(localStorage.getItem('sorrida:meine-praxen:v1'));
      s.praxen.find((e) => e.praxisName.startsWith('Hausarzt')).token = alt;
      localStorage.setItem('sorrida:meine-praxen:v1', JSON.stringify(s));
    }, ALT);
    await hp.goto(`${L}/portal/${tA}`);
    await hp.getByTestId('praxis-merken-knopf').click();
    pruef('Gleicher Name, anderer Link: Frage statt stillem Ersetzen', await hp.getByTestId('praxis-merken-frage').isVisible());
    pruef('Frage: Tastaturfokus auf der Frage', (await hp.evaluate(() => document.activeElement && document.activeElement.id)) === 'praxis-merken-frage');
    await hp.getByTestId('praxis-merken-frage').scrollIntoViewIfNeeded();
    await fotos(hp, '05b-portal-frage-gleicher-name-390');
    await hp.getByTestId('praxis-merken-ersetzen').click();
    pruef('Ersetzen: „Gemerkt“, Fokus auf der Meldung', (await hp.getByTestId('praxis-gemerkt').isVisible()) && (await hp.evaluate(() => document.activeElement && document.activeElement.dataset.testid)) === 'praxis-gemerkt');
    const nachErsetzen = await hp.evaluate(() => JSON.parse(localStorage.getItem('sorrida:meine-praxen:v1')).praxen.map((e) => e.token));
    pruef('Ersetzen: alter Link weg, neuer Link an seiner Stelle', JSON.stringify(nachErsetzen) === JSON.stringify([tA, tB]));

    // Anamnese-Link der Zahnarztpraxis zeigt die Kennung
    await hp.goto(`${L}/a/${tAnam}`);
    pruef('/a: Band der Zahnarztpraxis', (await hp.getByTestId('praxis-band').getAttribute('data-gruppe')) === 'zahn');
    pruef('/a: Band ist ein <header>', (await hp.getByTestId('praxis-band').evaluate((e) => e.tagName)) === 'HEADER');
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
    const anServer = (von) => anfragen.slice(von).filter((u) => /^\/(api|portal)\//.test(u));
    pruef('Beim Öffnen der Liste kein Aufruf an /api und kein Portal vorab geladen', anServer(ab).length === 0, anServer(ab).join(', '));
    const karten = hp.getByTestId('meine-praxis');
    pruef('Zwei getrennte Karten', (await karten.count()) === 2);
    const ab2 = anfragen.length;
    await hp.reload();
    await hp.getByTestId('meine-praxen-liste').waitFor();
    await karten.nth(1).scrollIntoViewIfNeeded();
    await hp.waitForTimeout(1500);
    pruef('Neu geladen, Karten sichtbar: weiterhin kein Portal vorab geladen', anServer(ab2).length === 0, anServer(ab2).join(', '));
    pruef('Hinweis: Die Liste gilt nur in diesem Browser', (await hp.getByTestId('meine-praxen-nur-browser').innerText()).startsWith('Die Liste gilt nur in diesem Browser.'));
    pruef('Karte: gültig, solange die Praxis keinen neuen Link schickt', (await karten.nth(0).innerText()).includes('solange die Praxis keinen neuen Link schickt'));
    pruef('Keine eigenständige Web-App (eigener Speicher auf dem iPhone)', (await hp.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').count()) === 0);
    const mEn = await (await hc.request.get(`${L}/meine-praxen/manifest.webmanifest?lang=en`)).json();
    const mDe = await (await hc.request.get(`${L}/meine-praxen/manifest.webmanifest`)).json();
    pruef('Manifest: im Browser öffnen, Name in der Sprache der Seite', mDe.display === 'browser' && mDe.short_name === 'Meine Praxen' && mEn.display === 'browser' && mEn.lang === 'en' && mEn.short_name !== mDe.short_name && mEn.start_url === '/meine-praxen?lang=en', JSON.stringify(mEn).slice(0, 200));
    pruef('Karten in den Farben ihrer Gruppen', JSON.stringify(await karten.evaluateAll((k) => k.map((x) => x.dataset.gruppe))) === '["arzt","zahn"]');
    const text = await hp.getByTestId('meine-praxen-liste').innerText();
    pruef('Karten nennen Praxis, Fach, Ort, für wen und gültig bis', /Hausarztpraxis Dr\. Weber[\s\S]*Hausarztpraxis · Münster[\s\S]*Für Anna[\s\S]*Gültig bis/.test(text) && /Zahnarztpraxis Dr\. Sonnenberg[\s\S]*Zahnarztpraxis · Münster/.test(text), text.slice(0, 300));
    pruef('Einleitung: Liste nur auf dem Gerät, Sorrida verbindet nichts', (await hp.getByTestId('meine-praxen-einleitung').innerText()).includes('Sorrida verbindet Ihre Daten nicht.'));
    const roh = await hp.evaluate(() => localStorage.getItem('sorrida:meine-praxen:v1'));
    const gespeichert = JSON.parse(roh);
    const felder = [...new Set(gespeichert.praxen.flatMap((e) => Object.keys(e)))].sort().join(',');
    pruef('Gespeichert nur erlaubte Felder', felder === 'fachKurz,gemerktAm,gruppe,gueltigBis,ort,praxisName,token,vorname', felder);
    // Ohne die Tokens geprüft: Ein zufälliges Token kann die Ziffern 1980 enthalten.
    const ohneTokens = roh.replace(/"token":"[^"]*"/g, '');
    pruef('Nichts Weiteres gespeichert (kein Nachname, kein Geburtsdatum, keine Kontaktdaten)', !/Zwilling|1980|example\.org|\+49/.test(ohneTokens), (ohneTokens.match(/Zwilling|1980|example\.org|\+49/) || [''])[0]);
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
    pruef('Umbenennen: Fokus zurück auf „Umbenennen“ der Karte', (await hp.evaluate(() => document.activeElement && document.activeElement.dataset.testid)) === 'meine-praxis-umbenennen');

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
    pruef('Entfernen: Fokus auf der nächsten Karte', (await hp.evaluate(() => document.activeElement && document.activeElement.dataset.testid + ':' + document.activeElement.textContent)).startsWith('meine-praxis-titel:Zahnarztpraxis'));

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

    // Von der Praxis ersetzter Link: Die Seite „nicht mehr gültig“ nimmt ihn auf Wunsch aus der Liste (nur auf dem Gerät).
    const tErsetzt = token();
    await hp.evaluate((alt) => {
      const s = JSON.parse(localStorage.getItem('sorrida:meine-praxen:v1'));
      s.praxen.push({ ...s.praxen[0], token: alt, gueltigBis: '2099-01-01T00:00:00.000Z' });
      localStorage.setItem('sorrida:meine-praxen:v1', JSON.stringify(s));
    }, tErsetzt);
    await hp.goto(`${L}/portal/${tErsetzt}`);
    pruef('Ersetzter Link: Seite „nicht mehr gültig“ mit Hinweis auf den neuen Link', (await hp.getByTestId('portal-ungueltig').isVisible()) && (await hp.getByTestId('portal-ungueltig-hinweis').innerText()).includes('neuen Link'));
    await fotos(hp, '10b-link-nicht-mehr-gueltig-390');
    const vorEntfernen = anfragen.length;
    await hp.getByTestId('gemerkt-entfernen').click();
    const restTokens = await hp.evaluate(() => JSON.parse(localStorage.getItem('sorrida:meine-praxen:v1')).praxen.map((e) => e.token));
    pruef('Ersetzter Link: entfernt, Fokus auf der Meldung, die anderen bleiben', (await hp.getByTestId('gemerkt-entfernt').innerText()).startsWith('Entfernt.') && (await hp.evaluate(() => document.activeElement && document.activeElement.dataset.testid)) === 'gemerkt-entfernt' && JSON.stringify(restTokens) === JSON.stringify([tB]), restTokens.join(','));
    pruef('Ersetzter Link: Entfernen fragt den Server nicht', anServer(vorEntfernen).length === 0, anServer(vorEntfernen).join(', '));
    await fotos(hp, '10c-link-entfernt-390');
    await hp.goto(`${L}/meine-praxen`);
    await hp.getByTestId('meine-praxen-liste').waitFor();

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
    const zwei = anfragen.filter((u) => [tA, tB, tAnam, tErsetzt, ALT].filter((t) => u.includes(t)).length > 1);
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
