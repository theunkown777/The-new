// Browser-Durchlauf: Schmerzabfrage („Wo haben Sie Beschwerden?“) am echten 3D-Modell, je Art.
// Je Art eine Demo-Praxis des passenden Fachs, ein Patientenlink, die Seite /portal/<token>/fragen:
// warten, bis das Modell bereit ist (data-bereit), an einer bekannten Stelle tippen und prüfen, dass der
// richtige Ort erscheint. Dazu: Liste per Tastatur, Absenden, genau ein Eintrag in der Datenbank, und die
// Akte zeigt die Angabe am Modell (nur lesend, Bordeaux). Bildschirmfotos mit 390 und 1280 px Breite.
//
// Aufruf: BASIS=http://localhost:3103 BILDER=<Ordner> node e2e/modelle-realismus.js [koerper,zahn,auge,hno,haut]
// Ohne Grafikkarte setzt der Durchlauf localStorage „modell-scharf“ = 1 (nur außerhalb des Betriebs wirksam).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { L, D, sql, pruef, KONTEXT, HANDY, demo, lauf } = require('./gemeinsam');
const ANATOMIE = require('../lib/modelle/drei/anatomieInhalt.json');

const lm = (datei, name) => ANATOMIE[datei].teile.find((t) => t.name === name).mitte;
// Je Art: Fach der Demo-Praxis, Stelle zum Antippen (Punkt im Körper und Richtung nach außen) und erwarteter Ort
const ARTEN = {
  koerper: { fach: 'ortho', ziel: { p: lm('skelett', 'kniescheibe:R'), n: [0, 0, 1] }, ort: 'knie:R', listeOrt: 'ellenbogen:L' },
  haut: { fach: 'haut', ziel: { p: [70, ANATOMIE.skelett.teile.find((t) => t.name === 'brustbein:M').mitte[1], 60], n: [0, 0, 1] }, ort: 'brust:L', listeOrt: 'ueberall' },
  auge: { fach: 'augen', ziel: { p: [33, 738, 72], n: [0, 0, 1] }, ort: 'auge:L', listeOrt: 'gesicht:stirn' },
  hno: { fach: 'hno', ziel: { p: [-62, 724, -14], n: [-1, 0, 0] }, ort: 'ohr:R', listeOrt: 'nase' },
  zahn: { fach: 'zahn', zaehne: ['36', '46', '31', '41', '11', '21', '33', '43'], listeOrt: 'zahn:17' },
};
const NUR = (process.argv[2] || Object.keys(ARTEN).join(',')).split(',');
fs.mkdirSync(D, { recursive: true });

/** Patientenlink für einen Patienten der Praxis anlegen (wie „Patientenlink erzeugen“, hier direkt in der Datenbank). */
function portalLink(praxisId) {
  const pid = sql(`select id from "Patient" where "practiceId"='${praxisId}' order by "createdAt" limit 1`);
  const roh = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(roh).digest('hex');
  sql(`update "Patient" set "portalTokenHash"='${hash}', "portalExpiresAt"=now() + interval '2 days' where id='${pid}'`);
  return { pid, roh };
}

/** Im Browser: liegt der schwebende Knopf „Frag Sorrida“ über der Lizenzzeile des Modells? */
function lizenzVerdeckt() {
  const q = document.querySelector('[data-testid="modell-quelle"]'), k = document.querySelector('[data-testid="frag-sorrida-knopf"]');
  if (!q || !k) return 'kein Knopf';
  q.scrollIntoView({ block: 'end' });
  const ueber = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const kr = k.getBoundingClientRect(), r = document.createRange();
  r.selectNodeContents(q);
  return [...r.getClientRects()].some((z) => z.width > 0 && ueber(z, kr)) ? 'verdeckt' : 'frei';
}

async function bereit(p, zeit = 240000) {
  await p.waitForSelector('[data-testid="kurz-buehne"] [data-testid="modell-3d-buehne"][data-bereit="1"]', { timeout: zeit });
  await p.waitForSelector('[data-testid="kurz-buehne"][data-modell="3d"]', { timeout: 10000 });
  await p.waitForTimeout(1200); // Einblenden und erstes ruhiges Bild
}

