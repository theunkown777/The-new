// Echte Anatomie (BodyParts3D, Lee-Perry-Smith-Kopf): Dateien laden, Teile vorbereiten, Materialien.
// Die Dateien sind mit meshopt gepackt; entpackt wird in Web Workern. Jedes Teil wird einzeln
// vorbereitet, dazwischen bekommt der Browser Luft (keine langen Aufgaben im Hauptfaden).
import type * as DREI from "three";
import { ANATOMIE_PFAD, type DateiId } from "@/lib/modelle/drei/anatomie";
import type { Drei, EchtUniforms } from "./Buehne";

interface Roh { name: string; e: Record<string, unknown>; geo: DREI.BufferGeometry; mitte: [number, number, number] }
const cache = new Map<DateiId, Promise<Roh[]>>();
let lader: Promise<{ laden: (url: string) => Promise<{ scene: DREI.Object3D }> }> | null = null;

/** Dem Browser kurz Luft geben (Eingaben, Zeichnen), bevor es weitergeht. */
export const luft = () => new Promise<void>((r) => { const w = window as unknown as { scheduler?: { yield?: () => Promise<void> } }; if (w.scheduler?.yield) w.scheduler.yield().then(r); else setTimeout(r, 0); });

function gltfLader() {
  lader ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/libs/meshopt_decoder.module.js")]);
    await MeshoptDecoder.ready;
    // Entpacken in zwei Workern, nicht im Hauptfaden
    try { MeshoptDecoder.useWorkers(2); } catch { /* ohne Worker */ }
    const l = new GLTFLoader();
    l.setMeshoptDecoder(MeshoptDecoder);
    return { laden: (url: string) => l.loadAsync(url) as Promise<{ scene: DREI.Object3D }> };
  })();
  return lader;
}

// Umrechnen und Normalen bilden im Web Worker: Der Hauptfaden bleibt frei (keine langen Aufgaben).
const WERKER = `
const teil = (arr, norm) => {
  if (!norm) return (i) => arr[i];
  const m = arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : 1;
  const vz = arr instanceof Int8Array || arr instanceof Int16Array;
  return (i) => vz ? Math.max(arr[i] / m, -1) : arr[i] / m;
};
const lies = (at) => {
  const f = teil(at.daten, at.norm), out = new Float32Array(at.anzahl * at.groesse);
  for (let i = 0; i < at.anzahl; i++) for (let k = 0; k < at.groesse; k++) out[i * at.groesse + k] = f(at.offset + i * at.schritt + k);
  return out;
};
self.onmessage = (e) => {
  const { id, pos, idx, m, weitere, nachWinkel } = e.data;
  const P = lies(pos), n = pos.anzahl;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    P[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
    P[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    P[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  }
  // Normalen: beim Gebiss nach Winkel gewichtet (lange, schmale Dreiecke kippen die Schattierung nicht). Die anderen
  // Dateien sind grob vereinfacht; dort wirkt die Gewichtung nach Fläche ruhiger (Vergleichsbilder Herz, Kopf, Verdauung).
  const N = new Float32Array(n * 3);
  const winkel = (p, q, r) => {
    const ax = P[q] - P[p], ay = P[q + 1] - P[p + 1], az = P[q + 2] - P[p + 2], bx = P[r] - P[p], by = P[r + 1] - P[p + 1], bz = P[r + 2] - P[p + 2];
    const l = Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz);
    return l > 0 ? Math.acos(Math.min(1, Math.max(-1, (ax * bx + ay * by + az * bz) / l))) : 0;
  };
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 0)) continue;
    nx /= l; ny /= l; nz /= l;
    const wa = nachWinkel ? winkel(a, b, c) : l, wb = nachWinkel ? winkel(b, c, a) : l, wc = nachWinkel ? winkel(c, a, b) : l;
    N[a] += nx * wa; N[a + 1] += ny * wa; N[a + 2] += nz * wa; N[b] += nx * wb; N[b + 1] += ny * wb; N[b + 2] += nz * wb; N[c] += nx * wc; N[c + 1] += ny * wc; N[c + 2] += nz * wc;
  }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
    N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l;
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i * 3 + k]); hi[k] = Math.max(hi[k], P[i * 3 + k]); }
  }
  const aus = {};
  for (const [name, at] of Object.entries(weitere)) aus[name] = { daten: lies(at), groesse: at.groesse };
  self.postMessage({ id, P, N, idx, aus, lo, hi }, [P.buffer, N.buffer, idx.buffer, ...Object.values(aus).map((x) => x.daten.buffer)]);
};`;
let werker: Worker | null = null;
let nr = 0;
const offen = new Map<number, (d: Record<string, unknown>) => void>();
function rechne(daten: Record<string, unknown>, transfer: Transferable[]): Promise<Record<string, unknown>> {
  if (!werker) {
    werker = new Worker(URL.createObjectURL(new Blob([WERKER], { type: "text/javascript" })));
    werker.onmessage = (e) => { const f = offen.get(e.data.id); offen.delete(e.data.id); f?.(e.data); };
  }
  const id = ++nr;
  return new Promise((r) => { offen.set(id, r); werker!.postMessage({ ...daten, id }, transfer); });
}
/** Ein Attribut für den Worker: eigene Kopie der Werte (auch aus verschachtelten Puffern) */
function attributDaten(at: DREI.BufferAttribute | DREI.InterleavedBufferAttribute) {
  const il = (at as DREI.InterleavedBufferAttribute).isInterleavedBufferAttribute;
  const quelle = il ? (at as DREI.InterleavedBufferAttribute).data.array : (at as DREI.BufferAttribute).array;
  const daten = (quelle as unknown as { slice: () => ArrayLike<number> & { buffer: ArrayBuffer } }).slice();
  return { daten, norm: at.normalized, anzahl: at.count, groesse: at.itemSize, schritt: il ? (at as DREI.InterleavedBufferAttribute).data.stride : at.itemSize, offset: il ? (at as DREI.InterleavedBufferAttribute).offset : 0 };
}

