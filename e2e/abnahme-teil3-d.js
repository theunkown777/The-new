const fs = require('fs');
const { L, D, sql, rechnungenSicher, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
lauf('D Begleitbrief', async (b) => {
  const c = await b.newContext({ ...KONTEXT, acceptDownloads: true }); const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  const pr = await demo(p);
  // Zwei Rechnungen bei verschiedenen Patienten: eine wird privat versichert, mindestens eine bleibt gesetzlich.
  rechnungenSicher(pr, 2);
  await p.goto(L + '/zahlungen'); await p.waitForTimeout(500);
  const vorher = await p.locator('[data-testid="erstattungsbrief-oeffnen"]:visible').count();
  // Die Demo-Praxis hat je nach Zufall keine offene Rechnung; die Liste zeigt aber zuerst nur offene. Dann die jüngste Rechnung öffnen.
  if (sql(`select count(*) from "Invoice" where "practiceId"='${pr}' and status in ('OFFEN','GEMELDET')`) === '0') sql(`update "Invoice" set status='OFFEN', "paidAt"=null where id=(select id from "Invoice" where "practiceId"='${pr}' order by "createdAt" desc limit 1)`);
  const [iid, pid] = sql(`select i.id||'|'||i."patientId" from "Invoice" i where i."practiceId"='${pr}' and i.status in ('OFFEN','GEMELDET') order by i."createdAt" desc limit 1`).split('|');
  if (!iid || !pid) throw new Error('Keine offene Rechnung gefunden');
  sql(`update "Patient" set "insuranceType"='PKV', "insuranceName"='Debeka' where id='${pid}'`);
  // Mindestens eine Rechnung muss bei einem gesetzlich Versicherten bleiben, sonst fielen zwei Prüfungen unten stumm weg.
  const gkvFrage = `select count(*) from "Invoice" i join "Patient" p on p.id=i."patientId" where i."practiceId"='${pr}' and coalesce(p."insuranceType",'')<>'PKV'`;
  if (sql(gkvFrage) === '0') sql(`update "Patient" set "insuranceType"='GKV', "insuranceName"='AOK' where id=(select i."patientId" from "Invoice" i where i."practiceId"='${pr}' and i."patientId"<>'${pid}' order by i."createdAt" limit 1)`);
  const gkv = sql(gkvFrage);
  const erwartet = Number(sql(`select count(*) from "Invoice" i join "Patient" p on p.id=i."patientId" where i."practiceId"='${pr}' and p."insuranceType"='PKV'`));
  await p.goto(L + '/zahlungen'); await p.waitForTimeout(500);
  const knoepfe = p.locator('[data-testid="erstattungsbrief-oeffnen"]:visible');
  pruef('Knopf nur bei Rechnungen privat Versicherter', (await knoepfe.count()) >= 1 && (await knoepfe.count()) <= erwartet && Number(gkv) > 0, `vorher ${vorher}, jetzt ${await knoepfe.count()} (Rechnungen PKV in der Liste höchstens ${erwartet}, übrige ${gkv})`);
  await knoepfe.first().click(); const dlg = p.getByTestId('erstattungsbrief-dialog'); await dlg.waitFor(); await p.waitForTimeout(400);
  const hinweis = await p.getByTestId('erstattungsbrief-hinweis').innerText();
  pruef('Dialog zeigt den Hinweis (Entwurf, bitte prüfen)', hinweis.length > 30, hinweis.slice(0, 110));
  const deckt = async (seite) => seite.evaluate(() => { const d = document.querySelector('[data-testid="erstattungsbrief-dialog"]'); const r = d.getBoundingClientRect(); const pkte = [[r.left + 20, r.top + 20], [r.left + r.width / 2, r.top + r.height / 2], [r.right - 20, r.bottom - 20]]; return { ok: pkte.every(([x, y]) => d.contains(document.elementFromPoint(x, y))), breite: document.documentElement.scrollWidth, r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight }; });
  let dk = await deckt(p);
  pruef('1280: Dialog liegt über der Tabelle', dk.ok && dk.r[3] <= dk.vh, JSON.stringify(dk));
  pruef('Versicherung vorbelegt', (await p.getByTestId('erstattungsbrief-versicherung').inputValue()) === 'Debeka');
  // ohne Bezeichnung kein PDF
  await p.getByTestId('erstattungsbrief-bezeichnung-0').fill('Eingehende Untersuchung');
  await dlg.locator('input[placeholder="z. B. 3,5"]').first().fill('3,5');
  await dlg.locator('label:has-text("Ziffer") + input, input[id$="-n-1"]').first().fill('7').catch(() => {});
  const gruende = dlg.locator('[data-testid^="erstattungsbrief-grund-0-"]'); await gruende.nth(0).check(); await gruende.nth(1).check();
  await p.getByTestId('erstattungsbrief-ergaenzung-0').fill('Erheblich erhöhter Zeitaufwand wegen ausführlicher Beratung.');
  await p.screenshot({ path: D + '/d-brief-1280.png' });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByTestId('erstattungsbrief-erstellen').click()]);
  const pfad = D + '/d-brief.pdf'; await dl.saveAs(pfad); const buf = fs.readFileSync(pfad);
  pruef('PDF heruntergeladen: beginnt mit %PDF, größer als 1 kB', buf.slice(0, 4).toString() === '%PDF' && buf.length > 1024, `${dl.suggestedFilename()} · ${buf.length} Bytes`);
  pruef('Meldung „heruntergeladen“', await p.getByTestId('erstattungsbrief-fertig').isVisible().catch(() => false));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  pruef('Esc schließt, Fokus zurück auf dem Knopf', (await dlg.count()) === 0 && await p.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'erstattungsbrief-oeffnen');
  // Schnittstelle: fremde Rechnung / GKV / ohne Recht
  const api = (seite, id, body) => seite.evaluate(async ([i, bd]) => (await fetch(`/api/invoices/${i}/erstattungsbrief`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bd) })).status, [id, body]);
  const body = { gebuehrenordnung: 'GOAE', versicherung: 'Debeka', versicherungAnschrift: '', versicherungsnummer: '', bezug: '', absenderAnschrift: '', ort: '', posten: [{ nummer: '7', bezeichnung: 'Untersuchung', faktor: '3,5', gruende: ['zeitaufwand'], ergaenzung: '' }] };
  const fremd = sql(`select id from "Invoice" where "practiceId"<>'${pr}' limit 1`);
  if (fremd) pruef('Rechnung einer anderen Praxis → 404', (await api(p, fremd, body)) === 404, 'Status ' + await api(p, fremd, body));
  const gkvId = sql(`select i.id from "Invoice" i join "Patient" p on p.id=i."patientId" where i."practiceId"='${pr}' and coalesce(p."insuranceType",'')<>'PKV' limit 1`);
  const st = gkvId ? await api(p, gkvId, body) : 0;
  pruef('Rechnung eines gesetzlich Versicherten → abgelehnt', !!gkvId && st >= 400 && st < 500, gkvId ? 'Status ' + st : 'keine Rechnung eines gesetzlich Versicherten');
  // Handy
  const hc = await b.newContext({ ...HANDY, storageState: await c.storageState() }); const hp = await hc.newPage();
  await hp.goto(L + '/zahlungen'); await hp.waitForTimeout(500);
  await hp.locator('[data-testid="erstattungsbrief-oeffnen"]:visible').first().click(); await hp.getByTestId('erstattungsbrief-dialog').waitFor();
  await hp.waitForTimeout(400); // der Dialog blendet kurz ein (0,18 s); erst danach messen
  dk = await deckt(hp);
  pruef('390 px: Dialog füllt den Bildschirm über der Karte, kein waagerechtes Scrollen', dk.ok && dk.breite <= 390 && dk.r[2] === 390 && dk.r[3] <= dk.vh, JSON.stringify(dk));
  const unten = await hp.getByTestId('erstattungsbrief-erstellen').boundingBox();
  pruef('390 px: Knopf „PDF erstellen“ ist ohne Scrollen erreichbar', !!unten && unten.y + unten.height <= 844, JSON.stringify(unten && [Math.round(unten.y), Math.round(unten.height)]));
  await hp.screenshot({ path: D + '/d-brief-390.png' });
  pruef('Keine Seitenfehler', fehler.length === 0, fehler.slice(0, 2).join(' | '));
});
