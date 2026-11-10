import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { patientResponseSchema } from "@/lib/patientLink";
import { eingangMelden } from "@/lib/eingang";

// Rückmeldung des Patienten über den Patienten-Link (öffentlich, ohne Login).
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `patient-link:${ip}`;
  if (await isRateLimited(key, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, 60 * 60 * 1000);

  const proposal = await prisma.treatmentProposal.findUnique({
    where: { shareTokenHash: hashToken(params.token) },
    select: { id: true, shareExpiresAt: true, status: true, practiceId: true, patientId: true },
  });
  if (!proposal || !proposal.shareExpiresAt || proposal.shareExpiresAt < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  }

  const parsed = patientResponseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });

  await prisma.treatmentProposal.update({
    where: { id: proposal.id },
    data: {
      patientResponse: parsed.data.response,
      patientChoices: parsed.data.choices,
      patientNote: parsed.data.note || null,
      patientRespondedAt: new Date(),
      patientWantsInstallments: parsed.data.wantsInstallments,
    },
  });
  await eingangMelden({ practiceId: proposal.practiceId, patientId: proposal.patientId, art: parsed.data.response === "RUECKRUF" ? "VORSCHLAG_RUECKRUF" : "VORSCHLAG_INTERESSE", entityId: proposal.id, hinweis: parsed.data.wantsInstallments ? "möchte in Raten zahlen" : null });
  return NextResponse.json({ ok: true });
}
