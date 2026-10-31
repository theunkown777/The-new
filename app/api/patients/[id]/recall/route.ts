import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Vorsorge-Erinnerung als gesendet vermerken.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const res = await prisma.patient.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data: { recallSentAt: new Date() } });
  if (res.count === 0) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
