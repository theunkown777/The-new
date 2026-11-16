// Festzuschüsse 2027 einlesen: CSV „Befund;Euro“ → data/festzuschuss-2027.json
//
// Aufruf:  npx tsx scripts/festzuschuss-2027-einlesen.ts <datei.csv> ["Quelle"]
//          npx tsx scripts/festzuschuss-2027-einlesen.ts <datei.csv> --nur-pruefen
//
// Die CSV hat je Zeile eine Befund-Nummer und den Betrag bei 100 % in Euro, zum Beispiel:
//   Befund;Euro
//   1.1;410,25
//   1.2;470,90
// Die Beträge stehen in der Veröffentlichung „Festzuschussbeträge ab 01.01.2027“ des GKV-Spitzenverbands
// (Beschluss des Gemeinsamen Bundesausschusses, Bundesanzeiger). Bitte von Hand abtippen oder aus der
// Tabelle kopieren und danach gegen das Original vergleichen: Das Skript prüft nur Vollständigkeit
// (jeder Befund aus 2026 kommt vor) und Plausibilität (höchstens 25 % Abweichung von 2026).
// Bei einem Fehler wird nichts geschrieben. Nach dem Schreiben: npx vitest run und die Seiten mit Beträgen 2027 ansehen.
import fs from "node:fs";
import path from "node:path";
import { csvLesen, dateiInhalt, pruefen } from "@/lib/festzuschuss2027";
import { FESTZUSCHUSS_BEFUNDE } from "@/lib/proposals";

const ZIEL = path.join(process.cwd(), "data", "festzuschuss-2027.json");

function main(): number {
  const args = process.argv.slice(2);
  const nurPruefen = args.includes("--nur-pruefen");
  const [datei, quelle] = args.filter((a) => !a.startsWith("--"));
  if (!datei) {
    console.error('Aufruf: npx tsx scripts/festzuschuss-2027-einlesen.ts <datei.csv> ["Quelle"] [--nur-pruefen]');
    return 2;
  }
  let text: string;
  try {
    text = fs.readFileSync(datei, "utf-8");
  } catch {
    console.error(`Datei nicht lesbar: ${datei}`);
    return 2;
  }
  const { werte, fehler: leseFehler } = csvLesen(text);
  const fehler = [...leseFehler, ...pruefen(werte, FESTZUSCHUSS_BEFUNDE)];
  if (fehler.length) {
    console.error(`Nicht übernommen, ${fehler.length} ${fehler.length === 1 ? "Fehler" : "Fehler"}:`);
    for (const f of fehler) console.error(`  - ${f}`);
    return 1;
  }
  console.log("Befund  2026        2027        Änderung");
  for (const [befund, ref] of Object.entries(FESTZUSCHUSS_BEFUNDE)) {
    const neu = werte[befund];
    const prozent = ((neu - ref.euro) / ref.euro) * 100;
    console.log(`${befund.padEnd(7)} ${ref.euro.toFixed(2).padStart(9)} € ${neu.toFixed(2).padStart(9)} €  ${prozent >= 0 ? "+" : ""}${prozent.toFixed(1)} %  ${ref.name}`);
  }
  if (nurPruefen) {
    console.log("\nGeprüft, nichts geschrieben (--nur-pruefen).");
    return 0;
  }
  const inhalt = dateiInhalt(werte, FESTZUSCHUSS_BEFUNDE, quelle?.trim() || "GKV-Spitzenverband, Festzuschussbeträge ab 01.01.2027", new Date().toISOString().slice(0, 10));
  fs.writeFileSync(ZIEL, `${JSON.stringify(inhalt, null, 2)}\n`, "utf-8");
  console.log(`\nGeschrieben: ${path.relative(process.cwd(), ZIEL)}`);
  console.log("Ab jetzt rechnet Sorrida 2027 mit diesen Beträgen, und das Wort „voraussichtlich“ entfällt.");
  console.log("Bitte jeden Betrag gegen die Veröffentlichung vergleichen, dann: npx vitest run");
  return 0;
}

process.exit(main());
