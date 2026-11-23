// Gebiss (mund.glb und mund-leicht.glb): eigener Bau, damit Zähne und Zahnfleisch auch von nah glatt und ruhig wirken.
//  - Zähne, Zahnfleisch und Zunge werden mit Loop-Unterteilung geglättet und erst danach vereinfacht.
//  - Gaumenmuskeln nur zwischen Nasenboden und Rachen (keine rosa Formen in der Nase, keine Zipfel unter dem Kinn).
//  - Oberkiefer als fester Körper neu gebildet (fest.mjs): Ober- und Gaumenbeine sind getrennte, sich überlappende Hüllen
//    mit Höhlen und offenen Zahnfächern. Im Raster vereinigt, über den Zahnwurzeln waagerecht abgeschnitten (sauber
//    geschlossen) und dort, wo er das Zahnfleisch durchstoßen würde, freigestellt.
//  - Der Kieferknochen wird dort, wo er das Zahnfleisch durchsticht, ein wenig nach innen gesetzt.
//  - Eckenfarbe (COLOR_0): Rot = Wurzel (von Knochen oder Zahnfleisch bedeckt), Grün = Umgebungsverdeckung,
//    Blau = Schneidekante (Frontzähne) bzw. Zahnfleischsaum am Zahnhals.
// Jede Fassung (voll, leicht) bekommt ihr eigenes Budget je Teil (Feld „bau“ in zuordnung.mjs).
import { rahmen, vereinfache } from "./netz.mjs";
import { eckNormalen, loop, raster, schneide } from "./glatt.mjs";
import { sammle, verdeckung } from "./strahlen.mjs";
import { fest } from "./fest.mjs";

export const FASSUNGEN = { voll: 0, leicht: 1 };

const glatt = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Nachbarn je Ecke (für Glätten und Ausbreiten von Werten auf dem Netz). */
function nachbarn(n) {
  const l = Array.from({ length: n.pos.length / 3 }, () => new Set());
  for (let i = 0; i < n.idx.length; i += 3) for (let k = 0; k < 3; k++) { const a = n.idx[i + k], b = n.idx[i + (k + 1) % 3]; l[a].add(b); l[b].add(a); }
  return l.map((s) => [...s]);
}
function mittle(werte, nb, runden) {
  for (let r = 0; r < runden; r++) {
    const neu = new Float32Array(werte.length);
    for (let v = 0; v < werte.length; v++) { let s = werte[v], z = 1; for (const u of nb[v]) { s += werte[u]; z++; } neu[v] = s / z; }
    werte.set(neu);
  }
  return werte;
}

/** Schritt 1 (je Teil, auf den Rohdaten): Schnitte und Glätten. */
function vorbereiten(t, netz, roh) {
  const b = t.bau ?? {};
  if (b.schnitt?.yMax != null) netz = schneide(netz, b.schnitt.yMax, "oben");
  if (b.schnitt?.yMin != null) netz = schneide(netz, b.schnitt.yMin, "unten");
  if (b.fest) {
    // Zahnwurzeln des Oberkiefers ab „wurzelAb“ mit zum Knochen zählen (sonst offene Zahnfächer über dem Zahnfleisch)
    const wurzeln = b.fest.wurzelAb == null ? [] : roh.filter((r) => r.t.zahn && /^[12]/.test(r.t.k)).map((r) => ({ netz: r.netz, ab: b.fest.wurzelAb }));
    const fleisch = b.fest.zahnfleisch ? roh.find((r) => r.t.k === "mund:zahnfleisch" && r.t.m?.[0] === b.fest.zahnfleisch) : null;
    netz = fest(netz, b.fest, wurzeln, fleisch ? { netz: fleisch.netz, abstand: 2.5, innen: 0.8, rand: 0.3 } : null);
  }
  for (let i = 0; i < (b.glaetten ?? 0); i++) netz = loop(netz);
  return netz;
}

/** Ziel-Dreiecke eines Teils in einer Fassung: Zahl oder Anteil nach dem Glätten („x0.5“ = die Hälfte). Ohne Angabe: alle. */
function budget(t, roh, f) {
  const z = t.bau?.dreiecke?.[f];
  if (z == null) return Infinity;
  if (typeof z === "string" && z.startsWith("x")) return roh * Number(z.slice(1));
  return z;
}

/**
 * Knochen, der vor dem Zahnfleisch liegt, nach innen setzen (je Ecke so weit, dass das Zahnfleisch 0,5 mm davor liegt;
 * danach weich ausgebreitet, damit keine Kante entsteht). Gibt die Zahl der verschobenen Ecken zurück.
 */
