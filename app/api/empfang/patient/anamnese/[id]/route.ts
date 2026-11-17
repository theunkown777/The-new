import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { anamnesePruefen, anamneseProfilFuer } from "@/lib/anamnesis";
import { uebergabeFuer } from "@/lib/empfangServer";
import { eingangMelden } from "@/lib/eingang";

// Anamnesebogen am Empfangs-Tablet absenden. Zugang nur mit gültigem Übergabe-Token für genau
// diesen Patienten und den Schritt „Anamnese“. Danach ist der Bogen gesperrt (wie im Patientenportal).
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const a = await uebergabeFuer("anamnese");
  if (!a) return NextResponse.json({ error: "Die Zeit am Tablet ist abgelaufen. Bitte geben Sie das Tablet am Empfang zurück." }, { status: 401 });
  if (!(await consumeAttempt(`empfang-patient:${a.patient.id}`, 30, 3600e3))) return NextResponse.json({ error: "Zu viele Anfragen. Bitte wenden Sie sich an den Empfang." }, { status: 429 });
  const offen = { id: params.id, patientId: a.patient.id, practiceId: a.patient.practiceId, submittedAt: null, expiresAt: { gt: new Date() } };
  const form = await prisma.anamnesisForm.findFirst({ where: offen, select: { fach: true } });
  if (!form) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  // Geprüft wird gegen den Bogen des Fachs, der angezeigt wurde (lib/anamneseProfile.ts); fremde Fragen werden abgelehnt.
  const profil = anamneseProfilFuer(form.fach, a.patient.practice.specialty, a.patient);
  const geprueft = anamnesePruefen(await req.json().catch(() => null), profil, { altbestand: !form.fach });
  if (!geprueft.ok) return NextResponse.json({ error: geprueft.fehler }, { status: 400 });
  const res = await prisma.anamnesisForm.updateMany({
    where: offen,
    data: { answers: geprueft.daten as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null, fach: form.fach ?? a.patient.practice.specialty },
  });
  if (res.count === 0) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  await eingangMelden({ practiceId: a.patient.practiceId, patientId: a.patient.id, art: "ANAMNESE", entityId: params.id, hinweis: "am Empfangs-Tablet ausgefüllt" });
  return NextResponse.json({ ok: true });
}
