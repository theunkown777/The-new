import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { kiHilfenStand } from "@/lib/kiHilfen";

// Schalter „KI-Hilfen“ der Praxis. Lesen darf jedes Teammitglied (die Oberfläche fragt, ob sie die
// KI-Knöpfe zeigen soll), ändern nur die Praxisleitung. Jede Änderung steht im Protokoll.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { kiHilfen: true } });
  return NextResponse.json(kiHilfenStand(practice?.kiHilfen), { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({ ein: z.boolean() });

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Praxisleitung kann das ändern." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { kiHilfen: parsed.data.ein } });
  await auditFromSession(session, "ki.schalter", { entityType: "Praxis", entityId: session.user.practiceId, summary: parsed.data.ein ? "eingeschaltet" : "ausgeschaltet" });
  return NextResponse.json({ ok: true, ...kiHilfenStand(parsed.data.ein) });
}
