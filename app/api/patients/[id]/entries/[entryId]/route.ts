import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

// Einträge werden nicht gelöscht, sondern als „nicht mehr aktuell“ markiert,
// damit die Historie der Akte erhalten bleibt (Dokumentationspflicht).
export async function PATCH(req: Request, { params }: { params: { id: string; entryId: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = z.object({ inaktiv: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const r = await prisma.patientEntry.updateMany({ where: { id: params.entryId, patientId: patient.id, practiceId: session.user.practiceId }, data: { inaktiv: parsed.data.inaktiv } });
  if (!r.count) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: parsed.data.inaktiv ? "als nicht mehr aktuell markiert" : "wieder aktuell" });
  return NextResponse.json({ ok: true });
}
