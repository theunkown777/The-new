import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { preparePatientDemo } from "@/lib/demoPatient";

// Gastzugang: Die Praxis erzeugt den Portal-Link eines Beispielpatienten und
// öffnet damit die Patientenansicht, genau wie im echten Betrieb. Einen
// eigenen Patienten-Einstieg ohne Link der Praxis gibt es nicht.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { isDemo: true } });
  if (!practice?.isDemo) return NextResponse.json({ error: "Nur im Gastzugang" }, { status: 403 });
  const token = await preparePatientDemo(session.user.practiceId);
  return NextResponse.json({ url: `/portal/${token}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
