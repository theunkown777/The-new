// Browser-Durchlauf: Lächeln-Zitat der Startseite („Damit beide Seiten lächeln.“), bei 1280, 390 und 360 px.
//
//   node e2e/laecheln.js
//
// Umgebung wie in e2e/gemeinsam.js (BASIS, BILDER). Die Website muss ohne Vorschau-Schloss laufen.
// Der Abschnitt läuft von selbst ab, zu klicken gibt es nichts. Geprüft wird:
//   Vorher    vor dem Hineinscrollen hat der Ablauf nicht begonnen (nichts gezeichnet, kein Status)
//   Ablauf    nach dem Hineinscrollen: Praxis, Patient, beide in dieser Folge; am Ende ganzer Bogen,
//             „Jetzt lächeln beide.“ und Link zum Zeitrechner; die Höhe des Abschnitts bleibt dabei gleich
//   Eile      wer sofort weiterscrollt, findet trotzdem den Endzustand vor
//   Bedienung keine Knöpfe oder Schalter; der Link führt zum Zeitrechner; Fokus per Tastatur zeigt sofort den Endzustand
//   Vorlesen  keine Ansagen, die Zwischenzeilen sind versteckt, vorgelesen wird der Endzustand
//   Maße      kein seitlicher Überlauf, Link mindestens 44 px, Etiketten links und rechts
//   Ruhe      „Bewegung reduzieren“: sofort der Endzustand
//   Ohne JS   vollständiger Endzustand
const { L, D, pruef, KONTEXT, HANDY, lauf } = require('./gemeinsam');

const T = (id) => `[data-testid="${id}"]`;
const ABSCHNITT = T('laecheln-zitat');
const WARTEN = { timeout: 20000 };

/** Neue Seite ohne Rundgang-Einladung (sie läge auf dem Handy über dem Abschnitt). */
async function seite(b, ctx) {
  const c = await b.newContext(ctx);
  await c.addInitScript(() => { try { sessionStorage.setItem('sorrida-rundgang', 'zu'); } catch { /* ohne Speicher */ } });
  const p = await c.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await p.goto(L + '/', { waitUntil: 'networkidle' });
  return { c, p, fehler };
}

const zustand = (p) => p.evaluate(() => {
  const s = document.querySelector('[data-testid="laecheln-zitat"]');
  const stil = (x) => getComputedStyle(x);
  const zahl = (x, feld) => parseFloat(stil(x)[feld]);
  const schluss = s.querySelector('.laecheln-status[data-stand="beide"]');
  const link = s.querySelector('[data-testid="laecheln-link"]');
  return {
    phase: s.dataset.phase ?? null,
    sichtbar: zahl(s, 'opacity'),
    haelften: [...s.querySelectorAll('.laecheln-haelfte')].map((x) => zahl(x, 'strokeDashoffset')),
    ganz: zahl(s.querySelector('.laecheln-ganz'), 'opacity'),
    flach: !['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(stil(s.querySelector('.laecheln-gruppe')).transform),
    wort: zahl(s.querySelector('.laecheln-wort'), 'strokeDashoffset'),
    schluss: zahl(schluss, 'opacity'),
    titel: schluss.querySelector('p').innerText,
    zwischen: [...s.querySelectorAll('.laecheln-status[aria-hidden="true"]')].map((x) => (stil(x).visibility === 'visible' && zahl(x, 'opacity') > 0 ? x.innerText : '')),
    seiten: [...s.querySelectorAll('.laecheln-seite')].map((x) => zahl(x, 'opacity')),
    link: link.getAttribute('href'),
    hoehe: s.getBoundingClientRect().height,
  };
});

/** Endzustand: beide Hälften gezeichnet, ganzer Bogen darüber, Wort-Bogen da, Schluss-Status sichtbar, keine Zwischenzeile. */
const fertig = (z) => z.haelften.every((x) => x === 0) && z.ganz === 1 && !z.flach && z.wort === 0 && z.schluss === 1
  && z.seiten.every((x) => x === 1) && z.zwischen.every((x) => x === '') && z.titel === 'Jetzt lächeln beide.';
const kurz = (z) => JSON.stringify({ phase: z.phase, haelften: z.haelften, ganz: z.ganz, wort: z.wort, schluss: z.schluss, zwischen: z.zwischen });

/** Wartet auf die Ruhe am Ende des Ablaufs (auf den Zustand, nicht auf eine feste Zeit). */
const aufEnde = (p) => p.waitForFunction(() => {
  const s = document.querySelector('[data-testid="laecheln-zitat"]');
  const o = (sel) => parseFloat(getComputedStyle(s.querySelector(sel)).opacity);
  return s.dataset.phase === 'beide' && o('.laecheln-ganz') === 1 && o('.laecheln-status[data-stand="beide"]') === 1
    && parseFloat(getComputedStyle(s.querySelector('.laecheln-wort')).strokeDashoffset) === 0
    && ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(s.querySelector('.laecheln-gruppe')).transform)
    && [...s.querySelectorAll('.laecheln-status[aria-hidden="true"]')].every((x) => getComputedStyle(x).visibility === 'hidden');
}, null, WARTEN);

