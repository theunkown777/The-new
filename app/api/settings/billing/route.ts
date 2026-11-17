import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const practice = await prisma.practice.findUnique({
    where: { id: session.user.practiceId },
    select: { gozPunktwertCent: true, bemaPunktwertCent: true },
  });

  return NextResponse.json({ practice });
}

const updateSchema = z.object({
  gozPunktwertCent: z.number().min(0).max(100).optional().nullable(),
  bemaPunktwertCent: z.number().min(0).max(100).optional().nullable(),
});

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const practice = await prisma.practice.update({
    where: { id: session.user.practiceId },
    data: parsed.data,
    select: { gozPunktwertCent: true, bemaPunktwertCent: true },
  });

  return NextResponse.json({ practice });
}
