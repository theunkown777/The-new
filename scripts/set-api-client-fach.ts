// Setzt das Fach an einem bestehenden Partner-API-Schlüssel. Bewusst als Handgriff des Betreibers, nicht per
// Migration: Nur der Betreiber weiß, für welches Fach ein Partner Berichte erzeugt.
//
// Nutzung: npx tsx scripts/set-api-client-fach.ts <client-id> <fach|->
// fach (lib/specialties.ts, z. B. "zahn" oder "physio"); "-" entfernt das Fach wieder.
import { PrismaClient } from "@prisma/client";
import { SPECIALTY_IDS } from "../lib/specialties";

const prisma = new PrismaClient();

async function main() {
  const [id, wert] = process.argv.slice(2);
  if (!id || !wert) {
    console.error("Nutzung: npx tsx scripts/set-api-client-fach.ts <client-id> <fach|->");
    process.exit(1);
  }
  const fach = wert === "-" ? null : wert;
  if (fach && !(SPECIALTY_IDS as readonly string[]).includes(fach)) {
    console.error(`Unbekannte Fachrichtung: ${fach}. Erlaubt: ${SPECIALTY_IDS.join(", ")}`);
    process.exit(1);
  }
  const vorher = await prisma.apiClient.findUnique({ where: { id }, select: { name: true, fach: true } });
  if (!vorher) {
    console.error(`Kein API-Client mit der ID ${id}.`);
    process.exit(1);
  }
  await prisma.apiClient.update({ where: { id }, data: { fach } });
  console.log(`${vorher.name} (${id}): Fach ${vorher.fach ?? "ohne"} -> ${fach ?? "ohne"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
