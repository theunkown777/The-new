import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { terminActionSchema } from "@/lib/termine";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = terminActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const { status, gesendet } = parsed.data;
  const now = new Date();
  const data = {
    ...(status ? { status } : {}),
    ...(gesendet === "bestaetigung" ? { confirmedAt: now } : {}),
    ...(gesendet === "erinnerung" ? { remindedAt: now } : {}),
  };
  const r = await prisma.appointment.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data });
  if (!r.count) return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const r = await prisma.appointment.deleteMany({ where: { id: params.id, practiceId: session.user.practiceId, status: { in: ["GEPLANT", "BESTAETIGT", "ABGESAGT"] } } });
  if (!r.count) return NextResponse.json({ error: "Nur geplante oder abgesagte Termine lassen sich löschen." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
