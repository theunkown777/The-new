import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { portalPatient } from "@/lib/portalAuth";
import { kurzArt, kurzcheckSchema } from "@/lib/kurzcheck";
import { eingangMelden } from "@/lib/eingang";

// Kurz-Fragebogen aus dem Patientenlink speichern. Die Praxis sieht ihn im Eingang und in der Akte.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `kurzcheck:${ip}`;
  if (await isRateLimited(key, 12, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const praxis = await prisma.practice.findUnique({ where: { id: patient.practiceId }, select: { specialty: true } });
  const parsed = kurzcheckSchema(kurzArt(praxis?.specialty)).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });

  const neu = await prisma.kurzcheck.create({ data: { practiceId: patient.practiceId, patientId: patient.id, antworten: parsed.data as unknown as Prisma.InputJsonValue }, select: { id: true } });
  // Nur die letzten 20 je Patient aufbewahren
  const alt = await prisma.kurzcheck.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" }, skip: 20, select: { id: true } });
  if (alt.length) await prisma.kurzcheck.deleteMany({ where: { id: { in: alt.map((a) => a.id) } } });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "KURZCHECK", entityId: neu.id });
  return NextResponse.json({ ok: true }, { status: 201 });
}
