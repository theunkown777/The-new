import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { terminSchema } from "@/lib/termine";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = terminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  const [patient, location] = await Promise.all([
    prisma.patient.findFirst({ where: { id: d.patientId, practiceId }, select: { id: true } }),
    d.locationId ? prisma.location.findFirst({ where: { id: d.locationId, practiceId }, select: { id: true } }) : null,
  ]);
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  if (d.locationId && !location) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  const appointment = await prisma.appointment.create({
    data: { practiceId, patientId: patient.id, locationId: location?.id ?? null, start: new Date(d.start), minutes: d.minutes, reason: d.reason },
  });
  return NextResponse.json({ appointment }, { status: 201 });
}
