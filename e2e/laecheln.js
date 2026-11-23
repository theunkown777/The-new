// Browser-Durchlauf: Lächeln-Zitat der Startseite („Damit beide Seiten lächeln.“), bei 1280, 390 und 360 px.
//
//   node e2e/laecheln.js
//
// Umgebung wie in e2e/gemeinsam.js (BASIS, BILDER). Die Website muss ohne Vorschau-Schloss laufen.
// Geprüft wird:
//   Einstieg  nach dem Hineinscrollen: volles Lächeln, beide Schalter an, „Jetzt lächeln beide.“, Link zu #ablauf
//   Funktion  Praxis aus → „Der Patient lächelt.“ (Link #fuer-patienten, Ansage); Patient aus → „Noch lächelt niemand.“,
//             kein Link; Höhe des Abschnitts bleibt gleich (kein Layout-Sprung)
//   Tastatur  Leertaste und Enter schalten, Tab geht von Praxis zu Patient, Fokusring papierweiß
//   Maße      kein seitlicher Überlauf, Schalter und Link mindestens 44 px
//   Ruhe      „Bewegung reduzieren“: sofort der Endzustand, Umschalten wirkt sofort
//   Ohne JS   vollständiger Endzustand
const { L, D, pruef, KONTEXT, HANDY, lauf } = require('./gemeinsam');

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (id) => `[data-testid="${id}"]`;
const ABSCHNITT = T('laecheln-zitat');

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
  const st = s.querySelector('[data-testid="laecheln-status"]');
  const sichtbar = [...st.children].filter((x) => getComputedStyle(x).visibility === 'visible');
  const link = s.querySelector('[data-testid="laecheln-link"]');
  return {
    voll: s.hasAttribute('data-voll'),
    intro: s.dataset.intro,
    praxis: s.dataset.praxis,
    patient: s.dataset.patient,
    knopfPraxis: s.querySelector('[data-testid="laecheln-praxis"]').getAttribute('aria-pressed'),
    knopfPatient: s.querySelector('[data-testid="laecheln-patient"]').getAttribute('aria-pressed'),
    stand: st.dataset.stand,
    text: sichtbar.map((x) => x.innerText).join(' '),
    link: link && getComputedStyle(link.parentElement).visibility === 'visible' ? link.getAttribute('href') : null,
    ansage: s.querySelector('[data-testid="laecheln-ansage"]').textContent,
    hoehe: s.getBoundingClientRect().height,
  };
});

const strich = (p) => p.evaluate(() => [...document.querySelectorAll('.laecheln-haelfte')].map((x) => parseFloat(getComputedStyle(x).strokeDashoffset)));

