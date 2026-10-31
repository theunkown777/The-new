import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { bankSchema, normalizeIban } from "@/lib/invoices";

// Bankverbindung der Praxis für den GiroCode im Patientenportal.
export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;
  const parsed = bankSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({
    where: { id: session.user.practiceId },
    data: { accountHolder: parsed.data.accountHolder, iban: normalizeIban(parsed.data.iban), bic: parsed.data.bic || null },
  });
  return NextResponse.json({ ok: true });
}