const aufPhase = (p, phase) => p.waitForFunction((ph) => document.querySelector('[data-testid="laecheln-zitat"]').dataset.phase === ph, phase, WARTEN);
const insBild = (p) => p.evaluate(() => document.querySelector('.laecheln-feld').scrollIntoView({ block: 'center' }));

async function breite(b, name, ctx) {
  const { c, p, fehler } = await seite(b, ctx);
  await aufPhase(p, 'wartet');
  // Gegenprobe über eine Sekunde: Ohne Hineinscrollen darf nichts beginnen (der erste Schritt käme nach 0,15 s)
  await p.waitForTimeout(1000);
  let z = await zustand(p);
  pruef(`${name}: vor dem Hineinscrollen hat der Ablauf nicht begonnen`, z.phase === 'wartet' && z.haelften.every((x) => x > 1) && z.ganz === 0 && z.schluss === 0 && z.wort > 1 && z.zwischen.every((x) => x === ''), kurz(z));

  const bedien = await p.evaluate(() => {
    const s = document.querySelector('[data-testid="laecheln-zitat"]');
    return {
      knoepfe: s.querySelectorAll('button, input, select, [role="button"], [role="switch"], [aria-pressed], [aria-checked]').length,
      fokussierbar: [...s.querySelectorAll('a[href], button, input, [tabindex]')].map((x) => x.getAttribute('data-testid')),
      ansagen: s.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
      zwischen: [...s.querySelectorAll('.laecheln-status')].filter((x) => x.dataset.stand !== 'beide').map((x) => x.getAttribute('aria-hidden')),
      text: s.innerText,
    };
  });
  pruef(`${name}: keine Knöpfe oder Schalter, nur der eine Link`, bedien.knoepfe === 0 && bedien.fokussierbar.join() === 'laecheln-link', JSON.stringify(bedien.fokussierbar));
  pruef(`${name}: kein Hinweis auf Schalter mehr`, !/einschalten|Wer soll lächeln|Noch lächelt niemand/.test(bedien.text));
  pruef(`${name}: keine Ansagen, Zwischenzeilen sind aria-hidden`, bedien.ansagen === 0 && bedien.zwischen.length === 2 && bedien.zwischen.every((x) => x === 'true'), JSON.stringify(bedien.zwischen));
  // Was ein Vorleseprogramm bekommt, ist schon vor dem Ablauf der Endzustand
  const baum = await p.locator(ABSCHNITT).ariaSnapshot();
  pruef(`${name}: vorgelesen wird der Endzustand, nicht die Zwischenzeilen`, baum.includes('Jetzt lächeln beide.') && baum.includes('Wie viel Zeit Ihr Team zurückbekommt') && !baum.includes('Die Praxis lächelt.') && !baum.includes('Der Patient lächelt.'));

  // Stationen und Höhe des Abschnitts mitschreiben, dann hineinscrollen
  await p.evaluate(() => {
    const s = document.querySelector('[data-testid="laecheln-zitat"]');
    window.__laecheln = [{ phase: s.dataset.phase, hoehe: s.getBoundingClientRect().height }];
    new MutationObserver(() => window.__laecheln.push({ phase: s.dataset.phase, hoehe: s.getBoundingClientRect().height })).observe(s, { attributes: true, attributeFilter: ['data-phase'] });
  });
  await insBild(p);
  await aufPhase(p, 'praxis');
  // „Die Praxis lächelt.“ blendet kurz nach dem Start der ersten Hälfte ein
  const ersteZeile = await p.waitForFunction(() => {
    const x = document.querySelector('[data-testid="laecheln-zitat"] .laecheln-status[data-stand="praxis"]');
    return getComputedStyle(x).visibility === 'visible' && parseFloat(getComputedStyle(x).opacity) > 0.5 ? x.innerText : false;
  }, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => '');
  pruef(`${name}: erste Station zeigt „Die Praxis lächelt.“`, ersteZeile === 'Die Praxis lächelt.', ersteZeile);
  await aufEnde(p);
  z = await zustand(p);
  pruef(`${name}: am Ende ganzer Bogen und „Jetzt lächeln beide.“`, z.phase === 'beide' && fertig(z) && z.sichtbar === 1, kurz(z));
  const weg = await p.evaluate(() => window.__laecheln);
  pruef(`${name}: Folge Praxis, Patient, beide`, weg.map((x) => x.phase).join() === 'wartet,praxis,patient,beide', weg.map((x) => x.phase).join());
  pruef(`${name}: Höhe des Abschnitts bleibt beim Wechsel der Statuszeile gleich`, weg.every((x) => Math.abs(x.hoehe - z.hoehe) <= 1), weg.map((x) => x.hoehe).join(' ') + ' → ' + z.hoehe);

  const masse = await p.evaluate(() => {
    const s = document.querySelector('[data-testid="laecheln-zitat"]');
    const box = (sel) => { const r = s.querySelector(sel).getBoundingClientRect(); return { l: r.left, r: r.right, o: r.top, u: r.bottom, h: r.height }; };
    return {
      ueber: document.documentElement.scrollWidth - innerWidth, breite: innerWidth,
      praxis: box('[data-testid="laecheln-praxis"]'), patient: box('[data-testid="laecheln-patient"]'),
      bogen: box('.laecheln-bogen'), status: box('[data-testid="laecheln-status"]'), link: box('[data-testid="laecheln-link"]'),
    };
  });
  pruef(`${name}: kein seitlicher Überlauf`, masse.ueber <= 0, String(masse.ueber));
  pruef(`${name}: Praxis links, Patient rechts, beide im Bild und ohne Überlappung`, masse.praxis.l >= 0 && masse.praxis.r <= masse.patient.l && masse.patient.r <= masse.breite, JSON.stringify([masse.praxis, masse.patient]));
  pruef(`${name}: Status steht unter Bogen und Etiketten`, masse.status.o >= masse.bogen.u - 1 && (masse.breite >= 1024 || masse.status.o >= Math.max(masse.praxis.u, masse.patient.u)), JSON.stringify(masse.status));
  pruef(`${name}: Link mindestens 44 px hoch`, masse.link.h >= 44, String(masse.link.h));
  await p.locator(ABSCHNITT).screenshot({ path: `${D}/laecheln-${name}.png` });

  // Der Link führt nach vorn zum Zeitrechner
  pruef(`${name}: Link zeigt auf #zeitrechner, das Ziel gibt es genau einmal`, z.link === '#zeitrechner' && (await p.locator('[id="zeitrechner"]').count()) === 1, z.link);
  await p.click(T('laecheln-link'));
  const amZiel = await p.waitForFunction(() => {
    const r = document.getElementById('zeitrechner').getBoundingClientRect();
    return location.hash === '#zeitrechner' && r.top >= -2 && r.top < innerHeight / 2;
  }, null, { timeout: 5000 }).then(() => true).catch(() => false);
  pruef(`${name}: Klick auf den Link springt zum Zeitrechner weiter unten`, amZiel);
  pruef(`${name}: keine Fehler in der Konsole`, fehler.length === 0, fehler.slice(0, 2).join(' | '));
  await c.close();
}

