// Baut die räumlichen Anatomie-Modelle (public/anatomie-3d/*.glb) aus echten Daten:
//  - BodyParts3D 4.0 (DBCLS, aus CT-Daten eines erwachsenen Mannes), OBJ-Dateien „isa_BP3D_4.0_obj_99“
//  - Kopf-Scan „Lee Perry-Smith“ aus dem three.js-Repository (r170)
// Die Teile werden je Struktur zusammengefasst, stark vereinfacht und mit gltfpack (meshopt) gepackt.
//
// Aufruf (Daten vorher in einen eigenen, leeren Ordner laden und entpacken, siehe public/anatomie-3d/README.md):
//   node scripts/anatomie-3d/bauen.mjs --obj <Ordner mit FJ*.obj> \
//     --listen <isa_element_parts.txt>,<partof_element_parts.txt> --kopf <Ordner mit LeePerrySmith.glb und Texturen> [--nur haut,skelett]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Quelle, verbinde } from "./quelle.mjs";
import { kompakt, rahmen, vereinfache, verschweisse } from "./netz.mjs";
import { huelle } from "./huelle.mjs";
import { schreibeGlb } from "./glb.mjs";
import { DATEIEN } from "./zuordnung.mjs";
import { baueKopf } from "./kopf.mjs";
import { baueMund } from "./mund.mjs";

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const OBJ = arg("obj"), LISTEN = (arg("listen") ?? "").split(",").filter(Boolean), KOPF = arg("kopf");
const NUR = arg("nur")?.split(",") ?? null;
if (!OBJ || !LISTEN.length) { console.error("Bitte --obj und --listen angeben (siehe Kopf der Datei)."); process.exit(1); }
const ZIEL = resolve("public/anatomie-3d");
const GLTFPACK = resolve("node_modules/.bin/gltfpack");
mkdirSync(ZIEL, { recursive: true });
const arbeit = mkdtempSync(join(tmpdir(), "anatomie-3d-"));
const q = new Quelle(OBJ, LISTEN);
const INHALT_PFAD = resolve("lib/modelle/drei/anatomieInhalt.json");
let inhalt = {};
try { inhalt = JSON.parse(readFileSync(INHALT_PFAD, "utf8")); } catch { /* neu */ }
const bericht = [];

for (const [datei, plan] of Object.entries(DATEIEN)) {
  if (NUR && !NUR.includes(datei)) continue;
  const benutzt = new Set();
  const roh = [];
  for (const t of plan.teile) {
    let fjs = [...q.finde(t.m)].filter((f) => t.huelle || !benutzt.has(f));
    let gespiegelt = false;
    if (t.spiegelVon) {
      // Links fehlt oder ist unvollständig: die rechte Seite spiegeln
      const rechts = [...q.finde(t.spiegelVon)], namen = (l) => new Set(l.map((f) => q.name.get(f))).size;
      if (rechts.length && namen(fjs) < namen(rechts)) { fjs = rechts; gespiegelt = true; }
    }
    if (!fjs.length) { bericht.push(`${datei}: ${t.k ?? t.n} – keine Daten`); continue; }
    if (!t.huelle && !gespiegelt) for (const f of fjs) benutzt.add(f);
    let netz = verschweisse(verbinde(fjs.map((f) => q.netz(f)), gespiegelt));
    if (t.huelle) netz = huelle(netz.pos, { raster: 4, weich: 15, schwelle: 0.09 });
    const namen = [...new Set(fjs.map((f) => q.name.get(f)))];
    bericht.push(`${datei}: ${t.k ?? t.n}${gespiegelt ? " (gespiegelt)" : ""}${t.huelle ? " (berechnete Hülle)" : ""} ← ${namen.length} Namen, ${netz.idx.length / 3} Dreiecke: ${namen.slice(0, 6).join("; ")}${namen.length > 6 ? " …" : ""}`);
    roh.push({ t, netz, gespiegelt });
  }
  if (plan.bau === "mund") {
    // Gebiss: eigener Bau mit beiden Fassungen (voll und leicht), Eckenfarben inklusive (siehe mund.mjs)
    const { voll, leicht, zusatz, zeilen } = baueMund(roh, alsTeil);
    bericht.push(...zeilen);
    const v = schreibe(datei, voll, 6), l = schreibe(`${datei}-leicht`, leicht, 5);
    inhalt[datei] = { ...beschreibe(plan, voll, v), ...zusatz, ao: true };
    console.log(`${datei}.glb: ${(v / 1024).toFixed(0)} KB, ${inhalt[datei].dreiecke} Dreiecke; ${datei}-leicht.glb: ${(l / 1024).toFixed(0)} KB, ${leicht.reduce((a, t) => a + t.idx.length / 3, 0)} Dreiecke`);
    continue;
  }
  // Dreiecke verteilen: größere Teile bekommen mehr, kleine behalten ihre Form
  const gewicht = roh.map((r) => Math.pow(r.netz.idx.length / 3, 0.8) * (r.t.gewicht ?? 1));
  const summe = gewicht.reduce((a, b) => a + b, 0);
  const teile = [];
  const namenZahl = new Map();
  for (let i = 0; i < roh.length; i++) {
    const { t, gespiegelt } = roh[i];
    const ziel = Math.max(Math.min(roh[i].netz.idx.length / 3, 80), (plan.dreiecke * gewicht[i]) / summe);
    teile.push(alsTeil(t, vereinfache(roh[i].netz, ziel), gespiegelt, namenZahl));
  }
  const bytes = schreibe(datei, teile);
  inhalt[datei] = beschreibe(plan, teile, bytes);
  console.log(`${datei}.glb: ${(bytes / 1024).toFixed(0)} KB, ${inhalt[datei].dreiecke} Dreiecke`);
}

