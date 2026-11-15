import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Eintrag von der Warteliste nehmen (bleibt als erledigt stehen und wird später aufgeräumt).
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const r = await prisma.warteliste.updateMany({ where: { id: params.id, practiceId: session.user.practiceId, erledigtAt: null }, data: { erledigtAt: new Date() } });
  if (!r.count) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