function knochenUnterZahnfleisch(knochen, zahnfleisch) {
  const G = sammle([zahnfleisch]), nb = nachbarn(knochen), nv = knochen.pos.length / 3, bewegt = new Uint8Array(nv), summe = new Float32Array(nv);
  // Drei Runden: messen, verschieben, nachmessen (nach dem Verschieben zeigen die Normalen etwas anders)
  for (let runde = 0; runde < 3; runde++) {
    const N = eckNormalen(knochen), schub = new Float32Array(nv);
    for (let v = 0; v < nv; v++) {
      const n = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]], p = [knochen.pos[v * 3], knochen.pos[v * 3 + 1], knochen.pos[v * 3 + 2]];
      // Blick entlang der Normalen und aus den Richtungen, aus denen man auf das Gebiss schaut (vorn, seitlich, schräg)
      for (const r of [n, [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0, 0.6, 0.8], [0, -0.6, 0.8]]) {
        if (r !== n && r[0] * n[0] + r[1] * n[1] + r[2] * n[2] < 0.3) continue;
        const info = {}, d = [-r[0], -r[1], -r[2]];
        const t = G.treffe([p[0] + r[0] * 4, p[1] + r[1] * 4, p[2] + r[2] * 4], d, 8.5, info);
        // nur Eintritt zählt: beginnt der Strahl im Zahnfleisch, liegt die Stelle schon darunter
        if (t >= 8.5 || !G.vorderseite(info.dreieck, d)) continue;
        const tiefe = t - 4; // > 0: das Zahnfleisch liegt hinter dem Knochen
        // nur dünne Stellen: tiefer liegt dort wirklich Knochen außerhalb des Zahnfleischs (Kieferkörper, Nasenboden)
        if (tiefe > -0.6 && tiefe < 1.8) schub[v] = Math.max(schub[v], tiefe + 0.6);
      }
    }
    // weich ausbreiten (Übergang ohne Kante), aber nie weniger als gemessen
    const weich = schub.slice();
    for (let r = 0; r < 2; r++) { const neu = weich.slice(); for (let v = 0; v < nv; v++) for (const u of nb[v]) neu[v] = Math.max(neu[v], weich[u] * 0.75); weich.set(neu); }
    mittle(weich, nb, 3);
    for (let v = 0; v < nv; v++) {
      const s = Math.min(Math.max(schub[v], weich[v]), 2.6 - summe[v]);
      if (s < 0.02) continue;
      bewegt[v] = 1; summe[v] += s;
      for (let k = 0; k < 3; k++) knochen.pos[v * 3 + k] -= N[v * 3 + k] * s;
    }
  }
  return bewegt.reduce((a, b) => a + b, 0);
}

/** Weisheitszähne (im Scan nicht enthalten) als Kopie des Nachbarzahns ergänzen. */
function weisheitszaehne(teile) {
  const nach = (k) => teile.find((t) => t.extras.k === k);
  const mitte = (t) => { const r = rahmen(t.pos); return [0, 1, 2].map((i) => (r.min[i] + r.max[i]) / 2); };
  for (const q of [1, 2, 3, 4]) {
    const z7 = nach(`${q}7`), z6 = nach(`${q}6`);
    if (!z7 || !z6) continue;
    const a = mitte(z6), b = mitte(z7), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const pos = new Float32Array(z7.pos.length);
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = b[k] + (z7.pos[i + k] - b[k]) * 0.9 + d[k] * 0.92;
    teile.push({ name: `${q}8`, pos, idx: z7.idx.slice(), extras: { ...z7.extras, k: `${q}8`, nachgebildet: true } });
  }
}

/** Kiefergelenk: oberster Punkt des Unterkiefers hinten auf jeder Seite (Gelenkköpfchen); Drehachse knapp darunter. */
function gelenkUndAchse(teile) {
  const uk = teile.find((t) => t.extras.k === "mund:unterkiefer");
  const gelenk = {};
  for (const [seite, vz] of [["R", -1], ["L", 1]]) {
    let best = null;
    for (let i = 0; i < uk.pos.length; i += 3) {
      const x = uk.pos[i], y = uk.pos[i + 1], z = uk.pos[i + 2];
      if (x * vz < 20) continue;
      if (!best || y > best[1]) best = [x, y, z];
    }
    gelenk[seite] = best.map((v) => Math.round(v * 10) / 10);
  }
  const achse = [0, (gelenk.R[1] + gelenk.L[1]) / 2 - 4, (gelenk.R[2] + gelenk.L[2]) / 2].map((v) => Math.round(v * 10) / 10);
  return { gelenk, achse };
}

