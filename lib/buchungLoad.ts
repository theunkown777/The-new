import { prisma } from "@/lib/prisma";
import { freieZeiten, sprechzeitenLesen, type FreieZeitenEingabe } from "@/lib/buchung";
import { kalenderFrischHalten } from "@/lib/kalenderSync";
import { reservierungen } from "@/lib/terminanfrage";

/**
 * Alles, was für die freien Zeiten einer Praxis gebraucht wird: Einstellungen, Termine, übertragene Belegung.
 * Online-Anfragen neuer Patienten belegen ihre Zeit, solange sie reserviert ist (24 Stunden, lib/terminanfrage.ts).
 * `ohneAnfrage`: diese eine Anfrage nicht mitzählen (beim Bestätigen in der Praxis).
 */
export async function buchungsLage(practiceId: string, jetzt = new Date(), ohneAnfrage?: string) {
  const praxis = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { id: true, name: true, isDemo: true, buchungAktiv: true, sprechzeiten: true, buchungMinuten: true, buchungVorlaufStd: true, buchungTageVoraus: true, kalenderUrl: true, kalenderSyncAt: true, kalenderSyncFehler: true, neupatientenBuchung: true, buchungKennung: true, buchungAnlaesse: true, locations: { select: { id: true, name: true, address: true, rooms: true } } },
  });
  if (!praxis) return null;
  if (praxis.buchungAktiv) await kalenderFrischHalten(praxis, jetzt);
  const bis = new Date(jetzt.getTime() + (praxis.buchungTageVoraus + 2) * 864e5);
  const [eingetragen, belegungen, anfragen] = await Promise.all([
    prisma.appointment.findMany({ where: { practiceId, status: { not: "ABGESAGT" }, start: { gte: new Date(jetzt.getTime() - 864e5), lte: bis } }, select: { start: true, minutes: true } }),
    prisma.kalenderBelegung.findMany({ where: { practiceId, ende: { gte: jetzt }, start: { lte: bis } }, select: { start: true, ende: true, ganztag: true } }),
    prisma.terminanfrage.findMany({ where: { practiceId, status: "OFFEN", reserviertBis: { gt: jetzt }, start: { gte: new Date(jetzt.getTime() - 864e5), lte: bis }, ...(ohneAnfrage ? { id: { not: ohneAnfrage } } : {}) }, select: { start: true, minutes: true, status: true, reserviertBis: true } }),
  ]);
  const termine = [...eingetragen, ...reservierungen(anfragen, jetzt)];
  const eingabe: FreieZeitenEingabe = {
    sprechzeiten: sprechzeitenLesen(praxis.sprechzeiten),
    minuten: praxis.buchungMinuten,
    vorlaufStd: praxis.buchungVorlaufStd,
    tageVoraus: praxis.buchungTageVoraus,
    // Behandlungsplätze aller Standorte; ohne Standort ein Platz
    plaetze: praxis.locations.reduce((a, l) => a + l.rooms, 0) || 1,
    termine, belegungen, jetzt,
  };
  return { praxis, eingabe, tage: praxis.buchungAktiv ? freieZeiten(eingabe) : [] };
}
