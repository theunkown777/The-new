import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";

// Auskunft und Datenübertragbarkeit (Art. 15 und 20 DSGVO): alle zu einem
// Patienten gespeicherten Daten als maschinenlesbare JSON-Datei. Nur für
// Admins, jeder Abruf wird protokolliert. Interne Kennungen von Portal-
// Zugängen (Token-Hashes) gehören nicht in die Auskunft.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const patient = await prisma.patient.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: {
      reports: { include: { serviceEntries: true, revisions: { select: { text: true, createdAt: true } } } },
      proposals: true,
      anamnesisForms: true,
      invoices: true,
    },
  });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  const { portalTokenHash: _p, ...rest } = patient;
  const strip = <T extends Record<string, unknown>>(o: T) => {
    const c: Record<string, unknown> = { ...o };
    for (const k of Object.keys(c)) if (/tokenhash/i.test(k)) delete c[k];
    return c;
  };
  const data = {
    hinweis:
      "Auskunft nach Art. 15 DSGVO aus Sorrida. Enthält die in Sorrida gespeicherten Daten, nicht die Daten Ihrer Praxissoftware.",
    erstelltAm: new Date().toISOString(),
    praxis: session.user.practiceName,
    patient: { ...rest, anamnesisForms: patient.anamnesisForms.map((f) => strip(f as unknown as Record<string, unknown>)), proposals: patient.proposals.map((p) => strip(p as unknown as Record<string, unknown>)) },
  };
  await auditFromSession(session, "patient.export", { entityType: "Patient", entityId: patient.id });
  const datei = `auskunft-${patient.lastName}-${patient.firstName}`.toLowerCase().replace(/[^a-z0-9äöüß-]+/g, "-");
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(datei)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
