import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { anamnesisSchema } from "@/lib/anamnesis";

// Ausgefüllter Anamnesebogen (öffentlich, ohne Login). Nach dem Absenden
// ist der Link verbraucht, damit niemand die Angaben nachträglich ändert.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `anamnesis:${ip}`;
  if (await isRateLimited(key, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, 60 * 60 * 1000);

  const form = await prisma.anamnesisForm.findUnique({ where: { tokenHash: hashToken(params.token) } });
  if (!form || form.submittedAt || form.expiresAt < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist nicht mehr gültig. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  }
  const parsed = anamnesisSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });

  await prisma.anamnesisForm.update({
    where: { id: form.id },
    data: { answers: parsed.data as unknown as Prisma.InputJsonValue, submittedAt: new Date(), tokenHash: null },
  });
  return NextResponse.json({ ok: true });
}
