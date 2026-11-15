import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { stammdatenSchema } from "@/lib/praxisStammdaten";
import { auditFromSession } from "@/lib/audit";

// Angaben der Praxis für ihre Patienten (Anschrift, Telefon, Kammer, Impressum, Datenschutzhinweise).
// Sie stehen im Fuß von Patientenportal, Patienten-Link, Anamnesebogen und Patienten-E-Mails.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = stammdatenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { stammdaten: parsed.data } });
  await auditFromSession(session, "praxis.stammdaten", { entityType: "Praxis", entityId: session.user.practiceId });
  return NextResponse.json({ ok: true });
}
