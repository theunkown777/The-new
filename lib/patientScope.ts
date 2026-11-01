import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Sitzung prüfen und sicherstellen, dass der Patient zur eigenen Praxis gehört (Mandantentrennung). */
export async function patientInPractice(patientId: string): Promise<
  { session: Session; patient: { id: string; firstName: string; lastName: string }; error: null } | { session: null; patient: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, patient: null, error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.user.practiceId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) return { session: null, patient: null, error: NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 }) };
  return { session, patient, error: null };
}
