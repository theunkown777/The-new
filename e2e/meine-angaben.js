// Brücke zwischen Praxen, Stufe 2 Teil D1: „Eigene Angaben mitnehmen“.
// Der Patient behält nach dem Senden eine verschlüsselte Kopie seiner Antworten auf seinem Gerät und füllt damit den
// Bogen einer anderen Praxis vor. Zwei Praxen: A (Zahnarzt, nur in der Datenbank) und B (Hausarzt, Gastzugang mit
// Sitzung, damit die Akte sichtbar ist). Derselbe Mensch hat in beiden Praxen einen eigenen, unverbundenen Datensatz.
// Geprüft wird:
//   - Bogen A (/a): Ohne Klick wird nichts gespeichert. Code zu kurz und ungleich werden abgelehnt. Im Speicher steht
//     kein Klartext: keine Antwort, keine Ergänzung, kein Name, kein Praxisname, kein Code, kein Link.
//   - Bogen B (Portal): falscher Code, dann Übernahme nur der Grundfragen; markierte Felder; Pflicht-Haken vor dem
//     Senden mit Fokus; die Anfrage trägt nur den Stand. Beim Öffnen der Kopie kein Aufruf an den Server.
//   - Akte und Eingang von B zeigen den Hinweis mit Stand und nichts über A. A erfährt nichts.
//   - /meine-praxen: Liste, Protokoll, eine löschen, alles löschen. Zurücknehmen der Übernahme.
//   - Auf einem Gerät der Praxis gibt es weder Angebot noch Übernahme.
//   - Handy (390 px) und Bildschirm (1280 px), hell und dunkel, ohne waagerechtes Scrollen.
// Aufruf: BASIS=http://localhost:3201 BILDER=<Ordner> node e2e/meine-angaben.js
const crypto = require('crypto');
const { chromium, L, D, sql, pruef, stand, KONTEXT, HANDY, demo } = require('./gemeinsam');