// Leichte Fassungen (scripts/anatomie-3d/leicht.mjs): gleiche Teile, ein Drittel bis die Hälfte der Dreiecke.
const MIT_LEICHT = new Set(["skelett", "muskeln", "haut", "mund", "lunge", "verdauung", "gehirn", "herz", "auge", "harnwege", "hno", "sehnen"]);
/** Handy, Tablet oder schwächerer Rechner: lieber die leichte Fassung, damit nichts ruckelt. */
export function leichtesGeraet(): boolean {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    (n.hardwareConcurrency ?? 8) <= 4 ||
    (n.deviceMemory ?? 8) <= 4 ||
    Math.min(window.innerWidth, window.innerHeight) < 700
  );
}
const dateiName = (datei: string) => (MIT_LEICHT.has(datei) && leichtesGeraet() ? `${datei}-leicht` : datei);

/** Datei laden und ihre Teile als fertige Geometrien (in Szenenkoordinaten, mit Normalen) liefern; einmal je Sitzung. */
export function ladeRoh(T: Drei, datei: DateiId): Promise<Roh[]> {
  if (!cache.has(datei)) {
    cache.set(datei, (async () => {
      const { laden } = await gltfLader();
      const g = await laden(`${ANATOMIE_PFAD}/${dateiName(datei)}.glb`);
      g.scene.updateMatrixWorld(true);
      const meshes: DREI.Mesh[] = [];
      g.scene.traverse((o) => { if ((o as DREI.Mesh).isMesh) meshes.push(o as DREI.Mesh); });
      return Promise.all(meshes.map((m) => vorbereiten(T, m, datei === "mund")));
    })().catch((e) => { cache.delete(datei); throw e; }));
  }
  return cache.get(datei)!;
}

