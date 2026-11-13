import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { agreementSchema } from "@/lib/agreement";
import { agreementContext } from "@/lib/agreementContext";
import { eingangMelden } from "@/lib/eingang";
import { portalPruefung, pruefungNoetigAntwort } from "@/lib/portalPruefungServer";

// Digitales Einverständnis aus dem Patientenportal speichern. Einmalig:
// danach ist es fest (Änderungen nur über die Praxis).
// Der Link allein genügt dafür nicht (S5): Ist ein Geburtsdatum hinterlegt, muss
// es kurz zuvor bestätigt worden sein. Ohne hinterlegtes Geburtsdatum bleibt die
// Unterschrift möglich, wird aber als "ohne Geburtsdatum-Prüfung" festgehalten
// (agreedGeprueftAt bleibt leer) und der Praxis im Eingang gemeldet.
export async function POST(req: Request, { params }: { params: { token: string; id: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  const pruefung = await portalPruefung(params.token, patient.id);
  if (pruefung.status === "noetig") return pruefungNoetigAntwort();
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
      agreedGeprueftAt: pruefung.status === "bestaetigt" ? pruefung.geprueftAt : null,
      ...(proposal.patientResponse ? {} : { patientResponse: "INTERESSE", patientRespondedAt: now }),
    },
  });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "VEREINBARUNG", entityId: proposal.id, hinweis: pruefung.status === "ohne" ? "ohne Geburtsdatum-Prüfung: bitte Geburtsdatum in der Akte nachtragen" : null });
  return NextResponse.json({ ok: true });
}