async function breite(b, name, ctx) {
  const { c, p, fehler } = await seite(b, ctx);
  await p.locator(ABSCHNITT).scrollIntoViewIfNeeded();
  await p.evaluate(() => { const s = document.querySelector('[data-testid="laecheln-zitat"] svg.laecheln-bogen'); s.scrollIntoView({ block: 'center' }); });
  await warte(3300);
  let z = await zustand(p);
  pruef(`${name}: Einstieg fertig, volles Lächeln`, z.voll && z.intro === 'fertig' && z.knopfPraxis === 'true' && z.knopfPatient === 'true', JSON.stringify({ voll: z.voll, intro: z.intro }));
  pruef(`${name}: Status „Jetzt lächeln beide.“ mit Link zu #ablauf`, z.stand === 'beide' && z.text.includes('Jetzt lächeln beide.') && z.link === '#ablauf', `${z.stand} ${z.link}`);
  pruef(`${name}: Ansage beim Laden leer`, z.ansage === '', z.ansage);
  const hoehe = z.hoehe;

  await p.click(T('laecheln-praxis'));
  await warte(600);
  z = await zustand(p);
  pruef(`${name}: Praxis aus → „Der Patient lächelt.“`, z.knopfPraxis === 'false' && z.praxis === 'aus' && !z.voll && z.text.includes('Der Patient lächelt.') && z.link === '#fuer-patienten', `${z.stand} ${z.link}`);
  pruef(`${name}: Ansage nennt den neuen Stand`, z.ansage.includes('Der Patient lächelt.'), z.ansage);
  const [sPraxis, sPatient] = await strich(p);
  pruef(`${name}: Praxis-Hälfte zurückgezogen, Patient-Hälfte steht`, sPraxis > 1 && sPatient === 0, `${sPraxis} ${sPatient}`);

  await p.click(T('laecheln-patient'));
  await warte(600);
  z = await zustand(p);
  pruef(`${name}: beide aus → „Noch lächelt niemand.“, kein Link`, z.stand === 'keine' && z.text.includes('Noch lächelt niemand.') && z.link === null, `${z.stand} ${z.link}`);
  pruef(`${name}: Höhe des Abschnitts unverändert`, Math.abs(z.hoehe - hoehe) <= 1, `${hoehe} → ${z.hoehe}`);

  // Tastatur
  await p.focus(T('laecheln-praxis'));
  await p.keyboard.press('Space');
  await warte(200);
  pruef(`${name}: Leertaste schaltet Praxis an`, (await zustand(p)).knopfPraxis === 'true');
  await p.keyboard.press('Tab');
  const fokusId = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid'));
  pruef(`${name}: Tab führt zu Patient`, fokusId === 'laecheln-patient', fokusId);
  const ring = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineColor}`; });
  pruef(`${name}: Fokusring papierweiß`, ring === 'solid rgb(245, 242, 238)', ring);
  await p.keyboard.press('Enter');
  await warte(600);
  z = await zustand(p);
  pruef(`${name}: Enter schaltet Patient an → „Jetzt lächeln beide.“`, z.knopfPatient === 'true' && z.stand === 'beide' && z.text.includes('Jetzt lächeln beide.'), z.stand);

  const masse = await p.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const a = box('[data-testid="laecheln-praxis"]'), b2 = box('[data-testid="laecheln-patient"]'), l = box('[data-testid="laecheln-link"]');
    return { ueber: document.documentElement.scrollWidth - innerWidth, a: [a.width, a.height], b: [b2.width, b2.height], l: l.height };
  });
  pruef(`${name}: kein seitlicher Überlauf`, masse.ueber <= 0, String(masse.ueber));
  pruef(`${name}: Tippflächen mindestens 44 px`, masse.a[0] >= 44 && masse.a[1] >= 44 && masse.b[0] >= 44 && masse.b[1] >= 44 && masse.l >= 44, JSON.stringify(masse));
  await p.locator(ABSCHNITT).screenshot({ path: `${D}/laecheln-${name}.png` });
  pruef(`${name}: keine Fehler in der Konsole`, fehler.length === 0, fehler.slice(0, 2).join(' | '));
  await c.close();
}

lauf('laecheln', async (b) => {
  await breite(b, 'pc-1280', KONTEXT);
  await breite(b, 'handy-390', HANDY);
  await breite(b, 'handy-360', { ...HANDY, viewport: { width: 360, height: 780 } });

  // Bewegung reduzieren: sofort der Endzustand, ohne Warten
  {
    const { c, p } = await seite(b, { ...KONTEXT, reducedMotion: 'reduce' });
    await p.locator(ABSCHNITT).scrollIntoViewIfNeeded();
    const s = await strich(p);
    const mitte = await p.evaluate(() => getComputedStyle(document.querySelector('.laecheln-mitte')).opacity);
    pruef('reduziert: Hälften sofort gezeichnet, Treffpunkt sichtbar', s.every((x) => x === 0) && mitte === '1', `${s} ${mitte}`);
    await p.click(T('laecheln-praxis'));
    const [sPraxis] = await strich(p);
    const z = await zustand(p);
    pruef('reduziert: Umschalten wirkt sofort', sPraxis > 1 && z.stand === 'patient', `${sPraxis} ${z.stand}`);
    await c.close();
  }

  // Ohne JavaScript: vollständiger Endzustand
  {
    const { c, p } = await seite(b, { ...KONTEXT, javaScriptEnabled: false });
    const s = await strich(p);
    const z = await zustand(p);
    pruef('ohne JS: Hälften gezeichnet, „Jetzt lächeln beide.“ sichtbar', s.every((x) => x === 0) && z.text.includes('Jetzt lächeln beide.') && z.link === '#ablauf', `${s} ${z.stand}`);
    await c.close();
  }
});
