// Löscht alle Daten einer Praxis nach Vertragsende (AVV § 10). Ablauf: docs/BETRIEB.md, Abschnitt 11.
//
// Probelauf (löscht nichts):
//   npx tsx scripts/praxis-loeschen.ts --praxis <Kennung>
// Löschen (der Probelauf zeigt den fertigen Befehl):
//   npx tsx scripts/praxis-loeschen.ts --praxis <Kennung> --ausfuehren --datenbank <Rechner:Port/Datenbank> \
//     --bestaetigen "<genauer Name der Praxis>" --sicherung-tage <Tage>
// --datenbank bindet die Bestätigung an die Datenbank: Ein Branch beim Anbieter ist eine Kopie mit gleichen Kennungen
// und Namen und hat einen anderen Rechnernamen. --sicherung-tage steht in der Bestätigung (docs/BETRIEB.md, Abschnitt 2).
//
// Braucht DATABASE_URL in der Umgebung (die Datei .env zählt nicht). Gibt nur Name und Kennung der Praxis und Zahlen
// je Tabelle aus, nie Angaben zu Patienten. Liste der Tabellen und Reihenfolge: lib/praxisLoeschen.ts.
import { resolveDatabaseUrls } from "../lib/databaseUrl";

async function main(): Promise<number> {
  // Vor dem Laden von Prisma lesen: @prisma/client lädt beim Import die Datei .env nach. Gelöscht wird nur in der
  // Datenbank, die ausdrücklich angegeben ist.
  const url = process.env.DATABASE_URL?.trim();
  const { PrismaClient } = await import("@prisma/client");
  const L = await import("../lib/praxisLoeschen");

  const aufruf = L.argumenteLesen(process.argv.slice(2));
  if ("fehler" in aufruf) {
    console.error(`${aufruf.fehler}\n\n${L.NUTZUNG}`);
    return 2;
  }
  if (!url) {
    console.error("DATABASE_URL fehlt. Ohne Angabe der Datenbank wird nichts gelesen und nichts gelöscht.");
    return 2;
  }
  // Nur DATABASE_URL, keine andere Variable: Die Datenbank, die oben steht, ist die, in der gelöscht wird.
  const adressen = resolveDatabaseUrls({ DATABASE_URL: url });
  if (!adressen) {
    console.error("DATABASE_URL ist keine PostgreSQL-Adresse.");
    return 2;
  }
  const ziel = L.datenbankZiel(adressen.direct);
  if (aufruf.ausfuehren && aufruf.datenbank !== ziel) {
    console.error(`Die Angabe hinter --datenbank stimmt nicht mit der Datenbank aus DATABASE_URL überein (${ziel}). Nichts gelesen, nichts gelöscht.`);
    return 1;
  }
  const prisma = new PrismaClient({ datasourceUrl: adressen.direct });
  try {
    const praxis = await prisma.practice.findUnique({ where: { id: aufruf.praxisId }, select: { id: true, name: true, isDemo: true } });
    if (!praxis) {
      console.error(`Keine Praxis mit der Kennung ${aufruf.praxisId} in ${ziel}.`);
      return 1;
    }
    const zeilen = await L.praxisZaehlen(prisma, praxis.id);
    const verweise = await L.fremdeVerweise(prisma, praxis.id);
    console.log(L.uebersichtText({ ziel, praxis, zeilen, verweise }));
    console.log("");
    if (verweise.length) {
      console.error("Abbruch: Nichts gelöscht.");
      return 1;
    }
    if (!aufruf.ausfuehren) {
      console.log(L.probelaufText(praxis, ziel));
      return 0;
    }
    if (aufruf.bestaetigen !== praxis.name) {
      console.error("Der Name hinter --bestaetigen stimmt nicht genau mit dem Namen der Praxis überein. Nichts gelöscht.");
      return 1;
    }
    // Name und fremde Verweise werden in der Transaktion noch einmal geprüft.
    const ergebnis = await L.praxisLoeschen(prisma, praxis.id, { name: aufruf.bestaetigen });
    console.log("Gelöscht. Text für die Bestätigung an die Praxis (Textform):");
    console.log("----------------------------------------------------------------");
    console.log(L.bestaetigungText(ergebnis, { sicherungTage: aufruf.sicherungTage! }));
    console.log("----------------------------------------------------------------");
    console.log("Vor dem Versand: Branches beim Datenbank-Anbieter und den E-Mail-Dienst prüfen und die Zeilen in eckigen");
    console.log("Klammern ausfüllen (docs/BETRIEB.md, Abschnitt 11).");
    return 0;
  } catch (e) {
    // Die Löschung läuft in einer Transaktion: Bricht sie ab, bleibt alles stehen. Der Probelauf zeigt den Stand.
    console.error(e instanceof L.LoeschAbbruch ? e.message : `Fehler: ${e instanceof Error ? e.message : String(e)}\nStand mit dem Probelauf prüfen.`);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