/** Gepackte (quantisierte) Geometrie im Worker in Fließkomma umrechnen, Lage einrechnen, Normalen bilden. */
async function vorbereiten(T: Drei, m: DREI.Mesh, nachWinkel: boolean): Promise<Roh> {
  const quelle = m.geometry;
  const pos = attributDaten(quelle.getAttribute("position") as DREI.BufferAttribute);
  const idx = new Uint32Array(quelle.index!.array as ArrayLike<number>);
  const weitere: Record<string, ReturnType<typeof attributDaten>> = {};
  for (const n of ["uv", "color"]) if (quelle.getAttribute(n)) weitere[n] = attributDaten(quelle.getAttribute(n) as DREI.BufferAttribute);
  const d = await rechne({ pos, idx, m: m.matrixWorld.elements.slice(), weitere, nachWinkel }, [pos.daten.buffer, idx.buffer, ...Object.values(weitere).map((w) => w.daten.buffer)]);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(d.P as Float32Array, 3));
  geo.setAttribute("normal", new T.BufferAttribute(d.N as Float32Array, 3));
  for (const [n, w] of Object.entries(d.aus as Record<string, { daten: Float32Array; groesse: number }>)) geo.setAttribute(n === "color" ? "kiefer" : n, new T.BufferAttribute(w.daten, w.groesse));
  geo.setIndex(new T.BufferAttribute(d.idx as Uint32Array, 1));
  const lo = d.lo as number[], hi = d.hi as number[];
  geo.boundingBox = new T.Box3(new T.Vector3(...lo), new T.Vector3(...hi));
  geo.boundingSphere = geo.boundingBox.getBoundingSphere(new T.Sphere());
  // Name und Daten stehen am benannten Elternknoten
  let k: DREI.Object3D | null = m;
  while (k && !(k.userData && "g" in k.userData)) k = k.parent;
  const e = (k?.userData ?? {}) as Record<string, unknown>;
  const karten = m.material as DREI.MeshStandardMaterial;
  if (karten.map) e._map = karten.map;
  if (karten.normalMap) e._normalMap = karten.normalMap;
  quelle.dispose();
  return { name: (k?.name ?? "").split("#")[0], e, geo, mitte: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] };
}

/** Weitere Dateien vorbereiten, wenn der Browser gerade nichts zu tun hat (eine nach der anderen),
 *  damit der Wechsel der Ebene später sofort geht. Rechnen im Worker, hier nur Laden und Übergeben. */
export function vorbereitenImLeerlauf(T: Drei, dateien: DateiId[], waermen?: (meshes: DREI.Mesh[]) => void | Promise<void>) {
  if (typeof window === "undefined") return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const warte = (f: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 600));
  // Beim Vorwärmen auch schon geladene Dateien (z. B. die Haut wird beim Abnehmen durchscheinend: neue Shader-Fassung)
  const liste = waermen ? [...dateien] : dateien.filter((d) => !cache.has(d));
  const naechste = () => {
    const d = liste.shift();
    if (!d) return;
    warte(() => {
      if (!waermen) return void ladeRoh(T, d).catch(() => {}).finally(naechste);
      // Laden und im Worker vorbereiten, dann im nächsten ruhigen Moment an die Grafik übergeben
      ladeDatei(T, d)
        .then((meshes) => new Promise<void>((fertig) => warte(() => { Promise.resolve().then(() => waermen(meshes)).catch(() => {}).finally(fertig); })))
        .catch(() => {})
        .finally(naechste);
    });
  };
  naechste();
}

/** Teile einer Datei als Meshes mit userData für die Bühne. */
export async function ladeDatei(T: Drei, datei: DateiId): Promise<DREI.Mesh[]> {
  const roh = await ladeRoh(T, datei);
  return roh.map((r) => {
    const e = r.e;
    // Eingebackene Umgebungsverdeckung: Eckenfarbe (als „kiefer“ geladen), Grünkanal; beim Kopf-Scan steht dort nichts
    // Beim Gebiss (Datei „mund“) tragen Rot und Blau der Eckenfarbe mehr: Wurzel, Schneidekante, Zahnfleischsaum
    const mesh = new T.Mesh(r.geo, stoffEcht(T, { ...e, _ao: !!r.geo.getAttribute("kiefer") && e.s !== "gesicht", _mund: datei === "mund" }));
    const kennung = (e.k as string | undefined) ?? (e.n ? `deko:${e.n}` : undefined);
    mesh.userData = {
      kennung, name: e.n ?? null, gruppe: e.g, geschlecht: e.geschlecht ?? null, datei, mitteY: r.mitte[1], mitte: r.mitte,
      klappe: e.klappe ?? 0, geteilt: true, berechnet: !!e.berechnet, nachgebildet: !!e.nachgebildet, haut: e.s === "gesicht",
      ...(e.s === "gesicht" ? { kieferVoll: true } : {}),
    };
    return mesh;
  });
}

