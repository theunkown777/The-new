import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  return NextResponse.json({ patient });
}

// Löschen (Art. 17 DSGVO) nur für Admins, nur mit Bestätigung durch den
// Nachnamen und nur, wenn keine Aufbewahrungspflicht entgegensteht
// (lib/retention.ts). Der Vorgang wird ohne Namen protokolliert.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { requireAdmin } = await import("@/lib/permissions");
  const { deletionCheck } = await import("@/lib/retention");
  const { auditFromSession } = await import("@/lib/audit");
  const { session, error } = await requireAdmin();
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    select: {
      id: true,
      lastName: true,
      reports: { select: { id: true, createdAt: true, treatmentDate: true } },
      proposals: { select: { id: true, createdAt: true } },
      anamnesisForms: { select: { createdAt: true } },
      invoices: { select: { createdAt: true } },
    },
  });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim().toLowerCase() !== patient.lastName.trim().toLowerCase()) {
    return NextResponse.json({ error: "Zur Bestätigung bitte den Nachnamen genau eingeben." }, { status: 400 });
  }

  const check = deletionCheck({
    reports: patient.reports.map((r) => (r.treatmentDate && r.treatmentDate > r.createdAt ? r.treatmentDate : r.createdAt)),
    proposals: patient.proposals.map((p) => p.createdAt),
    anamnesis: patient.anamnesisForms.map((a) => a.createdAt),
    invoices: patient.invoices.map((i) => i.createdAt),
  });
  if (!check.allowed) {
    return NextResponse.json(
      {
        error: `Löschen ist gesperrt: Zu diesem Patienten gibt es Dokumentation, die bis ${check.until.toLocaleDateString("de-DE")} aufzubewahren ist (§ 630f BGB, steuerliche Fristen). Sie können die Daten exportieren; Werbung und Erinnerungen stellen Sie getrennt ab.`,
        until: check.until,
      },
      { status: 409 }
    );
  }

  const reportIds = patient.reports.map((r) => r.id);
  const proposalIds = patient.proposals.map((p) => p.id);
  await prisma.$transaction([
    prisma.invoice.deleteMany({ where: { patientId: patient.id } }),
    prisma.treatmentProposal.deleteMany({ where: { id: { in: proposalIds } } }),
    prisma.reportServiceEntry.deleteMany({ where: { reportId: { in: reportIds } } }),
    prisma.reportRevision.deleteMany({ where: { reportId: { in: reportIds } } }),
    prisma.report.deleteMany({ where: { id: { in: reportIds } } }),
    prisma.anamnesisForm.deleteMany({ where: { patientId: patient.id } }),
    prisma.launchToken.deleteMany({ where: { patientId: patient.id } }),
    prisma.patient.delete({ where: { id: patient.id } }),
  ]);
  await auditFromSession(session, "patient.geloescht", {
    entityType: "Patient",
    entityId: patient.id,
    summary: check.reason === "leer" ? "ohne Dokumentation" : "Aufbewahrungsfrist abgelaufen",
  });
  return NextResponse.json({ ok: true });
}
