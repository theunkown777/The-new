import { prisma } from "@/lib/prisma";
import { auslastung, ausfallquote, heuteTag, tagesGrenzen } from "@/lib/termine";
import { sichtbareStandorte, terminFilter, type StandortRecht } from "@/lib/standortRechte";

/**
 * Kennzahlen für heute und morgen (Dashboard, Praxismanager).
 * `recht`: Standort-Recht des angemeldeten Kontos (lib/standortRechte.ts, standortRechtVon);
 * null = alle Standorte. Mit Einschränkung zählen nur Termine und Plätze der eigenen Standorte.
 */
export async function loadTermineHeute(practiceId: string, now = new Date(), recht: StandortRecht = null) {
  const ort = terminFilter(recht);
  const heute = tagesGrenzen(heuteTag(now));
  const morgen = { von: heute.bis, bis: new Date(heute.bis.getTime() + 864e5) };
  const [heuteListe, morgenListe, letzte, standorte] = await Promise.all([
    prisma.appointment.findMany({
      where: { practiceId, ...ort, start: { gte: heute.von, lt: heute.bis } },
      orderBy: { start: "asc" },
      select: { id: true, start: true, minutes: true, status: true, locationId: true, reason: true, patient: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.appointment.findMany({ where: { practiceId, ...ort, start: { gte: morgen.von, lt: morgen.bis } }, select: { status: true, confirmedAt: true } }),
    prisma.appointment.findMany({ where: { practiceId, ...ort, start: { gte: new Date(now.getTime() - 60 * 864e5), lt: now } }, select: { status: true } }),
    prisma.location.findMany({ where: { practiceId }, select: { id: true, rooms: true, minutesPerDay: true } }).then((l) => sichtbareStandorte(recht, l)),
  ]);
  const a = auslastung(heuteListe, standorte);
  return {
    liste: heuteListe.filter((t) => t.status !== "ABGESAGT"),
    heute: heuteListe.filter((t) => t.status !== "ABGESAGT").length,
    auslastungHeute: a.prozent,
    kapazitaetAngenommen: a.angenommen,
    morgenUnbestaetigt: morgenListe.filter((t) => t.status === "GEPLANT" && !t.confirmedAt).length,
    ausfallquote: ausfallquote(letzte),
  };
}
