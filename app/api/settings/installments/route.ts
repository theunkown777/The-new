import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { installmentsSchema } from "@/lib/installments";

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const parsed = installmentsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { installments: parsed.data } });
  return NextResponse.json({ installments: parsed.data });
}
