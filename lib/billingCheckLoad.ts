import { prisma } from "@/lib/prisma";
import { billingCheck } from "@/lib/billingCheck";
import { isDental } from "@/lib/specialties";

/** Lädt die Daten der letzten zwölf Monate und prüft sie. */
export async function loadBillingCheck(practiceId: string, now = new Date()) {
  const seit = new Date(now.getTime() - 400 * 864e5);
  const [appointments, reports, proposals, invoices, catalog] = await Promise.all([
    prisma.appointment.findMany({ where: { practiceId, start: { gte: seit, lt: now } }, select: { id: true, patientId: true, start: true, status: true, reason: true } }),
    prisma.report.findMany({
      where: { practiceId, createdAt: { gte: seit } },
      select: { id: true, patientId: true, createdAt: true, treatmentDate: true, serviceEntries: { select: { catalogItemId: true, performed: true, faktor: true, begruendung: true, quantity: true } } },
    }),
    prisma.treatmentProposal.findMany({ where: { practiceId, status: "ANGENOMMEN", updatedAt: { gte: seit } }, select: { id: true, patientId: true, status: true, eigenanteilCent: true, updatedAt: true } }),
    prisma.invoice.findMany({ where: { practiceId, proposalId: { not: null }, status: { not: "STORNIERT" } }, select: { proposalId: true } }),
    prisma.serviceCatalogItem.findMany({
      where: { OR: [{ practiceId: null }, { practiceId }] },
      select: { id: true, code: true, title: true, faktorMin: true, faktorMax: true, regelhoechstfaktor: true, begruendungspflichtAbFaktor: true, ausschlussMit: true, frequenzlimitAnzahl: true, frequenzlimitZeitraumTage: true },
    }),
  ]);
  // „Termin ohne Dokumentation“ nur dort, wo Sorrida die Dokumentation führt
  // (Zahnmedizin mit Berichten). Arztpraxen dokumentieren im PVS.
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } });
  if (!isDental(practice?.specialty)) appointments.length = 0;
  const ids = new Set([...appointments.map((a) => a.patientId), ...reports.map((r) => r.patientId), ...proposals.map((p) => p.patientId)]);
  const patients = await prisma.patient.findMany({ where: { practiceId, id: { in: [...ids] } }, select: { id: true, firstName: true, lastName: true } });
  const invoiced = new Set(invoices.map((i) => i.proposalId));
  return billingCheck({
    now,
    appointments,
    reports: reports.map((r) => ({ ...r, entries: r.serviceEntries })),
    proposals: proposals.map((p) => ({ ...p, invoiced: invoiced.has(p.id) })),
    catalog: new Map(catalog.map((c) => [c.id, c])),
    patientName: new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`])),
  });
}
