import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { resolvePrices } from "@/lib/proposals";
import { priceOverridesSchema } from "@/lib/proposalSchema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const practice = await prisma.practice.findUnique({
    where: { id: session.user.practiceId },
    select: { proposalPrices: true },
  });
  return NextResponse.json({ prices: resolvePrices(practice?.proposalPrices) });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json();
  const parsed = priceOverridesSchema.safeParse(body?.prices);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  await prisma.practice.update({
    where: { id: session.user.practiceId },
    data: { proposalPrices: parsed.data },
  });
  return NextResponse.json({ prices: parsed.data });
}
