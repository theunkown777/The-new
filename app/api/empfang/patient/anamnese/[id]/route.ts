import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { anamnesisSchema } from "@/lib/anamnesis";
import { uebergabeFuer } from "@/lib/empfangServer";
import { eingangMelden } from "@/lib/eingang";

// Anamnesebogen am Empfangs-Tablet absenden. Zugang nur mit gültigem Übergabe-Token für genau
// diesen Patienten und den Schritt „Anamnese“. Danach ist der Bogen gesperrt (wie im Patientenportal).
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const a = await uebergabeFuer("anamnese");
  if (!a) return NextResponse.json({ error: "Die Zeit am Tablet ist abgelaufen. Bitte geben Sie das Tablet am Empfang zurück." }, { status: 401 });
  if (!(await consumeAttempt(`empfang-patient:${a.patient.id}`, 30, 3600e3))) return NextResponse.json({ error: "Zu viele Anfragen. Bitte wenden Sie sich an den Empfang." }, { status: 429 });
  const parsed = anamnesisSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  const res = await prisma.anamnesisForm.updateMany({
    where: { id: params.id, patientId: a.patient.id, practiceId: a.patient.practiceId, submittedAt: null, expiresAt: { gt: new Date() } },
    data: { answers: parsed.data as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null },
  });
  if (res.count === 0) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  await eingangMelden({ practiceId: a.patient.practiceId, patientId: a.patient.id, art: "ANAMNESE", entityId: params.id, hinweis: "am Empfangs-Tablet ausgefüllt" });
  return NextResponse.json({ ok: true });
}
