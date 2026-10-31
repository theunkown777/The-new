import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { specialtySettingsSchema } from "@/lib/practiceMed";

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;
  const parsed = specialtySettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }
  const ids = parsed.data.customOffers.map((c) => c.id);
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Doppelte Leistung" }, { status: 400 });
  await prisma.practice.update({
    where: { id: session.user.practiceId },
    data: { specialty: parsed.data.specialty, medPrices: parsed.data.medPrices, customOffers: parsed.data.customOffers },
  });
  return NextResponse.json({ ok: true });
}
