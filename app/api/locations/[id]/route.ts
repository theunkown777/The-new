import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { standortSchema } from "@/lib/termine";
import { auditFromSession } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = standortSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const r = await prisma.location.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data: { ...parsed.data, address: parsed.data.address || null } });
  if (!r.count) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "standort", { entityType: "Standort", entityId: params.id, summary: "geändert" });
  return NextResponse.json({ ok: true });
}

// Termine des Standorts bleiben erhalten und verlieren nur die Zuordnung.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const r = await prisma.location.deleteMany({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!r.count) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "standort", { entityType: "Standort", entityId: params.id, summary: "entfernt" });
  return NextResponse.json({ ok: true });
}
