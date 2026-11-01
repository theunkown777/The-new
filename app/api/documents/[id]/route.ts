import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const doc = await prisma.patientDocument.findFirst({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!doc) return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "akte.dokument.abruf", { entityType: "Patient", entityId: doc.patientId });
  return new NextResponse(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    },
  });
}

// Löschen nur durch Admins: Dokumente gehören zur Behandlungsdokumentation.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const doc = await prisma.patientDocument.findFirst({ where: { id: params.id, practiceId: session.user.practiceId }, select: { id: true, patientId: true } });
  if (!doc) return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  await prisma.patientDocument.delete({ where: { id: doc.id } });
  await auditFromSession(session, "akte.dokument", { entityType: "Patient", entityId: doc.patientId, summary: "gelöscht" });
  return NextResponse.json({ ok: true });
}
