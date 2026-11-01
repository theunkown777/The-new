import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { standortSchema } from "@/lib/termine";
import { auditFromSession } from "@/lib/audit";

export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = standortSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const location = await prisma.location.create({ data: { practiceId: session.user.practiceId, ...parsed.data, address: parsed.data.address || null } });
  await auditFromSession(session, "standort", { entityType: "Standort", entityId: location.id, summary: "angelegt" });
  return NextResponse.json({ location }, { status: 201 });
}
