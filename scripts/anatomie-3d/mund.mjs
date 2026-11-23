// Gebiss (mund.glb und mund-leicht.glb): eigener Bau, damit Zähne und Zahnfleisch auch von nah glatt und ruhig wirken.
//  - Zähne, Zahnfleisch und Zunge werden mit Loop-Unterteilung geglättet und erst danach vereinfacht.
//  - Gaumenmuskeln nur zwischen Nasenboden und Rachen (keine rosa Formen in der Nase, keine Zipfel unter dem Kinn).
//  - Zahnfleischrand je Zahn (saum.mjs): Bogen um jeden Zahnhals, Papillen zwischen den Zähnen, Wölbung über den Wurzeln.
//  - Ober- und Unterkiefer als feste Körper neu gebildet (fest.mjs), erst nach dem Zahnfleisch: Die Knochen sind getrennte,
//    sich überlappende Hüllen mit Höhlen und offenen Zahnfächern. Im Raster vereinigt, die Zahnwurzeln eingeschlossen
//    (keine Wurzelspitzen mehr außerhalb des Knochens) und dort, wo der Knochen das Zahnfleisch durchstoßen würde,
//    freigestellt. Der Oberkiefer ist oben abgeschnitten: zu den Seiten abfallend, Mulden geschlossen, Kante gerundet.
//  - Eckenfarbe (COLOR_0): Grün = Umgebungsverdeckung. Zähne: Rot = Wurzel (von Knochen oder Zahnfleisch bedeckt),
//    Blau = Schneidekante (Frontzähne). Zahnfleisch: Rot = freier Rand am Zahn, Blau = feste Gingiva (über 0,5) oder
//    bewegliche Schleimhaut (unter 0,5).
// Jede Fassung (voll, leicht) bekommt ihr eigenes Budget je Teil (Feld „bau“ in zuordnung.mjs).
import { rahmen, vereinfache } from "./netz.mjs";
import { eckNormalen, loop, raster, schneide } from "./glatt.mjs";
import { sammle, verdeckung } from "./strahlen.mjs";
import { fest } from "./fest.mjs";
import { saumFarbe, saumFormen, saumPlan } from "./saum.mjs";

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

const oberesZahnfleisch = (r) => r.t.k === "mund:zahnfleisch" && /upper/.test(r.t.m?.[0] ?? "");
const zaehneVon = (roh, oben) => roh.filter((r) => r.t.zahn && (oben ? /^[12]/ : /^[34]/).test(r.t.k));

/** Schritt 1 (je Teil, auf den Rohdaten): Schnitte und Glätten; das Zahnfleisch bekommt danach seinen Rand je Zahn. */
function vorbereiten(t, netz, roh, plaene, zeilen) {
  const b = t.bau ?? {};
  if (b.schnitt?.yMax != null) netz = schneide(netz, b.schnitt.yMax, "oben");
  if (b.schnitt?.yMin != null) netz = schneide(netz, b.schnitt.yMin, "unten");
  for (let i = 0; i < (b.glaetten ?? 0); i++) netz = loop(netz);
  if (t.k === "mund:zunge") {
    // Zunge 2,5 mm tiefer (sie stand wie ein Klumpen im offenen Mund) und mit flacher Mittelfurche auf dem Rücken
    netz = { pos: Float32Array.from(netz.pos), idx: netz.idx };
    const N = eckNormalen(netz);
    for (let v = 0; v < netz.pos.length / 3; v++) netz.pos[v * 3 + 1] -= 2.5 + 0.7 * zungenFurche(netz, N, v);
  }
  if (b.saum) {
    const oben = /upper/.test(t.m?.[0] ?? "");
    const plan = saumPlan(zaehneVon(roh, oben).map((r) => ({ k: r.t.k, netz: r.netz })), oben);
    netz = { pos: Float32Array.from(netz.pos), idx: netz.idx };
    zeilen.push(`Zahnfleisch ${oben ? "oben" : "unten"}: Rand je Zahn, ${saumFormen(netz, plan)} Ecken verschoben`);
    plaene[oben ? "o" : "u"] = plan;
  }
  return netz;
}

