import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = z.object({ require2faAll: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { require2faAll: parsed.data.require2faAll } });
  await auditFromSession(session, parsed.data.require2faAll ? "2fa.an" : "2fa.aus", { entityType: "Praxis", entityId: session.user.practiceId, summary: parsed.data.require2faAll ? "Pflicht für alle Konten" : "Pflicht nur für Admins" });
  return NextResponse.json({ ok: true });
}
