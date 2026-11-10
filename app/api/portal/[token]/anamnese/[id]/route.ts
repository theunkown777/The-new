import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { anamnesisSchema } from "@/lib/anamnesis";
import { portalPatient } from "@/lib/portalAuth";
import { eingangMelden } from "@/lib/eingang";

// Anamnesebogen aus dem Patientenportal absenden. Danach ist er gesperrt.
export async function POST(req: Request, { params }: { params: { token: string; id: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const parsed = anamnesisSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  const res = await prisma.anamnesisForm.updateMany({
    where: { id: params.id, patientId: patient.id, submittedAt: null, expiresAt: { gt: new Date() } },
    data: { answers: parsed.data as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null },
  });
  if (res.count === 0) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "ANAMNESE", entityId: params.id });
  return NextResponse.json({ ok: true });
}
