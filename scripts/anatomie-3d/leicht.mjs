// Leichte Fassungen der 3D-Dateien für Handys und schwächere Geräte: gleiche Teile und Kennungen,
// etwa ein Drittel bis die Hälfte der Dreiecke. Aufruf: node scripts/anatomie-3d/leicht.mjs
// Trägt die Datei eine eingebackene Umgebungsverdeckung (ao.mjs), bleibt sie erhalten, solange die leichte
// Fassung dadurch höchstens 15 % größer wird als ohne. Sonst wird die leichte Fassung ohne sie gebaut.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leseGlb } from "./lesen.mjs";
import { schreibeGlb } from "./glb.mjs";

const ORDNER = "public/anatomie-3d";
// Anteil der Dreiecke, der bleibt (große Ebenen stärker vereinfachen)
const ANTEIL = { skelett: 0.35, muskeln: 0.35, haut: 0.4, mund: 0.5, lunge: 0.5, verdauung: 0.5, gehirn: 0.5, herz: 0.5, auge: 0.6, harnwege: 0.6, hno: 0.6, sehnen: 0.6 };
const GRENZE = 0.15;
const arbeit = mkdtempSync(join(tmpdir(), "anatomie-leicht-"));
// -kn/-km/-ke: Namen, Materialien und Zusatzdaten (Kennungen der Teile) behalten; -cc: meshopt-Kompression;
// -kv/-vc 4: Eckenfarbe (Verdeckung) behalten, in 16 Stufen (sie ist geglättet und wird nur abgedunkelt)
const pack = (ein, aus, anteil) => execFileSync("npx", ["gltfpack", "-i", ein, "-o", aus, "-si", String(anteil), "-cc", "-kn", "-km", "-ke", "-kv", "-vc", "4"], { stdio: "pipe" });

for (const [datei, anteil] of Object.entries(ANTEIL)) {
  const ein = `${ORDNER}/${datei}.glb`, aus = `${ORDNER}/${datei}-leicht.glb`;
  if (!existsSync(ein)) continue;
  const { teile } = await leseGlb(ein);
  if (!teile.some((t) => t.attribute.COLOR_0)) { pack(ein, aus, anteil); console.log(`${datei}-leicht: ${(statSync(aus).size / 1024).toFixed(0)} KB`); continue; }
  // Vergleich: dieselbe leichte Fassung ohne Eckenfarbe
  const ohneRoh = join(arbeit, `${datei}-ohne.glb`), ohne = join(arbeit, `${datei}-ohne-leicht.glb`), mit = join(arbeit, `${datei}-mit-leicht.glb`);
  schreibeGlb(ohneRoh, teile.map((t) => ({ name: t.name, pos: t.pos, idx: t.idx, extras: t.extras })));
  execFileSync("npx", ["gltfpack", "-i", ohneRoh, "-o", ohne, "-si", String(anteil), "-cc", "-kn", "-km", "-ke", "-vp", "14"], { stdio: "pipe" });
  pack(ein, mit, anteil);
  const a = statSync(mit).size, b = statSync(ohne).size, plus = a / b - 1;
  const nimm = plus <= GRENZE ? mit : ohne;
  renameSync(nimm, aus);
  unlinkSync(nimm === mit ? ohne : mit);
  console.log(`${datei}-leicht: ohne Verdeckung ${(b / 1024).toFixed(0)} KB, mit ${(a / 1024).toFixed(0)} KB (${plus >= 0 ? "+" : ""}${(plus * 100).toFixed(1)} %) → ${nimm === mit ? "mit" : "ohne"}`);
}
