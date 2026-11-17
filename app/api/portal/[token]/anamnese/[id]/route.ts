import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { anamnesePruefen, anamneseProfilFuer } from "@/lib/anamnesis";
import { portalPatient } from "@/lib/portalAuth";
import { eingangMelden } from "@/lib/eingang";

import { anschluss } from "@/lib/anschluss";
// Anamnesebogen aus dem Patientenportal absenden. Danach ist er gesperrt.
export async function POST(req: Request, props: { params: Promise<{ token: string; id: string }> }) {
  const params = await props.params;
  const ip = anschluss(req.headers);
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const offen = { id: params.id, patientId: patient.id, practiceId: patient.practiceId, submittedAt: null, expiresAt: { gt: new Date() } };
  const form = await prisma.anamnesisForm.findFirst({
    where: offen,
    select: { fach: true, practice: { select: { specialty: true } }, patient: { select: { birthDate: true, geschlecht: true } } },
  });
  if (!form) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  // Geprüft wird gegen den Bogen des Fachs, der angezeigt wurde (lib/anamneseProfile.ts); fremde Fragen werden abgelehnt.
  const profil = anamneseProfilFuer(form.fach, form.practice.specialty, form.patient);
  const geprueft = anamnesePruefen(await req.json().catch(() => null), profil, { altbestand: !form.fach });
  if (!geprueft.ok) return NextResponse.json({ error: geprueft.fehler }, { status: 400 });
  const res = await prisma.anamnesisForm.updateMany({
    where: offen,
    data: { answers: geprueft.daten as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null, fach: form.fach ?? form.practice.specialty },
  });
  if (res.count === 0) return NextResponse.json({ error: "Dieser Bogen ist nicht mehr offen." }, { status: 404 });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "ANAMNESE", entityId: params.id });
  return NextResponse.json({ ok: true });
}