const KENN = `e2e-ma-${Date.now().toString(36)}`;
const SCHLUESSEL = 'sorrida:meine-angaben:v1';
const CODE = 'Sommer-2026';
const token = () => crypto.randomBytes(32).toString('hex');
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const q = (s) => s.replace(/'/g, "''");
const zwei = (n) => String(n).padStart(2, '0');
const jetzt = new Date();
const HEUTE_ISO = `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
const HEUTE = `${zwei(jetzt.getDate())}.${zwei(jetzt.getMonth() + 1)}.${jetzt.getFullYear()}`;
const PRAXIS_A = 'Zahnarztpraxis Dr. Sonnenberg (Demo)';

// Antworten im Bogen von A: Ja mit Ergänzung, Ja ohne Ergänzung, sonst Nein.
const JA_A = { medikamente: 'Ramipril 5 mg', blutverduenner: 'ASS 100', allergien: 'Penicillin', rauchen: '', knirschen: '', bisphosphonate: 'Alendronat seit 2024' };
// Grundfragen, die A gestellt hat und B auch stellt (ohne „schwanger“: nie mitgenommen).
const GRUND = ['allergien', 'blutdruck', 'blutverduenner', 'diabetes', 'gerinnung', 'herz', 'infektion', 'medikamente', 'rauchen'];
const KLARTEXT = ['Ramipril', 'ASS 100', 'Penicillin', 'Alendronat', 'Anna', 'Zwilling', '1980', 'Sonnenberg', 'morgens', 'angst', 'allergien', 'knirschen', 'medikamente', CODE];

let PB = null; // Praxis B (Gastzugang)
function anlegenA() {
  const tAnam = token();
  sql(`insert into "Practice" (id, name, specialty, "isDemo", stammdaten) values ('${KENN}-zahn', '${q(PRAXIS_A)}', 'zahn', true, '${q(JSON.stringify({ plzOrt: '48155 Münster', strasse: 'Marktstraße 1' }))}'::jsonb)`);
  sql(`insert into "Patient" (id, "practiceId", "firstName", "lastName", "birthDate", email, "portalTokenHash", "portalExpiresAt") values ('${KENN}-zahn-pat', '${KENN}-zahn', 'Anna', 'Zwilling', '1980-05-12', 'anna.zwilling@example.org', '${hash(token())}', now() + interval '60 days')`);
  sql(`insert into "AnamnesisForm" (id, "practiceId", "patientId", "tokenHash", "expiresAt", fach) values ('${KENN}-anamA', '${KENN}-zahn', '${KENN}-zahn-pat', '${hash(tAnam)}', now() + interval '7 days', 'zahn')`);
  return tAnam;
}
function anlegenB(pb) {
  const tB = token();
  sql(`insert into "Patient" (id, "practiceId", "firstName", "lastName", "birthDate", email, "portalTokenHash", "portalExpiresAt") values ('${KENN}-pat-b', '${pb}', 'Anna', 'Zwilling', '1980-05-12', 'anna.zwilling@example.org', '${hash(tB)}', now() + interval '60 days')`);
  for (const n of [1, 2, 3]) sql(`insert into "AnamnesisForm" (id, "practiceId", "patientId", "expiresAt", fach) values ('${KENN}-anamB${n}', '${pb}', '${KENN}-pat-b', now() + interval '7 days', 'hausarzt')`);
  return tB;
}
function aufraeumen() {
  const ignorieren = (f) => { try { f(); } catch { /* weiter aufräumen */ } };
  ignorieren(() => sql(`delete from "Eingang" where "patientId" like '${KENN}%'`));
  ignorieren(() => sql(`delete from "AnamnesisForm" where id like '${KENN}%'`));
  ignorieren(() => sql(`delete from "AuditLog" where "practiceId" like '${KENN}%'`));
  ignorieren(() => sql(`delete from "Patient" where id like '${KENN}%'`));
  ignorieren(() => sql(`delete from "Practice" where id like '${KENN}%'`));
}

/** Namen der Fragen im Bogen (Radio-Gruppen), ohne die Auswahl der Kopie. */
const fragen = (p) => p.$$eval('form input[type=radio]', (es) => [...new Set(es.map((e) => e.name))]);
const feld = (p, key) => p.locator('fieldset', { has: p.locator(`input[name="${key}"]`) });
async function antworten(p, key, ja, detail) {
  await feld(p, key).locator('label').nth(ja ? 0 : 1).click();
  if (ja && detail) await feld(p, key).locator('input.input').fill(detail);
}
const vomGeraet = (p) => p.$$eval('fieldset[data-vom-geraet="ja"] input[type=radio]', (es) => [...new Set(es.map((e) => e.name))].sort());
const unbeantwortet = (p) => p.$$eval('form fieldset', (fs) => fs.filter((f) => f.querySelector('input[type=radio]') && !f.querySelector('input[type=radio]:checked')).map((f) => f.querySelector('input[type=radio]').name));
const breiteOk = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const aktiv = (p) => p.evaluate(() => (document.activeElement && (document.activeElement.dataset.testid || document.activeElement.id)) || '');
const aktivId = (p) => p.evaluate(() => (document.activeElement && document.activeElement.id) || '');

(async () => {
  let b;
  const tAnam = anlegenA();
  let tB = null;
  try {
    b = await chromium.launch();
    const fotos = async (p, name, voll = true) => p.screenshot({ path: `${D}/${name}.png`, fullPage: voll });
    const csp = [];
    const neu = async (opt) => {
      const c = await b.newContext(opt);
      const p = await c.newPage();
      p.on('console', (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 140)); });
      return { c, p };
    };

    // ---------- Praxis B: Gastzugang Hausarzt (Sitzung im eigenen Browser der Praxis) ----------
    const { c: pc, p: pp } = await neu(KONTEXT);
    PB = await demo(pp, 'hausarzt');
    const praxisB = sql(`select name from "Practice" where id = '${PB}'`);
    tB = anlegenB(PB);
    const zaehlenA = () => sql(`select (select count(*) from "AuditLog" where "practiceId" = '${KENN}-zahn') || '/' || (select count(*) from "Eingang" where "practiceId" = '${KENN}-zahn') || '/' || (select coalesce(max("submittedAt")::text, '-') from "AnamnesisForm" where "practiceId" = '${KENN}-zahn')`);

    // ---------- Handy, 390 px, hell: Gerät des Patienten ----------
    const { c: hc, p: hp } = await neu(HANDY);
    const anfragen = [];
    hp.on('request', (r) => anfragen.push({ url: r.url().replace(L, ''), body: r.postData() || '' }));

    // Bogen A (Zahnarzt, Link /a)
    await hp.goto(`${L}/a/${tAnam}`);
    const namenA = await fragen(hp);
    pruef('A: zahnärztlicher Bogen mit Fachfragen', namenA.includes('knirschen') && namenA.includes('bisphosphonate'), namenA.join(','));
    pruef('A: ohne Kopie auf dem Gerät kein Knopf zum Übernehmen', (await hp.getByTestId('angaben-uebernahme').count()) === 0);
    for (const k of namenA) await antworten(hp, k, k in JA_A, JA_A[k]);
    await hp.getByTestId('anamnese-anliegen').locator('label').last().click(); // Angst (Wunsch, wird nie gespeichert)
    await hp.getByLabel('Weitere Hinweise (freiwillig)').fill('Bitte morgens anrufen');
    await hp.locator('#confirm').fill('Anna Zwilling');
    pruef('A: ohne Übernahme kein Haken „geprüft“', (await hp.getByTestId('anamnese-geprueft').count()) === 0);
    await hp.getByRole('button', { name: 'Anamnesebogen absenden' }).click();
    await hp.getByTestId('angaben-angebot').waitFor({ timeout: 30000 });
    pruef('A: gesendet, danach das Angebot mit dem Knopf „Kopie meiner Angaben auf diesem Gerät behalten“', (await hp.getByTestId('angaben-behalten').innerText()).trim() === 'Kopie meiner Angaben auf diesem Gerät behalten');
    pruef('A: ohne Klick nichts im Speicher', (await hp.evaluate((s) => localStorage.getItem(s), SCHLUESSEL)) === null);
    pruef('A: 390 px ohne waagerechtes Scrollen (Angebot)', await breiteOk(hp));
    await fotos(hp, '01-a-gesendet-angebot-390');
    await hp.getByTestId('angaben-behalten').click();
    pruef('A: Name der Kopie vorbelegt mit „Meine Angaben“', (await hp.getByTestId('angaben-name').inputValue()) === 'Meine Angaben');
    await hp.getByTestId('angaben-code-neu').fill('12345');
    await hp.getByTestId('angaben-code-wdh').fill('12345');
    await hp.getByTestId('angaben-speichern').click();
    pruef('A: Code mit 5 Zeichen abgelehnt', (await hp.getByTestId('angaben-behalten-fehler').innerText()) === 'Der Code braucht mindestens 6 Zeichen.');
    await hp.getByTestId('angaben-code-neu').fill(CODE);
    await hp.getByTestId('angaben-code-wdh').fill('Sommer-2027');
    await hp.getByTestId('angaben-speichern').click();
    pruef('A: ungleiche Codes abgelehnt, Fokus auf der Wiederholung', (await hp.getByTestId('angaben-behalten-fehler').innerText()) === 'Die beiden Codes stimmen nicht überein.' && (await aktiv(hp)) === 'angaben-code-wdh');
    pruef('A: nach Fehlern weiterhin nichts im Speicher', (await hp.evaluate((s) => localStorage.getItem(s), SCHLUESSEL)) === null);
    await hp.getByTestId('angaben-code-wdh').fill(CODE);
    await fotos(hp, '02-a-kopie-behalten-formular-390');
    const vorSpeichern = anfragen.length;
    await hp.getByTestId('angaben-speichern').click();
    await hp.getByTestId('angaben-gespeichert').waitFor({ timeout: 30000 });
    pruef('A: gespeichert, Meldung mit Löschdatum, Fokus auf der Meldung', /^Gespeichert\. Ab dem \d\d\.\d\d\.\d{4} wird die Kopie gelöscht\./.test(await hp.getByTestId('angaben-gespeichert').innerText()) && (await aktiv(hp)) === 'angaben-gespeichert');
    const anServer = (von) => anfragen.slice(von).filter((a) => /^\/(api|a|portal)\//.test(a.url)).map((a) => a.url);
    pruef('A: Speichern ruft den Server nicht auf', anServer(vorSpeichern).length === 0, anServer(vorSpeichern).join(', '));
    await fotos(hp, '03-a-kopie-gespeichert-390');
    const roh = await hp.evaluate((s) => localStorage.getItem(s), SCHLUESSEL);
    const ablage = JSON.parse(roh);
    const funde = KLARTEXT.filter((w) => roh.includes(w)).concat(roh.includes(tAnam) ? ['Link'] : []);
    pruef('Speicher: kein Klartext (Antworten, Ergänzungen, Name, Geburtsdatum, Praxis, Wünsche, Hinweis, Code, Link)', funde.length === 0, funde.join(', '));
    pruef('Speicher: eine Kopie mit genau den lesbaren Feldern Name, Stand, Art', ablage.kopien.length === 1 && Object.keys(ablage.kopien[0]).sort().join(',') === 'bezeichnung,daten,gruppe,id,iter,iv,salt,stand' && ablage.kopien[0].bezeichnung === 'Meine Angaben' && ablage.kopien[0].stand === HEUTE_ISO && ablage.kopien[0].gruppe === 'zahn', JSON.stringify({ ...ablage.kopien[0], daten: '…' }));
    pruef('Speicher: mindestens 250 000 Durchläufe', ablage.kopien[0].iter >= 250000, String(ablage.kopien[0].iter));
    pruef('Speicher: neben der Kopie nur dieser eine Schlüssel', JSON.stringify(await hp.evaluate(() => Object.keys(localStorage))) === JSON.stringify([SCHLUESSEL]));
    const standA = zaehlenA();

    // Bogen B (Hausarzt, im Portal)
    await hp.goto(`${L}/portal/${tB}/anamnese/${KENN}-anamB1`);
    await hp.getByTestId('angaben-uebernehmen').waitFor();
    pruef('B: Knopf „Angaben von diesem Gerät übernehmen“, noch nichts ausgefüllt', (await hp.getByTestId('angaben-uebernehmen').innerText()).trim() === 'Angaben von diesem Gerät übernehmen' && (await vomGeraet(hp)).length === 0);
    const namenB = await fragen(hp);
    pruef('B: ärztlicher Bogen ohne zahnärztliche Fragen', !namenB.includes('knirschen') && !namenB.includes('bisphosphonate') && namenB.includes('operationen'), namenB.join(','));
    await fotos(hp, '04-b-bogen-vor-uebernahme-390', false);
    await hp.getByTestId('angaben-uebernehmen').click();
    pruef('B: Kopie zur Auswahl mit Stand und Art', /Meine Angaben[\s\S]*Zahnarzt/.test(await hp.getByTestId('angaben-uebernahme').innerText()));
    const vorOeffnen = anfragen.length;
    await hp.getByTestId('angaben-code').fill('Falsch-123');
    await hp.getByTestId('angaben-oeffnen').click();
    await hp.getByTestId('angaben-fehler').waitFor({ timeout: 30000 });
    pruef('B: falscher Code wird abgelehnt, nichts übernommen', (await hp.getByTestId('angaben-fehler').innerText()) === 'Der Code passt nicht. Bitte versuchen Sie es noch einmal.' && (await vomGeraet(hp)).length === 0);
    pruef('B: Code-Feld nach dem Versuch leer', (await hp.getByTestId('angaben-code').inputValue()) === '');
    await fotos(hp, '05-b-falscher-code-390', false);
    await hp.getByTestId('angaben-code').fill(CODE);
    await hp.getByTestId('angaben-oeffnen').click();
    await hp.getByTestId('angaben-ergebnis').waitFor({ timeout: 30000 });
    pruef('B: Öffnen der Kopie ruft den Server nicht auf', anServer(vorOeffnen).length === 0, anServer(vorOeffnen).join(', '));
    const ergebnis = await hp.getByTestId('angaben-ergebnis').innerText();
    pruef('B: Ergebnis nennt Kopie, Stand und Zahl der Fragen', ergebnis.includes(`Aus „Meine Angaben“ (Stand ${HEUTE}) übernommen: ${GRUND.length} von ${namenB.length} Fragen.`), ergebnis.slice(0, 200));
    pruef('B: Herkunft nur auf dem Gerät und mit dem Satz, dass A nichts erfährt', ergebnis.includes(`Die Kopie stammt aus dem Bogen von ${PRAXIS_A}. Diese Praxis erfährt von der Übernahme nichts.`));
    pruef('B: Fokus auf dem Ergebnis', (await aktiv(hp)) === 'angaben-ergebnis');
    const markiert = await vomGeraet(hp);
    pruef('B: nur die passenden Grundfragen übernommen', JSON.stringify(markiert) === JSON.stringify(GRUND), markiert.join(','));
    const offenB = await unbeantwortet(hp);
    pruef('B: Fachfragen des Hausarztes bleiben offen', ['operationen', 'dauererkrankung', 'familie_erkrankungen'].every((k) => offenB.includes(k)), offenB.join(','));
    pruef('B: Ja mit Ergänzung übernommen (Allergie: Penicillin)', (await feld(hp, 'allergien').locator('input[type=radio]').nth(0).isChecked()) && (await feld(hp, 'allergien').locator('input.input').inputValue()) === 'Penicillin');
    pruef('B: Nein übernommen (Diabetes)', await feld(hp, 'diabetes').locator('input[type=radio]').nth(1).isChecked());
    pruef('B: markierte Felder tragen „Vom Gerät übernommen, Stand …“', (await hp.getByTestId('anamnese-vom-geraet').count()) === GRUND.length && (await hp.getByTestId('anamnese-vom-geraet').first().innerText()) === `Vom Gerät übernommen, Stand ${HEUTE}`);
    pruef('B: keine zahnärztliche Frage im Bogen', !/Knirschen|Osteoporose/.test(await hp.locator('form').innerText()));
    pruef('B: 390 px ohne waagerechtes Scrollen (Übernahme)', await breiteOk(hp));
    await fotos(hp, '06-b-uebernommen-390');
    for (const k of offenB) await antworten(hp, k, false);
    await hp.locator('#confirm').fill('Anna Zwilling');
    await hp.getByRole('button', { name: 'Anamnesebogen absenden' }).click();
    const hakenFehler = await hp.locator('#anamnese-fehler').innerText();
    pruef('B: ohne Haken „geprüft“ kein Senden, Meldung und Fokus am Haken', hakenFehler === 'Bitte bestätigen Sie, dass Sie die übernommenen Angaben geprüft haben.' && (await aktivId(hp)) === 'vorbefuellt-geprueft', `${hakenFehler} / ${await aktivId(hp)}`);
    pruef('B: Haken als ungültig markiert und mit der Meldung verbunden', (await hp.getByTestId('anamnese-geprueft').getAttribute('aria-invalid')) === 'true' && (await hp.getByTestId('anamnese-geprueft').getAttribute('aria-describedby')) === 'anamnese-fehler');
    pruef('B: Haken mit dem Text der Vorgabe', (await hp.locator('label[for="vorbefuellt-geprueft"]').innerText()).trim() === 'Ich habe alle übernommenen Angaben geprüft. Sie sind aktuell.');
    pruef('B: noch nichts gesendet', sql(`select "submittedAt" is null from "AnamnesisForm" where id = '${KENN}-anamB1'`) === 't');
    await hp.getByTestId('anamnese-geprueft').scrollIntoViewIfNeeded();
    await fotos(hp, '07-b-haken-fehlt-390', false);
    await hp.getByTestId('anamnese-geprueft').check();
    const vorSenden = anfragen.length;
    await hp.getByRole('button', { name: 'Anamnesebogen absenden' }).click();
    await hp.getByRole('status').filter({ hasText: 'ist bei' }).waitFor({ timeout: 30000 });
    const post = anfragen.slice(vorSenden).find((a) => a.url === `/api/portal/${tB}/anamnese/${KENN}-anamB1`);
    const body = post ? JSON.parse(post.body) : {};
    pruef('B: gesendet wird nur der Stand und „geprüft“', JSON.stringify(body.vorbefuellt) === JSON.stringify({ stand: HEUTE_ISO, geprueft: true }), JSON.stringify(body.vorbefuellt));
    pruef('B: die Anfrage nennt weder A noch die Kopie', post && !/Sonnenberg|Meine Angaben|zahn|knirschen/i.test(post.body), post ? post.body.slice(0, 120) : 'keine Anfrage');
    pruef('B: alle Anfragen tragen höchstens ein Token', anfragen.every((a) => [tAnam, tB].filter((t) => a.url.includes(t)).length <= 1));
    const zeile = sql(`select to_char("vorbefuelltStand", 'YYYY-MM-DD') || '|' || (answers::text ~* 'Sonnenberg|vorbefuellt|Meine Angaben') from "AnamnesisForm" where id = '${KENN}-anamB1'`);
    pruef('B: in der Datenbank nur der Stand, in den Antworten nichts über die Herkunft', zeile === `${HEUTE_ISO}|false`, zeile);
    pruef('A: erfährt nichts (keine neuen Einträge, Bogen unverändert)', zaehlenA() === standA, `${standA} → ${zaehlenA()}`);
    pruef('A: eigener Bogen ohne Stand einer Übernahme', sql(`select "vorbefuelltStand" is null from "AnamnesisForm" where id = '${KENN}-anamA'`) === 't');
    await fotos(hp, '08-b-gesendet-390');

    // /meine-praxen auf dem Gerät des Patienten
    const vorListe = anfragen.length;
    await hp.goto(`${L}/meine-praxen`);
    await hp.getByTestId('meine-angaben-liste').waitFor();
    await hp.waitForTimeout(600);
    pruef('/meine-praxen: beim Öffnen kein Aufruf an /api und kein Portal', anServer(vorListe).length === 0, anServer(vorListe).join(', '));
    const kopieText = await hp.getByTestId('meine-angaben-kopie').first().innerText();
    pruef('/meine-praxen: Kopie mit Name, Stand, Art und Löschdatum', /Meine Angaben/.test(kopieText) && kopieText.includes(`Stand ${HEUTE}`) && /Zahnarzt/.test(kopieText) && /Wird ab dem \d\d\.\d\d\.\d{4} gelöscht\./.test(kopieText), kopieText);
    const protokoll = await hp.getByTestId('meine-angaben-protokoll').innerText();
    pruef('/meine-praxen: Protokoll nennt Tag, Kopie und Praxis B', protokoll.includes(`${HEUTE}: „Meine Angaben“ in den Bogen von ${praxisB}`), protokoll.slice(0, 200));
    pruef('/meine-praxen: 390 px ohne waagerechtes Scrollen', await breiteOk(hp));
    await hp.getByTestId('meine-angaben').scrollIntoViewIfNeeded();
    await fotos(hp, '09-meine-praxen-angaben-390-hell');
    const ablageHandy = await hp.evaluate((s) => localStorage.getItem(s), SCHLUESSEL);

    // ---------- Akte und Eingang von Praxis B ----------
    await pp.goto(`${L}/patients/${KENN}-pat-b`);
    await pp.getByTestId('anamnese-vorbefuellt').waitFor({ timeout: 60000 });
    pruef('Akte B: Hinweis mit Stand', (await pp.getByTestId('anamnese-vorbefuellt').innerText()) === `Teilweise mit gespeicherten Angaben des Patienten vorausgefüllt (Stand ${HEUTE}), vom Patienten geprüft.`);
    const akte = await pp.locator('main').innerText();
    pruef('Akte B: nichts über A (Name, Kopie, Herkunft)', !/Sonnenberg|Meine Angaben|vom Gerät|Kopie/i.test(akte), (akte.match(/Sonnenberg|Meine Angaben|vom Gerät|Kopie/i) || [''])[0]);
    pruef('Akte B: Hinweise aus den Antworten wie sonst (Allergie, Blutverdünner)', /Allergie/.test(akte) && /Blutverdünner/.test(akte));
    await pp.getByTestId('anamnese-vorbefuellt').scrollIntoViewIfNeeded();
    await fotos(pp, '10-akte-b-hinweis-1280', false);
    await pp.goto(`${L}/eingang`);
    await pp.waitForLoadState('networkidle');
    const eingang = await pp.locator('main').innerText();
    pruef('Eingang B: Anamnese da, nichts über A', /Anamnesebogen abgeschickt/.test(eingang) && !/Sonnenberg|Meine Angaben|Gerät/.test(eingang));
    await fotos(pp, '11-eingang-b-1280', false);

    // ---------- Gerät der Praxis: kein Angebot und keine Übernahme, auch wenn eine Kopie im Speicher läge ----------
    await pp.evaluate(([s, w]) => localStorage.setItem(s, w), [SCHLUESSEL, ablageHandy]);
    await pp.goto(`${L}/portal/${tB}/anamnese/${KENN}-anamB3`);
    await pp.locator('#confirm').waitFor();
    await pp.waitForTimeout(800);
    pruef('Praxis-Gerät: Bogen ohne Knopf zum Übernehmen', (await pp.getByTestId('angaben-uebernahme').count()) === 0);
    await pp.evaluate((s) => localStorage.removeItem(s), SCHLUESSEL);
    await hc.close();

    // ---------- Bildschirm, 1280 px, hell ----------
    {
      const { c, p } = await neu({ ...KONTEXT, colorScheme: 'light' });
      await p.goto(`${L}/meine-praxen`);
      await p.evaluate(([s, w]) => localStorage.setItem(s, w), [SCHLUESSEL, ablageHandy]);
      await p.goto(`${L}/portal/${tB}/anamnese/${KENN}-anamB2`);
      await p.getByTestId('angaben-uebernehmen').click();
      await fotos(p, '12-b-uebernehmen-offen-1280-hell', false);
      await p.getByTestId('angaben-code').fill(CODE);
      await p.getByTestId('angaben-oeffnen').click();
      await p.getByTestId('angaben-ergebnis').waitFor({ timeout: 30000 });
      pruef('1280 px (hell): Übernahme der Grundfragen', JSON.stringify(await vomGeraet(p)) === JSON.stringify(GRUND));
      await fotos(p, '13-b-uebernommen-1280-hell');
      for (const k of await unbeantwortet(p)) await antworten(p, k, false);
      await p.locator('#confirm').fill('Anna Zwilling');
      await p.getByTestId('anamnese-geprueft').check();
      await p.getByRole('button', { name: 'Anamnesebogen absenden' }).click();
      await p.getByTestId('angaben-angebot').waitFor({ timeout: 30000 });
      pruef('1280 px (hell): gesendet, Angebot für eine neue Kopie', await p.getByTestId('angaben-behalten').isVisible());
      await fotos(p, '14-b-gesendet-1280-hell');
      await p.goto(`${L}/meine-praxen`);
      await p.getByTestId('meine-angaben-liste').waitFor();
      pruef('1280 px (hell): Protokoll mit zwei Übernahmen', (await p.getByTestId('meine-angaben-protokoll').locator('li').count()) === 2);
      await fotos(p, '15-meine-praxen-angaben-1280-hell');
      await c.close();
    }

    // ---------- Dunkel: Handy und Bildschirm ----------
    {
      const { c, p } = await neu({ ...HANDY, colorScheme: 'dark' });
      await p.goto(`${L}/meine-praxen`);
      await p.evaluate(([s, w]) => localStorage.setItem(s, w), [SCHLUESSEL, ablageHandy]);
      await p.goto(`${L}/portal/${tB}/anamnese/${KENN}-anamB3`);
      await p.getByTestId('angaben-uebernehmen').click();
      await p.getByTestId('angaben-code').fill(CODE);
      await p.getByTestId('angaben-code').press('Enter');
      await p.getByTestId('angaben-ergebnis').waitFor({ timeout: 30000 });
      pruef('390 px (dunkel): Übernahme mit der Eingabetaste', (await vomGeraet(p)).length === GRUND.length);
      pruef('390 px (dunkel): ohne waagerechtes Scrollen', await breiteOk(p));
      await fotos(p, '16-b-uebernommen-390-dunkel', false);
      // Eine Antwort selbst ändern, dann zurücknehmen: Die Änderung bleibt, der Rest wird wieder leer.
      await antworten(p, 'blutdruck', true);
      pruef('Selbst geändert: Markierung an diesem Feld weg', (await vomGeraet(p)).length === GRUND.length - 1 && !(await vomGeraet(p)).includes('blutdruck'));
      await p.getByTestId('angaben-zuruecknehmen').click();
      const offen = await unbeantwortet(p);
      pruef('Zurücknehmen: übernommene Antworten leer, eigene Änderung bleibt, kein Haken mehr', (await vomGeraet(p)).length === 0 && !offen.includes('blutdruck') && GRUND.filter((k) => k !== 'blutdruck').every((k) => offen.includes(k)) && (await p.getByTestId('anamnese-geprueft').count()) === 0, offen.join(','));
      pruef('Zurücknehmen: Meldung', (await p.getByTestId('angaben-ergebnis').innerText()).includes('Die Übernahme ist zurückgenommen.'));
      await fotos(p, '17-b-zurueckgenommen-390-dunkel', false);
      await p.goto(`${L}/meine-praxen`);
      await p.getByTestId('meine-angaben-liste').waitFor();
      pruef('390 px (dunkel): Abschnitt folgt dem Gerät', (await p.getByTestId('meine-praxen').evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(25, 22, 21)');
      pruef('390 px (dunkel): /meine-praxen ohne waagerechtes Scrollen', await breiteOk(p));
      await p.getByTestId('meine-angaben').scrollIntoViewIfNeeded();
      await fotos(p, '18-meine-praxen-angaben-390-dunkel');
      // Eine Kopie löschen, mit Rückfrage und Abbrechen per Tastatur
      await p.getByTestId('meine-angaben-loeschen').first().click();
      await p.getByRole('button', { name: 'Abbrechen' }).click();
      pruef('Löschen abgebrochen: Fokus zurück auf „Löschen“', (await aktivId(p)).startsWith('meine-angaben-loeschen-'), await aktivId(p));
      await p.getByTestId('meine-angaben-loeschen').first().click();
      await fotos(p, '19-meine-angaben-loeschen-frage-390-dunkel', false);
      await p.getByTestId('meine-angaben-loeschen-ja').click();
      pruef('Eine löschen: Liste leer, Protokoll bleibt, Meldung mit Fokus', (await p.getByTestId('meine-angaben-leer').isVisible()) && (await p.getByTestId('meine-angaben-protokoll').isVisible()) && (await aktiv(p)) === 'meine-angaben-meldung');
      const nachLoeschen = JSON.parse(await p.evaluate((s) => localStorage.getItem(s), SCHLUESSEL));
      pruef('Eine löschen: im Speicher keine Kopie mehr', nachLoeschen.kopien.length === 0 && nachLoeschen.protokoll.length === 1);
      await p.getByTestId('meine-angaben-alles').click();
      await p.getByTestId('meine-angaben-alles-ja').click();
      pruef('Alles löschen: Schlüssel entfernt', (await p.evaluate((s) => localStorage.getItem(s), SCHLUESSEL)) === null && (await p.getByTestId('meine-angaben-meldung').innerText()).length > 0);
      await fotos(p, '20-meine-angaben-geloescht-390-dunkel');
      await c.close();
    }
    {
      const { c, p } = await neu({ ...KONTEXT, colorScheme: 'dark' });
      await p.goto(`${L}/meine-praxen`);
      await p.evaluate(([s, w]) => localStorage.setItem(s, w), [SCHLUESSEL, ablageHandy]);
      await p.reload();
      await p.getByTestId('meine-angaben-liste').waitFor();
      pruef('1280 px (dunkel): Kopie und Protokoll', (await p.getByTestId('meine-angaben-kopie').count()) === 1 && (await p.getByTestId('meine-angaben-protokoll').isVisible()));
      await fotos(p, '21-meine-praxen-angaben-1280-dunkel');
      // Abgelaufene Kopie (Stand vor mehr als 12 Monaten) wird beim Lesen gelöscht
      await p.evaluate((s) => { const a = JSON.parse(localStorage.getItem(s)); a.kopien[0].stand = '2025-01-02'; localStorage.setItem(s, JSON.stringify(a)); }, SCHLUESSEL);
      await p.reload();
      await p.getByTestId('meine-angaben-leer').waitFor();
      pruef('Abgelaufen: Kopie beim Lesen gelöscht, Meldung', /1/.test(await p.getByTestId('meine-angaben-meldung').innerText()) && JSON.parse(await p.evaluate((s) => localStorage.getItem(s), SCHLUESSEL)).kopien.length === 0);
      // Englisch
      await p.goto(`${L}/meine-praxen?lang=en`);
      pruef('Englisch: Abschnitt übersetzt', !(await p.getByTestId('meine-angaben').innerText()).includes('Meine Angaben auf diesem Gerät'));
      await c.close();
    }
    await pc.close();

    pruef('Keine Meldung der Inhaltsrichtlinie (CSP)', csp.length === 0, csp.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('ABBRUCH', String((e && e.message) || e).split('\n').slice(0, 4).join(' / '));
    pruef('Durchlauf ohne Abbruch', false);
  } finally {
    if (b) await b.close().catch(() => {});
    aufraeumen();
  }
  const { ok, fehl } = stand();
  console.log(`\nMeine Angaben: ${ok} bestanden, ${fehl} fehlgeschlagen`);
  process.exitCode = fehl ? 1 : 0;
})();
