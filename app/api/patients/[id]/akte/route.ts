import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";

// Aus einem Schnellvorschlag (nur Kürzel) eine Akte machen: Name und auf Wunsch Geburtsdatum eintragen.
const schema = z.object({
  firstName: z.string().trim().min(1, "Bitte den Vornamen eingeben").max(80),
  lastName: z.string().trim().min(1, "Bitte den Nachnamen eingeben").max(80),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const patient = await prisma.patient.findFirst({ where: { id: params.id, practiceId: session.user.practiceId, ohneAkte: true }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Kein Schnellvorschlag ohne Akte gefunden" }, { status: 404 });
  const geb = parsed.data.geburtsdatum ? new Date(`${parsed.data.geburtsdatum}T12:00:00Z`) : null;
  if (geb && (Number.isNaN(geb.getTime()) || geb > new Date() || geb.getUTCFullYear() < 1900)) return NextResponse.json({ error: "Bitte ein gültiges Geburtsdatum eingeben" }, { status: 400 });
  await prisma.patient.update({ where: { id: patient.id }, data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, ohneAkte: false, ...(geb ? { birthDate: geb } : {}) } });
  await auditFromSession(session, "patient.akte", { entityType: "Patient", entityId: patient.id, summary: "aus Schnellvorschlag angelegt" });
  return NextResponse.json({ ok: true });
}
