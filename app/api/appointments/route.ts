import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { terminSchema } from "@/lib/termine";
import { standortFuerNeu, standortRechtVon } from "@/lib/standortRechte";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = terminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  // Rechte je Standort: Wer Standorten zugeordnet ist, trägt Termine nur dort ein.
  const ort = standortFuerNeu(await standortRechtVon(session.user.id, practiceId), d.locationId);
  if (!ort.ok) return NextResponse.json({ error: ort.grund }, { status: 403 });
  const [patient, location] = await Promise.all([
    prisma.patient.findFirst({ where: { id: d.patientId, practiceId }, select: { id: true } }),
    ort.locationId ? prisma.location.findFirst({ where: { id: ort.locationId, practiceId }, select: { id: true } }) : null,
  ]);
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  if (ort.locationId && !location) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  const appointment = await prisma.appointment.create({
    data: { practiceId, patientId: patient.id, locationId: location?.id ?? null, start: new Date(d.start), minutes: d.minutes, reason: d.reason },
  });
  return NextResponse.json({ appointment }, { status: 201 });
}
