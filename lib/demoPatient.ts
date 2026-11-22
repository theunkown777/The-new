import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { invoiceNumber } from "@/lib/invoices";
import { gebuehrenwerkeFuer } from "@/lib/abrechnungsarten";
import { abschlussWort } from "@/lib/fachprofile";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Titel der beiden Beispielrechnungen je Fach: Zahnmedizin mit Zahnleistungen, Fächer mit GOÄ mit GOÄ, alle anderen
 * neutral (keine GOÄ bei Apotheke, Pflegedienst, Hebamme oder Heilmitteln). Die offene Rechnung trägt „(frühere …“,
 * daran erkennt preparePatientDemo eine schon vorbereitete Demo.
 */
export function demoRechnungen(fach: string | null | undefined): { offen: string; bezahlt: string } {
  if (fach === "zahn") return { offen: "Mehrkosten Füllung (frühere Behandlung)", bezahlt: "Professionelle Zahnreinigung" };
  if (gebuehrenwerkeFuer(fach).includes("GOAE")) return { offen: "Privatleistung nach GOÄ (frühere Behandlung)", bezahlt: "Vorsorgeuntersuchung (Privatleistung)" };
  return { offen: "Selbstzahlerleistung (früherer Termin)", bezahlt: `${abschlussWort(fach)} (Privatleistung)` };
}

// Patientenansicht der Demo: Wählt in einer frischen Demo-Praxis einen
// Beispielpatienten, gibt ihm einen offenen Vorschlag, eine offene und eine
// bezahlte Rechnung sowie einen Anamnesebogen und liefert nur den
// Portal-Link. Wer so einsteigt, bekommt keinen Zugang zur Praxis.
export async function preparePatientDemo(practiceId: string, now = new Date()): Promise<string> {
  // Schon vorbereitet? Dann nur einen neuen Link ausgeben, nichts doppelt anlegen.
  // Erkennbar an der vorbereiteten Beispielrechnung "(frühere Behandlung)" bzw. "(früherer Termin)" (demoRechnungen).
  const ready = await prisma.patient.findFirst({ where: { practiceId, invoices: { some: { title: { contains: "(frühere" } } } }, select: { id: true } });
  if (ready) {
    const { raw, hash } = generateToken();
    await prisma.patient.update({ where: { id: ready.id }, data: { portalTokenHash: hash, portalExpiresAt: new Date(now.getTime() + DAY) } });
    return raw;
  }
  const patient =
    (await prisma.patient.findFirst({
      where: { practiceId, NOT: { notes: { startsWith: "Beispielpatient im Gastzugang" } }, proposals: { some: {} } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.patient.findFirstOrThrow({ where: { practiceId, proposals: { some: {} } }, select: { id: true } }));

  const proposals = await prisma.treatmentProposal.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, eigenanteilCent: true } });
  const open = proposals.find((p) => p.status === "ENTWURF" || p.status === "BESPROCHEN") ?? proposals[0];
  await prisma.treatmentProposal.update({
    where: { id: open.id },
    data: { status: "BESPROCHEN", shareCreatedAt: new Date(now.getTime() - 2 * 3600 * 1000), patientResponse: null, patientRespondedAt: null, patientViewedAt: null },
  });

  const practice = await prisma.practice.findUniqueOrThrow({ where: { id: practiceId }, select: { specialty: true } });
  const titel = demoRechnungen(practice.specialty);
  const year = now.getFullYear();
  const used = await prisma.invoice.count({ where: { practiceId } });
  await prisma.invoice.createMany({
    data: [
      { practiceId, patientId: patient.id, number: invoiceNumber(year, used + 1), title: titel.offen, amountCent: 18640, dueDate: new Date(now.getTime() + 12 * DAY), createdAt: new Date(now.getTime() - 2 * DAY) },
      { practiceId, patientId: patient.id, number: invoiceNumber(year, used + 2), title: titel.bezahlt, amountCent: 11000, dueDate: new Date(now.getTime() - 40 * DAY), status: "BEZAHLT", paidAt: new Date(now.getTime() - 45 * DAY), createdAt: new Date(now.getTime() - 54 * DAY) },
    ],
  });
  await prisma.anamnesisForm.create({
    data: { practiceId, patientId: patient.id, tokenHash: crypto.randomBytes(32).toString("hex"), expiresAt: new Date(now.getTime() + 14 * DAY), fach: practice.specialty },
  });

  const { raw, hash } = generateToken();
  await prisma.patient.update({ where: { id: patient.id }, data: { portalTokenHash: hash, portalExpiresAt: new Date(now.getTime() + DAY) } });
  return raw;
}
