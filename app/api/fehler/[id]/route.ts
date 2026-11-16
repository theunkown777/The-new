import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportTeam } from "@/lib/supportTeam";

// Ansicht /betrieb des Sorrida-Teams: Fehlereintrag als erledigt markieren oder wieder öffnen.
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!(await isSupportTeam(session?.user.id))) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const erledigt = body?.erledigt === true;
  const res = await prisma.fehlerEintrag.updateMany({ where: { id: params.id }, data: { erledigtAt: erledigt ? new Date() : null } });
  if (res.count === 0) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
