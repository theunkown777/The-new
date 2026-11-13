import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Diktat-Einstellung der Praxis. Lesen darf jedes Teammitglied (der Diktierknopf fragt sie ab),
// ändern nur die Praxisleitung.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { diktatCloud: true } });
  return NextResponse.json({ cloud: practice?.diktatCloud ?? false }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({ cloud: z.boolean() });

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Praxisleitung kann das ändern." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { diktatCloud: parsed.data.cloud } });
  return NextResponse.json({ ok: true, cloud: parsed.data.cloud });
}
