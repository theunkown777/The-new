import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

const schema = z.object({ behandlerId: z.string().max(40).nullable() });

/** Stammbehandler/in setzen oder entfernen; nur Konten derselben Praxis. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const id = parsed.data.behandlerId;
  if (id) {
    const u = await prisma.user.findFirst({ where: { id, practiceId: session.user.practiceId }, select: { id: true } });
    if (!u) return NextResponse.json({ error: "Dieses Konto gehört nicht zu Ihrer Praxis." }, { status: 400 });
  }
  await prisma.patient.update({ where: { id: patient.id }, data: { behandlerId: id } });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: id ? "Stammbehandlung zugeordnet" : "Stammbehandlung entfernt" });
  return NextResponse.json({ ok: true });
}
