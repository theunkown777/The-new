// Prüft, ob es neuere amtliche Stände gibt als im Repo eingelesen sind.
// Aufruf: npx tsx scripts/amtlich-pruefen.ts
// Ausgabe: je Quelle „aktuell“, „neuer Stand verfügbar“ oder „nicht prüfbar“.
// Ende mit Code 0 (keine Änderung) oder 3 (mindestens ein neuer Stand). Ein Abruffehler ist „nicht prüfbar“, kein Absturz.
// Läuft monatlich über .github/workflows/amtlich.yml; bei Code 3 öffnet der Lauf ein Issue.
//
// Das Skript ändert nichts. Es liest nur öffentliche Seiten der Herausgeber und vergleicht sie mit dem Stand im Repo:
//   EBM     Verzeichnis der KBV-Stammdateien gegen die Version in lib/amtlich/ebm.ts (SDEBM_URL)
//   OPS     Seite des BfArM gegen das Jahr in data/amtlich/ops.json
//   UV-GOÄ  Seite der KBV (Vertrag Ärzte/Unfallversicherungsträger) gegen den Stand in data/amtlich/uvgoae.json
//   BEMA    Seite der KZBV gegen den Stand in data/amtlich/bema.json
// ICD-10-GM ist in Sorrida nicht als Verzeichnis eingelesen (nur das Format wird geprüft) und wird deshalb nicht verglichen.
// Die Auswertung der Seiten ist eine Heuristik (lib/amtlich/pruefen.ts). Ein Treffer heißt: bitte nachsehen.
import fs from "node:fs";
import path from "node:path";
import { SDEBM_URL } from "@/lib/amtlich/ebm";
import { datumBewerten, ebmBewerten, exitCode, jahrBewerten, sdebmVersion, zeile, type PruefErgebnis } from "@/lib/amtlich/pruefen";

const ZEITLIMIT_MS = 20_000;

/** Seite abrufen; bei Zeitüberschreitung, Netzfehler oder Fehlerstatus null. */
async function abrufen(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ZEITLIMIT_MS), redirect: "follow", headers: { "User-Agent": "amtlich-pruefen/1.0", Accept: "text/html,*/*" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** meta aus einer Datei unter data/amtlich lesen; null, wenn die Datei fehlt oder nicht lesbar ist. */
function meta(datei: string): { titel?: string; stand?: string } | null {
  try {
    return (JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "amtlich", datei), "utf-8")) as { meta?: { titel?: string; stand?: string } }).meta ?? null;
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  const ops = meta("ops.json");
  const opsJahr = Number(/Version (20\d{2})/.exec(ops?.titel ?? "")?.[1]) || null;
  const uvgoae = meta("uvgoae.json");
  const bema = meta("bema.json");

  const [ebmSeite, opsSeite, uvSeite, bemaSeite] = await Promise.all([
    abrufen(SDEBM_URL.replace(/[^/]+$/, "")),
    abrufen("https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/OPS-ICHI/OPS/_node.html"),
    abrufen("https://www.kbv.de/infothek/rechtsquellen/unfallversicherungstraeger-und-weitere-kostentraeger"),
    abrufen("https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/"),
  ]);

  const ergebnisse: PruefErgebnis[] = [
    ebmBewerten(sdebmVersion(SDEBM_URL), ebmSeite),
    jahrBewerten("OPS (BfArM)", opsJahr, opsSeite, "OPS"),
    datumBewerten("UV-GOÄ (Seite der KBV)", uvgoae?.stand ?? null, uvSeite, "UV-GOÄ"),
    datumBewerten("BEMA (KZBV)", bema?.stand ?? null, bemaSeite, "BEMA"),
  ];

  console.log(`Amtliche Stände, geprüft am ${new Date().toISOString().slice(0, 10)}`);
  for (const e of ergebnisse) console.log(zeile(e));
  console.log("[nicht verglichen] ICD-10-GM: in Sorrida nicht als Verzeichnis eingelesen");
  const code = exitCode(ergebnisse);
  console.log(code === 3 ? "\nErgebnis: neuer Stand verfügbar. Bitte nachsehen und einlesen." : "\nErgebnis: keine Änderung erkannt.");
  return code;
}

main().then((code) => process.exit(code), () => {
  // Auch ein unerwarteter Fehler ist kein Absturz mit Fehlercode: Dann war die Prüfung nicht möglich.
  console.log("[nicht prüfbar] Die Prüfung konnte nicht ausgeführt werden.");
  process.exit(0);
});
