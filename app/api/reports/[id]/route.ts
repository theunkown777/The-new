import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { approvalUpdate } from "@/lib/reportApproval";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: { patient: true, author: { select: { name: true } } },
  });
  if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  return NextResponse.json({ report });
}

const updateSchema = z.object({
  editedText: z.string().min(1).optional(),
  status: z.enum(["ENTWURF", "FINAL"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const existing = await prisma.report.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!existing) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  // Vor dem Überschreiben den bisherigen Text als Revision sichern, damit
  // Bearbeitungen an der Gesundheitsdokumentation nachvollziehbar bleiben.
  const previousText = existing.editedText ?? existing.generatedText;
  const textChanging =
    parsed.data.editedText !== undefined && parsed.data.editedText !== previousText;

  if (textChanging && previousText) {
    await prisma.reportRevision.create({
      data: {
        reportId: existing.id,
        text: previousText,
        editedById: session.user.id,
      },
    });
  }

  // Freigabe: wer und wann. Eine spätere Textänderung macht aus dem
  // freigegebenen Bericht wieder einen Entwurf, damit nie ein ungeprüfter
  // Text als freigegeben gilt.
  const approval = approvalUpdate({
    previousStatus: existing.status,
    requestedStatus: parsed.data.status,
    textChanging,
    user: { id: session.user.id, name: session.user.name ?? "Unbekannt" },
  });
  const report = await prisma.report.update({
    where: { id: params.id },
    data: { ...parsed.data, ...approval.data },
  });
  if (approval.event) {
    await auditFromSession(session, approval.event, { entityType: "Bericht", entityId: report.id });
  }

  return NextResponse.json({ report });
}
