// Schreibt lib/modelle/i18n/quelle.json = { Schlüssel: deutscher Text } neu, nachdem Texte der
// Modelle geändert wurden. Mit Ordner als Argument zusätzlich Teil-Dateien für die Übersetzung.
// Aufruf: npx tsx scripts/modell-texte.ts [Ordner]
import { writeFileSync, mkdirSync } from "node:fs";
import { sammleModellTexte } from "../lib/modelle/i18n/sammeln";

const { alle, teile } = sammleModellTexte();
writeFileSync("lib/modelle/i18n/quelle.json", JSON.stringify(alle, null, 1) + "\n");
const ziel = process.argv[2];
if (ziel) { mkdirSync(ziel, { recursive: true }); for (const [g, t] of Object.entries(teile)) writeFileSync(`${ziel}/${g}.json`, JSON.stringify(t, null, 1) + "\n"); }
const worte = Object.values(alle).join(" ").split(/\s+/).length;
console.log(`${Object.keys(alle).length} Texte, ${worte} Wörter`, Object.fromEntries(Object.entries(teile).map(([g, t]) => [g, Object.keys(t).length])));
