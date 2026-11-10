import { prisma } from "@/lib/prisma";
import { freieZeiten, sprechzeitenLesen, type FreieZeitenEingabe } from "@/lib/buchung";
import { kalenderFrischHalten } from "@/lib/kalenderSync";

/** Alles, was für die freien Zeiten einer Praxis gebraucht wird: Einstellungen, Termine, übertragene Belegung. */
export async function buchungsLage(practiceId: string, jetzt = new Date()) {
  const praxis = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { id: true, name: true, isDemo: true, buchungAktiv: true, sprechzeiten: true, buchungMinuten: true, buchungVorlaufStd: true, buchungTageVoraus: true, kalenderUrl: true, kalenderSyncAt: true, kalenderSyncFehler: true, locations: { select: { id: true, name: true, address: true, rooms: true } } },
  });
  if (!praxis) return null;
  if (praxis.buchungAktiv) await kalenderFrischHalten(praxis, jetzt);
  const bis = new Date(jetzt.getTime() + (praxis.buchungTageVoraus + 2) * 864e5);
  const [termine, belegungen] = await Promise.all([
    prisma.appointment.findMany({ where: { practiceId, status: { not: "ABGESAGT" }, start: { gte: new Date(jetzt.getTime() - 864e5), lte: bis } }, select: { start: true, minutes: true } }),
    prisma.kalenderBelegung.findMany({ where: { practiceId, ende: { gte: jetzt }, start: { lte: bis } }, select: { start: true, ende: true, ganztag: true } }),
  ]);
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
