// Fügt die übersetzten Teil-Dateien einer Sprache zu lib/modelle/i18n/<sprache>.json zusammen und prüft sie.
// Aufruf: npx tsx scripts/modell-texte-zusammen.ts <Ordner mit en/, tr/, …>
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { sammleModellTexte } from "../lib/modelle/i18n/sammeln";
import { MODELL_SPRACHEN } from "../lib/modelle/i18n/schluessel";

const ordner = process.argv[2];
const { alle } = sammleModellTexte();
const platzhalter = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(",");
let fehler = 0;
for (const lang of MODELL_SPRACHEN) {
  const dir = `${ordner}/${lang}`;
  if (!existsSync(dir)) { console.log(`${lang}: Ordner fehlt`); fehler++; continue; }
  const roh: Record<string, string> = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) Object.assign(roh, JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  const aus: Record<string, string> = {};
  const probleme: string[] = [];
  for (const [k, de] of Object.entries(alle)) {
    const v = typeof roh[k] === "string" ? roh[k].trim() : "";
    if (!v) { probleme.push(`fehlt: ${k} „${de.slice(0, 40)}“`); continue; }
    if (platzhalter(v) !== platzhalter(de)) { probleme.push(`Platzhalter: ${k} „${de.slice(0, 40)}“ → „${v.slice(0, 40)}“`); continue; }
    aus[k] = v;
  }
  writeFileSync(`lib/modelle/i18n/${lang}.json`, JSON.stringify(aus, null, 1) + "\n");
  console.log(`${lang}: ${Object.keys(aus).length} von ${Object.keys(alle).length}`, probleme.slice(0, 8));
  fehler += probleme.length;
}
if (fehler) console.log("Unvollständige Sprachen bleiben in MODELL_SPRACHEN_FERTIG (schluessel.ts) ausgeschaltet.");
