// Backt die Umgebungsverdeckung (ambient occlusion) in die fertigen 3D-Dateien: je Ecke ein Wert 0…1 im
// Grünkanal der Eckenfarbe (COLOR_0). Falten, Achseln, Zwischenräume von Zähnen und Rippen werden so dunkler,
// ohne dass das Gerät dafür rechnet. Der Rotkanal bleibt 0 (Kiefer-Gewicht gibt es nur beim Kopf-Scan).
//
// Aufruf: node scripts/anatomie-3d/ao.mjs [--nur haut,skelett] [--strahlen 24] [--grenze 0.15] [--probe]
//   --grenze: höchstens so viel größer darf eine Datei werden (Anteil); sonst bleibt die alte Datei.
//   --probe:  nur messen, nichts ersetzen.
// Danach die leichten Fassungen neu bauen: node scripts/anatomie-3d/leicht.mjs
// Die Daten bleiben bearbeitete Fassungen von BodyParts3D (CC BY-SA 2.1 JP) und stehen unter CC BY-SA 4.0.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { leseGlb } from "./lesen.mjs";
import { verdeckung } from "./strahlen.mjs";
import { schreibeGlb } from "./glb.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const NUR = arg("nur", null)?.split(",") ?? null;
const STRAHLEN = Number(arg("strahlen", 24));
const GRENZE = Number(arg("grenze", 0.15));
const PROBE = process.argv.includes("--probe");
const ORDNER = resolve("public/anatomie-3d");
const GLTFPACK = resolve("node_modules/.bin/gltfpack");
const INHALT_PFAD = resolve("lib/modelle/drei/anatomieInhalt.json");
/** Reichweite der Strahlen in mm: so weit zählt etwas als „verdeckend“ (Größe der Falten und Zwischenräume). */
// Das Gebiss (mund) fehlt hier: bauen.mjs baut es mit Eckenfarben und leichter Fassung selbst (mund.mjs).
const REICHWEITE = { haut: 70, skelett: 32, muskeln: 40, sehnen: 30, lunge: 25, herz: 18, verdauung: 25, harnwege: 20, gehirn: 14, auge: 6, hno: 12 };

const inhalt = JSON.parse(readFileSync(INHALT_PFAD, "utf8"));
const arbeit = mkdtempSync(join(tmpdir(), "anatomie-ao-"));
const bericht = [];
for (const [datei, reichweite] of Object.entries(REICHWEITE)) {
  if (NUR && !NUR.includes(datei)) continue;
  const pfad = join(ORDNER, `${datei}.glb`);
  const vorher = statSync(pfad).size;
  const { teile } = await leseGlb(pfad);
  if (teile.some((t) => t.attribute.COLOR_0)) { bericht.push(`${datei}: hat schon Eckenfarben, übersprungen`); continue; }
  const start = performance.now();
  const ao = verdeckung(teile, reichweite, { strahlen: STRAHLEN });
  const roh = teile.map((t, i) => {
    const farbe = new Float32Array((t.pos.length / 3) * 4);
    for (let v = 0; v < t.pos.length / 3; v++) { farbe[v * 4 + 1] = ao[i][v]; farbe[v * 4 + 3] = 1; }
    return { name: t.name, pos: t.pos, idx: t.idx, extras: t.extras, attribute: { COLOR_0: { daten: farbe, groesse: 4 } } };
  });
  const rohPfad = join(arbeit, `${datei}.glb`), neuPfad = join(arbeit, `${datei}-ao.glb`);
  schreibeGlb(rohPfad, roh);
  // Verdeckung braucht keine feinen Stufen: erst 6 Bit, wenn es zu groß wird 5 oder 4 Bit (64, 32, 16 Stufen; geglättet)
  let nachher = 0, plus = 0, bits = 0;
  for (bits of [6, 5, 4]) {
    execFileSync(GLTFPACK, ["-i", rohPfad, "-o", neuPfad, "-cc", "-kn", "-km", "-ke", "-kv", "-vp", "14", "-vc", String(bits)], { stdio: "pipe" });
    nachher = statSync(neuPfad).size; plus = nachher / vorher - 1;
    if (plus <= GRENZE) break;
  }
  const mittel = ao.reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0) / ao.reduce((s, a) => s + a.length, 0);
  const zeile = `${datei}: ${(vorher / 1024).toFixed(0)} KB → ${(nachher / 1024).toFixed(0)} KB (${plus >= 0 ? "+" : ""}${(plus * 100).toFixed(1)} %), ${bits} Bit, mittlere Verdeckung ${(1 - mittel).toFixed(2)}, ${((performance.now() - start) / 1000).toFixed(0)} s`;
  if (plus > GRENZE) { bericht.push(`${zeile}: zu groß, bleibt ohne`); continue; }
  bericht.push(zeile);
  if (PROBE) continue;
  copyFileSync(neuPfad, pfad);
  inhalt[datei] = { ...inhalt[datei], bytes: nachher, ao: true };
}
if (!PROBE) writeFileSync(INHALT_PFAD, JSON.stringify(inhalt, null, 1) + "\n");
console.log(bericht.join("\n"));
