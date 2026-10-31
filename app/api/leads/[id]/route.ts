import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportTeam } from "@/lib/supportTeam";

// Postfach des Sorrida-Teams: Anfrage als erledigt markieren oder wieder öffnen.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!(await isSupportTeam(session?.user.id))) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const done = body?.done === true;
  const res = await prisma.lead.updateMany({ where: { id: params.id }, data: { handledAt: done ? new Date() : null } });
  if (res.count === 0) return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
