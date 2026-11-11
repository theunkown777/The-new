// Leichte Fassungen der 3D-Dateien für Handys und schwächere Geräte: gleiche Teile und Kennungen,
// etwa ein Drittel bis die Hälfte der Dreiecke. Aufruf: node scripts/anatomie-3d/leicht.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const ORDNER = "public/anatomie-3d";
// Anteil der Dreiecke, der bleibt (große Ebenen stärker vereinfachen)
const ANTEIL = { skelett: 0.35, muskeln: 0.35, haut: 0.4, mund: 0.5, lunge: 0.5, verdauung: 0.5, gehirn: 0.5, herz: 0.5, auge: 0.6, harnwege: 0.6, hno: 0.6, sehnen: 0.6 };

for (const [datei, anteil] of Object.entries(ANTEIL)) {
  const ein = `${ORDNER}/${datei}.glb`;
  if (!existsSync(ein)) continue;
  // -kn/-km/-ke: Namen, Materialien und Zusatzdaten (Kennungen der Teile) behalten; -cc: meshopt-Kompression
  execFileSync("npx", ["gltfpack", "-i", ein, "-o", `${ORDNER}/${datei}-leicht.glb`, "-si", String(anteil), "-cc", "-kn", "-km", "-ke"], { stdio: "inherit" });
}
