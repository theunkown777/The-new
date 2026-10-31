import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { agreementSchema } from "@/lib/agreement";
import { agreementContext } from "@/lib/agreementContext";

// Digitales Einverständnis aus dem Patientenportal speichern. Einmalig:
// danach ist es fest (Änderungen nur über die Praxis).
export async function POST(req: Request, { params }: { params: { token: string; id: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const parsed = agreementSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, ...portalProposalWhere(patient.id), status: { in: ["ENTWURF", "BESPROCHEN", "ANGENOMMEN"] }, agreedAt: null },
    select: { id: true, status: true, createdAt: true, input: true, choices: true, patientChoices: true, patientResponse: true, practice: { select: { name: true, proposalPrices: true } } },
  });
  if (!proposal) return NextResponse.json({ error: "Dieser Vorschlag kann nicht mehr bestätigt werden." }, { status: 404 });

  const ctx = proposal && agreementContext(proposal);
  if (!ctx) return NextResponse.json({ error: "Dieser Vorschlag kann nicht mehr bestätigt werden." }, { status: 404 });
  const now = new Date();
  await prisma.treatmentProposal.update({
    where: { id: proposal.id },
    data: {
      agreedAt: now,
      agreedName: parsed.data.name,
      agreedSignature: parsed.data.signature,
      agreedChoices: ctx.choices,
      agreedText: ctx.text,
      ...(proposal.patientResponse ? {} : { patientResponse: "INTERESSE", patientRespondedAt: now }),
    },
  });
  return NextResponse.json({ ok: true });
}