/** Mittelfurche der Zunge: oben auf dem Zungenrücken, nahe der Mitte, nicht an der Spitze (0 bis 1). */
function zungenFurche(netz, N, v) {
  const x = netz.pos[v * 3], z = netz.pos[v * 3 + 2];
  return (1 - glatt(0.3, 2, Math.abs(x))) * glatt(0.2, 0.6, N[v * 3 + 1]) * (1 - glatt(55, 66, z));
}

/** Schritt 2 (Knochen, nach dem Zahnfleisch): im Raster neu bilden, Zahnwurzeln einschließen, vom Zahnfleisch freistellen. */
function festerKnochen(t, netz, roh, vor) {
  const b = t.bau.fest, oben = !b.unten;
  const wurzeln = zaehneVon(roh, oben).map((r) => ({ netz: r.netz, ab: b.wurzelAb, bis: b.wurzelBis, dehnen: b.dehnen }));
  const fleisch = vor.find((r) => r.t.k === "mund:zahnfleisch" && oberesZahnfleisch(r) === oben);
  return fest(netz, b, wurzeln, fleisch ? { netz: fleisch.netz, abstand: 2.5, innen: 0.8, rand: 0.3, unten: !oben } : null);
}

/** Ziel-Dreiecke eines Teils in einer Fassung: Zahl oder Anteil nach dem Glätten („x0.5“ = die Hälfte). Ohne Angabe: alle. */
function budget(t, roh, f) {
  const z = t.bau?.dreiecke?.[f];
  if (z == null) return Infinity;
  if (typeof z === "string" && z.startsWith("x")) return roh * Number(z.slice(1));
  return z;
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
function farben(teile, plaene) {
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
      // Rot: freier Rand (nur wo der Zahn wirklich nah ist, nicht über den Wurzeln), Blau: feste Gingiva oder Schleimhaut
      const r = rahmen(t.pos), plan = (r.min[1] + r.max[1]) / 2 > 676 ? plaene.o : plaene.u;
      for (let v = 0; v < nv; v++) {
        const x = t.pos[v * 3], y = t.pos[v * 3 + 1], z = t.pos[v * 3 + 2], f = saumFarbe(x, y, z, plan, [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]]);
        const d = Math.abs(zahnAbstand.abstand(x, y, z, 3));
        c[v * 4] = f.rot * (d === Infinity ? 0 : 1 - glatt(0.6, 2.2, d));
        c[v * 4 + 2] = f.blau;
      }
    }
    if (k === "mund:zunge") for (let v = 0; v < nv; v++) c[v * 4 + 2] = zungenFurche(t, N, v);
    t.attribute = { COLOR_0: { daten: c, groesse: 4 } };
  });
}

/**
 * Baut beide Fassungen aus den Rohdaten. roh: [{ t, netz, gespiegelt }] wie in bauen.mjs;
 * alsTeil(t, netz, gespiegelt, namenZahl) macht daraus ein Teil mit Name und Zusatzdaten.
 * Gibt { voll, leicht, zusatz, zeilen } zurück.
 */
export function baueMund(roh, alsTeil) {
  const plaene = {}, zeilen = [];
  const vor = roh.map((r) => ({ ...r, netz: vorbereiten(r.t, r.netz, roh, plaene, zeilen) }));
  for (const r of vor) if (r.t.bau?.fest) r.netz = festerKnochen(r.t, r.netz, roh, vor);
  const aus = {};
  for (const [fassung, f] of Object.entries(FASSUNGEN)) {
    const namenZahl = new Map(), teile = [];
    for (const r of vor) {
      if (r.t.bau?.nurVoll && fassung !== "voll") continue;
      const rohTri = r.netz.idx.length / 3;
      let netz = vereinfache(r.netz, budget(r.t, rohTri, f));
      netz = { pos: new Float32Array(netz.pos), idx: netz.idx };
      const teil = alsTeil(r.t, netz, r.gespiegelt, namenZahl);
      teile.push(teil);
      zeilen.push(`${fassung}: ${teil.name.padEnd(24)} ${String(r.netz.idx.length / 3).padStart(7)} → ${String(netz.idx.length / 3).padStart(6)} Dreiecke`);
    }
    weisheitszaehne(teile);
    farben(teile, plaene);
    aus[fassung] = teile;
  }
  return { voll: aus.voll, leicht: aus.leicht, zusatz: gelenkUndAchse(aus.voll), zeilen };
}