if (KOPF && (!NUR || NUR.includes("kopf"))) {
  const k = baueKopf(KOPF, q, arbeit, ZIEL, GLTFPACK);
  inhalt.kopf = k;
  console.log(`kopf.glb: ${(k.bytes / 1024).toFixed(0)} KB`);
}

writeFileSync(INHALT_PFAD, JSON.stringify(inhalt, null, 1) + "\n");
writeFileSync(join(arbeit, "bericht.txt"), bericht.join("\n") + "\n");
console.log(`Bericht: ${join(arbeit, "bericht.txt")}`);

/** Ein Teil der Datei: Name (mehrfach vorkommende mit #2, #3 …) und Zusatzdaten für die Anwendung. */
function alsTeil(t, netz, gespiegelt, namenZahl) {
  const basis = t.k ?? `deko:${t.n}`;
  const z = (namenZahl.get(basis) ?? 0) + 1; namenZahl.set(basis, z);
  const extras = { g: t.g, s: t.s, f: t.f };
  if (t.k) extras.k = t.k; else extras.n = t.n;
  if (t.klappe) extras.klappe = t.klappe === true ? 1 : t.klappe;
  if (t.geschlecht) extras.geschlecht = t.geschlecht;
  if (t.huelle) extras.berechnet = true;
  if (gespiegelt) extras.gespiegelt = true;
  if (t.zahn) extras.zahn = true;
  return { name: z > 1 ? `${basis}#${z}` : basis, pos: netz.pos, idx: netz.idx, extras };
}

/** GLB schreiben und packen; farbBits: Eckenfarbe behalten (so viele Bit je Kanal). Gibt die Bytes zurück. */
function schreibe(name, teile, farbBits = 0) {
  const rohDatei = join(arbeit, `${name}.glb`);
  schreibeGlb(rohDatei, teile);
  const farbe = farbBits ? ["-kv", "-vc", String(farbBits)] : [];
  execFileSync(GLTFPACK, ["-i", rohDatei, "-o", join(ZIEL, `${name}.glb`), "-cc", "-kn", "-km", "-ke", ...farbe, "-vp", "14"], { stdio: "inherit" });
  return statSync(join(ZIEL, `${name}.glb`)).size;
}

/** Eintrag in anatomieInhalt.json: Größe, Dreiecke, Rahmen und Teile mit Mittelpunkt. */
function beschreibe(plan, teile, bytes) {
  const r = rahmen(new Float32Array(teile.flatMap((t) => [...rahmen(t.pos).min, ...rahmen(t.pos).max])));
  return {
    name: plan.name, bytes, dreiecke: teile.reduce((a, t) => a + t.idx.length / 3, 0),
    rahmen: { min: r.min.map((v) => Math.round(v)), max: r.max.map((v) => Math.round(v)) },
    teile: teile.map((t) => ({ name: t.name.split("#")[0], g: t.extras.g, ...(t.extras.geschlecht ? { geschlecht: t.extras.geschlecht } : {}), mitte: [0, 1, 2].map((k) => { const rr = rahmen(t.pos); return Math.round((rr.min[k] + rr.max[k]) / 2); }) })).filter((t, i, a) => a.findIndex((x) => x.name === t.name) === i),
  };
}

export { kompakt };