/**
 * Beobachtet die Bühne, während eine neue 3D-Bühne entsteht (nach „3D“ oder „Zurück“): Bis sie bereit ist
 * (data-bereit="1"), muss die Zeichnung gelten (data-modell="schema"), sonst liegt eine leere Ebene über ihr.
 * Gibt den ersten Verstoß zurück oder null.
 */
async function ueberblenden(p, ausloesen) {
  await p.evaluate(() => {
    window.__frueh = null;
    const pruefe = () => {
      const b = document.querySelector('[data-testid="kurz-buehne"]');
      if (!b || window.__frueh) return;
      const s = b.querySelector('[data-testid="modell-3d-buehne"]');
      const bereit = !!s && s.getAttribute('data-bereit') === '1';
      if (b.getAttribute('data-modell') === '3d' && !bereit) window.__frueh = `data-modell=3d, Bühne ${s ? `data-bereit=${s.getAttribute('data-bereit')}` : 'fehlt'}`;
    };
    if (window.__beob) window.__beob.disconnect();
    window.__beob = new MutationObserver(pruefe);
    window.__beob.observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  await ausloesen();
  // Gleich danach: Solange die neue Bühne nicht bereit ist, gilt die Zeichnung und der Ladehinweis ist da.
  // Aus dem Zwischenspeicher ist die Bühne oft schon nach wenigen Millisekunden bereit; dann ist „3d“ richtig.
  const sofort = await p.evaluate(() => {
    const b = document.querySelector('[data-testid="kurz-buehne"]');
    const s = b?.querySelector('[data-testid="modell-3d-buehne"]');
    return { modell: b?.getAttribute('data-modell'), bereit: s?.getAttribute('data-bereit') === '1', laedt: !!document.querySelector('[data-testid="kurz-3d-laedt"]') };
  });
  await bereit(p);
  const frueh = await p.evaluate(() => { window.__beob.disconnect(); return window.__frueh; });
  if (frueh) return frueh;
  if (sofort.bereit) return null;
  return sofort.modell !== 'schema' ? `sofort data-modell=${sofort.modell}` : !sofort.laedt ? 'kein Ladehinweis' : null;
}

/** Bildschirmpunkt einer Stelle: Punkt auf der Haut (Strahl von außen), dann in Bildkoordinaten. */
async function stelle(p, ziel) {
  return p.evaluate(({ p: punkt, n }) => {
    const m = document.querySelector('[data-testid="kurz-buehne"] [data-testid="modell-3d-buehne"]').__modell;
    const h = m.aufFlaeche(punkt, n);
    return h ? { ...m.punktBei(h.punkt), punkt: h.punkt } : null;
  }, ziel);
}

async function eineArt(b, art) {
  const a = ARTEN[art];
  const ctx = await b.newContext(KONTEXT);
  await ctx.addInitScript(() => { try { localStorage.setItem('modell-scharf', '1'); } catch { /* egal */ } });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(String(e.message || e)));
  const praxisId = await demo(p, a.fach);
  const { pid, roh } = portalLink(praxisId);
  sql(`delete from "Kurzcheck" where "patientId"='${pid}'`);
  const t0 = Date.now();
  await p.goto(`${L}/portal/${roh}/fragen`);
  pruef(`${art}: Seite zeigt sofort die Zeichnung`, await p.locator('[data-testid="kurz-buehne"] svg[role="group"]').count() > 0);
  await bereit(p);
  const ladezeit = Date.now() - t0;
  const bytes = await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('/anatomie-3d/')).map((r) => ({ n: r.name.split('/').pop(), b: r.transferSize || r.encodedBodySize })));
  const bildzeit = await p.evaluate(() => document.querySelector('[data-testid="kurz-buehne"] [data-testid="modell-3d-buehne"]').__modell.bildzeit());
  pruef(`${art}: Modell bereit, Hinweis „Modell …, nicht Ihr eigener/eigenes“ und Lizenzzeile sichtbar`, (await p.getByTestId('kurz-modell-hinweis').innerText()).includes('nicht Ihr') && await p.getByTestId('modell-quelle').isVisible(), `${ladezeit} ms, ${bytes.map((x) => `${x.n} ${Math.round(x.b / 1024)} KB`).join(', ')}, Bildzeit ${bildzeit} ms`);
  await p.screenshot({ path: path.join(D, `${art}-1280-modell.png`) });

  // Antippen
  if (art === 'zahn') {
    const ziel = await p.evaluate((liste) => {
      const m = document.querySelector('[data-testid="kurz-buehne"] [data-testid="modell-3d-buehne"]').__modell;
      for (const k of liste) { const q = m.punkt(k); if (q && q.vorn) return { k, ...q }; }
      return null;
    }, a.zaehne);
    pruef('zahn: ein Zahn ist von vorn zu sehen', !!ziel, ziel ? `Zahn ${ziel.k}` : '');
    if (ziel) {
      await p.mouse.click(ziel.x, ziel.y);
      await p.waitForTimeout(500);
      const orte = await p.locator('[data-testid="kurz-orte"] [data-ort]').evaluateAll((l) => l.map((e) => e.getAttribute('data-ort')));
      pruef('zahn: Antippen ergibt den Zahn', orte.includes(`zahn:${ziel.k}`), orte.join(', '));
      pruef('zahn: Nachbarzähne zur Korrektur angeboten', await p.getByTestId('kurz-nachbarn').isVisible());
    }
  } else {
    const s = await stelle(p, a.ziel);
    pruef(`${art}: Stelle liegt vorn im Bild`, !!s && s.vorn, s ? `${Math.round(s.x)},${Math.round(s.y)}` : 'kein Treffer');
    if (s) {
      await p.mouse.click(s.x, s.y);
      await p.waitForTimeout(500);
      const orte = await p.locator('[data-testid="kurz-orte"] [data-ort]').evaluateAll((l) => l.map((e) => e.getAttribute('data-ort')));
      pruef(`${art}: Antippen ergibt ${a.ort}`, orte.includes(a.ort), orte.join(', '));
      const flecken = await p.evaluate(() => document.querySelector('[data-testid="kurz-buehne"] [data-testid="modell-3d-buehne"]').__modell.flecken());
      pruef(`${art}: Fleck auf der Haut gesetzt`, flecken >= 2, String(flecken));
    }
  }
  await p.screenshot({ path: path.join(D, `${art}-1280-getippt.png`) });

  // Liste per Tastatur (Bildschirmleser, ohne Maus)
  await p.getByTestId('kurz-liste').locator('summary').focus();
  await p.keyboard.press('Enter');
  const knopf = p.getByTestId(`kurz-ort-${a.listeOrt}`);
  await knopf.focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  pruef(`${art}: Stelle über die Liste per Tastatur (${a.listeOrt})`, await p.locator(`[data-testid="kurz-orte"] [data-ort="${a.listeOrt}"]`).count() === 1);
  // Schalter „Schema“: die Zeichnung erscheint wieder
  await p.getByTestId('kurz-schema').click();
  await p.waitForTimeout(400);
  pruef(`${art}: Schalter „Schema“ zeigt die Zeichnung`, (await p.getByTestId('kurz-buehne').getAttribute('data-modell')) === 'schema');
  const nach3d = await ueberblenden(p, () => p.getByTestId('kurz-3d').click());
  pruef(`${art}: nach „3D“ gilt die Zeichnung, bis das neue Modell bereit ist`, !nach3d, nach3d || '');
  // Nächste Frage und zurück: Die Bühne entsteht neu und muss wieder erst bereit sein
  await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-staerke').waitFor({ timeout: 10000 });
  const nachZurueck = await ueberblenden(p, () => p.getByTestId('kurz-zurueck').click());
  pruef(`${art}: nach „Zurück“ gilt die Zeichnung, bis das neue Modell bereit ist`, !nachZurueck, nachZurueck || '');

  // Handy 390 px: kein seitlicher Überlauf
  const hp = await ctx.browser().newContext(HANDY);
  await hp.addInitScript(() => { try { localStorage.setItem('modell-scharf', '1'); } catch { /* egal */ } });
  const h = await hp.newPage();
  await h.goto(`${L}/portal/${roh}/fragen`);
  await bereit(h);
  pruef(`${art}: Handy 390 px ohne Überlauf`, await h.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  // Lizenzzeile am unteren Bildrand: der schwebende Knopf „Frag Sorrida“ darf sie nicht verdecken
  const verdeckt = await h.evaluate(lizenzVerdeckt);
  pruef(`${art}: Handy: Lizenzzeile nicht vom Knopf „Frag Sorrida“ verdeckt`, verdeckt !== 'verdeckt', verdeckt);
  await h.screenshot({ path: path.join(D, `${art}-390-modell.png`), fullPage: true });
  await hp.close();

  // Absenden
  await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-staerke-5').click(); await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-seit-tage').click(); await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-wichtig-ursache').click(); await p.getByTestId('kurz-weiter').click();
  await p.getByTestId('kurz-danke').waitFor({ timeout: 20000 });
  const zeile = sql(`select count(*) || '|' || (max(antworten::text)) from "Kurzcheck" where "patientId"='${pid}'`);
  const [anzahl, json] = [zeile.split('|')[0], zeile.slice(zeile.indexOf('|') + 1)];
  const gespeichert = JSON.parse(json || '{}');
  pruef(`${art}: genau ein Eintrag mit Art und Stand 2`, anzahl === '1' && gespeichert.art === art && gespeichert.stand === 2, `${anzahl}, ${(gespeichert.orte || []).join(', ')}`);

  // Akte: Angabe am Modell ansehen (nur lesend, Bordeaux)
  await p.goto(`${L}/patients/${pid}#kurzcheck`, { timeout: 180000 });
  await p.getByTestId('kurzcheck-modell-knopf').click({ timeout: 180000 }); // beim ersten Aufruf übersetzt next dev die Seite erst
  await p.waitForSelector('[data-testid="kurzcheck-modell"] [data-testid="modell-3d-buehne"][data-bereit="1"]', { timeout: 240000 });
  await p.waitForTimeout(1500);
  const text = await p.getByTestId('kurzcheck-karte').innerText();
  pruef(`${art}: Akte zeigt die Angabe und den Hinweis „keine Diagnose“`, /keine Diagnose/.test(text) && /Wo: /.test(text));
  await p.getByTestId('kurzcheck-karte').screenshot({ path: path.join(D, `${art}-1280-akte.png`) });
  // Praxis auf dem Handy (/modelle): hier schwebt der Knopf „Frag Sorrida“ über der Seite.
  // Nur Gebiss und Körper: Auge, Ohr und Haut zeigen dort Schnittbilder ohne Lizenzzeile.
  if (art === 'zahn' || art === 'koerper') {
    const pp = await ctx.browser().newContext(HANDY);
    await pp.addCookies(await ctx.cookies());
    await pp.addInitScript(() => { try { localStorage.setItem('modell-scharf', '1'); } catch { /* egal */ } });
    const ph = await pp.newPage();
    await ph.goto(`${L}/modelle`, { timeout: 180000 });
    await ph.locator('[data-testid="modell-3d-start"]').first().click({ timeout: 180000 });
    await ph.waitForSelector('[data-testid="modell-quelle"]', { timeout: 240000 });
    await ph.waitForTimeout(800);
    const praxisVerdeckt = await ph.evaluate(lizenzVerdeckt);
    pruef(`${art}: Praxis am Handy: Lizenzzeile nicht vom Knopf „Frag Sorrida“ verdeckt`, praxisVerdeckt === 'frei', praxisVerdeckt);
    await ph.screenshot({ path: path.join(D, `${art}-390-praxis-modelle.png`) });
    await pp.close();
  }
  pruef(`${art}: keine Fehler im Browser`, fehler.length === 0, fehler.slice(0, 2).join(' / '));
  await ctx.close();
}

lauf('Modelle realistisch: Schmerzabfrage am 3D-Modell', async (b) => {
  for (const art of NUR) {
    try { await eineArt(b, art); } catch (e) { pruef(`${art}: Durchlauf`, false, String((e && e.message) || e).split('\n').slice(0, 3).join(' / ')); }
  }
});
