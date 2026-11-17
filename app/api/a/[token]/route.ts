import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { anamnesePruefen, anamneseProfilFuer } from "@/lib/anamnesis";
import { eingangMelden } from "@/lib/eingang";

import { anschluss } from "@/lib/anschluss";
// Ausgefüllter Anamnesebogen (öffentlich, ohne Login). Nach dem Absenden
// ist der Link verbraucht, damit niemand die Angaben nachträglich ändert.
export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const ip = anschluss(req.headers);
  const key = `anamnesis:${ip}`;
  if (await isRateLimited(key, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, 60 * 60 * 1000);

  const form = await prisma.anamnesisForm.findUnique({
    where: { tokenHash: hashToken(params.token) },
    include: { practice: { select: { specialty: true } }, patient: { select: { birthDate: true, geschlecht: true } } },
  });
  if (!form || form.submittedAt || form.expiresAt < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist nicht mehr gültig. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  }
  // Geprüft wird gegen den Bogen des Fachs, der angezeigt wurde (lib/anamneseProfile.ts); fremde Fragen werden abgelehnt.
  // Vom Gerät übernommene Angaben (lib/meineAngaben.ts): Gespeichert wird nur der Tag, an dem der Patient sie
  // festgehalten hat. Keine Herkunft, keine andere Praxis.
  const profil = anamneseProfilFuer(form.fach, form.practice.specialty, form.patient);
  const geprueft = anamnesePruefen(await req.json().catch(() => null), profil, { altbestand: !form.fach, vorbefuelltErlaubt: true });
  if (!geprueft.ok) return NextResponse.json({ error: geprueft.fehler }, { status: 400 });

  await prisma.anamnesisForm.update({
    where: { id: form.id },
    data: { answers: geprueft.daten as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null, fach: form.fach ?? form.practice.specialty, vorbefuelltStand: geprueft.vorbefuelltStand },
  });
  await eingangMelden({ practiceId: form.practiceId, patientId: form.patientId, art: "ANAMNESE", entityId: form.id });
  return NextResponse.json({ ok: true });
}