const RAUSCHEN = `
float aufH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float aufN(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(aufH(i), aufH(i + vec3(1,0,0)), f.x), mix(aufH(i + vec3(0,1,0)), aufH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(aufH(i + vec3(0,0,1)), aufH(i + vec3(1,0,1)), f.x), mix(aufH(i + vec3(0,1,1)), aufH(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/**
 * Material je Stoff, mit Zusätzen im Shader: Zerfließen beim Ein- und Ausblenden (uAuf),
 * Kiefer öffnen beim Gesicht (Gewicht je Ecke), ein leichtes rötliches Durchscheinen der Haut am Rand,
 * eingebackene Umgebungsverdeckung (Falten, Achseln, Zwischenräume dunkler) und eine leichte, ruhige
 * Unregelmäßigkeit von Farbe und Rauheit bei Haut, Muskeln und Knochen. Die Netze haben keine
 * Texturkoordinaten; das Muster hängt deshalb an der Lage im Raum (mm) und wandert beim Drehen nicht.
 */
export function stoffEcht(T: Drei, e: Record<string, unknown>): DREI.MeshPhysicalMaterial {
  const s = String(e.s ?? "organ"), farbe = new T.Color(String(e.f ?? "#cccccc"));
  const p: DREI.MeshPhysicalMaterialParameters = { color: farbe, roughness: 0.5 };
  switch (s) {
    case "knochen": Object.assign(p, { roughness: 0.58, clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.25, sheenColor: new T.Color(0xfff1d8) }); break;
    case "knorpel": Object.assign(p, { roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 }); break;
    case "muskel": Object.assign(p, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new T.Color(0xff9e8c), sheenRoughness: 0.4 }); break;
    case "sehne": Object.assign(p, { roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: new T.Color(0xffffff) }); break;
    case "lunge": Object.assign(p, { roughness: 0.6, sheen: 0.6, sheenColor: new T.Color(0xffd3d0), opacity: 0.38, side: T.DoubleSide }); break;
    case "herz": Object.assign(p, { roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }); break;
    case "arterie": case "vene": Object.assign(p, { roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }); break;
    case "gehirn": Object.assign(p, { roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.5, sheenColor: new T.Color(0xffe2dc) }); break;
    case "nerv": Object.assign(p, { roughness: 0.4, clearcoat: 0.5 }); break;
    case "zahn": Object.assign(p, { roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.07, ior: 1.62, sheen: 0.2, sheenColor: new T.Color(0xffffff), specularIntensity: 0.9 }); break;
    case "zahnfleisch": case "gaumen": Object.assign(p, { roughness: 0.32, clearcoat: 0.65, clearcoatRoughness: 0.25 }); break;
    case "zunge": Object.assign(p, { roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new T.Color(0xffb3b0) }); break;
    case "lederhaut": Object.assign(p, { roughness: 0.25, clearcoat: 0.8 }); break;
    case "hornhaut": Object.assign(p, { roughness: 0.05, clearcoat: 1, opacity: 0.3 }); break;
    case "linse": Object.assign(p, { roughness: 0.1, clearcoat: 1, opacity: 0.6 }); break;
    case "iris": Object.assign(p, { roughness: 0.45, clearcoat: 0.6 }); break;
    case "haut": Object.assign(p, { color: new T.Color(0xb48a78), roughness: 0.55, sheen: 0.45, sheenColor: new T.Color(0xffcdb8), sheenRoughness: 0.5, clearcoat: 0.06, clearcoatRoughness: 0.6 }); break;
    case "gesicht": Object.assign(p, { color: new T.Color(0xffffff), map: e._map as DREI.Texture, normalMap: e._normalMap as DREI.Texture, normalScale: new T.Vector2(0.6, 0.6), roughness: 0.52, sheen: 0.45, sheenColor: new T.Color(0xffc9b5), sheenRoughness: 0.5, side: T.DoubleSide }); break;
    default: Object.assign(p, { roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.3 });
  }
  // Gebiss: Zahnschmelz elfenbeinfarben mit leichtem, feuchtem Glanz (kein Lack), Zahnfleisch ruhig und matt feucht
  const mund = !!e._mund && (s === "zahn" || s === "zahnfleisch" || s === "gaumen");
  if (mund && s === "zahn") Object.assign(p, { color: new T.Color(0xf2ebdc), roughness: 0.28, clearcoat: 0.65, clearcoatRoughness: 0.12, ior: 1.62, specularIntensity: 0.75, sheen: 0.12, sheenColor: new T.Color(0xffffff) });
  if (mund && s !== "zahn") Object.assign(p, { roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new T.Color(0xffc4bf), sheenRoughness: 0.5 });
  // Zunge im Gebiss: kräftiger rot und matt (Papillen), kein Klarlack
  const zungeMund = !!e._mund && s === "zunge";
  if (zungeMund) Object.assign(p, { color: new T.Color(0xc55a62), roughness: 0.7, clearcoat: 0, sheen: 0.35, sheenColor: new T.Color(0xffb0aa), sheenRoughness: 0.6 });
  // Handy (Standard-Material ohne Klarlack und Schimmer): Zahnfleisch sonst himbeerrot, Zähne grauer; hier ausgleichen
  if (leichtesGeraet() && mund) p.color = new T.Color(s === "zahn" ? 0xf7f1e6 : 0xd98a8c);
  // Handys und schwächere Geräte: das schlankere Standard-Material (gleiche Farben, Rauheit und Auflösen;
  // ohne Klarlack). Sein Shader ist deutlich kleiner und wird viel schneller übersetzt. Nur die Haut behält
  // ihren Schimmer (samtiger Glanz am Rand), weil er sie erst wie Haut aussehen lässt.
  // Sonst alle Stoffe mit (kaum sichtbarem) Klarlack und Schimmer, damit sie sich ein Shader-Programm teilen.
  let mat: DREI.MeshPhysicalMaterial;
  if (leichtesGeraet() && s === "haut") {
    const { color, roughness, opacity, sheen, sheenColor, sheenRoughness } = p;
    mat = new T.MeshPhysicalMaterial({ color, roughness, metalness: 0, sheen, sheenColor, sheenRoughness, ...(opacity !== undefined ? { opacity } : {}) });
  } else if (leichtesGeraet()) {
    const { color, roughness, opacity, side, map, normalMap, normalScale } = p;
    mat = new T.MeshStandardMaterial({ color, roughness, metalness: 0, ...(opacity !== undefined ? { opacity } : {}), ...(side !== undefined ? { side } : {}), ...(map ? { map } : {}), ...(normalMap ? { normalMap, normalScale } : {}) }) as unknown as DREI.MeshPhysicalMaterial;
  } else {
    p.clearcoat ??= 0.02;
    p.clearcoatRoughness ??= 0.5;
    p.sheen ??= 0.02;
    p.sheenColor ??= new T.Color(0xffffff);
    mat = new T.MeshPhysicalMaterial(p);
  }
  // Punktraster nur für die Haut (sie wird beim Kombinieren durchsichtig); die Lunge bleibt echt durchscheinend
  const raster = leichtesGeraet() && (s === "haut" || s === "gesicht");
  if (p.opacity !== undefined && p.opacity < 1 && !raster) { mat.transparent = true; mat.depthWrite = false; }
  const u: EchtUniforms = { auf: { value: 1 }, kiefer: { value: 0 }, achse: { value: new T.Vector3() }, deck: { value: 1 }, haut: { value: 0 } };
  // Unregelmäßigkeit je Stoff: 1 Haut, 2 Muskel, 3 Knochen (der Kopf-Scan hat eine echte Farbtextur und bleibt, wie er ist)
  // 4 Zahn und 5 Zahnfleisch im Gebiss: Zahn Rot = Wurzel (verdeckt), Blau = Schneidekante;
  // Zahnfleisch Rot = freier Rand am Zahn, Blau über 0,5 = feste Gingiva, darunter bewegliche Schleimhaut
  // 6 Zunge im Gebiss (Papillen, Mittelfurche aus Blau der Eckenfarbe)
  const stoffNr = { value: s === "haut" ? 1 : s === "muskel" ? 2 : s === "knochen" ? 3 : mund ? (s === "zahn" ? 4 : 5) : zungeMund ? 6 : 0 };
  const aoAn = { value: e._ao ? 1 : 0 };
  // Handy: Durchscheinen als Punktraster statt echter Transparenz (ein Shader-Programm für alles, nichts zu sortieren)
  mat.userData.raster = raster;
  mat.userData.u = u;
  const haut = s === "haut" || s === "gesicht", kiefer = s === "gesicht";
  mat.userData.haut = haut;
  u.haut.value = haut ? 1 : 0;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAuf = u.auf; sh.uniforms.uKiefer = u.kiefer; sh.uniforms.uAchse = u.achse; sh.uniforms.uDeck = u.deck; sh.uniforms.uHaut = u.haut;
    sh.uniforms.uStoff = stoffNr; sh.uniforms.uAo = aoAn;
    let v = sh.vertexShader, f = sh.fragmentShader;
    // „kiefer“ = Eckenfarbe der Datei: Rot = Gewicht des Unterkiefers (Kopf-Scan), Grün = Umgebungsverdeckung (übrige Dateien)
    v = `varying vec3 vAufPos;\nvarying float vAo;\nvarying vec2 vMund;\nattribute vec4 kiefer;\nuniform float uAo;\n${kiefer ? "uniform float uKiefer; uniform vec3 uAchse;\n" : ""}` + v;
    if (kiefer) {
      v = v.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        float kW = uKiefer * kiefer.r, kC = cos(kW), kS = sin(kW);
        objectNormal = vec3(objectNormal.x, objectNormal.y * kC - objectNormal.z * kS, objectNormal.y * kS + objectNormal.z * kC);`);
      v = v.replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec3 kp = transformed - uAchse; transformed = uAchse + vec3(kp.x, kp.y * kC - kp.z * kS, kp.y * kS + kp.z * kC); }`);
    }
    v = v.replace("#include <project_vertex>", "#include <project_vertex>\n vAufPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vAo = mix(1.0, kiefer.g, uAo * 0.82);\n vMund = kiefer.rb;");
    f = `varying vec3 vAufPos;\nvarying float vAo;\nvarying vec2 vMund;\nuniform float uAuf;\nuniform float uDeck;\nuniform float uHaut;\nuniform float uStoff;\n${RAUSCHEN}\n` + f;
    // Farbe: ruhige Flecken (3 cm und 9 mm) bei Haut und Knochen, feine Längsstreifen bei Muskeln; dann die Verdeckung
    f = f.replace("#include <color_fragment>", `#include <color_fragment>
      float stoffR = aufN(vAufPos * 0.032) * 0.65 + aufN(vAufPos * 0.11) * 0.35;
      if (uStoff > 0.5 && uStoff < 1.5) diffuseColor.rgb *= mix(vec3(0.94, 0.955, 0.975), vec3(1.045, 1.0, 0.975), stoffR);
      else if (uStoff > 1.5 && uStoff < 2.5) diffuseColor.rgb *= 0.9 + 0.13 * aufN(vec3(vAufPos.x * 0.8, vAufPos.y * 0.05, vAufPos.z * 0.8)) + 0.07 * stoffR;
      else if (uStoff > 2.5 && uStoff < 3.5) diffuseColor.rgb *= mix(vec3(0.95, 0.93, 0.89), vec3(1.03, 1.02, 1.0), stoffR);
      else if (uStoff > 3.5 && uStoff < 4.5) {
        // Zahn: Wurzel wärmer (Zement), am Hals ein Hauch Gelb, Schneidekante leicht durchscheinend bläulich grau
        float wurzel = smoothstep(0.15, 0.85, vMund.x);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.95, 0.87, 0.72), wurzel);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.99, 0.95, 0.86), smoothstep(0.0, 0.25, vMund.x) * (1.0 - wurzel));
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.86, 0.9, 0.96), vMund.y * 0.7);
        diffuseColor.rgb *= 0.985 + 0.03 * aufN(vAufPos * 0.9);
      }
      else if (uStoff > 4.5 && uStoff < 5.5) {
        // Zahnfleisch: feste Gingiva hell korallrosa (etwa #E9A5A0), deutlich abgesetzt die dunklere, rötere
        // bewegliche Schleimhaut (etwa #D9787A); der freie Rand am Zahn ein wenig heller und glasiger
        float festG = smoothstep(0.4, 0.6, vMund.y);
        diffuseColor.rgb *= mix(vec3(1.04, 0.95, 0.93), vec3(1.2, 1.55, 1.42), festG);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(1.04, 1.08, 1.08), vMund.x * 0.6);
        diffuseColor.rgb *= 0.98 + 0.04 * stoffR;
      }
      else if (uStoff > 5.5) {
        // Zunge: feine Papillen (helle Pünktchen), Mittelfurche etwas dunkler
        float pap = aufN(vAufPos * 2.2);
        diffuseColor.rgb *= 0.93 + 0.12 * smoothstep(0.55, 0.8, pap);
        diffuseColor.rgb *= 1.0 - 0.16 * vMund.y;
      }
      diffuseColor.rgb *= vAo;`);
    f = f.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      if (uStoff > 0.5 && uStoff < 3.5) roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * stoffR), 0.05, 1.0);
      else if (uStoff > 3.5 && uStoff < 4.5) roughnessFactor = clamp(roughnessFactor + 0.3 * smoothstep(0.2, 0.9, vMund.x), 0.05, 1.0);
      else if (uStoff > 4.5 && uStoff < 5.5) roughnessFactor = mix(0.38, 0.5, smoothstep(0.4, 0.6, vMund.y));`);
    // Gebiss: feine Tüpfelung der festen Gingiva und Papillen der Zunge als leichte Unebenheit (nur die Normale)
    f = f.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      if (uStoff > 4.5) {
        float hS = uStoff > 5.5 ? aufN(vAufPos * 2.2) * 0.05 : aufN(vAufPos * 3.0) * 0.035 * smoothstep(0.4, 0.6, vMund.y) * (1.0 - vMund.x);
        vec3 sp = -vViewPosition, dpx = dFdx(sp), dpy = dFdy(sp);
        vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dFdx(hS) * r1 + dFdy(hS) * r2);
        normal = normalize(abs(det) * normal - grad);
      }`);
    f = f.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      float aufWert = aufN(vAufPos * 0.06) * 0.72 + aufN(vAufPos * 0.23) * 0.28;
      if (aufWert > uAuf * 1.06 - 0.03) discard;
      if (uDeck < 0.999 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > uDeck) discard;`);
    f = f.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      if (uAuf < 0.995) totalEmissiveRadiance += vec3(1.0, 0.66, 0.38) * smoothstep(uAuf * 1.06 - 0.12, uAuf * 1.06 - 0.03, aufWert) * 0.9;
      totalEmissiveRadiance += uHaut * vec3(0.55, 0.16, 0.1) * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6) * 0.22;`);
    sh.vertexShader = v; sh.fragmentShader = f;
  };
  // Haut und andere Teile teilen sich das Programm (Hautschimmer über die Uniform uHaut); nur der Kiefer braucht ein eigenes
  mat.customProgramCacheKey = () => `echt|${kiefer ? "k" : ""}`;
  return mat;
}
