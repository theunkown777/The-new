import { prisma } from "@/lib/prisma";
import { anlaesseLesen, istReserviert, kennungGueltig, patientAbgleich } from "@/lib/terminanfrage";
import { buchungsLage } from "@/lib/buchungLoad";

/** Praxis zur Kennung der öffentlichen Buchungsseite; nur wenn die Buchung für neue Patienten eingeschaltet ist. */
export async function praxisZurKennung(kennung: string) {
  if (!kennungGueltig(kennung)) return null;
  const praxis = await prisma.practice.findUnique({ where: { buchungKennung: kennung }, select: { id: true, name: true, isDemo: true, buchungAktiv: true, neupatientenBuchung: true, buchungAnlaesse: true } });
  if (!praxis || !praxis.neupatientenBuchung) return null;
  return { ...praxis, anlaesse: anlaesseLesen(praxis.buchungAnlaesse) };
}

/** Freie Zeiten für die öffentliche Seite. Ohne eingeschaltete Online-Termine gibt es keine. */
export async function oeffentlicheLage(practiceId: string) {
  const lage = await buchungsLage(practiceId);
  if (!lage) return null;
  return { lage, aktiv: lage.praxis.buchungAktiv && lage.praxis.neupatientenBuchung, minuten: lage.praxis.buchungMinuten, tage: lage.tage };
}

/** Patienten der Praxis, die nach Name und Geburtsdatum zur Anfrage passen (Abgleich nur hier, nie öffentlich). */
export async function kandidaten(practiceId: string, anfrage: { firstName: string; lastName: string; birthDate: Date }) {
  const tag = anfrage.birthDate;
  const gleich = await prisma.patient.findMany({
    where: { practiceId, ohneAkte: false, birthDate: { gte: tag, lt: new Date(tag.getTime() + 864e5) } },
    select: { id: true, firstName: true, lastName: true, birthDate: true, phone: true, email: true },
    take: 200,
  });
  return patientAbgleich(anfrage, gleich);
}

/** Offene Online-Anfragen neuer Patienten mit Vorschlägen aus dem Bestand, für die Karte auf /termine. */
export async function offeneAnfragen(practiceId: string, now = new Date()) {
  const anfragen = await prisma.terminanfrage.findMany({ where: { practiceId, status: "OFFEN" }, orderBy: [{ start: "asc" }, { createdAt: "asc" }], take: 50 });
  if (anfragen.length === 0) return [];
  const [standorte, termine] = await Promise.all([
    prisma.location.findMany({ where: { practiceId }, select: { rooms: true } }),
    prisma.appointment.findMany({
      where: { practiceId, status: { not: "ABGESAGT" }, start: { gte: new Date(Math.min(...anfragen.map((a) => a.start.getTime())) - 8 * 3600e3), lte: new Date(Math.max(...anfragen.map((a) => a.start.getTime())) + 8 * 3600e3) } },
      select: { start: true, minutes: true },
    }),
  ]);
  const plaetze = standorte.reduce((s, l) => s + l.rooms, 0) || 1;
  const out = [];
  for (const a of anfragen) {
    const von = a.start.getTime(), bis = von + a.minutes * 60000;
    const gleichzeitig = termine.filter((t) => t.start.getTime() < bis && t.start.getTime() + t.minutes * 60000 > von).length;
    out.push({
      ...a,
      kandidaten: await kandidaten(practiceId, a),
      reserviert: istReserviert(a, now),
      vergangen: a.start.getTime() <= now.getTime(),
      belegt: gleichzeitig >= plaetze,
    });
  }
  return out;
}
