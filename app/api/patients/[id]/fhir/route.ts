import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { fhirBundle } from "@/lib/fhir";
import { websiteBasis } from "@/lib/betreiber";

// Export der Akte eines Patienten als FHIR-R4-Bundle (lib/fhir.ts), damit andere Programme die Daten lesen können.
// Wie die Auskunft (…/export): nur für die Praxisleitung, nur Patienten der eigenen Praxis, jeder Abruf steht im
// Protokoll (ohne Inhalte). Dokumente erscheinen nur mit Metadaten; die Dateien selbst werden hier nicht geladen.
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, error } = await requireAdmin();
  if (error) return error;
  const patient = await prisma.patient.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    select: {
      id: true, firstName: true, lastName: true, birthDate: true, geschlecht: true, email: true, phone: true,
      insuranceType: true, insuranceName: true, insuranceNumber: true, patientNummer: true, ohneAkte: true,
      entries: { select: { id: true, art: true, text: true, code: true, datum: true, inaktiv: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      appointments: { select: { id: true, start: true, minutes: true, reason: true, status: true, location: { select: { name: true } } }, orderBy: { start: "asc" } },
      documents: { select: { id: true, name: true, mime: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      invoices: { select: { id: true, number: true, title: true, amountCent: true, dueDate: true, status: true, paidAt: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  const { entries, appointments, documents, invoices, ...stamm } = patient;
  const bundle = fhirBundle({ basis: `${websiteBasis()}/fhir`, erstelltAm: new Date(), patient: stamm, entries, appointments, documents, invoices });
  await auditFromSession(session, "patient.export", { entityType: "Patient", entityId: patient.id, summary: "FHIR-Format" });
  const datei = `akte-fhir-${patient.lastName}-${patient.firstName}`.toLowerCase().replace(/[^a-z0-9äöüß-]+/g, "-");
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/fhir+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(datei)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