lauf('laecheln', async (b) => {
  await breite(b, 'pc-1280', KONTEXT);
  await breite(b, 'handy-390', HANDY);
  await breite(b, 'handy-360', { ...HANDY, viewport: { width: 360, height: 780 } });

  // Eile: hineinscrollen und sofort weiter bis ans Seitenende. Der Ablauf bleibt nicht auf halbem Weg stehen.
  {
    const { c, p } = await seite(b, HANDY);
    await aufPhase(p, 'wartet');
    await insBild(p);
    await aufPhase(p, 'praxis');
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await aufEnde(p);
    await insBild(p);
    const z = await zustand(p);
    pruef('Eile: nach schnellem Weiterscrollen steht der Endzustand', z.phase === 'beide' && fertig(z), kurz(z));
    await c.close();
  }

  // Tastatur: Kommt der Fokus auf den Link, bevor der Ablauf lief, steht der Endzustand sofort da
  {
    const { c, p } = await seite(b, KONTEXT);
    await aufPhase(p, 'wartet');
    await p.focus(T('laecheln-link'));
    const z = await zustand(p);
    pruef('Tastatur: Fokus auf dem Link zeigt sofort den Endzustand', z.phase === null && fertig(z), kurz(z));
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Tab');
    const ring = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return `${a.getAttribute('data-testid')} ${s.outlineStyle} ${s.outlineColor}`; });
    pruef('Tastatur: Fokusring papierweiß', ring === 'laecheln-link solid rgb(245, 242, 238)', ring);
    await p.waitForTimeout(600);
    pruef('Tastatur: danach beginnt kein Ablauf mehr', (await zustand(p)).phase === null);
    await c.close();
  }

  // Bewegung reduzieren: sofort der Endzustand, vor und nach dem Hineinscrollen
  {
    const { c, p } = await seite(b, { ...KONTEXT, reducedMotion: 'reduce' });
    let z = await zustand(p);
    pruef('reduziert: Endzustand ohne Ablauf', z.phase === null && fertig(z), kurz(z));
    await insBild(p);
    await p.waitForTimeout(600);
    z = await zustand(p);
    pruef('reduziert: auch nach dem Hineinscrollen kein Ablauf, alles sichtbar', z.phase === null && fertig(z) && z.sichtbar === 1, kurz(z));
    await p.locator(ABSCHNITT).screenshot({ path: `${D}/laecheln-reduziert.png` });
    await c.close();
  }

  // Ohne JavaScript: vollständiger Endzustand
  {
    const { c, p } = await seite(b, { ...KONTEXT, javaScriptEnabled: false });
    const z = await zustand(p);
    pruef('ohne JS: ganzer Bogen, „Jetzt lächeln beide.“ und Link sichtbar', z.phase === null && fertig(z) && z.sichtbar === 1 && z.link === '#zeitrechner', kurz(z));
    await c.close();
  }
});
