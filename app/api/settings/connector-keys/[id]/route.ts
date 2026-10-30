import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const key = await prisma.connectorKey.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!key) return NextResponse.json({ error: "Schlüssel nicht gefunden" }, { status: 404 });

  await prisma.connectorKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
