// Antippen am 3D-Modell → Stelle des Kurz-Fragebogens. Rein rechnerisch und ohne KI: Die Grenzen der
// Körperregionen kommen aus den Knochenmitten der echten Anatomie-Daten (lib/modelle/drei/anatomieInhalt.json,
// erzeugt von scripts/anatomie-3d/bauen.mjs). Szene in mm: y oben, z vorn, x < 0 ist die rechte Körperseite.
// Vorn und hinten entscheidet die Richtung der Oberfläche (Normale), nicht die Lage: sonst irrt es an den Armen.
import { ANATOMIE, type DateiId } from "@/lib/modelle/drei/anatomie";
import { ortGueltig, type KurzArt } from "@/lib/kurzcheck";

export type V3 = [number, number, number];

function mitte(datei: DateiId, name: string): V3 {
  const t = ANATOMIE[datei]?.teile.find((x) => x.name === name);
  if (!t) throw new Error(`Landmarke fehlt: ${datei}/${name}`);
  return t.mitte as V3;
}
const sk = (n: string) => mitte("skelett", n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/** Knochenmitten der rechten Seite (x negativ) und der Mitte; links ist gespiegelt. */
const K = {
  scheitel: ANATOMIE.haut.rahmen.max[1],
  schaedel: sk("schaedel:M"), unterkiefer: sk("unterkiefer:M"), hws: sk("hws:M"), bws: sk("bws:M"), lws: sk("lws:M"), kreuzbein: sk("kreuzbein:M"),
  brustbein: sk("brustbein:M"), schluesselbein: sk("schluesselbein:R"), oberarm: sk("oberarmknochen:R"),
  speiche: sk("speiche:R"), elle: sk("elle:R"), handwurzel: sk("handwurzel:R"), finger: sk("finger:R"),
  becken: sk("becken:R"), oberschenkel: sk("oberschenkelknochen:R"), kniescheibe: sk("kniescheibe:R"), schienbein: sk("schienbein:R"),
  fusswurzel: sk("fusswurzel:R"), ferse: sk("fersenbein:R"), zehen: sk("zehen:R"),
  kiefergelenk: (ANATOMIE.mund.gelenk?.R ?? [-44, 726, -5]) as V3,
  nase: (ANATOMIE.kopf.nase ?? [1, 709, 105]) as V3,
  mund: (ANATOMIE.kopf.mund ?? [0, 675, 96]) as V3,
};
const unterarm: V3 = [(K.speiche[0] + K.elle[0]) / 2, (K.speiche[1] + K.elle[1]) / 2, (K.speiche[2] + K.elle[2]) / 2];

/**
 * Abgeleitete Grenzen (mm). Jede Zahl ist aus den Knochenmitten berechnet; die festen Abstände sind
 * an der Hautoberfläche von haut.glb und kopf.glb abgeglichen (Test: lib/kurzcheck3d.test.ts).
 */
export const GRENZEN = {
  /** Kinn: Grenze Kopf/Hals vorn; hinten liegt sie am Hinterhaupt höher */
  kinn: K.unterkiefer[1] - 35,
  hinterhaupt: K.hws[1] + 52,
  /** Unterkante des Halses (über dem Schlüsselbein) */
  halsUnten: K.schluesselbein[1] + 12,
  /** 7. Halswirbel: Grenze Nacken/oberer Rücken */
  c7: K.bws[1] + 145,
  /** Achselhöhe: darüber Schulter, darunter Oberarm */
  achsel: K.oberarm[1] + 42,
  /** Schwertfortsatz (unteres Ende des Brustbeins) */
  brustbeinUnten: K.brustbein[1] - 90,
  /** Nabelhöhe: Grenze Ober-/Unterbauch */
  nabel: K.lws[1] - 15,
  /** Grenze oberer/unterer Rücken (Übergang Brust- zur Lendenwirbelsäule) */
  lwsOben: K.lws[1] + 90,
  /** Oberkante des Gesäßes (Beckenkamm hinten) */
  gesaessOben: K.kreuzbein[1] + 45,
  /** Hüftgelenk: Kopf des Oberschenkelknochens (Spiegelung des Knies an der Schaftmitte) */
  hueftgelenk: [2 * K.oberschenkel[0] - K.kniescheibe[0], 2 * K.oberschenkel[1] - K.kniescheibe[1]] as [number, number],
  /** Schritt: Beine getrennt */
  schritt: (K.becken[1] + K.oberschenkel[1]) / 2 - 70,
  ellenbogen: K.oberarm[1] - 0.57 * (K.oberarm[1] - unterarm[1]),
  handgelenk: K.handwurzel[1] + 20,
  knie: K.kniescheibe[1],
  sprunggelenk: K.fusswurzel[1] + 40,
  fuss: K.fusswurzel[1] + 10,
  /** Innenkante der Arme: weiter außen beginnt der Arm (oben am Oberarm, unten an der Hand neben dem Oberschenkel) */
  armOben: Math.abs(K.oberarm[0]) - 25,
  armUnten: (Math.abs(K.handwurzel[0]) + Math.abs(K.oberschenkel[0])) / 2 + 20,
};
const G = GRENZEN;

/** Innenkante des Arms in dieser Höhe (|x| in mm). */
const armKante = (y: number) => lerp(G.armOben, G.armUnten, (G.handgelenk + 80 - y) / 80);
/** Höhe der Leistenlinie (vom vorderen Darmbeinstachel schräg zum Schambein) bei |x| */
const leisteY = (ax: number) => lerp(K.becken[1] - 95, K.becken[1] + 55, (ax - 25) / 85);

/** Region des Körpers (Haut des ganzen Menschen) an diesem Punkt; null außerhalb. */
function koerperRegion(p: V3, n: V3, art: KurzArt): string | null {
  const [x, y, z] = p, ax = Math.abs(x), s = x < 0 ? "R" : "L";
  const vorn = n[2] >= 0, aussen = n[0] * Math.sign(x || 1);
  // Kopf: über der Kinnlinie, die nach hinten bis zum Hinterhaupt ansteigt
  const kopfGrenze = G.kinn + Math.max(0, Math.min(G.hinterhaupt - G.kinn, (40 - z) * 0.35));
  if (y > kopfGrenze && ax < 110) {
    const kg: V3 = [Math.sign(x || 1) * (Math.abs(K.kiefergelenk[0]) + 26), K.kiefergelenk[1] - 2, K.kiefergelenk[2] + 8];
    if (art === "koerper" && Math.hypot(x - kg[0], y - kg[1], z - kg[2]) < 17) return `kiefergelenk:${s}`;
    return z > K.schaedel[2] + 52 && n[2] > 0.25 && y < K.schaedel[1] + 35 ? "gesicht" : "kopf";
  }
  // Schulter: über der Achsel außen und oben auf der Schulter
  if (y > G.achsel && (ax > 140 || (ax > 78 && y > K.schluesselbein[1] - 8 && n[1] > 0.2))) return `schulter:${s}`;
  // Hals und Nacken
  if (y > G.halsUnten && vorn && ax < 80) return "hals";
  if (y > G.c7 && !vorn && ax < 80) return "nacken";
  // Arme: außerhalb der Innenkante, zwischen Achsel und Fingerspitzen
  if (y <= G.achsel && y > G.schritt - 60 && ax > armKante(y)) {
    if (y > G.ellenbogen + 40) return `oberarm:${s}`;
    if (y > G.ellenbogen - 45) return `ellenbogen:${s}`;
    if (y > G.handgelenk + 25) return `unterarm:${s}`;
    if (y > G.handgelenk - 25) return `handgelenk:${s}`;
    return `hand:${s}`;
  }
  // Rumpf hinten
  if (!vorn && y > G.schritt - 15) {
    if (y > G.lwsOben) return y > G.c7 ? "nacken" : "ruecken_oben";
    if (y > G.gesaessOben) return "ruecken_unten";
    if (ax > 125 && aussen > 0.5 && y > G.hueftgelenk[1] - 75) return `huefte:${s}`;
    return "gesaess";
  }
  // Rumpf vorn
  if (vorn && y > G.schritt) {
    if (y > G.brustbeinUnten - 0.75 * ax) return ax < 30 ? "brust" : `brust:${s}`;
    const ly = leisteY(ax);
    if (ax > 125 && y < G.gesaessOben + 40 && y > G.hueftgelenk[1] - 75 && aussen > 0.45) return `huefte:${s}`;
    if (y > ly + 28) return `bauch:${x < 0 ? "r" : "l"}${y > G.nabel ? "o" : "u"}`;
    if (y > ly - 30 || ax < 25) return `leiste:${s}`;
    return `oberschenkel:${s}`;
  }
  // Beine
  if (y > G.knie + 75) return `oberschenkel:${s}`;
  if (y > G.knie - 70) return `knie:${s}`;
  const hinten = n[2] < -0.3;
  if (y > G.sprunggelenk) return hinten ? `wade:${s}` : `unterschenkel:${s}`;
  if (y > G.fuss && !(z > 35)) return hinten ? `wade:${s}` : `sprunggelenk:${s}`;
  return `fuss:${s}`;
}

/** Landmarken am Kopf-Scan (kopf.glb ist am Schädel ausgerichtet; Augen und Ohren am Scan abgeglichen). */
const KOPF = {
  auge: [-33, 738, 72] as V3,
  /** Mitte der Ohrmuschel und ihre halben Ausdehnungen (seitlich, Höhe, Tiefe) */
  ohr: [-78, 724, -14] as V3, ohrMass: [30, 46, 36] as V3,
  /** Kiefergelenk: vor dem Tragus, über dem Gelenkköpfchen des Unterkiefers */
  kiefergelenk: [K.kiefergelenk[0] - 24, K.kiefergelenk[1] - 10, K.kiefergelenk[2] + 33] as V3,
  /** Kinn des Scans: etwa 5 cm unter der Mundspalte */
  kinn: K.mund[1] - 52,
};

/** Region am Kopf (Augen-, HNO-Praxis); null an Schultern und Brust des Scans. */
function kopfRegion(p: V3, n: V3): string | null {
  const [x, y, z] = p, ax = Math.abs(x), s = x < 0 ? "R" : "L";
  const sp = (v: V3): V3 => [Math.sign(x || 1) * Math.abs(v[0]), v[1], v[2]];
  const d = (v: V3) => Math.hypot(x - v[0], y - v[1], z - v[2]);
  // Grenze Kopf/Hals: am Kinn tief, zum Hinterhaupt ansteigend; die Unterseite des Kiefers gehört zum Hals
  const kopfGrenze = KOPF.kinn + Math.max(0, Math.min(G.hinterhaupt - KOPF.kinn, (40 - z) * 0.45));
  if (y <= kopfGrenze || (n[1] < -0.55 && y < K.mund[1] - 10 && z < 80)) {
    if (y < G.halsUnten - 10 || ax > 75) return null;
    return n[2] >= -0.2 ? "rachen" : "nacken";
  }
  if (d(sp(KOPF.auge)) < 21 && n[2] > 0) return `auge:${s}`;
  if (d(sp(KOPF.kiefergelenk)) < 12) return `kiefergelenk:${s}`;
  const o = sp(KOPF.ohr), m = KOPF.ohrMass;
  if (ax > 56 && Math.hypot((x - o[0]) / m[0], (y - o[1]) / m[1], (z - o[2]) / m[2]) < 1) return `ohr:${s}`;
  if (Math.hypot(x - K.nase[0], (y - K.nase[1]) * 0.8, z - K.nase[2]) < 24 && ax < 22) return "nase";
  if (Math.hypot(x - K.mund[0], (y - K.mund[1]) * 1.4, z - K.mund[2]) < 26) return "gesicht:mund";
  if (y < K.mund[1] - 17 && ax < 38 && n[2] > 0) return "gesicht:kinn";
  // Schläfe: seitlich zwischen Auge und Ohr, über dem Jochbogen
  if (ax > 48 && Math.abs(n[0]) > 0.45 && y > KOPF.auge[1] - 10 && y < KOPF.auge[1] + 62 && z > KOPF.ohr[2] + 24 && z < KOPF.auge[2] - 8) return `gesicht:schlaefe:${s}`;
  if (y > KOPF.auge[1] + 22) return y < K.schaedel[1] + 55 && n[2] > 0.35 && ax < 55 ? "gesicht:stirn" : "kopf";
  if (n[2] < 0.05 || z < KOPF.ohr[2] + 20) return "kopf";
  return `gesicht:wange:${s}`;
}

/**
 * Stelle zu einem Punkt auf der Oberfläche des Modells (Szenenkoordinaten in mm) und der Richtung der
 * Oberfläche dort (Normale). Körper und Haut: haut.glb; Augen und HNO: kopf.glb. Bei den Zähnen gilt die
 * Kennung des angetippten Teils (ortAusKennung). Gibt nur Stellen zurück, die es für die Art gibt:
 * Die Augenpraxis bekommt am Ohr keine Stelle, die HNO-Praxis am Auge keine. Nur die Schläfe wird in der
 * HNO-Praxis zum Kopf, weil sie dort keine eigene Stelle hat und am Kopf liegt.
 */
export function regionAusPunkt(punkt: V3, normale: V3, art: KurzArt): string | null {
  if (art === "zahn") return null;
  const l = Math.hypot(...normale) || 1;
  const n: V3 = [normale[0] / l, normale[1] / l, normale[2] / l];
  let ort = art === "auge" || art === "hno" ? kopfRegion(punkt, n) : koerperRegion(punkt, n, art);
  if (ort?.startsWith("gesicht:schlaefe:") && !ortGueltig(art, ort)) ort = "kopf";
  return ort && ortGueltig(art, ort) ? ort : null;
}

/** Zähne und Mund (mund.glb): Kennung des angetippten Teils → Stelle. */
export function ortAusKennung(kennung: string | null | undefined): string | null {
  if (!kennung) return null;
  if (/^[1-4][1-8]$/.test(kennung)) return `zahn:${kennung}`;
  switch (kennung) {
    case "mund:zahnfleisch": return "mund:zahnfleisch";
    case "mund:kiefergelenk": case "mund:oberkiefer": case "mund:unterkiefer": return "mund:kiefergelenk";
    case "mund:zunge": case "mund:mundboden": case "mund:speicheldruesen": case "mund:zungenbein": return "mund:zunge";
    case "mund:gaumen": case "mund:zaepfchen": return "mund:gaumen";
    default: return null;
  }
}

function ortZielEins(ort: string, art: KurzArt): Ziel | null {
  const [a, b, c] = ort.split(":");
  const seite = (c ?? b) === "L" ? 1 : (c ?? b) === "R" ? -1 : 0;
  const sx = (v: number) => (seite || -1) * Math.abs(v);
  const P = (x: number, y: number, z: number, n: V3): Ziel => ({ punkt: [x, y, z], normale: n });
  const seitlich = (nz: number): V3 => [seite * 0.8, 0, nz];
  if (a === "zahn" || a === "mund") return null;
  if (art === "auge" || art === "hno") {
    switch (a) {
      case "auge": return P(sx(KOPF.auge[0]), KOPF.auge[1], KOPF.auge[2] - 10, [0, 0, 1]);
      case "ohr": return P(sx(KOPF.ohr[0]) * 0.7, KOPF.ohr[1], KOPF.ohr[2], [seite, 0, 0]);
      case "kiefergelenk": return P(sx(KOPF.kiefergelenk[0]) * 0.7, KOPF.kiefergelenk[1], KOPF.kiefergelenk[2], [seite, 0, 0]);
      case "nase": return P(K.nase[0], K.nase[1], K.nase[2] - 20, [0, 0, 1]);
      case "rachen": return P(0, KOPF.kinn - 35, 20, [0, -0.2, 1]);
      case "kopf": return P(0, K.schaedel[1] + 40, -40, [0, 0.4, -1]);
      case "gesicht":
        if (b === "stirn") return P(0, KOPF.auge[1] + 32, 40, [0, 0.15, 1]);
        if (b === "mund") return P(0, K.mund[1], K.mund[2] - 15, [0, 0, 1]);
        if (b === "kinn") return P(0, K.mund[1] - 34, 60, [0, -0.2, 1]);
        if (b === "schlaefe") return P(sx(50), KOPF.auge[1] + 35, 30, seitlich(0.4));
        if (b === "wange") return P(sx(40), K.nase[1] - 12, 50, [seite * 0.5, 0, 1]);
        return null;
      default: return null;
    }
  }
  const gl = G.hueftgelenk;
  switch (a) {
    case "kopf": return P(0, K.schaedel[1] + 50, -20, [0, 0.6, -0.8]);
    case "gesicht": return P(0, K.schaedel[1] - 40, 60, [0, 0, 1]);
    case "kiefergelenk": return P(sx(K.kiefergelenk[0]), K.kiefergelenk[1], K.kiefergelenk[2] + 6, [seite, 0, 0.2]);
    case "hals": return P(0, (G.kinn + G.halsUnten) / 2 - 10, 20, [0, 0, 1]);
    case "nacken": return P(0, (G.hinterhaupt + G.c7) / 2, -40, [0, 0, -1]);
    case "brust": return b ? P(sx(85), K.brustbein[1], 60, [0, 0, 1]) : P(0, K.brustbein[1], K.brustbein[2], [0, 0, 1]);
    case "bauch": {
      if (!b) return P(0, G.nabel, 40, [0, 0, 1]);
      const oben = b[1] === "o", x = b[0] === "r" ? -55 : 55;
      return P(x, oben ? (G.nabel + G.brustbeinUnten - 40) / 2 + 10 : G.nabel - 60, 40, [0, 0, 1]);
    }
    case "leiste": return P(sx(70), leisteY(70), 40, [seite * 0.2, 0, 1]);
    case "ruecken_oben": return P(0, (G.c7 + G.lwsOben) / 2, -50, [0, 0, -1]);
    case "ruecken_unten": return P(0, (G.lwsOben + G.gesaessOben) / 2, -40, [0, 0, -1]);
    case "gesaess": return P(sx(60), (G.gesaessOben + G.schritt) / 2, -60, [0, 0, -1]);
    case "schulter": return P(sx(Math.abs(K.oberarm[0]) - 15), G.achsel + 70, -20, [seite, 0.4, 0]);
    case "oberarm": return P(sx(K.oberarm[0]), (G.achsel + G.ellenbogen + 40) / 2, K.oberarm[2], [seite, 0, 0.4]);
    case "ellenbogen": return P(sx(Math.abs(K.oberarm[0]) + 0.57 * (Math.abs(unterarm[0]) - Math.abs(K.oberarm[0]))), G.ellenbogen, -15, [seite, 0, -0.6]);
    case "unterarm": return P(sx(unterarm[0]), (G.ellenbogen - 45 + G.handgelenk + 25) / 2, unterarm[2], [seite, 0, 0.4]);
    case "handgelenk": return P(sx(K.handwurzel[0]), G.handgelenk, K.handwurzel[2], [seite, 0, 0.5]);
    case "hand": return P(sx(K.handwurzel[0] - 8), G.handgelenk - 75, K.handwurzel[2] + 10, [seite, 0, 0.4]);
    case "huefte": return P(sx(gl[0]) + (seite || -1) * 40, gl[1] - 10, 0, [seite * 0.6, 0, 0.8]);
    case "oberschenkel": return P(sx(K.oberschenkel[0]), (G.knie + 75 + G.schritt) / 2, K.oberschenkel[2], [0, 0, 1]);
    case "knie": return P(sx(K.kniescheibe[0]), G.knie, K.kniescheibe[2], [0, 0, 1]);
    case "unterschenkel": return P(sx(K.schienbein[0]), (G.knie - 70 + G.sprunggelenk) / 2, K.schienbein[2], [0, 0, 1]);
    case "wade": return P(sx(K.schienbein[0]), (G.knie - 70 + G.sprunggelenk) / 2 + 40, -45, [0, 0, -1]);
    case "sprunggelenk": return P(sx(K.fusswurzel[0]) + (seite || -1) * 20, (G.sprunggelenk + G.fuss) / 2, K.fusswurzel[2] - 5, [seite, 0, 0.2]);
    case "fuss": return P(sx(K.fusswurzel[0] + (K.zehen[0] - K.fusswurzel[0]) * 0.5), K.fusswurzel[1] + 5, K.fusswurzel[2] + 50, [0, 0.7, 0.7]);
    default: return null;
  }
}

export interface Ziel { punkt: V3; normale: V3 }
/**
 * Punkte im Körper und Richtung nach außen für eine Stelle: Dort setzt das Modell die Markierung
 * (auf die Haut projiziert, siehe Buehne.aufFlaeche) und dorthin dreht es die Ansicht.
 * „Beide Augen“ und „Beide Ohren“ ergeben zwei Punkte; Zähne und Mund keinen (dort gilt das Teil selbst).
 */
export function ortZiele(ort: string, art: KurzArt): Ziel[] {
  if (/^(auge|ohr):B$/.test(ort)) return (["R", "L"] as const).map((x) => ortZielEins(`${ort.slice(0, -1)}${x}`, art)).filter((z): z is Ziel => !!z);
  const z = ortZielEins(ort, art);
  return z ? [z] : [];
}
