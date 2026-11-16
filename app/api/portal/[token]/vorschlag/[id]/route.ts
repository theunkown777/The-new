import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { patientResponseSchema } from "@/lib/patientLink";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { eingangMelden } from "@/lib/eingang";

import { anschluss } from "@/lib/anschluss";
// Rückmeldung zu einem Vorschlag aus dem Patientenportal.
export async function POST(req: Request, props: { params: Promise<{ token: string; id: string }> }) {
  const params = await props.params;
  const ip = anschluss(req.headers);
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const parsed = patientResponseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const res = await prisma.treatmentProposal.updateMany({
    where: { id: params.id, ...portalProposalWhere(patient.id), status: { in: ["ENTWURF", "BESPROCHEN"] } },
    data: {
      patientResponse: parsed.data.response,
      patientChoices: parsed.data.choices,
      patientNote: parsed.data.note || null,
      patientRespondedAt: new Date(),
      patientWantsInstallments: parsed.data.wantsInstallments,
      // Mit der Rückmeldung hat sich ein Erinnerungswunsch erledigt.
      erinnernAm: null,
      erinnernGemeldetAt: null,
    },
  });
  if (res.count === 0) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: parsed.data.response === "RUECKRUF" ? "VORSCHLAG_RUECKRUF" : "VORSCHLAG_INTERESSE", entityId: params.id, hinweis: parsed.data.wantsInstallments ? "möchte in Raten zahlen" : null });
  return NextResponse.json({ ok: true });
}
