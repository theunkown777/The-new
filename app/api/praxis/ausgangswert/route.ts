import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ausgangswertSchema } from "@/lib/wirkung";

// Ausgangswerte für den Wirkungsbericht speichern (Schätzung der Praxis vor dem Start, nur Praxisleitung).
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Praxisleitung kann das ändern." }, { status: 403 });
  const parsed = ausgangswertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte drei ganze Zahlen eingeben." }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { ausgangswert: { ...parsed.data, erfasstAm: new Date().toISOString() } } });
  return NextResponse.json({ ok: true });
}
