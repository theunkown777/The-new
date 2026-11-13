import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ an: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben").max(200), aktiv: z.boolean() });

// Morgen-Mail der Praxis ein- oder ausschalten (nur Praxisleitung).
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Praxisleitung kann das ändern." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { morgenMail: parsed.data.aktiv, morgenMailAn: parsed.data.an } });
  return NextResponse.json({ ok: true });
}
