import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kontaktSchema } from "@/lib/kontakt";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = kontaktSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const alt = await prisma.patient.findUnique({ where: { id: patient.id }, select: { contactConsentAt: true } });
  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      email: d.email || null,
      phone: d.phone || null,
      // Zeitpunkt der Einwilligung bleibt, solange sie besteht; Widerruf löscht ihn.
      contactConsentAt: d.einwilligung ? alt?.contactConsentAt ?? new Date() : null,
    },
  });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `Kontaktdaten geändert, Einwilligung ${d.einwilligung ? "erteilt" : "nicht erteilt"}` });
  return NextResponse.json({ ok: true });
}