/** Eckenfarben (Wurzel, Verdeckung, Saum und Schneidekante) für alle Teile einer Fassung. */
function farben(teile) {
  const zahn = (t) => !!t.extras.zahn;
  const art = (k) => teile.filter((t) => t.extras.k === k);
  const zaehne = teile.filter(zahn), fleisch = art("mund:zahnfleisch"), knochen = [...art("mund:oberkiefer"), ...art("mund:unterkiefer")];
  const decke = sammle([...fleisch, ...knochen]);
  const alleZaehne = sammle(zaehne), zahnAbstand = raster({ pos: alleZaehne.P, idx: alleZaehne.I }, 3);
  // Verdeckung: Zähne, Zahnfleisch, Kiefer und Zunge werfen Schatten; Reichweite 6 mm (Zahnzwischenräume, Zahnhals)
  const ao = verdeckung(teile, 6, { strahlen: 32, verdecker: [...zaehne, ...fleisch, ...knochen, ...art("mund:zunge")] });
  teile.forEach((t, i) => {
    const nv = t.pos.length / 3, c = new Float32Array(nv * 4), N = eckNormalen(t), k = t.extras.k ?? "";
    for (let v = 0; v < nv; v++) { c[v * 4 + 1] = ao[i][v]; c[v * 4 + 3] = 1; }
    if (zahn(t)) {
      // Wurzel: Strahl entlang der Normalen trifft Knochen oder Zahnfleisch, dann ist die Stelle bedeckt
      const w = new Float32Array(nv);
      for (let v = 0; v < nv; v++) {
        const n = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]];
        const o = [t.pos[v * 3] + n[0] * 0.05, t.pos[v * 3 + 1] + n[1] * 0.05, t.pos[v * 3 + 2] + n[2] * 0.05];
        w[v] = decke.treffe(o, n, 6) < 6 ? 1 : 0;
      }
      mittle(w, nachbarn(t), 2);
      // Schneidekante der Frontzähne: die letzten 2,5 mm zur Spitze hin
      const r = rahmen(t.pos), oben = k[0] === "1" || k[0] === "2", front = Number(k[1]) <= 3;
      for (let v = 0; v < nv; v++) {
        c[v * 4] = w[v];
        if (front) { const y = t.pos[v * 3 + 1]; c[v * 4 + 2] = oben ? 1 - glatt(r.min[1], r.min[1] + 2.5, y) : glatt(r.max[1] - 2.5, r.max[1], y); }
      }
    } else if (k === "mund:zahnfleisch") {
      // Saum am Zahnhals: heller und rosiger
      for (let v = 0; v < nv; v++) {
        const d = Math.abs(zahnAbstand.abstand(t.pos[v * 3], t.pos[v * 3 + 1], t.pos[v * 3 + 2], 3));
        c[v * 4 + 2] = d === Infinity ? 0 : 1 - glatt(0.3, 2.4, d);
      }
    }
    t.attribute = { COLOR_0: { daten: c, groesse: 4 } };
  });
}

/**
 * Baut beide Fassungen aus den Rohdaten. roh: [{ t, netz, gespiegelt }] wie in bauen.mjs;
 * alsTeil(t, netz, gespiegelt, namenZahl) macht daraus ein Teil mit Name und Zusatzdaten.
 * Gibt { voll, leicht, zusatz, zeilen } zurück.
 */
export function baueMund(roh, alsTeil) {
  const vor = roh.map((r) => ({ ...r, netz: vorbereiten(r.t, r.netz, roh) }));
  const aus = {}, zeilen = [];
  for (const [fassung, f] of Object.entries(FASSUNGEN)) {
    const namenZahl = new Map(), teile = [], fertig = new Set();
    for (const r of vor) {
      if (r.t.bau?.nurVoll && fassung !== "voll") continue;
      const rohTri = r.netz.idx.length / 3;
      let netz = vereinfache(r.netz, budget(r.t, rohTri, f));
      netz = { pos: new Float32Array(netz.pos), idx: netz.idx };
      const teil = alsTeil(r.t, netz, r.gespiegelt, namenZahl);
      if (r.t.bau?.fest) fertig.add(teil);
      teile.push(teil);
      zeilen.push(`${fassung}: ${teil.name.padEnd(24)} ${String(r.netz.idx.length / 3).padStart(7)} → ${String(netz.idx.length / 3).padStart(6)} Dreiecke`);
    }
    const kiefer = (k) => teile.filter((t) => t.extras.k === k);
    const [gOben, gUnten] = kiefer("mund:zahnfleisch");
    for (const [kn, g] of [[kiefer("mund:oberkiefer")[0], gOben], [kiefer("mund:unterkiefer")[0], gUnten]]) {
      // der feste Oberkiefer ist schon im Raster vom Zahnfleisch freigestellt; hier nur der Unterkiefer
      if (kn && g && !fertig.has(kn)) zeilen.push(`${fassung}: ${kn.name} unter das Zahnfleisch gesetzt: ${knochenUnterZahnfleisch(kn, g)} Ecken`);
    }
    weisheitszaehne(teile);
    farben(teile);
    aus[fassung] = teile;
  }
  return { voll: aus.voll, leicht: aus.leicht, zusatz: gelenkUndAchse(aus.voll), zeilen };
}
