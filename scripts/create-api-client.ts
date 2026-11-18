// Vergibt einen neuen Partner-API-Key. Es gibt (bewusst) noch keine
// Admin-Oberfläche dafür - Partnerintegrationen sind ein Vertriebsprozess,
// kein Self-Service, daher genügt ein CLI-Skript für den Betreiber.
//
// Nutzung: npx tsx scripts/create-api-client.ts "Partnername GmbH" [fach]
// fach (lib/specialties.ts, z. B. "ortho"): gilt für Berichte, wenn ein Aufruf kein fach mitschickt.
import { PrismaClient } from "@prisma/client";
import { generateApiKey, hashApiKey, apiKeyPrefix } from "../lib/apiAuth";
import { SPECIALTY_IDS } from "../lib/specialties";

const prisma = new PrismaClient();

async function main() {
  const name = process.argv[2];
  const fach = process.argv[3] ?? null;
  if (!name) {
    console.error('Nutzung: npx tsx scripts/create-api-client.ts "Partnername GmbH" [fach]');
    process.exit(1);
  }
  if (fach && !(SPECIALTY_IDS as readonly string[]).includes(fach)) {
    console.error(`Unbekannte Fachrichtung: ${fach}. Erlaubt: ${SPECIALTY_IDS.join(", ")}`);
    process.exit(1);
  }

  const key = generateApiKey();
  const client = await prisma.apiClient.create({
    data: {
      name,
      apiKeyHash: hashApiKey(key),
      apiKeyPrefix: apiKeyPrefix(key),
      fach,
    },
  });

  console.log(`API-Client angelegt: ${client.name} (${client.id})${client.fach ? `, Fach ${client.fach}` : ", ohne Fach"}`);
  console.log("");
  console.log("API-Key (wird nur jetzt einmal angezeigt, sicher übermitteln):");
  console.log(key);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
