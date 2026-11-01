import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrySchema } from "@/lib/akte";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = entrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const entry = await prisma.patientEntry.create({
    data: {
      practiceId: session.user.practiceId,
      patientId: patient.id,
      art: d.art,
      text: d.text,
      code: d.code || null,
      datum: d.datum ? new Date(d.datum) : null,
      createdById: session.user.id,
      createdBy: session.user.name ?? null,
    },
  });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `${d.art} angelegt` });
  return NextResponse.json({ entry }, { status: 201 });
}
